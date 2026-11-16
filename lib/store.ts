import { create } from 'zustand';
import { supabase } from './supabase';
import { syncIcs } from './ics';
import type { Household, Member, Child, Task } from './types';

export interface ThanksIn { id: string; task_id: string; from_member_id: string; title: string }
export interface TipIn { id: string; task_id: string; from_member_id: string | null; title: string; tip: string }
export interface TipRequest { id: string; task_id: string; to_member_id: string; title: string }

interface State {
  loading: boolean;
  household: Household | null;
  members: Member[];
  me: Member | null;
  children: Child[];
  tasks: Task[];
  /** Tâches faites ces 7 derniers jours, les plus récentes d'abord. */
  recent: Task[];
  /** Mercis reçus pas encore vus. */
  thanksIn: ThanksIn[];
  /** Tâches pour lesquelles j'ai déjà dit merci. */
  thankedTaskIds: string[];
  /** Tâches qu'on m'a reprises : l'app me propose de laisser un conseil. */
  tipRequests: TipRequest[];
  /** Conseils qu'on m'a laissés et que je n'ai pas encore lus. */
  tipsIn: TipIn[];
  celebration: string | null;
  load: () => Promise<void>;
  reset: () => void;
  celebrate: (message?: string) => void;
  clearCelebration: () => void;
}

const CHEERS = [
  'Une de moins dans la tête ✨',
  'Bien joué, l’équipe 🚲',
  'Et hop, c’est réglé 👌',
  'Ça, c’est fait 🎉',
  'La tête plus légère 🌿',
];

// L'agenda en ligne est relu une fois à chaque ouverture de l'app, en arrière-plan.
let icsSyncedThisSession = false;

const titleOf = (row: any): string => {
  const t = Array.isArray(row?.tasks) ? row.tasks[0] : row?.tasks;
  return t?.title ?? 'une tâche';
};

export const useStore = create<State>((set, get) => ({
  loading: true,
  household: null,
  members: [],
  me: null,
  children: [],
  tasks: [],
  recent: [],
  thanksIn: [],
  thankedTaskIds: [],
  tipRequests: [],
  tipsIn: [],
  celebration: null,

  async load() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return set({ loading: false, household: null, me: null });

    const { data: me } = await supabase.from('members').select('*').eq('user_id', uid).maybeSingle();
    if (!me) return set({ loading: false, household: null, me: null });

    // La bibliothèque propose les tâches de saison qui approchent (sans doublon).
    await supabase.rpc('propose_library_tasks').then(() => {}, () => {});

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [household, members, children, tasks, recent, thanksIn, thanked, tips, tipsIn] = await Promise.all([
      supabase.from('households').select('*').eq('id', me.household_id).single(),
      supabase.from('members').select('*').eq('household_id', me.household_id).order('created_at'),
      supabase.from('children').select('*').eq('household_id', me.household_id).order('created_at'),
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', me.household_id)
        .eq('status', 'todo')
        .order('due_at', { ascending: true, nullsFirst: false }),
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', me.household_id)
        .eq('status', 'done')
        .gte('done_at', weekAgo)
        .order('done_at', { ascending: false })
        .limit(12),
      supabase.from('thanks').select('id, task_id, from_member_id, tasks(title)').eq('to_member_id', me.id).is('seen_at', null),
      supabase.from('thanks').select('task_id').eq('from_member_id', me.id).gte('created_at', weekAgo),
      supabase
        .from('transfers')
        .select('id, task_id, to_member_id, tasks(title)')
        .eq('from_member_id', me.id)
        .neq('to_member_id', me.id)
        .is('tip', null)
        .eq('tip_dismissed', false)
        .gte('accepted_at', weekAgo),
      supabase
        .from('transfers')
        .select('id, task_id, from_member_id, tip, tasks(title)')
        .eq('to_member_id', me.id)
        .not('tip', 'is', null)
        .is('tip_seen_at', null),
    ]);

    set({
      loading: false,
      me,
      household: household.data ?? null,
      members: members.data ?? [],
      children: children.data ?? [],
      tasks: tasks.data ?? [],
      recent: recent.data ?? [],
      thanksIn: (thanksIn.data ?? []).map((r: any) => ({ id: r.id, task_id: r.task_id, from_member_id: r.from_member_id, title: titleOf(r) })),
      thankedTaskIds: (thanked.data ?? []).map((r: any) => r.task_id),
      tipsIn: (tipsIn.data ?? []).map((r: any) => ({ id: r.id, task_id: r.task_id, from_member_id: r.from_member_id, title: titleOf(r), tip: r.tip })),
      tipRequests: (tips.data ?? []).map((r: any) => ({ id: r.id, task_id: r.task_id, to_member_id: r.to_member_id, title: titleOf(r) })),
    });

    if (!icsSyncedThisSession) {
      icsSyncedThisSession = true;
      syncIcs(me.household_id, me.id)
        .then((n) => {
          if (n) get().load();
        })
        .catch(() => {});
    }
  },

  reset() {
    set({ loading: false, household: null, members: [], me: null, children: [], tasks: [], recent: [], thanksIn: [], thankedTaskIds: [], tipRequests: [], tipsIn: [] });
  },

  celebrate(message) {
    set({ celebration: message ?? CHEERS[Math.floor(Math.random() * CHEERS.length)] });
  },
  clearCelebration() {
    set({ celebration: null });
  },
}));

export const partnerOf = (me: Member | null, members: Member[]) =>
  members.find((m) => m.id !== me?.id) ?? null;
