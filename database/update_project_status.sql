-- 更新项目状态字段，从 active/completed/archived 改为 pending/in_progress/completed
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 首先删除旧的 CHECK 约束
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. 更新现有数据：将 active 改为 in_progress，archived 改为 completed
UPDATE public.projects
SET status = CASE
  WHEN status = 'active' THEN 'in_progress'
  WHEN status = 'archived' THEN 'completed'
  ELSE status
END;

-- 3. 添加新的 CHECK 约束
ALTER TABLE public.projects
ADD CONSTRAINT projects_status_check
CHECK (status IN ('pending', 'in_progress', 'completed'));

-- 4. 更新默认值为 pending
ALTER TABLE public.projects
ALTER COLUMN status SET DEFAULT 'pending';
