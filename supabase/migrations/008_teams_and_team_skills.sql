-- ============================================================
-- Teams & Team Skill Catalogs
-- ============================================================

-- Helper: check if current user is admin or operations (active)
create or replace function public.is_team_manager()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'operations')
      and is_active = true
  );
$$ language sql security definer stable;

-- ============================================================
-- TEAMS
-- ============================================================
create table public.teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null default '',
  sort_order smallint not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEAM MEMBERS (many-to-many: profiles <-> teams)
-- ============================================================
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- ============================================================
-- TEAM SKILL GROUPS (categories within a team)
-- ============================================================
create table public.team_skill_groups (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEAM SKILLS (individual skills within a group)
-- ============================================================
create table public.team_skills (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.team_skill_groups(id) on delete cascade not null,
  team_id uuid references public.teams(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TEAM SKILL RATINGS (user ratings for team-specific skills)
-- ============================================================
create table public.team_skill_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  team_skill_id uuid references public.team_skills(id) on delete cascade not null,
  current_level smallint not null default 0 check (current_level between 0 and 5),
  target_level smallint not null default 0 check (target_level between 0 and 5),
  updated_at timestamptz not null default now(),
  unique(user_id, team_skill_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_team_members_team on public.team_members(team_id);
create index idx_team_members_user on public.team_members(user_id);
create index idx_team_skill_groups_team on public.team_skill_groups(team_id);
create index idx_team_skills_group on public.team_skills(group_id);
create index idx_team_skills_team on public.team_skills(team_id);
create index idx_team_skill_ratings_user on public.team_skill_ratings(user_id);
create index idx_team_skill_ratings_skill on public.team_skill_ratings(team_skill_id);

-- ============================================================
-- TRIGGERS (reuse existing update_updated_at function)
-- ============================================================
create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.update_updated_at();

create trigger team_skill_groups_updated_at
  before update on public.team_skill_groups
  for each row execute function public.update_updated_at();

create trigger team_skills_updated_at
  before update on public.team_skills
  for each row execute function public.update_updated_at();

create trigger team_skill_ratings_updated_at
  before update on public.team_skill_ratings
  for each row execute function public.update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_skill_groups enable row level security;
alter table public.team_skills enable row level security;
alter table public.team_skill_ratings enable row level security;

-- ---- TEAMS ----
create policy "Teams are viewable by authenticated users"
  on public.teams for select to authenticated using (true);

create policy "Team managers can create teams"
  on public.teams for insert to authenticated
  with check (public.is_team_manager());

create policy "Team managers can update teams"
  on public.teams for update to authenticated
  using (public.is_team_manager());

create policy "Team managers can delete teams"
  on public.teams for delete to authenticated
  using (public.is_team_manager());

-- ---- TEAM MEMBERS ----
create policy "Team members are viewable by authenticated users"
  on public.team_members for select to authenticated using (true);

create policy "Team managers can add team members"
  on public.team_members for insert to authenticated
  with check (public.is_team_manager());

create policy "Team managers can remove team members"
  on public.team_members for delete to authenticated
  using (public.is_team_manager());

-- ---- TEAM SKILL GROUPS ----
create policy "Team skill groups viewable by team members and managers"
  on public.team_skill_groups for select to authenticated
  using (
    public.is_team_manager()
    or exists (
      select 1 from public.team_members
      where team_members.team_id = team_skill_groups.team_id
        and team_members.user_id = auth.uid()
    )
  );

create policy "Team managers can create skill groups"
  on public.team_skill_groups for insert to authenticated
  with check (public.is_team_manager());

create policy "Team managers can update skill groups"
  on public.team_skill_groups for update to authenticated
  using (public.is_team_manager());

create policy "Team managers can delete skill groups"
  on public.team_skill_groups for delete to authenticated
  using (public.is_team_manager());

-- ---- TEAM SKILLS ----
create policy "Team skills viewable by team members and managers"
  on public.team_skills for select to authenticated
  using (
    public.is_team_manager()
    or exists (
      select 1 from public.team_members
      where team_members.team_id = team_skills.team_id
        and team_members.user_id = auth.uid()
    )
  );

create policy "Team managers can create skills"
  on public.team_skills for insert to authenticated
  with check (public.is_team_manager());

create policy "Team managers can update skills"
  on public.team_skills for update to authenticated
  using (public.is_team_manager());

create policy "Team managers can delete skills"
  on public.team_skills for delete to authenticated
  using (public.is_team_manager());

-- ---- TEAM SKILL RATINGS ----
create policy "Team skill ratings viewable by team members and managers"
  on public.team_skill_ratings for select to authenticated
  using (
    public.is_team_manager()
    or exists (
      select 1 from public.team_skills ts
      join public.team_members tm on tm.team_id = ts.team_id
      where ts.id = team_skill_ratings.team_skill_id
        and tm.user_id = auth.uid()
    )
  );

create policy "Users can insert own team skill ratings"
  on public.team_skill_ratings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own team skill ratings"
  on public.team_skill_ratings for update to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own team skill ratings"
  on public.team_skill_ratings for delete to authenticated
  using (auth.uid() = user_id);
