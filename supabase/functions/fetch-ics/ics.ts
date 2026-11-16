// Lecture d'un agenda au format iCal (.ics) : événements des 30 prochains jours.
// Pour un événement récurrent, seule la prochaine occurrence est retenue.

export type IcsItem = {
  source: 'calendar';
  source_ref: string;
  title: string;
  notes: string | null;
  starts_at: string;
  location: string | null;
};

type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number; allDay: boolean; utc: boolean; tz: string };
type Ev = {
  uid: string;
  summary: string;
  location: string;
  description: string;
  status: string;
  start: Parts | null;
  rrule: Record<string, string> | null;
  exdates: Set<string>;
  recurrenceId: string | null;
};

const DAY = 86400000;
const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const pad = (n: number) => String(n).padStart(2, '0');
const dayNum = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m - 1, d) / DAY);
const fromDayNum = (n: number) => {
  const dt = new Date(n * DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
};
const keyOf = (n: number) => {
  const p = fromDayNum(n);
  return `${p.y}${pad(p.m)}${pad(p.d)}`;
};

function localParts(instant: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(instant))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour, mi: o.minute, s: o.second };
}

function safeTz(tz: string, fallback: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return fallback;
  }
}

/** Heure "murale" dans un fuseau -> instant UTC (ms). */
function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, s: number, tz: string) {
  const wall = Date.UTC(y, m - 1, d, h, mi, s);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess, tz);
    guess -= Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - wall;
  }
  return guess;
}

function unfold(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function unescapeText(v: string) {
  return v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
}

function parseLine(line: string) {
  let inQuote = false;
  let idx = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ':' && !inQuote) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;
  const [name, ...rest] = line.slice(0, idx).split(';');
  const params: Record<string, string> = {};
  for (const p of rest) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(idx + 1) };
}

function parseDt(value: string, params: Record<string, string>, defTz: string): Parts | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const allDay = m[4] === undefined;
  const p: Parts = {
    y: +m[1], m: +m[2], d: +m[3], h: allDay ? 0 : +m[4], mi: allDay ? 0 : +m[5], s: allDay ? 0 : +(m[6] ?? 0),
    allDay, utc: m[7] === 'Z', tz: safeTz(params.TZID ?? defTz, defTz),
  };
  if (p.utc) {
    // On ramène tout en heure locale du calendrier pour raisonner en jours.
    const l = localParts(Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s), defTz);
    return { ...l, allDay: false, utc: false, tz: defTz };
  }
  return p;
}

function matcher(ev: Ev, start: Parts, lastDay: number) {
  const r = ev.rrule!;
  const freq = r.FREQ;
  const interval = Math.max(1, parseInt(r.INTERVAL ?? '1', 10) || 1);
  const S = dayNum(start.y, start.m, start.d);
  const sp = fromDayNum(S);
  const byday = (r.BYDAY ?? '').split(',').filter(Boolean).map((v) => {
    const mm = /^([+-]?\d+)?([A-Z]{2})$/.exec(v.trim());
    return mm ? { ord: mm[1] ? parseInt(mm[1], 10) : 0, wd: WD.indexOf(mm[2]) } : null;
  }).filter((v): v is { ord: number; wd: number } => !!v && v.wd >= 0);
  const bymonthday = (r.BYMONTHDAY ?? '').split(',').map((v) => parseInt(v, 10)).filter((v) => v > 0);
  const untilM = /^(\d{4})(\d{2})(\d{2})/.exec(r.UNTIL ?? '');
  const until = untilM ? dayNum(+untilM[1], +untilM[2], +untilM[3]) : Infinity;
  const monday = (n: number) => n - ((fromDayNum(n).wd + 6) % 7);

  const base = (D: number) => {
    if (D < S || D > until) return false;
    const p = fromDayNum(D);
    if (freq === 'DAILY') return (D - S) % interval === 0 && (byday.length === 0 || byday.some((b) => b.wd === p.wd));
    if (freq === 'WEEKLY') {
      if (((monday(D) - monday(S)) / 7) % interval !== 0) return false;
      return byday.length ? byday.some((b) => b.wd === p.wd) : p.wd === sp.wd;
    }
    if (freq === 'MONTHLY') {
      if (((p.y - sp.y) * 12 + (p.m - sp.m)) % interval !== 0) return false;
      if (byday.length) {
        const dim = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
        const nth = Math.floor((p.d - 1) / 7) + 1;
        const fromEnd = -(Math.floor((dim - p.d) / 7) + 1);
        return byday.some((b) => b.wd === p.wd && (b.ord === 0 || b.ord === nth || b.ord === fromEnd));
      }
      if (bymonthday.length) return bymonthday.includes(p.d);
      return p.d === sp.d;
    }
    if (freq === 'YEARLY') return (p.y - sp.y) % interval === 0 && p.m === sp.m && p.d === sp.d;
    return false;
  };

  // COUNT : on repère le dernier jour autorisé en comptant depuis le début.
  let lastAllowed = Infinity;
  const count = parseInt(r.COUNT ?? '', 10);
  if (count > 0) {
    let seen = 0;
    lastAllowed = -Infinity;
    for (let D = S, i = 0; D <= lastDay && i < 20000; D++, i++) {
      if (base(D)) {
        seen++;
        lastAllowed = D;
        if (seen >= count) break;
      }
    }
    if (seen < count) lastAllowed = Infinity;
  }
  return (D: number) => D <= lastAllowed && base(D);
}

