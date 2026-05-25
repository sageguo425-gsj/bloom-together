-- 修复 partner_invitations 表的 RLS 策略
-- 这个脚本可以直接在 Supabase SQL Editor 中执行

-- 首先删除可能存在的旧策略
DROP POLICY IF EXISTS "Users can view own invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can update received invitations" ON public.partner_invitations;
DROP POLICY IF EXISTS "Users can cancel own invitations" ON public.partner_invitations;

-- 确保 RLS 已启用
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

-- 重新创建策略：用户可以查看自己发送或接收的邀请
CREATE POLICY "Users can view own invitations" ON public.partner_invitations
  FOR SELECT USING (
    auth.uid() = sender_id OR
    receiver_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- 重新创建策略：用户可以创建邀请（sender_id 必须是当前用户）
CREATE POLICY "Users can create invitations" ON public.partner_invitations
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 重新创建策略：接收者可以更新邀请状态
CREATE POLICY "Users can update received invitations" ON public.partner_invitations
  FOR UPDATE USING (
    receiver_email = (SELECT email FROM public.users WHERE id = auth.uid())
  );

-- 新增策略：发送者可以取消自己发送的邀请
CREATE POLICY "Users can cancel own invitations" ON public.partner_invitations
  FOR UPDATE USING (
    auth.uid() = sender_id AND status = 'pending'
  );

-- 验证策略是否创建成功
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'partner_invitations';
