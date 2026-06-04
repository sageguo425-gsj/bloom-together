import { createClient } from '@/lib/supabase/server'
import { PartnerHeader } from './components/PartnerHeader'
import { PartnerTasks } from './components/PartnerTasks'
import { PartnerHabits } from './components/PartnerHabits'
import { PartnerProjects } from './components/PartnerProjects'
import { PartnerPet } from './components/PartnerPet'
import { MessageBoard } from './components/MessageBoard'
import { PartnerInvitation } from './components/PartnerInvitation'
import { ConnectionStatus } from './components/ConnectionStatus'
import { formatFocusMinutes } from '@/lib/utils'

// 禁用页面缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PartnerPage() {
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <PartnerInvitation />
      </main>
    )
  }

  // 获取当前用户的 partner_id
  const { data: currentUser } = await supabase
    .from('users')
    .select('partner_id')
    .eq('id', user.id)
    .single()

  // 如果没有伴侣，显示邀请界面
  if (!currentUser?.partner_id) {
    return (
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <PartnerInvitation />
      </main>
    )
  }

  // 获取伴侣信息
  const { data: partner } = await supabase
    .from('users')
    .select('id, username, email, avatar, level, exp')
    .eq('id', currentUser.partner_id)
    .single()

  if (!partner) {
    return (
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <PartnerInvitation />
      </main>
    )
  }

  const { data: currentUserExpData } = await supabase
    .from('users')
    .select('exp, exp_spent')
    .eq('id', user.id)
    .single()

  const userTotalExp = currentUserExpData?.exp || 0
  const userSpentExp = currentUserExpData?.exp_spent || 0
  const availableExp = Math.max(userTotalExp - userSpentExp, 0)

  const [user1Id, user2Id] = [user.id, partner.id].sort()
  const coupleKey = `${user1Id}:${user2Id}`

  const { data: existingPet } = await supabase
    .from('couple_pets')
    .select('*')
    .eq('couple_key', coupleKey)
    .maybeSingle()

  let couplePet = existingPet

  if (!couplePet) {
    const { data: createdPet } = await supabase
      .from('couple_pets')
      .insert({
        couple_key: coupleKey,
        user1_id: user1Id,
        user2_id: user2Id,
        name: '阿凛',
        species: 'german_shepherd',
        hunger: 0,
      })
      .select('*')
      .single()

    if (createdPet) {
      couplePet = createdPet
    } else {
      const { data: reloadedPet } = await supabase
        .from('couple_pets')
        .select('*')
        .eq('couple_key', coupleKey)
        .maybeSingle()

      couplePet = reloadedPet
    }
  }

  // 获取伴侣当日任务（使用东八区日期，避免部署环境时区影响）
  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const todayStart = new Date(`${today}T00:00:00.000+08:00`)
  const todayEnd = new Date(`${today}T23:59:59.999+08:00`)

  // 获取伴侣当日尚未完成的任务
  const { data: todayIncompleteTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', partner.id)
    .eq('date', today)
    .in('status', ['pending', 'in_progress'])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50)

  // 获取伴侣当日完成的任务
  const { data: completedTodayTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', partner.id)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .gte('completed_at', todayStart.toISOString())
    .lte('completed_at', todayEnd.toISOString())
    .order('completed_at', { ascending: false })
    .limit(50)

  // 获取伴侣今日任务统计
  const { data: todayTasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('user_id', partner.id)
    .eq('date', today)

  const todayTasksCompleted = todayTasks?.filter(t => t.status === 'completed').length || 0
  const todayTasksTotal = todayTasks?.length || 0

  // 获取伴侣今日专注时长
  const { data: pomodoroSessions } = await supabase
    .from('pomodoro_sessions')
    .select('duration')
    .eq('user_id', partner.id)
    .eq('mode', 'work')
    .eq('completed', true)
    .not('ended_at', 'is', null)
    .gte('ended_at', todayStart.toISOString())
    .lte('ended_at', todayEnd.toISOString())

  const todayFocusTime = Math.round((pomodoroSessions?.reduce((sum, s) => sum + s.duration, 0) || 0) / 60)

  // 获取伴侣习惯统计
  const { data: allHabits } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', partner.id)
    .eq('is_active', true)

  const { data: todayCheckins } = await supabase
    .from('habit_checkins')
    .select('habit_id')
    .eq('user_id', partner.id)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  const habitsChecked = todayCheckins?.length || 0
  const habitsTotal = allHabits?.length || 0

  // 获取伴侣活跃项目数
  const { data: activeProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', partner.id)
    .neq('status', 'archived')

  // 获取伴侣的习惯
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', partner.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // 获取伴侣的项目
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', partner.id)
    .order('created_at', { ascending: false })

  const projectTitleById = new Map(
    (projects || []).map((project) => [project.id, project.title])
  )

  const addProjectTitleToTasks = (tasks: typeof todayIncompleteTasks) => (
    (tasks || []).map((task) => ({
      ...task,
      project_title: task.project_id ? projectTitleById.get(task.project_id) || null : null,
    }))
  )

  const todayIncompleteTasksWithProjectTitles = addProjectTitleToTasks(todayIncompleteTasks)
  const completedTodayTasksWithProjectTitles = addProjectTitleToTasks(completedTodayTasks)

  const projectsWithProgress = await Promise.all(
    (projects || []).map(async (project) => {
      const [{ count: linkedTaskCount }, { count: completedTaskCount }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', partner.id)
          .eq('project_id', project.id),
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', partner.id)
          .eq('project_id', project.id)
          .eq('status', 'completed'),
      ])

      const configuredTotalTasks = project.total_tasks || 0
      const actualTotalTasks = linkedTaskCount || 0
      const totalTasks = Math.max(configuredTotalTasks, actualTotalTasks)
      const completedTasks = completedTaskCount || 0
      const progress = totalTasks > 0
        ? Math.min(Math.round((completedTasks / totalTasks) * 100), 100)
        : 0

      return {
        ...project,
        progress,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
      }
    })
  )

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-4 sm:space-y-6">
      {/* 伴侣信息卡片 - 磨砂玻璃效果 */}
      <div className="backdrop-blur-xl bg-white/40 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/50 p-4 sm:p-6 lg:p-8">
        <PartnerHeader partner={partner} />
      </div>

      {/* 四个统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* 今日任务 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-xl sm:rounded-2xl shadow-lg border border-white/60 p-3 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">今日任务</p>
              <p className="text-2xl sm:text-3xl font-light text-gray-900">
                {todayTasksCompleted}
                <span className="text-base sm:text-lg text-gray-400">/{todayTasksTotal}</span>
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <span className="text-xl sm:text-2xl">📋</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${todayTasksTotal > 0 ? (todayTasksCompleted / todayTasksTotal) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* 专注时长 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-xl sm:rounded-2xl shadow-lg border border-white/60 p-3 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">专注时长</p>
              <p className="text-2xl sm:text-3xl font-light text-gray-900">
                {formatFocusMinutes(todayFocusTime)}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
              <span className="text-xl sm:text-2xl">🍅</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">今日专注</p>
        </div>

        {/* 习惯打卡 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-xl sm:rounded-2xl shadow-lg border border-white/60 p-3 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">习惯打卡</p>
              <p className="text-2xl sm:text-3xl font-light text-gray-900">
                {habitsChecked}
                <span className="text-base sm:text-lg text-gray-400">/{habitsTotal}</span>
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
              <span className="text-xl sm:text-2xl">✅</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">连续 0 天</p>
        </div>

        {/* 活跃项目 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-xl sm:rounded-2xl shadow-lg border border-white/60 p-3 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">活跃项目</p>
              <p className="text-2xl sm:text-3xl font-light text-gray-900">{activeProjects?.length || 0}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
              <span className="text-xl sm:text-2xl">🎯</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">进行中</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* 任务列表 - 磨砂玻璃 */}
        <div className="lg:col-span-2 backdrop-blur-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60 p-4 sm:p-6">
          <PartnerTasks allTasks={todayIncompleteTasksWithProjectTitles} completedTodayTasks={completedTodayTasksWithProjectTitles} />
        </div>

        <PartnerPet
          initialPet={couplePet || null}
          initialAvailableExp={availableExp}
          coupleKey={coupleKey}
          currentUserId={user.id}
          partnerId={partner.id}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* 左侧：习惯与项目 */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* 习惯打卡 - 磨砂玻璃 */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-green-50/60 to-emerald-50/60 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60 p-4 sm:p-6">
            <PartnerHabits habits={habits || []} />
          </div>

          {/* 项目进度 - 磨砂玻璃 */}
          <div className="backdrop-blur-xl bg-gradient-to-br from-teal-50/60 to-cyan-50/60 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60 p-4 sm:p-6">
            <PartnerProjects projects={projectsWithProgress} />
          </div>
        </div>

        {/* 右侧：互动功能和连接状态 */}
        <div className="flex h-full flex-col gap-4 sm:gap-6">
          {/* 连接状态 - 磨砂玻璃 */}
          <div className="backdrop-blur-xl bg-white/50 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60">
            <ConnectionStatus />
          </div>

          {/* 留言板 - 磨砂玻璃 */}
          <div className="flex-1 backdrop-blur-xl bg-gradient-to-br from-pink-50/50 to-purple-50/50 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60">
            <MessageBoard />
          </div>
        </div>
        </div>
      </main>
  )
}
