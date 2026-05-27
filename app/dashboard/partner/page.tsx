import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PartnerHeader } from './components/PartnerHeader'
import { PartnerTasks } from './components/PartnerTasks'
import { PartnerHabits } from './components/PartnerHabits'
import { PartnerProjects } from './components/PartnerProjects'
import { MessageBoard } from './components/MessageBoard'
import { PartnerInvitation } from './components/PartnerInvitation'
import { ConnectionStatus } from './components/ConnectionStatus'

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

  // 获取伴侣的所有任务（用于显示所有任务）
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', partner.id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50)

  // 获取伴侣当日完成的任务
  const today = new Date().toISOString().split('T')[0];
  const { data: completedTodayTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', partner.id)
    .eq('status', 'completed')
    .gte('completed_at', `${today}T00:00:00`)
    .lte('completed_at', `${today}T23:59:59`)
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
    .eq('completed', true)
    .gte('started_at', `${today}T00:00:00`)
    .lte('started_at', `${today}T23:59:59`)

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
    .order('created_at', { ascending: false })

  // 获取伴侣的项目
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', partner.id)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-6">
      {/* 伴侣信息卡片 - 磨砂玻璃效果 */}
      <div className="backdrop-blur-xl bg-white/40 rounded-3xl shadow-2xl border border-white/50 p-8">
        <PartnerHeader partner={partner} />
      </div>

      {/* 四个统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 今日任务 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-lg border border-white/60 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">今日任务</p>
              <p className="text-3xl font-light text-gray-900">
                {todayTasksCompleted}
                <span className="text-lg text-gray-400">/{todayTasksTotal}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
              <span className="text-2xl">📋</span>
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
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-lg border border-white/60 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">专注时长</p>
              <p className="text-3xl font-light text-gray-900">
                {todayFocusTime}
                <span className="text-lg text-gray-400">分钟</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
              <span className="text-2xl">🍅</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">今日专注</p>
        </div>

        {/* 习惯打卡 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-lg border border-white/60 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">习惯打卡</p>
              <p className="text-3xl font-light text-gray-900">
                {habitsChecked}
                <span className="text-lg text-gray-400">/{habitsTotal}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">连续 0 天</p>
        </div>

        {/* 活跃项目 */}
        <div className="backdrop-blur-xl bg-white/60 rounded-2xl shadow-lg border border-white/60 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-light mb-1">活跃项目</p>
              <p className="text-3xl font-light text-gray-900">{activeProjects?.length || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">进行中</p>
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：伴侣的规划 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 任务列表 - 磨砂玻璃 */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-3xl shadow-xl border border-white/60 p-6">
              <PartnerTasks allTasks={allTasks || []} completedTodayTasks={completedTodayTasks || []} />
            </div>

            {/* 习惯打卡 - 磨砂玻璃 */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-green-50/60 to-emerald-50/60 rounded-3xl shadow-xl border border-white/60 p-6">
              <PartnerHabits habits={habits || []} />
            </div>

            {/* 项目进度 - 磨砂玻璃 */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-teal-50/60 to-cyan-50/60 rounded-3xl shadow-xl border border-white/60 p-6">
              <PartnerProjects projects={projects || []} />
            </div>
          </div>

          {/* 右侧：互动功能和连接状态 */}
          <div className="space-y-6">
            {/* 连接状态 - 磨砂玻璃 */}
            <div className="backdrop-blur-xl bg-white/50 rounded-3xl shadow-xl border border-white/60">
              <ConnectionStatus />
            </div>

            {/* 留言板 - 磨砂玻璃 */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-pink-50/50 to-purple-50/50 rounded-3xl shadow-xl border border-white/60">
              <MessageBoard />
            </div>
          </div>
        </div>
      </main>
  )
}
