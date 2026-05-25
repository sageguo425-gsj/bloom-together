import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { PartnerHeader } from './components/PartnerHeader'
import { PartnerTasks } from './components/PartnerTasks'
import { PartnerHabits } from './components/PartnerHabits'
import { PartnerProjects } from './components/PartnerProjects'
import { MessageBoard } from './components/MessageBoard'
import { PartnerInvitation } from './components/PartnerInvitation'
import { ConnectionStatus } from './components/ConnectionStatus'
import { DashboardNav } from './components/DashboardNav'

// 禁用页面缓存
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PartnerPage() {
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen relative">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
            filter: 'brightness(0.85) blur(3px)',
          }}
        />
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />
        <DashboardNav currentPage="partner" />
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <PartnerInvitation />
        </main>
      </div>
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
      <div className="min-h-screen relative">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
            filter: 'brightness(0.85) blur(3px)',
          }}
        />
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />
        <DashboardNav currentPage="partner" />
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <PartnerInvitation />
        </main>
      </div>
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
      <div className="min-h-screen relative">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
            filter: 'brightness(0.85) blur(3px)',
          }}
        />
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />
        <DashboardNav currentPage="partner" />
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <PartnerInvitation />
        </main>
      </div>
    )
  }

  // 获取伴侣的所有未完成或进行中的任务
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', partner.id)
    .in('status', ['pending', 'in_progress'])
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50)

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
    <div className="min-h-screen relative">
      {/* 全屏背景图片 */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
          filter: 'brightness(0.9) blur(2px)',
        }}
      />
      {/* 渐变遮罩层 - 绿色治愈系 */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-400/15 to-green-500/20 -z-10" />

      <DashboardNav currentPage="partner" />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-6">
        {/* 伴侣信息卡片 - 磨砂玻璃效果 */}
        <div className="backdrop-blur-xl bg-white/40 rounded-3xl shadow-2xl border border-white/50 p-8">
          <PartnerHeader partner={partner} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：伴侣的规划 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 任务列表 - 磨砂玻璃 */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-3xl shadow-xl border border-white/60 p-6">
              <PartnerTasks tasks={tasks || []} />
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
    </div>
  )
}
