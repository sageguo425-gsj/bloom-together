# 数据库迁移指南

## 问题说明
任务编辑界面关联习惯无法保存的问题是因为：
- `habits` 表的 `id` 字段类型是 `UUID`
- `tasks` 表的 `habit_id` 字段类型是 `INTEGER`
- 类型不匹配导致保存失败

## 解决方案
需要执行数据库迁移，将 `tasks` 表的 `habit_id` 字段类型从 `INTEGER` 改为 `UUID`。

## 方法一：使用 Supabase CLI（推荐）

### 1. 登录 Supabase
```bash
cd "G:\工作文件\软件\project\planning-app"
supabase login
```

### 2. 链接到项目
```bash
supabase link --project-ref mqpaaughmckiujrfhnlh
```

### 3. 推送迁移
```bash
supabase db push
```

## 方法二：在 Supabase Dashboard 手动执行

### 1. 访问 Supabase Dashboard
打开 https://supabase.com/dashboard/project/mqpaaughmckiujrfhnlh/editor

### 2. 进入 SQL Editor
点击左侧菜单的 "SQL Editor"

### 3. 执行以下 SQL 语句
```sql
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
```

### 4. 点击 "Run" 执行

## 注意事项
⚠️ **重要**：此迁移会清空所有现有任务的 `habit_id` 关联。如果有重要数据，请先备份。

## 验证
迁移完成后，在网站上尝试：
1. 编辑一个任务
2. 选择关联习惯
3. 点击"保存修改"
4. 应该能够成功保存

## 已完成的代码修改
✅ TypeScript 类型定义已更新（`Task.habit_id` 改为 `string`）
✅ TaskForm 组件已更新（移除了错误的类型转换）
✅ 代码已推送到 GitHub 并部署到 Vercel

只需要执行数据库迁移即可完成修复。
