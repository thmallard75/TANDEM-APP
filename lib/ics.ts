import { supabase } from './supabase';
import { classify } from './classify';

export type IcsConnector = { id: string; ics_url: string | null; last_sync_at: string | null };

export async function getIcsConnector(memberId: string): Promise<IcsConnector | null> {
  const { data } = await supabase
    .from('connectors')
    .select('id, ics_url, last_sync_at')
    .eq('member_id', memberId)
    .eq('type', 'ics')
    .maybeSingle();
  return data?.ics_url ? (data as IcsConnector) : null;
}

export async function saveIcsUrl(memberId: string, url: string) {
  const { error } = await supabase
    .from('connectors')
    .upsert({ member_id: memberId, type: 'ics', ics_url: url.trim() }, { onConflict: 'member_id,type' });
  if (error) throw error;
}

export async function removeIcs(memberId: string) {
  const { error } = await supabase.from('connectors').delete().eq('member_id', memberId).eq('type', 'ics');
  if (error) throw error;
}

/**
 * Lit l'agenda en ligne et crée les tâches nouvelles.
 * Renvoie le nombre de tâches créées, ou null si aucun agenda n'est connecté.
 */
export async function syncIcs(householdId: string, memberId: string): Promise<number | null> {
  const { data, error } = await supabase.functions.invoke('fetch-ics', { body: {} });
  if (error) throw new Error('Le service agenda ne répond pas. Réessaie dans un instant.');
  if (data?.error === 'no_connector') return null;
  if (data?.error) throw new Error(data.message ?? 'Lecture de l’agenda impossible.');
  return classify(householdId, memberId, data?.items ?? []);
}
