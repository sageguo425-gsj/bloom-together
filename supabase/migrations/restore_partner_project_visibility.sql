-- 恢复伴侣空间原有的项目可见性：已建立伴侣关系的双方可以查看彼此项目。
-- 项目是否显示已完成状态由前端列表决定，而不是由 RLS 或 is_shared 字段决定。

DROP POLICY IF EXISTS "Users can view own or partner shared projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and partner projects" ON public.projects;

CREATE POLICY "Users can view their own and partner projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT partner_id
      FROM public.users
      WHERE id = auth.uid()
        AND partner_id IS NOT NULL
    )
  );
