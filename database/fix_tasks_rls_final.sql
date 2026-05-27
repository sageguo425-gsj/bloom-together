-- 修复 tasks 表的 RLS 策略
-- 这个脚本会删除所有旧的策略并创建新的正确策略

-- 1. 删除所有旧的策略
DROP POLICY IF EXISTS "用户只能查看自己的任务" ON public.tasks;
DROP POLICY IF EXISTS "用户只能创建自己的任务" ON public.tasks;
DROP POLICY IF EXISTS "用户只能更新自己的任务" ON public.tasks;
DROP POLICY IF EXISTS "用户只能删除自己的任务" ON public.tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;

-- 2. 确保 RLS 已启用
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. 创建新的策略（使用简单明确的名称）
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'tasks';