export function parseIcs(text: string, now = Date.now(), windowDays = 30): IcsItem[] {
  const lines = unfold(text);
  let defTz = 'Europe/Paris';
  const events: Ev[] = [];
  let cur: Ev | null = null;
  let depth = 0; // on ignore les sous-blocs (VALARM)

  for (const raw of lines) {
    const l = parseLine(raw);
    if (!l) continue;
    if (l.name === 'X-WR-TIMEZONE' && !cur) defTz = safeTz(l.value.trim(), defTz);
    if (l.name === 'BEGIN') {
      if (l.value.trim().toUpperCase() === 'VEVENT') {
        cur = { uid: '', summary: '', location: '', description: '', status: '', start: null, rrule: null, exdates: new Set(), recurrenceId: null };
        depth = 0;
      } else if (cur) depth++;
      continue;
    }
    if (l.name === 'END') {
      if (cur && depth > 0) depth--;
      else if (cur && l.value.trim().toUpperCase() === 'VEVENT') {
        events.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur || depth > 0) continue;
    switch (l.name) {
      case 'UID': cur.uid = l.value.trim(); break;
      case 'SUMMARY': cur.summary = unescapeText(l.value); break;
      case 'LOCATION': cur.location = unescapeText(l.value); break;
      case 'DESCRIPTION': cur.description = unescapeText(l.value); break;
      case 'STATUS': cur.status = l.value.trim().toUpperCase(); break;
      case 'DTSTART': cur.start = parseDt(l.value, l.params, defTz); break;
      case 'RRULE': {
        const r: Record<string, string> = {};
        for (const kv of l.value.split(';')) {
          const eq = kv.indexOf('=');
          if (eq > 0) r[kv.slice(0, eq).toUpperCase()] = kv.slice(eq + 1).toUpperCase();
        }
        cur.rrule = r;
        break;
      }
      case 'EXDATE':
        for (const v of l.value.split(',')) {
          const p = parseDt(v, l.params, defTz);
          if (p) cur.exdates.add(`${p.y}${pad(p.m)}${pad(p.d)}`);
        }
        break;
      case 'RECURRENCE-ID': {
        const p = parseDt(l.value, l.params, defTz);
        if (p) cur.recurrenceId = `${p.y}${pad(p.m)}${pad(p.d)}`;
        break;
      }
    }
  }

  // Une occurrence modifiée remplace celle de la série.
  const moved = new Map<string, Set<string>>();
  for (const e of events) {
    if (e.recurrenceId && e.uid) {
      if (!moved.has(e.uid)) moved.set(e.uid, new Set());
      moved.get(e.uid)!.add(e.recurrenceId);
    }
  }

  const t = localParts(now, defTz);
  const today = dayNum(t.y, t.m, t.d);
  const lastDay = today + windowDays;
  const out: IcsItem[] = [];

  for (const e of events) {
    if (!e.start || !e.summary || e.status === 'CANCELLED') continue;
    const s = e.start;
    let D: number | null = null;

    if (e.rrule && !e.recurrenceId) {
      const ok = matcher(e, s, lastDay);
      const skip = new Set([...e.exdates, ...(moved.get(e.uid) ?? [])]);
      for (let d = Math.max(today, dayNum(s.y, s.m, s.d)); d <= lastDay; d++) {
        if (ok(d) && !skip.has(keyOf(d))) {
          D = d;
          break;
        }
      }
    } else {
      const d = dayNum(s.y, s.m, s.d);
      if (d >= today && d <= lastDay) D = d;
    }
    if (D === null) continue;

    const p = fromDayNum(D);
    const instant = zonedToUtc(p.y, p.m, p.d, s.h, s.mi, s.s, s.tz);
    out.push({
      source: 'calendar',
      source_ref: `ics:${e.uid || e.summary}:${keyOf(D)}`,
      title: e.summary.slice(0, 200),
      notes: e.description ? e.description.slice(0, 300) : null,
      starts_at: new Date(instant).toISOString(),
      location: e.location ? e.location.slice(0, 200) : null,
    });
  }

  out.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return out.slice(0, 80);
}
