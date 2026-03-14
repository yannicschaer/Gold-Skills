-- Change skill level scale from 0-5 to 0-10
-- Multiply existing values by 2 to preserve relative positioning

-- 1. Drop old constraints
ALTER TABLE public.skill_ratings DROP CONSTRAINT skill_ratings_current_level_check;
ALTER TABLE public.skill_ratings DROP CONSTRAINT skill_ratings_target_level_check;

-- 2. Migrate existing data (multiply by 2)
UPDATE public.skill_ratings SET current_level = current_level * 2;
UPDATE public.skill_ratings SET target_level = target_level * 2;

-- 3. Add new constraints with 0-10 range
ALTER TABLE public.skill_ratings ADD CONSTRAINT skill_ratings_current_level_check
  CHECK (current_level BETWEEN 0 AND 10);
ALTER TABLE public.skill_ratings ADD CONSTRAINT skill_ratings_target_level_check
  CHECK (target_level BETWEEN 0 AND 10);
