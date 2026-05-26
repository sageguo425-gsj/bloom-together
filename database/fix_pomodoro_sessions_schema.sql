-- 修复 pomodoro_sessions 表结构
-- 添加缺失的 started_at 和 ended_at 字段

-- 添加 started_at 字段（如果不存在）
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 添加 ended_at 字段（如果不存在）
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- 为已有记录设置 started_at（使用 created_at 作为默认值）
UPDATE pomodoro_sessions
SET started_at = created_at
WHERE started_at IS NULL;

-- 设置 started_at 为非空
ALTER TABLE pomodoro_sessions
ALTER COLUMN started_at SET NOT NULL;
