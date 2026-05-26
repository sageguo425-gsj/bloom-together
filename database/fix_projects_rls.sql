-- 修复 projects 表的 RLS 策略

-- 1. 删除所有旧的策略
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;

-- 2. 确保 RLS 已启用
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. 创建新的策略
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'projects';
