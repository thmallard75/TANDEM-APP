// classify-task : éléments bruts (événement d'agenda, phrase dictée) -> tâches familiales via OpenAI.
// Secret attendu : OPENAI_API_KEY (optionnel : OPENAI_MODEL pour forcer un modèle).
// Sans clé, ou si l'appel échoue, répond {fallback:true} : l'app bascule alors
// sur la fonction SQL ingest_items (classement par mots-clés).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Item = {
  source: 'calendar' | 'voice' | 'mail';
  source_ref: string | null;
  title: string;
  notes: string | null;
  starts_at: string | null;
  location: string | null;
};

// Du moins cher au plus ancien : on prend le premier que le compte accepte.
const MODELS = ['gpt-6-luna', 'gpt-5-nano', 'gpt-4.1-mini', 'gpt-4o-mini'];

const SYSTEM = `Tu es l'assistant de Tandem, une app qui rend visible la charge mentale parentale.
On te donne des éléments bruts (événements d'agenda, phrases dictées par un parent).
Pour chacun, décide s'il s'agit d'une TÂCHE FAMILIALE ou de gestion du foyer (quelque chose à anticiper, décider ou faire pour la maison, le couple ou les enfants).
Ignore le travail professionnel, le sport et les loisirs personnels, les réunions pro, les anniversaires de collègues.
Réponds UNIQUEMENT avec un objet JSON : {"tasks":[{"index":0,"keep":true,"title":"...","category":"sante|ecole|logistique|maison|social|admin","child":"prénom ou null","due_at":"ISO ou null","layers":{"anticipate":true,"decide":true,"execute":false},"context":{"contact":"...","place":"...","notes":"..."}}]}
Règles :
- Une entrée par élément reçu, avec son index.
- title : court, nominal ou à l'infinitif, en français ("Rdv pédiatre Tom", "Acheter fournitures rentrée").
- layers : pour une phrase dictée au passé ("j'ai pris rdv"), la personne a anticipé et décidé -> anticipate et decide true ; execute true seulement si elle dit l'avoir fait ou emmené.
  Pour un événement d'agenda futur, le créateur a anticipé -> anticipate true, le reste false.
- due_at : si la phrase donne un jour ("mardi", "le 3"), calcule la date ISO à partir de la date du jour. Pour un événement d'agenda, reprends starts_at.
- context : n'inclus que les clés connues, jamais de valeur inventée.
- keep=false si ce n'est pas une tâche familiale. Une phrase dictée par un parent est presque toujours à garder.`;

async function askOpenAI(apiKey: string, user: string): Promise<string> {
  const forced = Deno.env.get('OPENAI_MODEL');
  const models = forced ? [forced] : MODELS;
  let lastError = 'aucun modèle disponible';
  for (const model of models) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '{}';
    }
    lastError = `${model}: ${res.status} ${(await res.text()).slice(0, 200)}`;
    // Modèle inconnu ou non accessible : on essaie le suivant. Autre erreur (clé, quota) : inutile d'insister.
    if (res.status !== 404 && res.status !== 400 && res.status !== 403) break;
  }
  throw new Error(lastError);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ fallback: true, reason: 'no_api_key' });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return json({ error: 'unauthorized' }, 401);

    const { household_id, member_id, items } = (await req.json()) as {
      household_id: string;
      member_id: string;
      items: Item[];
    };

    const { data: me } = await supabase.from('members').select('id').eq('id', member_id).eq('user_id', user.user.id).maybeSingle();
    if (!me) return json({ error: 'forbidden' }, 403);

    const refs = items.map((i) => i.source_ref).filter(Boolean) as string[];
    const { data: existing } = refs.length
      ? await supabase.from('tasks').select('source_ref').eq('household_id', household_id).in('source_ref', refs)
      : { data: [] as { source_ref: string }[] };
    const seen = new Set((existing ?? []).map((e) => e.source_ref));
    const fresh = items.filter((i) => !i.source_ref || !seen.has(i.source_ref)).slice(0, 60);
    if (fresh.length === 0) return json({ created: 0 });

    const { data: children } = await supabase.from('children').select('id, first_name').eq('household_id', household_id);

    const text = await askOpenAI(
      apiKey,
      `Enfants du foyer : ${(children ?? []).map((c) => c.first_name).join(', ') || 'aucun'}.\nDate du jour : ${new Date().toISOString()} (fuseau Europe/Paris).\nÉléments :\n${JSON.stringify(
        fresh.map((i, index) => ({ index, ...i })),
      )}`,
    );

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

    const CATS = ['sante', 'ecole', 'logistique', 'maison', 'social', 'admin'];
    const validDate = (v: string | null) => (v && !Number.isNaN(Date.parse(v)) ? v : null);
    let created = 0;
    for (const t of parsed.tasks ?? []) {
      const src = fresh[t.index];
      if (!t.keep || !src || !t.title) continue;
      const child = (children ?? []).find((c) => c.first_name.toLowerCase() === (t.child ?? '').toLowerCase());
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          household_id,
          title: String(t.title).slice(0, 200),
          category: CATS.includes(t.category) ? t.category : 'logistique',
          source: src.source,
          source_ref: src.source_ref,
          child_id: child?.id ?? null,
          owner_member_id: member_id,
          due_at: validDate(t.due_at) ?? src.starts_at,
          context: { ...(t.context ?? {}), ...(src.location ? { place: src.location } : {}) },
        })
        .select('id')
        .single();
      if (error || !task) continue;

      const weights = { anticipate: 3, decide: 2, execute: 1 } as const;
      const layers = (Object.keys(weights) as Array<keyof typeof weights>)
        .filter((l) => t.layers?.[l])
        .map((l) => ({ task_id: task.id, layer: l, member_id, weight: weights[l] }));
      if (layers.length === 0) layers.push({ task_id: task.id, layer: 'anticipate', member_id, weight: 3 });
      await supabase.from('task_layers').insert(layers);
      created++;
    }

    return json({ created });
  } catch (e) {
    // OpenAI indisponible, clé refusée, JSON illisible… : l'app reprend la main avec les mots-clés.
    return json({ fallback: true, reason: String((e as Error)?.message ?? e) });
  }
});
