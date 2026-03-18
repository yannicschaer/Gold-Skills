-- Revert skill level scale from 0-10 back to 0-5
-- Halve existing values (round for odd numbers)

-- 1. Drop 0-10 constraints
ALTER TABLE public.skill_ratings DROP CONSTRAINT skill_ratings_current_level_check;
ALTER TABLE public.skill_ratings DROP CONSTRAINT skill_ratings_target_level_check;

-- 2. Halve existing data (ROUND handles odd values like 3,5,7,9)
UPDATE public.skill_ratings SET current_level = ROUND(current_level / 2.0);
UPDATE public.skill_ratings SET target_level = ROUND(target_level / 2.0);

-- 3. Re-add 0-5 constraints
ALTER TABLE public.skill_ratings ADD CONSTRAINT skill_ratings_current_level_check
  CHECK (current_level BETWEEN 0 AND 5);
ALTER TABLE public.skill_ratings ADD CONSTRAINT skill_ratings_target_level_check
  CHECK (target_level BETWEEN 0 AND 5);
