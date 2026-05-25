-- 允许伴侣查看彼此的任务、习惯和项目
-- 在 Supabase SQL Editor 中运行此脚本

-- ============================================
-- 任务表 (tasks) - 添加伴侣查看权限
-- ============================================

-- 删除旧的查看策略
DROP POLICY IF EXISTS "用户只能查看自己的任务" ON tasks;

-- 创建新的查看策略：用户可以查看自己和伴侣的任务
CREATE POLICY "用户可以查看自己和伴侣的任务"
  ON tasks FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IN (
      SELECT partner_id FROM users WHERE id = auth.uid() AND partner_id IS NOT NULL
    )
  );

-- ============================================
-- 习惯表 (habits) - 添加伴侣查看权限
-- ============================================

-- 删除旧的查看策略
DROP POLICY IF EXISTS "Users can view their own habits" ON habits;

-- 创建新的查看策略：用户可以查看自己和伴侣的习惯
CREATE POLICY "Users can view their own and partner habits"
  ON habits FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IN (
      SELECT partner_id FROM users WHERE id = auth.uid() AND partner_id IS NOT NULL
    )
  );

-- ============================================
-- 习惯打卡表 (habit_checkins) - 添加伴侣查看权限
-- ============================================

-- 删除旧的查看策略
DROP POLICY IF EXISTS "Users can view their own checkins" ON habit_checkins;

-- 创建新的查看策略：用户可以查看自己和伴侣的打卡记录
CREATE POLICY "Users can view their own and partner checkins"
  ON habit_checkins FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IN (
      SELECT partner_id FROM users WHERE id = auth.uid() AND partner_id IS NOT NULL
    )
  );

-- ============================================
-- 项目表 (projects) - 添加伴侣查看权限
-- ============================================

-- 删除旧的查看策略（如果存在）
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "用户只能查看自己的项目" ON projects;

-- 创建新的查看策略：用户可以查看自己和伴侣的项目
CREATE POLICY "Users can view their own and partner projects"
  ON projects FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IN (
      SELECT partner_id FROM users WHERE id = auth.uid() AND partner_id IS NOT NULL
    )
  );
