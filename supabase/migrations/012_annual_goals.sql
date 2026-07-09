-- ============================================================
-- Annual Goals (Jahreszielvereinbarung)
-- ============================================================
-- Ebene ÜBER den trimestralen Focus Goals (011): pro Jahres-
-- Cycle vereinbaren Mitarbeitende und Manager GEMEINSAM 1-3
-- Jahresziele (MbO / Malik: schriftlich, präzise, terminiert,
-- personengebunden, max. 3 = Konzentration).
--
-- Flow: draft (beide editieren) -> agreed (Manager bestätigt im
-- Gespräch; Kernfelder gesperrt) -> Check-ins übers Jahr ->
-- Jahresgespräch: Selbst- + Manager-Einschätzung, Fazit,
-- finaler Status + Abnahme (approved_by).
--
-- Bewusst KEINE Propagation in skill_ratings — das bleibt
-- Aufgabe der Quartals-Focus-Goals (011). Sichtbarkeit nur
-- Owner / Manager / Admin (Gesprächsinhalt, nicht team-public).
-- ============================================================

-- ------------------------------------------------------------
-- 1) development_cycles: Typ trimester | annual
-- ------------------------------------------------------------
alter table public.development_cycles
  add column cycle_type text not null default 'trimester'
    check (cycle_type in ('trimester', 'annual'));

create index idx_development_cycles_type on public.development_cycles(cycle_type);

-- ------------------------------------------------------------
-- 2) annual_goals
-- ------------------------------------------------------------
create table public.annual_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cycle_id uuid not null references public.development_cycles(id) on delete cascade,

  -- Malik: schriftlich, präzise, messbar, terminiert
  title text not null,
  success_criteria text not null,
  due_date date not null,

  -- Optionaler Stärken-Anker (max. eine Referenz, darf fehlen)
  skill_id text,
  team_skill_id uuid references public.team_skills(id) on delete set null,

  -- MbO: gemeinsam vereinbart. draft -> agreed (Manager bestätigt)
  agreement_status text not null default 'draft'
    check (agreement_status in ('draft', 'agreed')),
  agreed_by uuid references public.profiles(id) on delete set null,
  agreed_at timestamptz,

  -- Tracking + Jahresgespräch
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'achieved', 'partially_achieved', 'missed')),
  achievement_text text,          -- Selbst: "Was wurde erreicht?" (gegen success_criteria)
  manager_assessment_text text,   -- Manager-Einschätzung
  conclusion_text text,           -- gemeinsames Fazit
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,

  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (skill_id is not null)::int + (team_skill_id is not null)::int <= 1
  )
);

create index idx_annual_goals_user_cycle on public.annual_goals(user_id, cycle_id);
create index idx_annual_goals_cycle on public.annual_goals(cycle_id);

create trigger annual_goals_updated_at
  before update on public.annual_goals
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 3) goal_checkins (Zwischen-Check-ins übers Jahr)
-- ------------------------------------------------------------
create table public.goal_checkins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.annual_goals(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  confidence text not null default 'on_track'
    check (confidence in ('on_track', 'at_risk')),
  next_step text,  -- Malik: konstruktiv — bei at_risk: "Was tun wir jetzt?"
  created_at timestamptz not null default now()
);

create index idx_goal_checkins_goal on public.goal_checkins(goal_id, created_at);

-- ------------------------------------------------------------
-- 4) Brücke zu den Quartals-Focus-Goals
-- ------------------------------------------------------------
alter table public.development_goals
  add column annual_goal_id uuid references public.annual_goals(id) on delete set null;

create index idx_dev_goals_annual_goal on public.development_goals(annual_goal_id)
  where annual_goal_id is not null;

-- ------------------------------------------------------------
-- 5) Insert-Guard: max. 3 Ziele (Konzentration!) + Cycle-Typ
-- ------------------------------------------------------------
create or replace function public.guard_annual_goal_insert()
returns trigger as $$
begin
  if not exists (
    select 1 from public.development_cycles c
    where c.id = NEW.cycle_id and c.cycle_type = 'annual'
  ) then
    raise exception 'Annual goals require a cycle of type annual'
      using errcode = '22023';
  end if;

  if (
    select count(*) from public.annual_goals g
    where g.user_id = NEW.user_id and g.cycle_id = NEW.cycle_id
  ) >= 3 then
    raise exception 'Maximum of 3 annual goals per cycle'
      using errcode = '22023';
  end if;

  NEW.created_by := coalesce(NEW.created_by, auth.uid());
  return NEW;
end;
$$ language plpgsql security definer;

create trigger annual_goals_guard_insert
  before insert on public.annual_goals
  for each row execute function public.guard_annual_goal_insert();

