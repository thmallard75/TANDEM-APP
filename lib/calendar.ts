import * as Calendar from 'expo-calendar';
import { supabase } from './supabase';

/**
 * Lit les événements des 30 prochains jours sur les calendriers du téléphone
 * (Google, iCloud, Outlook… tout ce que l'OS expose) et les envoie à la
 * fonction classify-task. Rien n'est modifié côté calendrier.
 */
export async function syncDeviceCalendars(householdId: string, memberId: string) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return { synced: 0, denied: true };

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);

  const events = await Calendar.getEventsAsync(
    calendars.map((c) => c.id),
    start,
    end,
  );

  const items = events
    .filter((e) => e.title && !e.allDay)
    .map((e) => ({
      source: 'calendar' as const,
      source_ref: e.id,
      title: e.title,
      notes: e.notes ?? null,
      starts_at: typeof e.startDate === 'string' ? e.startDate : new Date(e.startDate).toISOString(),
      location: e.location ?? null,
    }));

  if (items.length === 0) return { synced: 0 };

  const { data, error } = await supabase.functions.invoke('classify-task', {
    body: { household_id: householdId, member_id: memberId, items },
  });
  if (error) throw error;
  return { synced: data?.created ?? 0 };
}
