-- RLS policies restrict rows, but authenticated also needs table-level privileges.
-- Keep anon without access to these user-owned schedule tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.schedule_terms,
  public.schedule_goals,
  public.schedule_reviews
TO authenticated;
