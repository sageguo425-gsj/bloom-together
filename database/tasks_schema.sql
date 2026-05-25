-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基础信息
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  tags TEXT[] DEFAULT '{}',

  -- 时间管理
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  estimated_duration INTEGER, -- 分钟

  -- 关联
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  habit_id INTEGER REFERENCES habits(id) ON DELETE SET NULL,

  -- 完成信息
  completed_at TIMESTAMP WITH TIME ZONE,

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);

-- 启用 RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "用户只能查看自己的任务"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的任务"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的任务"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户只能删除自己的任务"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- 自动设置完成时间触发器
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();
