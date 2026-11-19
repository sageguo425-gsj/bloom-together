ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.clear_completed_project_pin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.is_pinned := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_completed_project_pin ON public.projects;
CREATE TRIGGER clear_completed_project_pin
  BEFORE INSERT OR UPDATE OF status, is_pinned ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_completed_project_pin();
