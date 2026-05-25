-- 修复留言板权限问题
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "Users can send messages to partner" ON public.messages;

-- 2. 创建新的 INSERT 策略，允许用户向伴侣发送消息
CREATE POLICY "Users can send messages to partner" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND partner_id = messages.receiver_id
    )
  );

-- 3. 确保 authenticated 角色有 INSERT 权限
GRANT INSERT ON public.messages TO authenticated;
GRANT SELECT ON public.messages TO authenticated;
GRANT UPDATE ON public.messages TO authenticated;
