import { supabase } from './supabase';

export type RawItem = {
  source: 'calendar' | 'voice';
  source_ref: string | null;
  title: string;
  notes: string | null;
  starts_at: string | null;
  location: string | null;
};

/**
 * Transforme des éléments bruts en tâches.
 * 1) Essaie la fonction IA (classify-task).
 * 2) Si elle est absente, sans clé, ou en erreur : classement par mots-clés côté base (ingest_items).
 * L'app fonctionne donc toujours, l'IA n'est qu'un plus.
 */
export async function classify(householdId: string, memberId: string, items: RawItem[]): Promise<number> {
  if (items.length === 0) return 0;
  try {
    const { data, error } = await supabase.functions.invoke('classify-task', {
      body: { household_id: householdId, member_id: memberId, items },
    });
    if (!error && data && !data.fallback && typeof data.created === 'number') return data.created;
  } catch {
    // on passe au secours
  }
  const { data, error } = await supabase.rpc('ingest_items', { p_items: items });
  if (error) throw error;
  return (data as number) ?? 0;
}
