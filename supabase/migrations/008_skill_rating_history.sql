-- History table: one row per (user, skill, calendar day)
-- The trigger upserts so the last value set on a given day wins.
CREATE TABLE public.skill_rating_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id      text        NOT NULL,
  current_level smallint    NOT NULL CHECK (current_level BETWEEN 0 AND 5),
  target_level  smallint    NOT NULL CHECK (target_level BETWEEN 0 AND 5),
  recorded_date date        NOT NULL DEFAULT CURRENT_DATE,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id, recorded_date)
);

-- Indexes for the two main query patterns
CREATE INDEX idx_skill_rating_history_user_date
  ON public.skill_rating_history (user_id, recorded_date DESC);

CREATE INDEX idx_skill_rating_history_user_skill
  ON public.skill_rating_history (user_id, skill_id, recorded_date DESC);

-- RLS
ALTER TABLE public.skill_rating_history ENABLE ROW LEVEL SECURITY;

-- Users can read only their own history (timeline is personal)
CREATE POLICY "Users can read own skill rating history"
  ON public.skill_rating_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for clients — only the trigger writes here

-- Trigger function: fires after insert OR update on skill_ratings
CREATE OR REPLACE FUNCTION public.record_skill_rating_history()
RETURNS trigger AS $$
BEGIN
  -- On UPDATE: skip if neither level actually changed
  IF (TG_OP = 'UPDATE') THEN
    IF (
      NEW.current_level IS NOT DISTINCT FROM OLD.current_level AND
      NEW.target_level  IS NOT DISTINCT FROM OLD.target_level
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.skill_rating_history
    (user_id, skill_id, current_level, target_level, recorded_date, recorded_at)
  VALUES
    (NEW.user_id, NEW.skill_id, NEW.current_level, NEW.target_level, CURRENT_DATE, now())
  ON CONFLICT (user_id, skill_id, recorded_date)
  DO UPDATE SET
    current_level = EXCLUDED.current_level,
    target_level  = EXCLUDED.target_level,
    recorded_at   = EXCLUDED.recorded_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER skill_ratings_history
  AFTER INSERT OR UPDATE ON public.skill_ratings
  FOR EACH ROW EXECUTE FUNCTION public.record_skill_rating_history();
