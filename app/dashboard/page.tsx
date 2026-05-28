'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Task } from '@/lib/types/task';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, LabelList } from 'recharts';

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
  weeklyData: { date: string; minutes: number }[]; // 本周数据
  monthlyData: { week: string; minutes: number; dateRange: string }[]; // 本月数据（添加日期范围）
}

interface ProjectFocusData {
  projectId: number;
  projectTitle: string;
  focusMinutes: number;
  status: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStats>({ totalHabits: 0, checkedToday: 0, currentStreak: 0 });
  const [projectStats, setProjectStats] = useState<ProjectStats>({ activeProjects: 0 });
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats>({
    todayFocusTime: 0,
    weeklyData: [],
    monthlyData: []
  });
  const [projectFocusData, setProjectFocusData] = useState<ProjectFocusData[]>([]);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
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
        loadPomodoroStats(user.id),
        loadProjectFocusData(user.id)
      ]);

      setLoading(false);
    };

    getUser();

    // 添加页面可见性监听，当页面重新获得焦点时刷新任务
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadTodayTasks(user.id, selectedDate);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router, supabase]);

  // 监听 selectedDate 变化，重新加载任务
  useEffect(() => {
    if (user) {
      loadTodayTasks(user.id, selectedDate);
    }
  }, [selectedDate, user]);

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

      // 加载关联的项目和习惯信息
      const tasksWithRelations = await Promise.all(
        (data || []).map(async (task) => {
          let projectName = null;
          let habitName = null;

          if (task.project_id) {
            const { data: project } = await supabase
              .from('projects')
              .select('title')
              .eq('id', task.project_id)
              .single();
            projectName = project?.title;
          }

          if (task.habit_id) {
            const { data: habit } = await supabase
              .from('habits')
              .select('name')
              .eq('id', task.habit_id)
              .single();
            habitName = habit?.name;
          }

          return {
            ...task,
            projectName,
            habitName,
          };
        })
      );

      setTodayTasks(tasksWithRelations as any);
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
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // 获取今日完成的番茄钟会话
      const { data: todayData, error: todayError } = await supabase
        .from('pomodoro_sessions')
        .select('duration')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('started_at', `${today}T00:00:00`)
        .lte('started_at', `${today}T23:59:59`);

      if (todayError) {
        console.error('获取今日番茄钟统计失败:', todayError);
      }

      // 计算今日总专注时长（秒转分钟）
      const todaySeconds = todayData?.reduce((sum, session) => sum + session.duration, 0) || 0;
      const todayMinutes = Math.round(todaySeconds / 60);

      // 获取本周数据（周一到周日）
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // 周一
      weekStart.setHours(0, 0, 0, 0);

      const weeklyData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const { data: dayData } = await supabase
          .from('pomodoro_sessions')
          .select('duration')
          .eq('user_id', userId)
          .eq('completed', true)
          .gte('started_at', `${dateStr}T00:00:00`)
          .lte('started_at', `${dateStr}T23:59:59`);

        const minutes = Math.round((dayData?.reduce((sum, s) => sum + s.duration, 0) || 0) / 60);
        weeklyData.push({
          date: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
          minutes
        });
      }

      // 获取本月数据（按周统计）
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlyData = [];
      let weekNum = 1;
      let currentWeekStart = new Date(monthStart);

      while (currentWeekStart <= monthEnd) {
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

        const endDate = currentWeekEnd > monthEnd ? monthEnd : currentWeekEnd;

        const { data: weekData } = await supabase
          .from('pomodoro_sessions')
          .select('duration')
          .eq('user_id', userId)
          .eq('completed', true)
          .gte('started_at', currentWeekStart.toISOString())
          .lte('started_at', `${endDate.toISOString().split('T')[0]}T23:59:59`);

        const minutes = Math.round((weekData?.reduce((sum, s) => sum + s.duration, 0) || 0) / 60);

        // 格式化日期范围
        const startMonth = currentWeekStart.getMonth() + 1;
        const startDay = currentWeekStart.getDate();
        const endMonth = endDate.getMonth() + 1;
        const endDay = endDate.getDate();
        const dateRange = `${startMonth}月${startDay}日-${endMonth}月${endDay}日`;

        monthlyData.push({
          week: `第${weekNum}周`,
          minutes,
          dateRange
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        weekNum++;
      }

      setPomodoroStats({
        todayFocusTime: todayMinutes,
        weeklyData,
        monthlyData
      });
    } catch (error) {
      console.error('加载番茄钟统计失败:', error);
      setPomodoroStats({
        todayFocusTime: 0,
        weeklyData: [],
        monthlyData: []
      });
    }
  };

  const loadProjectFocusData = async (userId: string) => {
    try {
      // 获取所有项目
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('user_id', userId)
        .neq('status', 'archived')
        .order('status', { ascending: true }); // active 在前，completed 在后

      if (projectsError) {
        console.error('获取项目列表失败:', projectsError);
        setProjectFocusData([]);
        return;
      }

      if (!projects || projects.length === 0) {
        setProjectFocusData([]);
        return;
      }

      // 为每个项目计算专注时长
      const projectFocusPromises = projects.map(async (project) => {
        // 获取该项目下的所有任务ID
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('user_id', userId)
          .eq('project_id', project.id);

        if (!tasks || tasks.length === 0) {
          return {
            projectId: project.id,
            projectTitle: project.title,
            focusMinutes: 0,
            status: project.status
          };
        }

        const taskIds = tasks.map(t => t.id);

        // 获取这些任务的所有完成的番茄钟会话
        const { data: sessions } = await supabase
          .from('pomodoro_sessions')
          .select('duration')
          .eq('user_id', userId)
          .eq('completed', true)
          .in('task_id', taskIds);

        const totalSeconds = sessions?.reduce((sum, s) => sum + s.duration, 0) || 0;
        const totalMinutes = Math.round(totalSeconds / 60);

        return {
          projectId: project.id,
          projectTitle: project.title,
          focusMinutes: totalMinutes,
          status: project.status
        };
      });

      const projectFocusResults = await Promise.all(projectFocusPromises);

      // 按专注时长降序排序
      projectFocusResults.sort((a, b) => b.focusMinutes - a.focusMinutes);

      setProjectFocusData(projectFocusResults);
    } catch (error) {
      console.error('加载项目专注时长失败:', error);
      setProjectFocusData([]);
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

      // 如果任务被标记为完成，增加经验值
      if (newStatus === 'completed' && user) {
        const { addExpForTaskCompletion } = await import('@/lib/services/expService');
        const result = await addExpForTaskCompletion(user.id);

        if (result.success && result.leveledUp) {
          // 显示升级提示
          alert(`🎉 恭喜升级到 Lv.${result.newLevel}！`);
        }
      }

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* 今日任务列表 - 占2列，高度与每日日程一致 */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-300 p-6 shadow-md flex flex-col" style={{ height: '656px' }}>
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
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

              {/* 任务列表 - 固定高度，可滚动 */}
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-2 scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-50">
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
                      <div className="flex-1 space-y-2">
                        <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </h4>

                        {/* 第一行：时间和预计时长 */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {task.start_time && task.end_time && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{task.start_time.slice(0, 5)} - {task.end_time.slice(0, 5)}</span>
                            </span>
                          )}
                          {task.estimated_duration && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>预计 {Math.floor(task.estimated_duration / 60)}h {task.estimated_duration % 60}m</span>
                            </span>
                          )}
                        </div>

                        {/* 第二行：项目/习惯、优先级、标签 */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {(task as any).projectName && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                              📁 {(task as any).projectName}
                            </span>
                          )}
                          {(task as any).habitName && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                              ✅ {(task as any).habitName}
                            </span>
                          )}
                          {task.priority && (
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              task.priority === 'high'
                                ? 'bg-red-100 text-red-700'
                                : task.priority === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {task.priority === 'high' ? '高优先级' : task.priority === 'medium' ? '中优先级' : '低优先级'}
                            </span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
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
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl border border-teal-300 p-6 shadow-md flex flex-col" style={{ height: '656px' }}>
              {/* 头部 */}
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <h3 className="text-xl font-light text-gray-900">每日日程</h3>
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
              </div>

              {/* 时间轴 */}
              <div className="relative flex-1 overflow-y-auto min-h-0 bg-white/60 rounded-2xl p-4 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-teal-50">
                {/* 时间刻度 */}
                <div className="space-y-0">
                  {Array.from({ length: 17 }, (_, i) => i + 7).map((hour) => {
                    // 为每一行收集任务段
                    const rowTasks: Array<{
                      task: Task;
                      startBlock: number;
                      endBlock: number;
                    }> = [];

                    todayTasks.forEach((task) => {
                      if (!task.start_time || !task.end_time) return;

                      const [startHour, startMin] = task.start_time.split(':').map(Number);
                      const [endHour, endMin] = task.end_time.split(':').map(Number);

                      // 如果任务在这一小时内
                      if (startHour <= hour && endHour >= hour) {
                        let startBlock = 0;
                        let endBlock = 6;

                        if (startHour === hour) {
                          startBlock = Math.floor(startMin / 10);
                        }
                        if (endHour === hour) {
                          endBlock = Math.ceil(endMin / 10);
                        }

                        if (startBlock < endBlock) {
                          rowTasks.push({ task, startBlock, endBlock });
                        }
                      }
                    });

                    return (
                      <div key={hour} className="relative">
                        {/* 小时标签 */}
                        <div className="flex items-start gap-4 border-b border-gray-200">
                          <div className="w-16 flex-shrink-0 text-sm font-medium text-gray-700 py-2">
                            {hour.toString().padStart(2, '0')}:00
                          </div>
                          <div className="flex-1"></div>
                        </div>

                        {/* 时间块行 */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 flex-shrink-0"></div>
                          <div className="flex-1 relative" style={{ height: '48px' }}>
                            {/* 背景网格 */}
                            <div className="absolute inset-0 grid grid-cols-6">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="border-r border-b border-gray-200 hover:bg-teal-50/30 transition-colors"
                                />
                              ))}
                            </div>

                            {/* 任务块 */}
                            {rowTasks.map((item, idx) => {
                              const widthPercent = ((item.endBlock - item.startBlock) / 6) * 100;
                              const leftPercent = (item.startBlock / 6) * 100;

                              // 根据任务状态选择颜色
                              let bgGradient = 'from-emerald-400/90 via-emerald-500/90 to-teal-500/90';
                              let textColor = 'text-white';
                              let shadowColor = 'shadow-emerald-500/30';

                              if (item.task.status === 'completed') {
                                bgGradient = 'from-teal-400/90 via-teal-500/90 to-cyan-500/90';
                                shadowColor = 'shadow-teal-500/30';
                              } else if (item.task.status === 'in_progress') {
                                bgGradient = 'from-green-400/90 via-green-500/90 to-emerald-500/90';
                                shadowColor = 'shadow-green-500/30';
                              } else {
                                bgGradient = 'from-gray-300/90 via-gray-400/90 to-gray-500/90';
                                shadowColor = 'shadow-gray-500/30';
                              }

                              return (
                                <div
                                  key={`${item.task.id}-${idx}`}
                                  className={`absolute top-0 h-full rounded-lg bg-gradient-to-r ${bgGradient} backdrop-blur-sm border border-white/20 shadow-lg ${shadowColor} transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer group`}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                  }}
                                  title={`${item.task.title} (${item.task.start_time?.slice(0, 5)} - ${item.task.end_time?.slice(0, 5)})`}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center px-2">
                                    <span className={`text-sm font-medium ${textColor} truncate drop-shadow-sm`}>
                                      {item.task.title}
                                    </span>
                                  </div>
                                  {/* 磨砂玻璃效果叠加层 */}
                                  <div className="absolute inset-0 bg-white/10 rounded-lg"></div>
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

        {/* 专注时长统计图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 本周专注时长 - 折线图 */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-300 p-6 shadow-md">
            <h3 className="text-xl font-light text-gray-900 mb-6">本周专注时长</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pomodoroStats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                <XAxis
                  dataKey="date"
                  stroke="#10b981"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#10b981"
                  style={{ fontSize: '12px' }}
                  label={{ value: '分钟', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #d1fae5',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`${value} 分钟`, '专注时长']}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                >
                  <LabelList
                    dataKey="minutes"
                    position="top"
                    style={{ fill: '#059669', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 本月专注时长 - 条形图 */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl border border-teal-300 p-6 shadow-md">
            <h3 className="text-xl font-light text-gray-900 mb-6">本月专注时长</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pomodoroStats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccfbf1" />
                <XAxis
                  dataKey="week"
                  stroke="#14b8a6"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#14b8a6"
                  style={{ fontSize: '12px' }}
                  label={{ value: '分钟', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccfbf1',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: any, props: any) => {
                    const dateRange = props.payload.dateRange;
                    return [`${value} 分钟 (${dateRange})`, '专注时长'];
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="#14b8a6"
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="minutes"
                    position="top"
                    style={{ fill: '#0f766e', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 项目专注时长 - 横向条形图 */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-300 p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-light text-gray-900">项目专注时长</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompletedProjects}
                onChange={(e) => setShowCompletedProjects(e.target.checked)}
                className="w-4 h-4 rounded border-green-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-600">显示已完成项目</span>
            </label>
          </div>

          {projectFocusData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-white/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-gray-500 text-sm font-light mb-4">暂无项目数据</p>
              <Link
                href="/dashboard/projects"
                className="inline-block px-5 py-2.5 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 transition-all shadow-sm"
              >
                + 创建项目
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {projectFocusData
                .filter(project => showCompletedProjects || project.status !== 'completed')
                .map((project, index) => {
                  const maxMinutes = Math.max(...projectFocusData.map(p => p.focusMinutes), 1);
                  const widthPercent = (project.focusMinutes / maxMinutes) * 100;
                  const isCompleted = project.status === 'completed';

                  return (
                    <div key={project.projectId} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-medium ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                          {project.projectTitle}
                          {isCompleted && <span className="ml-2 text-xs text-gray-400">(已完成)</span>}
                        </span>
                      </div>
                      <div className="relative h-10 bg-white/60 rounded-xl overflow-hidden">
                        <div
                          className={`h-full rounded-xl transition-all duration-500 ${
                            isCompleted
                              ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                              : 'bg-gradient-to-r from-green-400 to-emerald-500'
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        >
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white font-semibold text-sm">
                            {project.focusMinutes} 分钟
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
