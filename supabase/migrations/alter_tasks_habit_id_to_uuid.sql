-- 修改 tasks 表的 habit_id 字段类型从 INTEGER 改为 UUID
-- 以匹配 habits 表的 id 类型

-- 1. 删除现有的外键约束
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_habit_id_fkey;

-- 2. 由于 INTEGER 无法直接转换为 UUID，我们需要先清空这个字段
-- 如果有重要数据，请先备份
UPDATE tasks SET habit_id = NULL WHERE habit_id IS NOT NULL;

-- 3. 修改 habit_id 字段类型为 UUID
ALTER TABLE tasks ALTER COLUMN habit_id TYPE UUID USING NULL;

-- 4. 重新添加外键约束
ALTER TABLE tasks ADD CONSTRAINT tasks_habit_id_fkey
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL;

-- 5. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_tasks_habit_id ON tasks(habit_id);
