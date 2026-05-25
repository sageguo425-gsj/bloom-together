-- 双人规划空间数据库表结构
-- 在 Supabase SQL Editor 中运行此脚本

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表（扩展 Supabase auth.users）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar TEXT,
  partner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 项目表
CREATE TABLE IF NOT EXISTS public.projects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 项目日记表
CREATE TABLE IF NOT EXISTS public.project_journals (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务表
CREATE TABLE IF NOT EXISTS public.tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES public.projects(id) ON DELETE SET NULL,
  habit_id INTEGER REFERENCES public.habits(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  estimated_duration INTEGER, -- 分钟
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  tags TEXT[],
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 番茄钟记录表
CREATE TABLE IF NOT EXISTS public.pomodoros (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER NOT NULL, -- 秒
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 习惯表
CREATE TABLE IF NOT EXISTS public.habits (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✅',
  color TEXT DEFAULT '#7cb342',
  frequency_type TEXT DEFAULT 'daily' CHECK (frequency_type IN ('daily', 'weekly', 'monthly')),
  frequency_value INTEGER, -- 每周几天或每月几次
  target_days INTEGER DEFAULT 30,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 习惯打卡记录表
CREATE TABLE IF NOT EXISTS public.habit_checkins (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- 白噪音方案表
CREATE TABLE IF NOT EXISTS public.white_noise_presets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 白噪音方案详情表
CREATE TABLE IF NOT EXISTS public.white_noise_preset_sounds (
  id SERIAL PRIMARY KEY,
  preset_id INTEGER NOT NULL REFERENCES public.white_noise_presets(id) ON DELETE CASCADE,
  sound_id TEXT NOT NULL,
  volume INTEGER NOT NULL CHECK (volume >= 0 AND volume <= 100)
);

-- 每日统计表（缓存）
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  focus_duration INTEGER DEFAULT 0, -- 秒
  tasks_completed INTEGER DEFAULT 0,
  habits_checked INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_pomodoros_user_id ON public.pomodoros(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoros_task_id ON public.pomodoros(task_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit_id ON public.habit_checkins(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_checkins_date ON public.habit_checkins(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON public.daily_stats(user_id, date);

-- 启用行级安全策略 (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_noise_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_noise_preset_sounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- 用户表 RLS 策略
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view partner profile" ON public.users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT partner_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 项目表 RLS 策略
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner shared projects" ON public.projects
  FOR SELECT USING (
    is_shared = TRUE AND user_id IN (
      SELECT partner_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 任务表 RLS 策略
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner shared tasks" ON public.tasks
  FOR SELECT USING (
    is_shared = TRUE AND user_id IN (
      SELECT partner_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 番茄钟表 RLS 策略
CREATE POLICY "Users can manage own pomodoros" ON public.pomodoros
  FOR ALL USING (auth.uid() = user_id);

-- 习惯表 RLS 策略
CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON public.habits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner shared habits" ON public.habits
  FOR SELECT USING (
    is_shared = TRUE AND user_id IN (
      SELECT partner_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 习惯打卡表 RLS 策略
CREATE POLICY "Users can manage own habit checkins" ON public.habit_checkins
  FOR ALL USING (auth.uid() = user_id);

-- 白噪音方案表 RLS 策略
CREATE POLICY "Users can manage own white noise presets" ON public.white_noise_presets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preset sounds" ON public.white_noise_preset_sounds
  FOR ALL USING (
    preset_id IN (
      SELECT id FROM public.white_noise_presets WHERE user_id = auth.uid()
    )
  );

-- 每日统计表 RLS 策略
CREATE POLICY "Users can view own stats" ON public.daily_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.daily_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.daily_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：注册新用户时自动创建 users 记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：auth.users 新增时自动创建 public.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
