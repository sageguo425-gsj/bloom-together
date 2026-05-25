-- 白噪音混音方案表
CREATE TABLE IF NOT EXISTS white_noise_mixes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sounds JSONB NOT NULL, -- [{ soundId: string, volume: number }]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_white_noise_mixes_user_id ON white_noise_mixes(user_id);
CREATE INDEX IF NOT EXISTS idx_white_noise_mixes_created_at ON white_noise_mixes(created_at);

-- 启用行级安全
ALTER TABLE white_noise_mixes ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "Users can view their own white noise mixes"
  ON white_noise_mixes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own white noise mixes"
  ON white_noise_mixes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own white noise mixes"
  ON white_noise_mixes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own white noise mixes"
  ON white_noise_mixes FOR DELETE
  USING (auth.uid() = user_id);
