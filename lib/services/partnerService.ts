import { createClient } from '@/lib/supabase/client'

export interface PartnerProfile {
  id: string
  username: string
  email: string
  avatar?: string
  level: number
  exp: number
}

export interface PartnerTask {
  id: number
  project_id?: number | null
  project_title?: string | null
  title: string
  description?: string
  date: string
  status: string
  priority: string
  start_time?: string
  end_time?: string
  likes_count: number
  is_liked_by_me: boolean
}

export interface PartnerHabit {
  id: number
  title: string
  name: string
  description?: string
  icon: string
  color: string
  frequency: unknown
  current_streak: number
  total_checkins: number
  checkins_this_month: number
  created_at: string
  checked_in_today: boolean
}

export interface PartnerProject {
  id: number
  title: string
  description?: string
  start_date: string
  end_date: string
  status: string
  priority: string
  progress: number
  completed_tasks: number
  total_tasks: number
}

export interface Message {
  id: number
  sender_id: string
  receiver_id: string
  content: string
  emoji?: string
  is_read: boolean
  created_at: string
  sender?: {
    username: string
    avatar?: string
  }
}

export interface SharedGoal {
  id: number
  title: string
  description?: string
  goal_type: string
  target_value: number
  current_value: number
  start_date: string
  end_date?: string
  status: string
  user1_progress: number
  user2_progress: number
}

export interface Notification {
  id: number
  type: string
  title: string
  content?: string
  link?: string
  is_read: boolean
  created_at: string
}

// 获取伴侣信息
export async function getPartnerProfile(): Promise<PartnerProfile | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: currentUser } = await supabase
    .from('users')
    .select('partner_id')
    .eq('id', user.id)
    .single()

  if (!currentUser?.partner_id) return null

  const { data: partner } = await supabase
    .from('users')
    .select('id, username, email, avatar, level, exp')
    .eq('id', currentUser.partner_id)
    .single()

  return partner
}

// 获取伴侣所有未完成或进行中的任务
export async function getPartnerTodayTasks(): Promise<PartnerTask[]> {
  const supabase = createClient()
  const partner = await getPartnerProfile()
  if (!partner) return []

  const { data: { user } } = await supabase.auth.getUser()
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      date,
      status,
      priority,
      start_time,
      end_time
    `)
    .eq('user_id', partner.id)
    .eq('date', today)
    .in('status', ['pending', 'in_progress'])
    .eq('is_shared', true)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (!tasks) return []

  // 获取点赞信息
  const taskIds = tasks.map(t => t.id)
  const { data: likes } = await supabase
    .from('likes')
    .select('target_id, user_id')
    .eq('target_type', 'task')
    .in('target_id', taskIds)

  const likesMap = new Map<number, { count: number; isLikedByMe: boolean }>()
  likes?.forEach(like => {
    const current = likesMap.get(like.target_id) || { count: 0, isLikedByMe: false }
    current.count++
    if (like.user_id === user?.id) {
      current.isLikedByMe = true
    }
    likesMap.set(like.target_id, current)
  })

  return tasks.map(task => ({
    ...task,
    likes_count: likesMap.get(task.id)?.count || 0,
    is_liked_by_me: likesMap.get(task.id)?.isLikedByMe || false
  }))
}

// 获取伴侣习惯列表
export async function getPartnerHabits(): Promise<PartnerHabit[]> {
  const supabase = createClient()
  const partner = await getPartnerProfile()
  if (!partner) return []

  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', partner.id)
    .eq('is_shared', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!habits) return []

  // 获取每个习惯的打卡统计
  const habitsWithStats = await Promise.all(
    habits.map(async (habit) => {
      // 获取总打卡次数
      const { count: totalCheckins } = await supabase
        .from('habit_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habit.id)

      // 获取本月打卡次数
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const { count: monthCheckins } = await supabase
        .from('habit_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habit.id)
        .gte('date', startOfMonth.toISOString().split('T')[0])

      // 计算连续打卡天数
      const { data: recentCheckins } = await supabase
        .from('habit_checkins')
        .select('date')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false })
        .limit(100)

      let currentStreak = 0
      let checkedInToday = false
      if (recentCheckins && recentCheckins.length > 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const checkDate = new Date(today)

        // 检查今天是否打卡
        const firstCheckinDate = new Date(recentCheckins[0].date)
        firstCheckinDate.setHours(0, 0, 0, 0)
        checkedInToday = firstCheckinDate.getTime() === today.getTime()

        for (const checkin of recentCheckins) {
          const checkinDate = new Date(checkin.date)
          checkinDate.setHours(0, 0, 0, 0)

          if (checkinDate.getTime() === checkDate.getTime()) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      }

      return {
        id: habit.id,
        title: habit.title,
        name: habit.name,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        current_streak: currentStreak,
        total_checkins: totalCheckins || 0,
        checkins_this_month: monthCheckins || 0,
        created_at: habit.created_at,
        checked_in_today: checkedInToday
      }
    })
  )

  return habitsWithStats
}

// 获取伴侣项目列表
export async function getPartnerProjects(): Promise<PartnerProject[]> {
  const supabase = createClient()
  const partner = await getPartnerProfile()
  if (!partner) return []

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', partner.id)
    .eq('is_shared', true)
    .order('created_at', { ascending: false })

  if (!projects) return []

  // 计算每个项目的进度
  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      // 查询该项目下的所有任务（不限制 is_shared）
      const { count: totalTasks, error: totalError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)

      // 查询该项目下已完成的任务
      const { count: completedTasks, error: completedError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('status', 'completed')

      if (totalError) console.error('查询总任务数错误:', totalError)
      if (completedError) console.error('查询已完成任务数错误:', completedError)

      console.log(`项目 "${project.title}" (ID: ${project.id}): 总任务=${totalTasks}, 已完成=${completedTasks}`)

      const progress = totalTasks ? Math.round((completedTasks || 0) / totalTasks * 100) : 0

      return {
        ...project,
        progress,
        completed_tasks: completedTasks || 0,
        total_tasks: totalTasks || 0
      }
    })
  )

  return projectsWithProgress
}

// 点赞/取消点赞
export async function toggleLike(targetType: 'task' | 'habit_checkin' | 'project', targetId: number): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // 检查是否已点赞
  const { data: existingLike } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .single()

  if (existingLike) {
    // 取消点赞
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existingLike.id)
    return !error
  } else {
    // 添加点赞
    const { error } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        target_type: targetType,
        target_id: targetId
      })
    return !error
  }
}

// 获取留言列表
export async function getMessages(): Promise<Message[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const partner = await getPartnerProfile()
  if (!partner) return []

  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:sender_id (
        username,
        avatar
      )
    `)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: true })
    .limit(100)

  return messages || []
}

