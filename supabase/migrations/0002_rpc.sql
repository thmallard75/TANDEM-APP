-- Appliquée le 2026-11-16.
create or replace function join_household(p_invite_code text, p_display_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_household uuid; v_count int;
begin
  select id into v_household from households where invite_code = p_invite_code;
  if v_household is null then return null; end if;
  select count(*) into v_count from members where household_id = v_household;
  if v_count >= 2 then raise exception 'Ce foyer a déjà deux adultes'; end if;
  insert into members (household_id, user_id, display_name) values (v_household, auth.uid(), p_display_name) on conflict (household_id, user_id) do nothing;
  return v_household;
end $$;
revoke execute on function join_household(text, text) from anon, public;

create or replace function accept_transfer(p_task_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare v_me uuid; v_from uuid; v_household uuid;
begin
  select household_id, owner_member_id into v_household, v_from from tasks where id = p_task_id;
  select id into v_me from members where user_id = auth.uid() and household_id = v_household;
  if v_me is null then raise exception 'Pas membre de ce foyer'; end if;
  update tasks set owner_member_id = v_me where id = p_task_id;
  insert into transfers (task_id, from_member_id, to_member_id, accepted_at) values (p_task_id, v_from, v_me, now());
  insert into task_layers (task_id, layer, member_id, weight) values (p_task_id, 'anticipate', v_me, 3);
end $$;
revoke execute on function accept_transfer(uuid) from anon, public;

-- Ajout 2026-11-16 : création du foyer + premier membre en une transaction
create or replace function create_household(p_name text, p_display_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare v_household uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from members where user_id = auth.uid()) then raise exception 'Tu fais déjà partie d''un foyer'; end if;
  insert into households (name) values (p_name) returning id into v_household;
  insert into members (household_id, user_id, display_name) values (v_household, auth.uid(), p_display_name);
  return v_household;
end $$;
revoke execute on function create_household(text, text) from anon, public;
