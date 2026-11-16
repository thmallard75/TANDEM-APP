-- Appliquée sur le projet sttsvpqrvzsyqswejrpc le 2026-11-16 (via MCP). Conservée pour référence / nouvel environnement.
create extension if not exists "pgcrypto";
create type member_role as enum ('adult');
create type connector_type as enum ('google_cal', 'apple_cal', 'gmail');
create type task_category as enum ('sante', 'ecole', 'logistique', 'maison', 'social', 'admin');
create type task_source as enum ('calendar', 'mail', 'voice', 'library');
create type task_status as enum ('todo', 'done', 'dismissed');
create type task_layer as enum ('anticipate', 'decide', 'execute');

create table households (id uuid primary key default gen_random_uuid(), name text not null, invite_code text unique not null default encode(gen_random_bytes(6), 'hex'), created_at timestamptz not null default now());
create table members (id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, display_name text not null, role member_role not null default 'adult', created_at timestamptz not null default now(), unique (household_id, user_id));
create index members_user_idx on members(user_id);
create table children (id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade, first_name text not null, birth_year int, created_at timestamptz not null default now());
create table connectors (id uuid primary key default gen_random_uuid(), member_id uuid not null references members(id) on delete cascade, type connector_type not null, vault_secret_id uuid, external_account text, last_sync_at timestamptz, created_at timestamptz not null default now(), unique (member_id, type));
create table library_tasks (id uuid primary key default gen_random_uuid(), title text not null, category task_category not null, trigger jsonb not null, default_layers jsonb not null default '{"anticipate":3,"decide":2,"execute":1}', locale text not null default 'fr');
create table tasks (id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade, title text not null, category task_category not null, source task_source not null, source_ref text, library_task_id uuid references library_tasks(id), child_id uuid references children(id) on delete set null, owner_member_id uuid references members(id) on delete set null, due_at timestamptz, status task_status not null default 'todo', context jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index tasks_household_due_idx on tasks(household_id, due_at);
create index tasks_owner_idx on tasks(owner_member_id);
create table task_layers (id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks(id) on delete cascade, layer task_layer not null, member_id uuid not null references members(id) on delete cascade, weight int not null check (weight between 1 and 3), recorded_at timestamptz not null default now());
create index task_layers_task_idx on task_layers(task_id);
create table weekly_reports (id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade, week_start date not null, scores jsonb not null, suggestions jsonb not null default '[]', opened_at timestamptz, created_at timestamptz not null default now(), unique (household_id, week_start));
create table transfers (id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks(id) on delete cascade, from_member_id uuid references members(id) on delete set null, to_member_id uuid not null references members(id) on delete cascade, proposed_at timestamptz not null default now(), accepted_at timestamptz);

create or replace function set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger tasks_updated_at before update on tasks for each row execute function set_updated_at();
create or replace function my_household_ids() returns setof uuid language sql stable security definer set search_path = public as $$ select household_id from members where user_id = auth.uid() $$;
revoke execute on function my_household_ids() from anon, public;

alter table households enable row level security; alter table members enable row level security; alter table children enable row level security; alter table connectors enable row level security; alter table tasks enable row level security; alter table task_layers enable row level security; alter table weekly_reports enable row level security; alter table transfers enable row level security; alter table library_tasks enable row level security;
create policy "households: membres" on households for all using (id in (select my_household_ids())) with check (true);
create policy "members: même foyer" on members for select using (household_id in (select my_household_ids()));
create policy "members: soi-même" on members for insert with check (user_id = auth.uid());
create policy "members: soi-même update" on members for update using (user_id = auth.uid());
create policy "children: foyer" on children for all using (household_id in (select my_household_ids())) with check (household_id in (select my_household_ids()));
create policy "connectors: propriétaire" on connectors for all using (member_id in (select id from members where user_id = auth.uid())) with check (member_id in (select id from members where user_id = auth.uid()));
create policy "tasks: foyer" on tasks for all using (household_id in (select my_household_ids())) with check (household_id in (select my_household_ids()));
create policy "task_layers: foyer" on task_layers for all using (task_id in (select id from tasks where household_id in (select my_household_ids()))) with check (task_id in (select id from tasks where household_id in (select my_household_ids())));
create policy "weekly_reports: foyer" on weekly_reports for select using (household_id in (select my_household_ids()));
create policy "weekly_reports: ouverture" on weekly_reports for update using (household_id in (select my_household_ids()));
create policy "transfers: foyer" on transfers for all using (task_id in (select id from tasks where household_id in (select my_household_ids()))) with check (task_id in (select id from tasks where household_id in (select my_household_ids())));
create policy "library_tasks: lecture" on library_tasks for select using (true);
