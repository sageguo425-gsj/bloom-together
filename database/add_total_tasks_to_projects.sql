-- 为 projects 表添加 total_tasks 字段
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0;

-- 添加注释
COMMENT ON COLUMN projects.total_tasks IS '项目总任务量';
