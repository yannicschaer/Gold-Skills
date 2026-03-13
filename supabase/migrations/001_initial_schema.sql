-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Skill ratings (user's self-assessment)
create table public.skill_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  skill_id text not null, -- references Sanity skill document _id
  current_level smallint not null default 0 check (current_level between 0 and 5),
  target_level smallint not null default 0 check (target_level between 0 and 5),
  updated_at timestamptz not null default now(),
  unique(user_id, skill_id)
);

-- Indexes
create index idx_skill_ratings_user on public.skill_ratings(user_id);
create index idx_skill_ratings_skill on public.skill_ratings(skill_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.skill_ratings enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Skill ratings: users can read all ratings (for team view), manage their own
create policy "Skill ratings are viewable by authenticated users"
  on public.skill_ratings for select
  to authenticated
  using (true);

create policy "Users can insert own skill ratings"
  on public.skill_ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own skill ratings"
  on public.skill_ratings for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own skill ratings"
  on public.skill_ratings for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger skill_ratings_updated_at
  before update on public.skill_ratings
  for each row execute function public.update_updated_at();
