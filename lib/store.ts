import { create } from 'zustand';
import { supabase } from './supabase';
import { syncIcs } from './ics';
import type { Household, Member, Child, Task } from './types';

interface State {
  loading: boolean;
  household: Household | null;
  members: Member[];
  me: Member | null;
  children: Child[];
  tasks: Task[];
  load: () => Promise<void>;
  reset: () => void;
}

// L'agenda en ligne est relu une fois à chaque ouverture de l'app, en arrière-plan.
let icsSyncedThisSession = false;

export const useStore = create<State>((set, get) => ({
  loading: true,
  household: null,
  members: [],
  me: null,
  children: [],
  tasks: [],

  async load() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return set({ loading: false, household: null, me: null });

    const { data: me } = await supabase.from('members').select('*').eq('user_id', uid).maybeSingle();
    if (!me) return set({ loading: false, household: null, me: null });

    // La bibliothèque propose les tâches de saison qui approchent (sans doublon).
    await supabase.rpc('propose_library_tasks').then(() => {}, () => {});

    const [{ data: household }, { data: members }, { data: children }, { data: tasks }] = await Promise.all([
      supabase.from('households').select('*').eq('id', me.household_id).single(),
      supabase.from('members').select('*').eq('household_id', me.household_id),
      supabase.from('children').select('*').eq('household_id', me.household_id),
      supabase
        .from('tasks')
        .select('*')
        .eq('household_id', me.household_id)
        .eq('status', 'todo')
        .order('due_at', { ascending: true, nullsFirst: false }),
    ]);

    set({
      loading: false,
      me,
      household: household ?? null,
      members: members ?? [],
      children: children ?? [],
      tasks: tasks ?? [],
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
    set({ loading: false, household: null, members: [], me: null, children: [], tasks: [] });
  },
}));

export const partnerOf = (me: Member | null, members: Member[]) =>
  members.find((m) => m.id !== me?.id) ?? null;
