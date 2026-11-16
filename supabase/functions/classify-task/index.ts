// classify-task : reçoit des éléments bruts (événement calendrier, note vocale, plus tard mail)
// et crée les tâches familiales correspondantes, avec catégorie, porteur et couches.
// Déployer : supabase functions deploy classify-task --no-verify-jwt=false
// Secrets  : supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';

type Item = {
  source: 'calendar' | 'voice' | 'mail';
  source_ref: string | null;
  title: string;
  notes: string | null;
  starts_at: string | null;
  location: string | null;
};

const SYSTEM = `Tu es l'assistant de Tandem, une app qui rend visible la charge mentale parentale.
On te donne des éléments bruts (événements de calendrier, phrases dictées par un parent).
Pour chacun, décide s'il s'agit d'une TÂCHE FAMILIALE (quelque chose à anticiper, décider ou faire pour le foyer ou les enfants).
Ignore le travail professionnel, le sport perso, les réunions pro, les anniversaires de collègues.
Réponds UNIQUEMENT en JSON : {"tasks":[{"index":0,"keep":true,"title":"...","category":"sante|ecole|logistique|maison|social|admin","child":"prénom ou null","due_at":"ISO ou null","layers":{"anticipate":true,"decide":true,"execute":false},"context":{"contact":"...","place":"...","notes":"..."}}]}
Règles :
- title : court, à l'infinitif ou nominal, en français ("Rdv pédiatre Tom", "Acheter fournitures rentrée").
- layers : pour une phrase dictée au passé ("j'ai pris rdv"), la personne a anticipé et décidé → anticipate et decide true ; execute true seulement si elle dit l'avoir fait/emmené.
  Pour un événement calendrier futur, le créateur a anticipé → anticipate true, le reste false.
- keep=false si ce n'est pas une tâche familiale.`;

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const { household_id, member_id, items } = (await req.json()) as {
    household_id: string;
    member_id: string;
    items: Item[];
  };

  // Vérifie que l'appelant est bien ce membre de ce foyer (RLS fait le reste).
  const { data: me } = await supabase.from('members').select('id').eq('id', member_id).eq('user_id', user.user.id).maybeSingle();
  if (!me) return Response.json({ error: 'forbidden' }, { status: 403 });

  // Déduplique : on ne reclasse pas un événement déjà vu.
  const refs = items.map((i) => i.source_ref).filter(Boolean) as string[];
  const { data: existing } = refs.length
    ? await supabase.from('tasks').select('source_ref').eq('household_id', household_id).in('source_ref', refs)
    : { data: [] };
  const seen = new Set((existing ?? []).map((e) => e.source_ref));
  const fresh = items.filter((i) => !i.source_ref || !seen.has(i.source_ref));
  if (fresh.length === 0) return Response.json({ created: 0 });

  const { data: children } = await supabase.from('children').select('id, first_name').eq('household_id', household_id);

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Enfants du foyer : ${(children ?? []).map((c) => c.first_name).join(', ') || 'aucun'}.\nDate du jour : ${new Date().toISOString()}.\nÉléments :\n${JSON.stringify(
          fresh.map((i, index) => ({ index, ...i })),
          null,
          1,
        )}`,
      },
    ],
  });

  const text = msg.content.find((c) => c.type === 'text')?.text ?? '{}';
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as {
    tasks: Array<{
      index: number;
      keep: boolean;
      title: string;
      category: string;
      child: string | null;
      due_at: string | null;
      layers: { anticipate: boolean; decide: boolean; execute: boolean };
      context: Record<string, string>;
    }>;
  };

  let created = 0;
  for (const t of parsed.tasks ?? []) {
    if (!t.keep) continue;
    const src = fresh[t.index];
    const child = (children ?? []).find((c) => c.first_name.toLowerCase() === (t.child ?? '').toLowerCase());
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        household_id,
        title: t.title,
        category: t.category,
        source: src.source,
        source_ref: src.source_ref,
        child_id: child?.id ?? null,
        owner_member_id: member_id,
        due_at: t.due_at ?? src.starts_at,
        context: { ...t.context, ...(src.location ? { place: src.location } : {}) },
      })
      .select('id')
      .single();
    if (error || !task) continue;

    const weights = { anticipate: 3, decide: 2, execute: 1 } as const;
    const layers = (Object.keys(weights) as Array<keyof typeof weights>)
      .filter((l) => t.layers?.[l])
      .map((l) => ({ task_id: task.id, layer: l, member_id, weight: weights[l] }));
    if (layers.length) await supabase.from('task_layers').insert(layers);
    created++;
  }

  return Response.json({ created });
});
