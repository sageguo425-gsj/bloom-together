-- Allow connected partners to view each other's completed focus sessions.
-- This is needed for the partner-space "today focus time" card.

DROP POLICY IF EXISTS "Users can view their own and partner pomodoro sessions"
  ON public.pomodoro_sessions;

CREATE POLICY "Users can view their own and partner pomodoro sessions"
  ON public.pomodoro_sessions FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IN (
      SELECT partner_id
      FROM public.users
      WHERE id = auth.uid()
        AND partner_id IS NOT NULL
    )
  );
