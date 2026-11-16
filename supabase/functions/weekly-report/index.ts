// weekly-report : chaque dimanche 18h (cron pg_cron → pg_net), calcule le score de chaque foyer
// à deux adultes et demande à Claude 2-3 tâches à proposer au moins chargé.
// Déployer : supabase functions deploy weekly-report --no-verify-jwt
// Appelée avec le header x-cron-secret (secret CRON_SECRET) pour éviter les appels externes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';

const CATEGORIES = ['sante', 'ecole', 'logistique', 'maison', 'social', 'admin'] as const;

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return Response.json({ error: 'forbidden' }, { status: 403 });
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // lundi
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data: households } = await db.from('households').select('id, name');
  let done = 0;

  for (const h of households ?? []) {
    const { data: members } = await db.from('members').select('id, display_name').eq('household_id', h.id);
    if (!members || members.length < 2) continue;

    // Couches enregistrées cette semaine, jointes à la catégorie de la tâche
    const { data: layers } = await db
      .from('task_layers')
      .select('member_id, weight, tasks!inner(category, household_id, id, title)')
      .eq('tasks.household_id', h.id)
      .gte('recorded_at', weekStart.toISOString());

    const total: Record<string, number> = {};
    const by_category: Record<string, Record<string, number>> = {};
    for (const c of CATEGORIES) by_category[c] = {};
    for (const m of members) {
      total[m.id] = 0;
      for (const c of CATEGORIES) by_category[c][m.id] = 0;
    }
    for (const l of layers ?? []) {
      const cat = (l as any).tasks.category as string;
      total[l.member_id] = (total[l.member_id] ?? 0) + l.weight;
      by_category[cat][l.member_id] = (by_category[cat][l.member_id] ?? 0) + l.weight;
    }

    const [a, b] = members;
    const lighter = (total[a.id] ?? 0) <= (total[b.id] ?? 0) ? a : b;
    const heavier = lighter.id === a.id ? b : a;

    // Tâches à venir portées par le plus chargé → candidates au transfert
    const { data: candidates } = await db
      .from('tasks')
      .select('id, title, category, due_at, context')
      .eq('household_id', h.id)
      .eq('status', 'todo')
      .eq('owner_member_id', heavier.id)
      .gte('due_at', new Date().toISOString())
      .order('due_at')
      .limit(15);

    let suggestions: unknown[] = [];
    if (candidates && candidates.length > 0 && Math.abs((total[a.id] ?? 0) - (total[b.id] ?? 0)) > 2) {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 800,
        system: `Tu aides un couple de parents à rééquilibrer la charge mentale. Ton ton est chaleureux, collectif ("l'équipe", "vous deux"), jamais accusateur, jamais "X n'a rien fait".
Choisis 2 ou 3 tâches parmi les candidates que ${lighter.display_name} pourrait reprendre la semaine prochaine. Privilégie celles qui ont du contexte (contact, lieu) et qui sont récurrentes.
Réponds UNIQUEMENT en JSON : {"suggestions":[{"task_id":"...","why":"une phrase courte, positive, qui s'adresse à ${lighter.display_name}"}]}`,
        messages: [
          {
            role: 'user',
            content: `Scores de la semaine : ${a.display_name} ${total[a.id]}, ${b.display_name} ${total[b.id]}.\nPar catégorie : ${JSON.stringify(by_category)}.\nCandidates : ${JSON.stringify(candidates)}`,
          },
        ],
      });
      const text = msg.content.find((c) => c.type === 'text')?.text ?? '{}';
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      suggestions = (parsed.suggestions ?? [])
        .map((s: { task_id: string; why: string }) => {
          const t = candidates.find((c) => c.id === s.task_id);
          return t ? { task_id: t.id, title: t.title, category: t.category, to_member_id: lighter.id, why: s.why } : null;
        })
        .filter(Boolean);
    }

    await db.from('weekly_reports').upsert(
      { household_id: h.id, week_start: weekStartStr, scores: { total, by_category }, suggestions },
      { onConflict: 'household_id,week_start' },
    );
    done++;
  }

  return Response.json({ households: done, week_start: weekStartStr });
});
