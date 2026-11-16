/** Jour J à minuit (heure locale), décalé de `days` jours. */
export function dayFromNow(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/** Prochain jour de la semaine demandé (0 = dimanche … 6 = samedi), jamais aujourd'hui. */
export function nextWeekday(weekday: number, from = new Date()): Date {
  const delta = (weekday - from.getDay() + 7) % 7 || 7;
  return dayFromNow(delta, from);
}

/**
 * Lit une date tapée à la main : « 17/11 », « 17/11/2026 », « 17/11 14:30 », « 3.12 9h ».
 * Sans année, on prend la prochaine occurrence. Renvoie null si ce n'est pas une date.
 */
export function parseFrenchDate(input: string, now = new Date()): Date | null {
  const m = /^\s*(\d{1,2})[\/.\-\s](\d{1,2})(?:[\/.\-](\d{2}|\d{4}))?(?:\s*(?:à\s*)?(\d{1,2})\s*[:hH]\s*(\d{2})?)?\s*$/.exec(input);
  if (!m) return null;
  const day = +m[1];
  const month = +m[2];
  const hour = m[4] !== undefined ? +m[4] : 0;
  const minute = m[5] !== undefined ? +m[5] : 0;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  let year = m[3] ? +m[3] : now.getFullYear();
  if (m[3] && m[3].length === 2) year += 2000;
  let d = new Date(year, month - 1, day, hour, minute);
  if (d.getMonth() !== month - 1) return null; // 31/02 n'existe pas
  if (!m[3] && d.getTime() < dayFromNow(0, now).getTime()) d = new Date(year + 1, month - 1, day, hour, minute);
  return d;
}

/** « mardi 17 novembre » ou « mardi 17 novembre à 14:30 » quand une heure est précisée. */
export function formatDue(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!d.getHours() && !d.getMinutes()) return date;
  return `${date} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}
