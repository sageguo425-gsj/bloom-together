-- 添加 interrupted_at 字段到 pomodoro_sessions 表
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS interrupted_at TIMESTAMP WITH TIME ZONE;

-- 添加 notes 字段用于记录备注
ALTER TABLE pomodoro_sessions
ADD COLUMN IF NOT EXISTS notes TEXT;
