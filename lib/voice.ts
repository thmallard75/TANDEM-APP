import { classify } from './classify';

/** Envoie une phrase dictée ("j'ai pris le rdv pédiatre de Tom") et crée la tâche correspondante. */
export async function submitVoiceNote(householdId: string, memberId: string, text: string) {
  return classify(householdId, memberId, [
    { source: 'voice', title: text, starts_at: null, notes: null, source_ref: null, location: null },
  ]);
}
