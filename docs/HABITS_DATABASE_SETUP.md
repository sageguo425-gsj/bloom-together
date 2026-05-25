# 习惯养成模块数据库设置

## 应用数据库迁移

### 方法 1: 使用 Supabase CLI（推荐）

如果你已经安装了 Supabase CLI：

```bash
cd planning-app
supabase db push
```

### 方法 2: 在 Supabase Dashboard 中手动执行

1. 登录到 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 SQL Editor
4. 复制 `supabase/migrations/create_habits.sql` 文件的内容
5. 粘贴到 SQL Editor 中
6. 点击 "Run" 执行

## 数据库表结构

### habits 表（习惯）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID（外键） |
| name | TEXT | 习惯名称 |
| description | TEXT | 习惯描述 |
| icon | TEXT | 图标（emoji） |
| color | TEXT | 颜色代码 |
| frequency | JSONB | 频率配置 `{"type": "daily/weekly/monthly", "times": 1}` |
| goal | JSONB | 目标配置 `{"streak_days": 30, "total_count": 100}` |
| current_streak | INTEGER | 当前连续打卡天数 |
| longest_streak | INTEGER | 最长连续打卡天数 |
| total_checkins | INTEGER | 总打卡次数 |
| last_checkin_date | DATE | 最后打卡日期 |
| related_task_ids | TEXT[] | 关联的任务ID数组 |
| is_active | BOOLEAN | 是否激活 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### habit_checkins 表（打卡记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| habit_id | UUID | 习惯ID（外键） |
| user_id | UUID | 用户ID（外键） |
| checkin_date | DATE | 打卡日期 |
| checkin_time | TIME | 打卡时间 |
| note | TEXT | 打卡备注 |
| auto_checkin | BOOLEAN | 是否自动打卡 |
| created_at | TIMESTAMP | 创建时间 |

## 安全策略

两个表都启用了行级安全策略（RLS），确保：
- 用户只能查看、创建、更新和删除自己的数据
- 数据隔离和安全性

## 索引

为了优化查询性能，创建了以下索引：
- `idx_habits_user_id`: 按用户ID查询习惯
- `idx_habits_is_active`: 按激活状态查询
- `idx_habit_checkins_habit_id`: 按习惯ID查询打卡记录
- `idx_habit_checkins_user_id`: 按用户ID查询打卡记录
- `idx_habit_checkins_date`: 按日期查询打卡记录
- `idx_habit_checkins_unique_daily`: 确保每个习惯每天只能打卡一次

## 验证安装

执行以下 SQL 查询来验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('habits', 'habit_checkins');

-- 检查 RLS 是否启用
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('habits', 'habit_checkins');
```

## 示例数据

可以插入一些测试数据：

```sql
-- 插入示例习惯（需要替换 user_id）
INSERT INTO habits (user_id, name, description, icon, color, frequency, goal)
VALUES (
  'your-user-id-here',
  '每天阅读',
  '每天阅读30分钟，培养阅读习惯',
  '📚',
  '#3b82f6',
  '{"type": "daily", "times": 1}'::jsonb,
  '{"streak_days": 30, "total_count": 100}'::jsonb
);
```
