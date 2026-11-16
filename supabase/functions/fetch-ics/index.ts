// fetch-ics : lit l'agenda en ligne du membre connecté (lien iCal enregistré dans connectors)
// et renvoie les événements des 30 prochains jours. L'app les transforme ensuite en tâches.
// Répond toujours en 200 : { items } ou { error, message }.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parseIcs } from './ics.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Seulement des adresses https publiques : pas d'IP, pas de noms internes. */
function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim().replace(/^webcal:/i, 'https:'));
    const h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:') return null;
    if (!h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return null;
    if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(h)) return null;
    return u;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return json({ error: 'unauthorized', message: 'Connecte-toi d’abord.' });

    const { data: me } = await supabase.from('members').select('id').eq('user_id', auth.user.id).maybeSingle();
    if (!me) return json({ error: 'no_member', message: 'Pas de foyer.' });

    const { data: conn } = await supabase
      .from('connectors')
      .select('id, ics_url')
      .eq('member_id', me.id)
      .eq('type', 'ics')
      .maybeSingle();
    if (!conn?.ics_url) return json({ error: 'no_connector', message: 'Aucun agenda connecté.' });

    const url = safeUrl(conn.ics_url);
    if (!url) return json({ error: 'bad_url', message: 'Ce lien n’est pas un lien d’agenda valide (il doit commencer par https://).' });

    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { Accept: 'text/calendar, */*' } });
    if (!res.ok) return json({ error: 'fetch_failed', message: `L’agenda a répondu ${res.status}. Vérifie que le lien est bien l’adresse secrète iCal.` });
    const text = (await res.text()).slice(0, 5_000_000);
    if (!text.includes('BEGIN:VCALENDAR')) {
      return json({ error: 'not_ics', message: 'Ce lien ne renvoie pas un agenda. Copie l’« adresse secrète au format iCal », pas l’adresse de la page.' });
    }

    const items = parseIcs(text);
    await supabase.from('connectors').update({ last_sync_at: new Date().toISOString() }).eq('id', conn.id);
    return json({ items });
  } catch (e) {
    return json({ error: 'failed', message: String((e as Error)?.message ?? e) });
  }
});
