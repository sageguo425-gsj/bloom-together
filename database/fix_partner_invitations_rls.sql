-- 修复伴侣邀请表的 RLS 策略
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can create invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can view own invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can update received invitations" ON public.partner_invitations;

-- 2. 创建新的 RLS 策略

-- 允许用户创建邀请（发送邀请）
CREATE POLICY "Users can create invitations" ON public.partner_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- 允许用户查看自己发送的和收到的邀请
CREATE POLICY "Users can view own invitations" ON public.partner_invitations
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    receiver_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- 允许用户更新收到的邀请（接受/拒绝）
CREATE POLICY "Users can update received invitations" ON public.partner_invitations
  FOR UPDATE
  USING (
    receiver_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- 3. 确保 RLS 已启用
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- 4. 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'partner_invitations';
