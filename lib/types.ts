export type Category = 'sante' | 'ecole' | 'logistique' | 'maison' | 'social' | 'admin';
export type Source = 'calendar' | 'mail' | 'voice' | 'library';
export type Status = 'todo' | 'done' | 'dismissed';
export type Layer = 'anticipate' | 'decide' | 'execute';

export const CATEGORY_LABEL: Record<Category, string> = {
  sante: 'Santé',
  ecole: 'École',
  logistique: 'Logistique',
  maison: 'Maison',
  social: 'Social',
  admin: 'Admin',
};

export const CATEGORY_COLOR: Record<Category, string> = {
  sante: '#E8736A',
  ecole: '#5B8DEF',
  logistique: '#F2A93B',
  maison: '#6BBF8A',
  social: '#B07CE8',
  admin: '#8A8F98',
};

export const LAYER_LABEL: Record<Layer, string> = {
  anticipate: 'Anticiper',
  decide: 'Décider',
  execute: 'Faire',
};

export interface Household {
  id: string;
  name: string;
  invite_code: string;
}

export interface Member {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
}

export interface Child {
  id: string;
  household_id: string;
  first_name: string;
  birth_year: number | null;
}

export interface Task {
  id: string;
  household_id: string;
  title: string;
  category: Category;
  source: Source;
  child_id: string | null;
  owner_member_id: string | null;
  due_at: string | null;
  status: Status;
  context: Record<string, unknown>;
  created_at: string;
  done_at: string | null;
  done_by_member_id: string | null;
}

export interface TaskLayer {
  id: string;
  task_id: string;
  layer: Layer;
  member_id: string;
  weight: number;
}

export interface WeeklyReport {
  id: string;
  household_id: string;
  week_start: string;
  scores: {
    total: Record<string, number>; // member_id -> points
    by_category: Record<Category, Record<string, number>>;
  };
  suggestions: Suggestion[];
  opened_at: string | null;
}

export interface Suggestion {
  task_id: string;
  title: string;
  category: Category;
  to_member_id: string;
  why: string;
}
