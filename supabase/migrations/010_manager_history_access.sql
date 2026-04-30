-- ============================================================
-- Manager-Zugriff auf Skill-History
-- ============================================================
-- Erweitert die RLS auf skill_rating_history, sodass Manager und
-- Admins die History ihrer Direct Reports lesen können (für
-- den "Verlauf"-Bereich auf der Member-Seite und im
-- Manager-Dashboard).
-- ============================================================

create policy "Managers can read direct reports' skill history"
  on public.skill_rating_history for select
  to authenticated
  using (public.is_manager_of(user_id) or public.is_admin());
