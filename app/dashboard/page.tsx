'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Task } from '@/lib/types/task';

interface HabitStats {
  totalHabits: number;
  checkedToday: number;
  currentStreak: number;
}

interface ProjectStats {
  activeProjects: number;
}

interface PomodoroStats {
  todayFocusTime: number; // 今日专注时长（分钟）
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStats>({ totalHabits: 0, checkedToday: 0, currentStreak: 0 });
  const [projectStats, setProjectStats] = useState<ProjectStats>({ activeProjects: 0 });
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats>({ todayFocusTime: 0 });
  const [partnerInfo, setPartnerInfo] = useState<{ username: string; avatar?: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // 并行加载所有数据，即使某些失败也不影响其他
      await Promise.allSettled([
        loadTodayTasks(user.id),
        loadHabitStats(user.id),
        loadProjectStats(user.id),
        loadPartnerInfo(user.id),
        loadPomodoroStats(user.id)
      ]);

      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

  const loadTodayTasks = async (userId: string, date?: string) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setTodayTasks(data || []);
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const loadHabitStats = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 获取所有活跃的习惯
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (habitsError) {
        console.error('获取习惯列表失败:', habitsError.message || JSON.stringify(habitsError));
        setHabitStats({ totalHabits: 0, checkedToday: 0, currentStreak: 0 });
        return;
      }

      const totalHabits = habits?.length || 0;

      // 获取今日打卡 - 尝试不同的字段名
      let todayCheckins = null;
      let checkinsError = null;

      // 先尝试使用 created_at 字段（如果 date 字段不存在）
      const result = await supabase
        .from('habit_checkins')
        .select('habit_id, created_at')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      todayCheckins = result.data;
      checkinsError = result.error;

      if (checkinsError) {
        console.error('获取打卡记录失败:', checkinsError.message || JSON.stringify(checkinsError));
        setHabitStats({ totalHabits, checkedToday: 0, currentStreak: 0 });
        return;
      }

      const checkedToday = todayCheckins?.length || 0;

      setHabitStats({ totalHabits, checkedToday, currentStreak: 0 });
    } catch (error: any) {
      console.error('加载习惯统计失败:', error?.message || JSON.stringify(error));
      setHabitStats({ totalHabits: 0, checkedToday: 0, currentStreak: 0 });
    }
  };

  const loadProjectStats = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status')
        .eq('user_id', userId)
        .neq('status', 'archived');

      if (error) {
        console.error('获取项目列表失败:', error);
        setProjectStats({ activeProjects: 0 });
        return;
      }

      // 统计活跃项目（active 和 completed 状态）
      const activeCount = data?.filter(p => p.status === 'active' || p.status === 'completed').length || 0;
      setProjectStats({ activeProjects: activeCount });
    } catch (error) {
      console.error('加载项目统计失败:', error);
      setProjectStats({ activeProjects: 0 });
    }
  };

  const loadPartnerInfo = async (userId: string) => {
    try {
      // 获取当前用户的 partner_id
      const { data: currentUser } = await supabase
        .from('users')
        .select('partner_id')
        .eq('id', userId)
        .single();

      if (!currentUser?.partner_id) {
        setPartnerInfo(null);
        return;
      }

      // 获取伴侣信息
      const { data: partner } = await supabase
        .from('users')
        .select('username, avatar')
        .eq('id', currentUser.partner_id)
        .single();

      setPartnerInfo(partner);
    } catch (error) {
      console.error('加载伴侣信息失败:', error);
      setPartnerInfo(null);
    }
  };

  const loadPomodoroStats = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 获取今日完成的番茄钟会话
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('duration')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('started_at', `${today}T00:00:00`)
        .lte('started_at', `${today}T23:59:59`);

      if (error) {
        console.error('获取番茄钟统计失败:', error);
        setPomodoroStats({ todayFocusTime: 0 });
        return;
      }

      // 计算总专注时长（秒转分钟）
      const totalSeconds = data?.reduce((sum, session) => sum + session.duration, 0) || 0;
      const totalMinutes = Math.round(totalSeconds / 60);

      setPomodoroStats({ todayFocusTime: totalMinutes });
    } catch (error) {
      console.error('加载番茄钟统计失败:', error);
      setPomodoroStats({ todayFocusTime: 0 });
    }
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
    if (user) {
      loadTodayTasks(user.id, newDate);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      if (user) {
        await loadTodayTasks(user.id, selectedDate);
      }
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {/* 全屏背景图片 */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
            filter: 'brightness(0.85) blur(3px)',
          }}
        />
        {/* 渐变遮罩层 */}
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />

        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-light">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* 全屏背景图片 */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
          filter: 'brightness(0.85) blur(3px)',
        }}
      />

      {/* 渐变遮罩层 */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/30 via-teal-800/20 to-green-900/35 -z-10" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Welcome Section - 非对称布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 lg:items-stretch">
          {/* 左侧主卡片 - 占2列 */}
          <div className="lg:col-span-2">
            <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white overflow-hidden shadow-xl h-full">
              {/* 装饰性元素 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl"></div>

              <div className="relative z-10">
                <p className="text-emerald-100/80 text-sm font-light mb-3">欢迎回来</p>
                <h2 className="text-4xl font-extralight mb-2">
                  {user?.user_metadata?.username || '用户'}
                </h2>
                <p className="text-emerald-50/90 text-lg font-light max-w-lg">
                  开始规划你的一天，让每一刻都充满意义
                </p>
              </div>
            </div>
          </div>

          {/* 右侧伴侣卡片 - 占1列 */}
          <div className="lg:col-span-1">
            <Link href="/dashboard/partner" className="block h-full">
              <div className="bg-white rounded-3xl p-8 border border-emerald-200 h-full flex flex-col justify-center shadow-sm hover:shadow-lg transition-all">
                {partnerInfo ? (
                  // 已连接状态
                  <>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-lg font-medium text-gray-900">
                        {user?.user_metadata?.username || '我'}
                      </span>
                      <span className="text-2xl">❤️</span>
                      <span className="text-lg font-medium text-gray-900">
                        {partnerInfo.username}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-light text-center mb-4 italic">
                      For you, a thousand times over
                    </p>
                    <div className="flex justify-center mb-4">
                      <div className="text-6xl">
                        🐕🐕
                      </div>
                    </div>
                    <div className="px-5 py-2.5 bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 rounded-full text-sm font-medium hover:from-pink-200 hover:to-purple-200 transition-all inline-block text-center">
                      进入伴侣空间
                    </div>
                  </>
                ) : (
                  // 未连接状态
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mb-4">
                      <span className="text-3xl">💕</span>
                    </div>
                    <h3 className="text-xl font-light text-gray-900 mb-2">伴侣空间</h3>
                    <p className="text-sm text-gray-500 font-light mb-4">与TA一起成长</p>
                    <div className="px-5 py-2.5 bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 rounded-full text-sm font-medium hover:from-pink-200 hover:to-purple-200 transition-all inline-block text-center">
                      立即体验
                    </div>
                  </>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Stats Grid - 非对称网格 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <Link href="/dashboard/tasks" className="bg-white rounded-2xl border border-emerald-200 p-6 hover:shadow-lg transition-all group block">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">今日任务</p>
                <p className="text-3xl font-extralight text-gray-900">
                  {todayTasks.filter(t => t.status === 'completed').length}
                  <span className="text-lg text-gray-400">/{todayTasks.length}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">📋</span>
              </div>
            </div>
            <div className="h-1 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${todayTasks.length > 0 ? (todayTasks.filter(t => t.status === 'completed').length / todayTasks.length) * 100 : 0}%` }}
              ></div>
            </div>
          </Link>

          <Link href="/dashboard/pomodoro" className="bg-white rounded-2xl border border-teal-200 p-6 hover:shadow-lg transition-all group block">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">专注时长</p>
                <p className="text-3xl font-extralight text-gray-900">
                  {pomodoroStats.todayFocusTime}
                  <span className="text-lg text-gray-400">分钟</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">🍅</span>
              </div>
            </div>
            <p className="text-xs text-teal-600 font-light">今日专注</p>
          </Link>

          <Link href="/dashboard/habits" className="bg-white rounded-2xl border border-green-200 p-6 hover:shadow-lg transition-all group block">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">习惯打卡</p>
                <p className="text-3xl font-extralight text-gray-900">
                  {habitStats.checkedToday}
                  <span className="text-lg text-gray-400">/{habitStats.totalHabits}</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <p className="text-xs text-green-600 font-light">连续 {habitStats.currentStreak} 天</p>
          </Link>

          <Link href="/dashboard/projects" className="bg-white rounded-2xl border border-emerald-200 p-6 hover:shadow-lg transition-all group block">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">活跃项目</p>
                <p className="text-3xl font-extralight text-gray-900">{projectStats.activeProjects}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <p className="text-xs text-emerald-600 font-light">进行中</p>
          </Link>
        </div>

        {/* 任务和时间轴视图 - 非对称布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 今日任务列表 - 占2列 */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-300 p-6 shadow-md">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-light text-gray-900">今日任务</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDateChange('prev')}
                    className="p-2 hover:bg-white/60 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-light text-gray-600 min-w-[120px] text-center">
                    {new Date(selectedDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => handleDateChange('next')}
                    className="p-2 hover:bg-white/60 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 任务列表 */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {todayTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <span className="text-3xl">📝</span>
                    </div>
                    <p className="text-gray-500 text-sm font-light mb-4">今天还没有任务</p>
                    <Link
                      href="/dashboard/tasks"
                      className="inline-block px-5 py-2.5 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-all shadow-sm"
                    >
                      + 添加任务
                    </Link>
                  </div>
                ) : (
                  todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all group cursor-pointer ${
                        task.status === 'completed'
                          ? 'bg-gray-50/80 border-gray-200 opacity-60'
                          : 'bg-white/80 border-emerald-200 hover:shadow-md'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => handleToggleTaskStatus(task.id, task.status)}
                        className="mt-1 w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium mb-1 ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {task.start_time && task.end_time && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}</span>
                            </span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                              {task.tags[0] === 'study' ? '学习' : task.tags[0] === 'work' ? '工作' : task.tags[0] === 'life' ? '生活' : task.tags[0] === 'health' ? '健康' : '其他'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 时间轴视图 - 占3列 */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl border border-teal-300 p-6 shadow-md">
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-light text-gray-900">每日日程</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDateChange('prev')}
                      className="p-2 hover:bg-white/60 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                      {new Date(selectedDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => handleDateChange('next')}
                      className="p-2 hover:bg-white/60 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => handleDateChange('prev')}
                      className="p-2 hover:bg-white/60 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                      {new Date(selectedDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => handleDateChange('next')}
                      className="p-2 hover:bg-white/60 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 时间轴 */}
              <div className="relative max-h-[500px] overflow-y-auto bg-white/60 rounded-2xl p-4">
                {/* 时间刻度 */}
                <div className="space-y-0">
                  {Array.from({ length: 17 }, (_, i) => i + 7).map((hour) => {
                    return (
                      <div key={hour} className="relative">
                        {/* 小时标签 */}
                        <div className="flex items-start gap-4 border-b-2 border-gray-300">
                          <div className="w-16 flex-shrink-0 text-sm font-medium text-gray-700 py-2">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex-1"></div>
                        </div>

                        {/* 6个10分钟时间块 */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 flex-shrink-0"></div>
                          <div className="flex-1 grid grid-cols-6 gap-0">
                            {Array.from({ length: 6 }, (_, blockIndex) => {
                              const blockStartMinute = blockIndex * 10;
                              const blockTime = hour * 60 + blockStartMinute;

                              // 查找覆盖这个时间块的任务
                              const blockTask = todayTasks.find((task) => {
                                if (!task.start_time || !task.end_time) return false;

                                const [startHour, startMin] = task.start_time.split(':').map(Number);
                                const [endHour, endMin] = task.end_time.split(':').map(Number);

                                const taskStartMinute = startHour * 60 + startMin;
                                const taskEndMinute = endHour * 60 + endMin;

                                // 检查这个时间块是否在任务时间范围内
                                return blockTime >= taskStartMinute && blockTime < taskEndMinute;
                              });

                              // 根据任务状态选择颜色
                              let bgColor = 'bg-white hover:bg-teal-50';
                              if (blockTask) {
                                if (blockTask.status === 'completed') {
                                  bgColor = 'bg-teal-400 hover:bg-teal-500';
                                } else if (blockTask.status === 'in_progress') {
                                  bgColor = 'bg-emerald-400 hover:bg-emerald-500';
                                } else {
                                  bgColor = 'bg-slate-300 hover:bg-slate-400';
                                }
                              }

                              return (
                                <div
                                  key={blockIndex}
                                  className={`h-12 border-r border-b border-gray-200 transition-colors cursor-pointer relative group ${bgColor}`}
                                  title={blockTask && blockTask.start_time && blockTask.end_time ? `${blockTask.title} (${blockTask.start_time.slice(0, 5)} - ${blockTask.end_time.slice(0, 5)})` : `${hour}:${blockStartMinute.toString().padStart(2, '0')}`}
                                >
                                  {/* 时间块提示 */}
                                  {!blockTask && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-xs text-gray-500 font-light">
                                        {hour}:{blockStartMinute.toString().padStart(2, '0')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 空状态（无任务时显示） */}
                {todayTasks.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-2xl">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📅</span>
                      </div>
                      <p className="text-gray-400 text-sm font-light mb-4">今天的日程还是空的</p>
                      <Link
                        href="/dashboard/tasks"
                        className="inline-block px-5 py-2.5 bg-teal-100 text-teal-700 rounded-full text-sm font-medium hover:bg-teal-200 transition-all"
                      >
                        + 添加日程
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