// 发送留言
export async function sendMessage(content: string, emoji?: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('发送留言失败: 用户未登录')
    return false
  }

  const partner = await getPartnerProfile()
  if (!partner) {
    console.error('发送留言失败: 未找到伴侣')
    return false
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      receiver_id: partner.id,
      content,
      emoji
    })

  if (error) {
    console.error('发送留言失败:', error.message, error)
    return false
  }

  return true
}

// 标记消息为已读
export async function markMessagesAsRead(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false)

  return !error
}

// 获取共同目标列表
export async function getSharedGoals(): Promise<SharedGoal[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: goals } = await supabase
    .from('shared_goals')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (!goals) return []

  // 获取每个目标的进度
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const { data: progress } = await supabase
        .from('shared_goal_progress')
        .select('user_id, progress_value')
        .eq('goal_id', goal.id)

      const user1Progress = progress
        ?.filter(p => p.user_id === goal.user1_id)
        .reduce((sum, p) => sum + p.progress_value, 0) || 0

      const user2Progress = progress
        ?.filter(p => p.user_id === goal.user2_id)
        .reduce((sum, p) => sum + p.progress_value, 0) || 0

      return {
        ...goal,
        user1_progress: user1Progress,
        user2_progress: user2Progress,
        current_value: user1Progress + user2Progress
      }
    })
  )

  return goalsWithProgress
}

// 创建共同目标
export async function createSharedGoal(
  title: string,
  description: string,
  goalType: 'project' | 'habit' | 'task',
  targetValue: number,
  startDate: string,
  endDate?: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const partner = await getPartnerProfile()
  if (!partner) return false

  const [user1Id, user2Id] = [user.id, partner.id].sort()

  const { error } = await supabase
    .from('shared_goals')
    .insert({
      user1_id: user1Id,
      user2_id: user2Id,
      title,
      description,
      goal_type: goalType,
      target_value: targetValue,
      start_date: startDate,
      end_date: endDate
    })

  return !error
}

// 更新共同目标进度
export async function updateSharedGoalProgress(
  goalId: number,
  progressValue: number,
  note?: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('shared_goal_progress')
    .insert({
      goal_id: goalId,
      user_id: user.id,
      progress_value: progressValue,
      note
    })

  return !error
}

// 获取通知列表
export async function getNotifications(): Promise<Notification[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return notifications || []
}

// 标记通知为已读
export async function markNotificationAsRead(notificationId: number): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  return !error
}

export interface PartnerInvitation {
  id: number
  sender_id: string
  receiver_email: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  created_at: string
  sender?: {
    username: string
    email: string
    avatar?: string
  }
}

// 发送伴侣邀请
export async function sendPartnerInvitation(receiverEmail: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('partner_invitations')
    .insert({
      sender_id: user.id,
      receiver_email: receiverEmail
    })

  if (error) {
    console.error('发送邀请失败:', error.message || error)
  }

  return !error
}

// 获取发送的邀请列表
export async function getSentInvitations(): Promise<PartnerInvitation[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: invitations } = await supabase
    .from('partner_invitations')
    .select('*')
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })

  return invitations || []
}

// 获取收到的邀请列表
export async function getReceivedInvitations(): Promise<PartnerInvitation[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: invitations } = await supabase
    .from('partner_invitations')
    .select(`
      *,
      sender:sender_id (
        username,
        email,
        avatar
      )
    `)
    .eq('receiver_email', user.email)
    .order('created_at', { ascending: false })

  return invitations || []
}

// 拒绝伴侣邀请
export async function rejectPartnerInvitation(invitationId: number): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('partner_invitations')
    .update({ status: 'rejected' })
    .eq('id', invitationId)

  return !error
}

// 取消发送的邀请
export async function cancelPartnerInvitation(invitationId: number): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('partner_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .eq('sender_id', user.id)

  return !error
}

// 接受伴侣邀请
export async function acceptPartnerInvitation(invitationId: number): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // 更新邀请状态为 accepted
  // 数据库触发器会自动更新双方的 partner_id
  const { error } = await supabase
    .from('partner_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)

  if (error) {
    console.error('接受邀请失败:', error.message || error)
    return false
  }

  return true
}

// 解除伴侣关系
export async function removePartner(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const partner = await getPartnerProfile()
  if (!partner) return false

  // 清除双方的 partner_id
  const { error: error1 } = await supabase
    .from('users')
    .update({ partner_id: null })
    .eq('id', user.id)

  const { error: error2 } = await supabase
    .from('users')
    .update({ partner_id: null })
    .eq('id', partner.id)

  return !error1 && !error2
}
