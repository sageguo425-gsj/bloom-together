-- 创建用户自定义标签表
-- 在 Supabase SQL Editor 中运行此脚本

CREATE TABLE IF NOT EXISTS public.user_tags (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON public.user_tags(user_id);

-- 启用 RLS
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own tags" ON public.user_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags" ON public.user_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON public.user_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON public.user_tags
  FOR DELETE USING (auth.uid() = user_id);
