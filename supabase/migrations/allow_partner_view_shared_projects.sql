-- 伴侣空间：允许查看伴侣已共享的项目，不因项目状态（包括 completed）而排除。
-- 清理此项目历史版本中可能存在的项目 SELECT 策略，再建立统一的读取规则。

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own and partner projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view partner shared projects" ON public.projects;

CREATE POLICY "Users can view own or partner shared projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      is_shared = TRUE
      AND user_id IN (
        SELECT partner_id
        FROM public.users
        WHERE id = auth.uid()
          AND partner_id IS NOT NULL
      )
    )
  );