-- ------------------------------------------------------------
-- 6) Update-Guard: Agreement-Flow, Lock, Abnahme
-- ------------------------------------------------------------
create or replace function public.guard_annual_goal_update()
returns trigger as $$
begin
  -- Vereinbaren (draft -> agreed): nur Manager oder Admin
  if OLD.agreement_status = 'draft' and NEW.agreement_status = 'agreed' then
    if not (public.is_admin() or public.is_manager_of(NEW.user_id)) then
      raise exception 'Only the user''s manager or an admin can agree a goal'
        using errcode = '42501';
    end if;
    NEW.agreed_by := coalesce(NEW.agreed_by, auth.uid());
    NEW.agreed_at := coalesce(NEW.agreed_at, now());
  end if;

  -- Neuverhandlung (agreed -> draft): Vereinbarung + Abnahme zurücksetzen
  if OLD.agreement_status = 'agreed' and NEW.agreement_status = 'draft' then
    NEW.agreed_by := null;
    NEW.agreed_at := null;
    NEW.approved_by := null;
    NEW.approved_at := null;
  end if;

  -- Lock: vereinbarte Kernfelder sind unveränderlich (Malik: Verbindlichkeit)
  if OLD.agreement_status = 'agreed' and NEW.agreement_status = 'agreed' then
    if NEW.title <> OLD.title
       or NEW.success_criteria <> OLD.success_criteria
       or NEW.due_date <> OLD.due_date
       or NEW.skill_id is distinct from OLD.skill_id
       or NEW.team_skill_id is distinct from OLD.team_skill_id then
      raise exception 'Agreed goals are locked — renegotiate first (set back to draft)'
        using errcode = '22023';
    end if;
  end if;

  -- Finale Abnahme im Jahresgespräch: nur Manager oder Admin
  if NEW.approved_by is not null and OLD.approved_by is null then
    if not (public.is_admin() or public.is_manager_of(NEW.user_id)) then
      raise exception 'Only the user''s manager or an admin can approve a goal'
        using errcode = '42501';
    end if;
    if OLD.agreement_status <> 'agreed' then
      raise exception 'Only agreed goals can be approved'
        using errcode = '22023';
    end if;
    NEW.approved_at := coalesce(NEW.approved_at, now());
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger annual_goals_guard_update
  before update on public.annual_goals
  for each row execute function public.guard_annual_goal_update();

-- ------------------------------------------------------------
-- 7) RLS
-- ------------------------------------------------------------
alter table public.annual_goals enable row level security;
alter table public.goal_checkins enable row level security;

-- Sichtbarkeit bewusst NICHT team-public: nur Owner, Manager, Admin.
create policy "Annual goals readable by owner, manager, admin"
  on public.annual_goals for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_manager_of(user_id)
    or public.is_admin()
  );

-- Entwurf anlegen: Mitarbeiter:in selbst ODER deren Manager (MbO: beide),
-- nur solange der Cycle offen ist.
create policy "Owner or manager insert annual goals on open cycle"
  on public.annual_goals for insert
  to authenticated with check (
    (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin())
    and exists (
      select 1 from public.development_cycles c
      where c.id = cycle_id and c.status in ('upcoming', 'active')
    )
  );

-- Owner editiert bei offenem Cycle; Manager + Admin für Agreement /
-- Assessment / Abnahme auch danach. Feld-Locks macht der Update-Guard.
create policy "Owner and managers update annual goals"
  on public.annual_goals for update
  to authenticated using (
    (user_id = auth.uid() and exists (
      select 1 from public.development_cycles c
      where c.id = cycle_id and c.status in ('upcoming', 'active')
    ))
    or public.is_manager_of(user_id)
    or public.is_admin()
  );

-- Löschen nur im Entwurfs-Stadium (vereinbarte Ziele: erst Neuverhandlung).
create policy "Drafts deletable by owner and manager"
  on public.annual_goals for delete
  to authenticated using (
    agreement_status = 'draft'
    and (user_id = auth.uid() or public.is_manager_of(user_id) or public.is_admin())
  );

-- Check-ins: lesbar/schreibbar von allen, die das Goal sehen.
create policy "Checkins readable via goal access"
  on public.goal_checkins for select
  to authenticated using (
    exists (
      select 1 from public.annual_goals g
      where g.id = goal_id
        and (g.user_id = auth.uid() or public.is_manager_of(g.user_id) or public.is_admin())
    )
  );

create policy "Checkins insertable by owner and manager"
  on public.goal_checkins for insert
  to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.annual_goals g
      where g.id = goal_id
        and (g.user_id = auth.uid() or public.is_manager_of(g.user_id) or public.is_admin())
    )
  );

create policy "Authors delete own checkins"
  on public.goal_checkins for delete
  to authenticated using (author_id = auth.uid());
