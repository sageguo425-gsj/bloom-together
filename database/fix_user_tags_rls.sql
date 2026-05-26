-- 修复 user_tags 表的 RLS 权限问题
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 删除现有的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own tags" ON public.user_tags;
DROP POLICY IF EXISTS "Users can create own tags" ON public.user_tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.user_tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.user_tags;

-- 2. 授予 authenticated 角色必要的权限
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tags TO authenticated;

-- 3. 重新创建 RLS 策略
CREATE POLICY "Users can view own tags" ON public.user_tags
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags" ON public.user_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.user_tags
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.user_tags
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. 确保 RLS 已启用
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
