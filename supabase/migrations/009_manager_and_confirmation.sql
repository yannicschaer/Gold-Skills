-- ============================================================
-- Manager-Mitarbeiter-Beziehung & Confirmed Skill Levels
-- ============================================================
-- Trennt Selbst-Einschätzung (current_level) von der durch den
-- direkten Vorgesetzten bestätigten Bewertung (confirmed_level).
-- Foundation für Development Cycles & Goals (Feature 2).
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles.manager_id
-- ------------------------------------------------------------
alter table public.profiles
  add column manager_id uuid references public.profiles(id) on delete set null;

-- Direkte Selbst-Referenz verhindern (A → A). Mehrstufige Zyklen
-- werden in der Admin-UI validiert (DB-seitig zu teuer).
alter table public.profiles
  add constraint profiles_manager_not_self check (manager_id is null or manager_id <> id);

create index idx_profiles_manager on public.profiles(manager_id);

-- ------------------------------------------------------------
-- 2) Confirmation-Felder auf skill_ratings + team_skill_ratings
-- ------------------------------------------------------------
alter table public.skill_ratings
  add column confirmation_status text not null default 'self_assessed'
    check (confirmation_status in ('self_assessed', 'confirmed')),
  add column confirmed_level smallint
    check (confirmed_level is null or confirmed_level between 0 and 5),
  add column confirmed_by uuid references public.profiles(id) on delete set null,
  add column confirmed_at timestamptz;

alter table public.team_skill_ratings
  add column confirmation_status text not null default 'self_assessed'
    check (confirmation_status in ('self_assessed', 'confirmed')),
  add column confirmed_level smallint
    check (confirmed_level is null or confirmed_level between 0 and 5),
  add column confirmed_by uuid references public.profiles(id) on delete set null,
  add column confirmed_at timestamptz;

-- ------------------------------------------------------------
-- 3) Helper: ist der Aufrufer Admin? Ist er Manager der gegebenen Person?
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

create or replace function public.is_manager_of(target_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = target_user_id and manager_id = auth.uid()
  );
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- 4) Trigger: nur Admin oder Manager der Person darf
--    confirmation_status / confirmed_level / confirmed_by / confirmed_at
--    setzen oder ändern. confirmed_by/confirmed_at werden bei
--    confirmation_status='confirmed' automatisch gesetzt.
-- ------------------------------------------------------------
create or replace function public.enforce_skill_rating_confirmation_auth()
returns trigger as $$
declare
  confirmation_changed boolean;
begin
  -- Auf INSERT prüfen, ob Confirmation bereits gesetzt ist
  if (TG_OP = 'INSERT') then
    confirmation_changed :=
      NEW.confirmation_status is distinct from 'self_assessed'
      or NEW.confirmed_level is not null
      or NEW.confirmed_by is not null
      or NEW.confirmed_at is not null;
  else
    confirmation_changed :=
      NEW.confirmation_status is distinct from OLD.confirmation_status
      or NEW.confirmed_level is distinct from OLD.confirmed_level
      or NEW.confirmed_by is distinct from OLD.confirmed_by
      or NEW.confirmed_at is distinct from OLD.confirmed_at;
  end if;

  if not confirmation_changed then
    return NEW;
  end if;

  if not (public.is_admin() or public.is_manager_of(NEW.user_id)) then
    raise exception 'Only the user''s manager or an admin can change confirmation fields'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  -- Auto-fill confirmed_by / confirmed_at wenn auf 'confirmed' gewechselt
  if NEW.confirmation_status = 'confirmed' then
    NEW.confirmed_by := coalesce(NEW.confirmed_by, auth.uid());
    NEW.confirmed_at := coalesce(NEW.confirmed_at, now());
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger skill_ratings_confirmation_auth
  before insert or update on public.skill_ratings
  for each row execute function public.enforce_skill_rating_confirmation_auth();

create trigger team_skill_ratings_confirmation_auth
  before insert or update on public.team_skill_ratings
  for each row execute function public.enforce_skill_rating_confirmation_auth();

-- ------------------------------------------------------------
-- 5) RLS: Manager und Admin dürfen die Ratings ihrer Direct Reports
--    aktualisieren (auch wenn sie nicht Owner sind). Bestehende
--    Owner-Policies bleiben unverändert.
-- ------------------------------------------------------------
create policy "Managers can update direct reports' skill ratings"
  on public.skill_ratings for update to authenticated
  using (public.is_manager_of(user_id) or public.is_admin());

create policy "Managers can update direct reports' team skill ratings"
  on public.team_skill_ratings for update to authenticated
  using (public.is_manager_of(user_id) or public.is_admin());
