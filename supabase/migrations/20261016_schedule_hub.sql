-- 首页目标地图与阶段复盘。执行本迁移后再部署依赖这些表的前端。
CREATE TABLE IF NOT EXISTS public.schedule_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_terms_dates_check CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS schedule_terms_user_dates_idx ON public.schedule_terms(user_id, start_date DESC);

CREATE TABLE IF NOT EXISTS public.schedule_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.schedule_terms(id) ON DELETE CASCADE,
  parent_goal_id uuid REFERENCES public.schedule_goals(id) ON DELETE SET NULL,
  period text NOT NULL CHECK (period IN ('semester', 'month', 'week')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  progress_mode text NOT NULL DEFAULT 'tasks' CHECK (progress_mode IN ('tasks', 'habit', 'children')),
  cadence text NOT NULL DEFAULT 'period' CHECK (cadence IN ('period', 'week')),
  target_count integer CHECK (target_count > 0),
  habit_id uuid REFERENCES public.habits(id) ON DELETE SET NULL,
  project_id integer REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_goals_dates_check CHECK (end_date >= start_date),
  CONSTRAINT schedule_goals_target_check CHECK (progress_mode = 'children' OR target_count IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS schedule_goals_user_term_idx ON public.schedule_goals(user_id, term_id, period);
CREATE INDEX IF NOT EXISTS schedule_goals_parent_idx ON public.schedule_goals(parent_goal_id);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS schedule_goal_id uuid REFERENCES public.schedule_goals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_schedule_goal_idx ON public.tasks(schedule_goal_id);

CREATE TABLE IF NOT EXISTS public.schedule_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.schedule_terms(id) ON DELETE SET NULL,
  period text NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'semester')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  wins text NOT NULL DEFAULT '',
  obstacles text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_reviews_dates_check CHECK (period_end >= period_start),
  CONSTRAINT schedule_reviews_unique_period UNIQUE (user_id, period, period_start)
);
CREATE INDEX IF NOT EXISTS schedule_reviews_user_start_idx ON public.schedule_reviews(user_id, period_start DESC);

ALTER TABLE public.schedule_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedule terms" ON public.schedule_terms
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own schedule goals" ON public.schedule_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.schedule_terms t WHERE t.id = term_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Users manage own schedule reviews" ON public.schedule_reviews
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id AND (term_id IS NULL OR EXISTS (
      SELECT 1 FROM public.schedule_terms t WHERE t.id = term_id AND t.user_id = auth.uid()
    ))
  );

-- 阻止任务关联到他人的目标，也阻止目标跨用户/跨学期挂接。
CREATE OR REPLACE FUNCTION public.validate_schedule_links() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE linked_goal record;
BEGIN
  IF TG_TABLE_NAME = 'tasks' THEN
    IF NEW.schedule_goal_id IS NOT NULL THEN
      SELECT user_id, progress_mode, habit_id INTO linked_goal
      FROM public.schedule_goals WHERE id = NEW.schedule_goal_id;
      IF NOT FOUND OR linked_goal.user_id <> NEW.user_id THEN
        RAISE EXCEPTION 'schedule goal does not belong to task owner';
      END IF;
      IF linked_goal.progress_mode = 'habit' AND NEW.habit_id IS DISTINCT FROM linked_goal.habit_id THEN
        RAISE EXCEPTION 'habit goal requires the matching task habit';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'schedule_goals' THEN
    IF NEW.parent_goal_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.schedule_goals g
      WHERE g.id = NEW.parent_goal_id AND g.user_id = NEW.user_id AND g.term_id = NEW.term_id
    ) THEN RAISE EXCEPTION 'parent goal must belong to the same term and user'; END IF;
    IF NEW.habit_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.habits h WHERE h.id = NEW.habit_id AND h.user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'habit does not belong to goal owner'; END IF;
    IF NEW.project_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id AND p.user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'project does not belong to goal owner'; END IF;
    IF NEW.progress_mode = 'habit' AND NEW.habit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.schedule_goal_id = NEW.id
      AND t.habit_id IS DISTINCT FROM NEW.habit_id
    ) THEN RAISE EXCEPTION 'linked tasks use a different habit'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_schedule_goal_links BEFORE INSERT OR UPDATE ON public.schedule_goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_links();
CREATE TRIGGER validate_task_schedule_link BEFORE INSERT OR UPDATE OF schedule_goal_id, habit_id, user_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_links();

-- 任务完成自动打卡。同一习惯同一天只计一次；撤销时保留手动打卡及其他已完成任务产生的打卡。
CREATE OR REPLACE FUNCTION public.refresh_task_habit_checkin(p_user_id uuid, p_habit_id uuid, p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  d date;
  previous_date date;
  last_date date;
  running_count integer := 0;
  longest_count integer := 0;
  total_count integer := 0;
  current_count integer := 0;
BEGIN
  IF p_habit_id IS NULL OR p_date IS NULL THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.user_id = p_user_id AND t.habit_id = p_habit_id AND t.date = p_date AND t.status = 'completed'
  ) THEN
    INSERT INTO public.habit_checkins (habit_id, user_id, checkin_date, checkin_time, auto_checkin)
    VALUES (p_habit_id, p_user_id, p_date, (now() AT TIME ZONE 'Asia/Shanghai')::time, true)
    ON CONFLICT (habit_id, checkin_date) DO NOTHING;
  ELSE
    DELETE FROM public.habit_checkins
    WHERE user_id = p_user_id AND habit_id = p_habit_id AND checkin_date = p_date AND auto_checkin = true;
  END IF;

  FOR d IN SELECT DISTINCT checkin_date FROM public.habit_checkins
    WHERE user_id = p_user_id AND habit_id = p_habit_id ORDER BY checkin_date
  LOOP
    total_count := total_count + 1;
    running_count := CASE WHEN previous_date = d - 1 THEN running_count + 1 ELSE 1 END;
    longest_count := GREATEST(longest_count, running_count);
    previous_date := d;
    last_date := d;
  END LOOP;
  IF last_date >= (now() AT TIME ZONE 'Asia/Shanghai')::date - 1 THEN
    current_count := running_count;
  END IF;
  UPDATE public.habits SET total_checkins = total_count, longest_streak = longest_count,
    current_streak = current_count, last_checkin_date = last_date
  WHERE id = p_habit_id AND user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_task_habit_checkin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.habit_id IS NOT NULL THEN
    PERFORM public.refresh_task_habit_checkin(OLD.user_id, OLD.habit_id, OLD.date);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.habit_id IS NOT NULL THEN
    PERFORM public.refresh_task_habit_checkin(NEW.user_id, NEW.habit_id, NEW.date);
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER sync_task_habit_checkin_after_change
  AFTER INSERT OR UPDATE OF status, date, habit_id OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_habit_checkin();

-- 已完成的旧任务补齐自动打卡，不覆盖用户手动打卡，也不重复增加经验。
DO $$
DECLARE item record;
BEGIN
  FOR item IN
    SELECT DISTINCT user_id, habit_id, date FROM public.tasks
    WHERE status = 'completed' AND habit_id IS NOT NULL
  LOOP
    PERFORM public.refresh_task_habit_checkin(item.user_id, item.habit_id, item.date);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_task_habit_checkin(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_task_habit_checkin() FROM PUBLIC, anon, authenticated;
