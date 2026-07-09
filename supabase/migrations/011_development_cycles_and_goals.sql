-- ============================================================
-- Development Cycles & Focus Goals
-- ============================================================
-- Strukturiert die Skill-Entwicklung in trimestralen Cycles
-- (3x/Jahr). Pro Cycle definiert jede:r Mitarbeitende 3-5
-- Fokus-Skills mit Lernplan; Manager bestätigen am Cycle-Ende.
-- Bestätigte Goals propagieren automatisch in
-- skill_ratings.confirmed_level (analog Manual-Bestätigung).
-- ============================================================

-- ------------------------------------------------------------
-- 1) development_cycles
-- ------------------------------------------------------------
create table public.development_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index idx_development_cycles_status on public.development_cycles(status);
create index idx_development_cycles_dates on public.development_cycles(start_date, end_date);

-- ------------------------------------------------------------
-- 2) development_goals
-- ------------------------------------------------------------
create table public.development_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.development_cycles(id) on delete cascade,
  -- Genau eine der beiden Skill-Referenzen ist gesetzt:
  skill_id text,
  team_skill_id uuid references public.team_skills(id) on delete cascade,
  target_level smallint not null
    check (target_level between 0 and 5),
  current_state_text text,
  learning_plan_text text,
  achievement_text text,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'achieved', 'partially_achieved', 'missed')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (skill_id is not null)::int + (team_skill_id is not null)::int = 1
  )
);

-- "Pro User pro Cycle pro Skill nur ein Goal" — partiell, weil
-- Postgres mit NULLs in UNIQUE-Constraints lax umgeht.
create unique index uq_goal_user_cycle_skill
  on public.development_goals(user_id, cycle_id, skill_id)
  where skill_id is not null;
create unique index uq_goal_user_cycle_team_skill
  on public.development_goals(user_id, cycle_id, team_skill_id)
  where team_skill_id is not null;

create index idx_dev_goals_user_cycle on public.development_goals(user_id, cycle_id);
create index idx_dev_goals_cycle on public.development_goals(cycle_id);

-- ------------------------------------------------------------
-- 3) updated_at-Trigger
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$ language plpgsql;

create trigger development_cycles_updated_at
  before update on public.development_cycles
  for each row execute function public.touch_updated_at();

create trigger development_goals_updated_at
  before update on public.development_goals
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 4) Approval propagiert in skill_ratings.confirmed_level
--    Wenn ein Goal mit status='achieved' approved wird, wird
--    das Skill-Rating entsprechend bestätigt. Die bestehende
--    Confirmation-Auth (009) läuft weiter — wir setzen
--    approved_by/approved_at hier serverseitig.
-- ------------------------------------------------------------
create or replace function public.propagate_goal_approval()
returns trigger as $$
declare
  cycle_status text;
begin
  -- Nur ausführen wenn Goal gerade auf "achieved" + approved
  if NEW.status <> 'achieved' or NEW.approved_by is null then
    return NEW;
  end if;

  -- Idempotent: schon gesetzt + unverändert? Skip.
  if (TG_OP = 'UPDATE'
      and OLD.status = NEW.status
      and OLD.approved_by is not distinct from NEW.approved_by
      and OLD.target_level = NEW.target_level) then
    return NEW;
  end if;

  -- Goal-Approval: nur Manager oder Admin
  if not (public.is_admin() or public.is_manager_of(NEW.user_id)) then
    raise exception 'Only the user''s manager or an admin can approve a goal'
      using errcode = '42501';
  end if;

  -- Cycle muss aktiv oder closed sein (kein Approval auf upcoming)
  select status into cycle_status from public.development_cycles where id = NEW.cycle_id;
  if cycle_status = 'upcoming' then
    raise exception 'Cannot approve goals while cycle is still upcoming'
      using errcode = '22023';
  end if;

  -- Ins Confirmed-Level propagieren
  if NEW.skill_id is not null then
    insert into public.skill_ratings (user_id, skill_id, current_level, target_level,
                                      confirmation_status, confirmed_level, confirmed_by, confirmed_at)
    values (NEW.user_id, NEW.skill_id, NEW.target_level, NEW.target_level,
            'confirmed', NEW.target_level, NEW.approved_by, coalesce(NEW.approved_at, now()))
    on conflict (user_id, skill_id) do update set
      confirmation_status = 'confirmed',
      confirmed_level = NEW.target_level,
      confirmed_by = NEW.approved_by,
      confirmed_at = coalesce(NEW.approved_at, now());
  elsif NEW.team_skill_id is not null then
    insert into public.team_skill_ratings (user_id, team_skill_id, current_level, target_level,
                                           confirmation_status, confirmed_level, confirmed_by, confirmed_at)
    values (NEW.user_id, NEW.team_skill_id, NEW.target_level, NEW.target_level,
            'confirmed', NEW.target_level, NEW.approved_by, coalesce(NEW.approved_at, now()))
    on conflict (user_id, team_skill_id) do update set
      confirmation_status = 'confirmed',
      confirmed_level = NEW.target_level,
      confirmed_by = NEW.approved_by,
      confirmed_at = coalesce(NEW.approved_at, now());
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger development_goals_propagate_approval
  after insert or update on public.development_goals
  for each row execute function public.propagate_goal_approval();

-- ------------------------------------------------------------
-- 5) RLS
-- ------------------------------------------------------------
alter table public.development_cycles enable row level security;
alter table public.development_goals enable row level security;

-- Cycles: alle Authenticated lesen; nur Admin schreibt.
create policy "Cycles readable by all authenticated"
  on public.development_cycles for select
  to authenticated using (true);

create policy "Admins manage cycles"
  on public.development_cycles for insert
  to authenticated with check (public.is_admin());

create policy "Admins update cycles"
  on public.development_cycles for update
  to authenticated using (public.is_admin());

create policy "Admins delete cycles"
  on public.development_cycles for delete
  to authenticated using (public.is_admin());

-- Goals: User sieht eigene, Manager sieht Direct-Reports', Admin sieht alle.
create policy "Goals readable by owner, manager, admin"
  on public.development_goals for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_manager_of(user_id)
    or public.is_admin()
  );

-- User legt eigene Goals an, aber nur wenn Cycle nicht geschlossen ist.
create policy "Users insert own goals on open cycle"
  on public.development_goals for insert
  to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.development_cycles c
      where c.id = cycle_id and c.status in ('upcoming', 'active')
    )
  );

-- User editiert eigene Goals; Manager + Admin dürfen für Approval auch updaten.
create policy "Users + managers update goals"
  on public.development_goals for update
  to authenticated using (
    (user_id = auth.uid() and exists (
      select 1 from public.development_cycles c
      where c.id = cycle_id and c.status in ('upcoming', 'active')
    ))
    or public.is_manager_of(user_id)
    or public.is_admin()
  );

create policy "Users delete own goals on open cycle"
  on public.development_goals for delete
  to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.development_cycles c
      where c.id = cycle_id and c.status in ('upcoming', 'active')
    )
  );
