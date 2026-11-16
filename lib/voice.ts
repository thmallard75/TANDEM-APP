import { supabase } from './supabase';

/**
 * Envoie une phrase dictée ("j'ai pris le rdv pédiatre de Tom") à classify-task.
 * Au MVP, on utilise la dictée native du clavier (micro du clavier iOS/Android) :
 * zéro dépendance, zéro coût. La transcription Whisper arrive en v1.1.
 */
export async function submitVoiceNote(householdId: string, memberId: string, text: string) {
  const { data, error } = await supabase.functions.invoke('classify-task', {
    body: {
      household_id: householdId,
      member_id: memberId,
      items: [{ source: 'voice', title: text, starts_at: null, notes: null, source_ref: null, location: null }],
    },
  });
  if (error) throw error;
  return data;
}
