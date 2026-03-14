-- 1. Drop old constraint first
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- 2. Rename existing 'member' users to 'designer'
UPDATE public.profiles SET role = 'designer' WHERE role = 'member';

-- 3. Add new constraint with 3 roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'designer', 'operations'));
