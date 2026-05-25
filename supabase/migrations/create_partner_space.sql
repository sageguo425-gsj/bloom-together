-- 伴侣空间功能数据库表结构和RLS策略
-- 创建时间: 2026-05-25

-- 首先创建 update_updated_at_column 函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 伴侣邀请表
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 点赞表（支持任务、习惯打卡、项目等）
CREATE TABLE IF NOT EXISTS public.likes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('task', 'habit_checkin', 'project')),
  target_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- 留言板表
CREATE TABLE IF NOT EXISTS public.messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  emoji TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 共同目标表
CREATE TABLE IF NOT EXISTS public.shared_goals (
  id SERIAL PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('project', 'habit', 'task')),
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (user1_id < user2_id)
);

-- 共同目标进度记录表
CREATE TABLE IF NOT EXISTS public.shared_goal_progress (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES public.shared_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  progress_value INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知表
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'message', 'partner_invitation', 'shared_goal')),
  title TEXT NOT NULL,
  content TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_partner_invitations_receiver ON public.partner_invitations(receiver_email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_sender ON public.partner_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON public.likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_goals_users ON public.shared_goals(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- 启用行级安全策略
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略（避免重复）
DROP POLICY IF EXISTS "Users can view own invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can update received invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can view likes on shared content" ON public.likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can view messages with partner" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to partner" ON public.messages;
DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own shared goals" ON public.shared_goals;
DROP POLICY IF EXISTS "Users can create shared goals with partner" ON public.shared_goals;
DROP POLICY IF EXISTS "Users can update own shared goals" ON public.shared_goals;
DROP POLICY IF EXISTS "Users can view shared goal progress" ON public.shared_goal_progress;
DROP POLICY IF EXISTS "Users can add progress to shared goals" ON public.shared_goal_progress;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- 伴侣邀请 RLS 策略
CREATE POLICY "Users can view own invitations" ON public.partner_invitations
  FOR SELECT USING (
    auth.uid() = sender_id OR
    receiver_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create invitations" ON public.partner_invitations
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received invitations" ON public.partner_invitations
  FOR UPDATE USING (
    receiver_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- 点赞 RLS 策略
CREATE POLICY "Users can view likes on shared content" ON public.likes
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.partner_id = likes.user_id
    )
  );

CREATE POLICY "Users can create likes" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- 留言板 RLS 策略
CREATE POLICY "Users can view messages with partner" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages to partner" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    receiver_id = (SELECT partner_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update received messages" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- 共同目标 RLS 策略
CREATE POLICY "Users can view own shared goals" ON public.shared_goals
  FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

CREATE POLICY "Users can create shared goals with partner" ON public.shared_goals
  FOR INSERT WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id) AND
    (user1_id = (SELECT partner_id FROM public.users WHERE id = auth.uid()) OR
     user2_id = (SELECT partner_id FROM public.users WHERE id = auth.uid()))
  );

CREATE POLICY "Users can update own shared goals" ON public.shared_goals
  FOR UPDATE USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- 共同目标进度 RLS 策略
CREATE POLICY "Users can view shared goal progress" ON public.shared_goal_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_goals sg
      WHERE sg.id = goal_id AND (sg.user1_id = auth.uid() OR sg.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can add progress to shared goals" ON public.shared_goal_progress
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.shared_goals sg
      WHERE sg.id = goal_id AND (sg.user1_id = auth.uid() OR sg.user2_id = auth.uid())
    )
  );

-- 通知 RLS 策略
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS update_partner_invitations_updated_at ON public.partner_invitations;
DROP TRIGGER IF EXISTS update_shared_goals_updated_at ON public.shared_goals;
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_message_created ON public.messages;

-- 创建触发器：自动更新 updated_at
CREATE TRIGGER update_partner_invitations_updated_at
  BEFORE UPDATE ON public.partner_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_goals_updated_at
  BEFORE UPDATE ON public.shared_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：发送点赞通知
CREATE OR REPLACE FUNCTION notify_like()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  target_title TEXT;
BEGIN
  IF NEW.target_type = 'task' THEN
    SELECT user_id, title INTO target_user_id, target_title
    FROM public.tasks WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'habit_checkin' THEN
    SELECT hc.user_id, h.title INTO target_user_id, target_title
    FROM public.habit_checkins hc
    JOIN public.habits h ON h.id = hc.habit_id
    WHERE hc.id = NEW.target_id;
  ELSIF NEW.target_type = 'project' THEN
    SELECT user_id, title INTO target_user_id, target_title
    FROM public.projects WHERE id = NEW.target_id;
  END IF;

  IF target_user_id IS NOT NULL AND target_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (
      target_user_id,
      'like',
      '收到新的点赞',
      '你的伴侣给你的 "' || target_title || '" 点赞了'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_like();

-- 创建函数：发送消息通知
CREATE OR REPLACE FUNCTION notify_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, content, link)
  VALUES (
    NEW.receiver_id,
    'message',
    '收到新消息',
    LEFT(NEW.content, 50),
    '/dashboard/partner/messages'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message();
