'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Task } from '@/lib/types/task';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { addExpForTaskCompletion } from '@/lib/services/expService';
import { formatFocusMinutes } from '@/lib/utils';
import ScheduleHub from './components/ScheduleHub';

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

const formatChartFocusMinutes = (value: unknown) => {
  const minutes = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;

  if (safeMinutes < 60) {
    return `${safeMinutes}分钟`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return `${hours}小时${remainingMinutes}分钟`;
};

const getShanghaiDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

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
  const [scheduleRefresh, setScheduleRefresh] = useState(0);
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

  }, [router, supabase]);

  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      void Promise.all([loadTodayTasks(user.id), loadHabitStats(user.id)]);
      setScheduleRefresh((value) => value + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const loadTodayTasks = async (userId: string, date?: string) => {
    try {
      const targetDate = date || getShanghaiDate();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const taskRows = data || [];
      const projectIds = [...new Set(taskRows.map((task) => task.project_id).filter(Boolean))];
      const habitIds = [...new Set(taskRows.map((task) => task.habit_id).filter(Boolean))];
      const scheduleGoalIds = [...new Set(taskRows.map((task) => task.schedule_goal_id).filter(Boolean))];

      const [projectsResult, habitsResult, goalsResult] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('projects').select('id, title').in('id', projectIds)
          : Promise.resolve({ data: [] }),
        habitIds.length > 0
          ? supabase.from('habits').select('id, name').in('id', habitIds)
          : Promise.resolve({ data: [] }),
        scheduleGoalIds.length > 0
          ? supabase.from('schedule_goals').select('id, title').in('id', scheduleGoalIds)
          : Promise.resolve({ data: [] }),
      ]);

      const projectNameById = new Map(
        (projectsResult.data || []).map((project) => [project.id, project.title])
      );
      const habitNameById = new Map(
        (habitsResult.data || []).map((habit) => [habit.id, habit.name])
      );
      const goalNameById = new Map(
        (goalsResult.data || []).map((goal) => [goal.id, goal.title])
      );

      const tasksWithRelations = taskRows.map((task) => ({
        ...task,
        projectName: task.project_id ? projectNameById.get(task.project_id) || null : null,
        habitName: task.habit_id ? habitNameById.get(task.habit_id) || null : null,
        scheduleGoalName: task.schedule_goal_id ? goalNameById.get(task.schedule_goal_id) || null : null,
      }));

      setTodayTasks(tasksWithRelations as any);
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const loadHabitStats = async (userId: string) => {
    try {
      const today = getShanghaiDate();

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

      // 打卡日由 checkin_date 记录，使用北京时间避免 UTC 日期偏移。
      const { data: todayCheckins, error: checkinsError } = await supabase
        .from('habit_checkins')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('checkin_date', today);

      if (checkinsError) {
        console.error('获取打卡记录失败:', checkinsError.message || JSON.stringify(checkinsError));
        setHabitStats({ totalHabits, checkedToday: 0, currentStreak: 0 });
        return;
      }

      const activeHabitIds = new Set((habits || []).map((habit) => habit.id));
      const checkedToday = new Set(
        (todayCheckins || [])
          .map((checkin) => checkin.habit_id)
          .filter((habitId) => activeHabitIds.has(habitId))
      ).size;

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
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'in_progress');

      if (error) {
        console.error('获取项目列表失败:', error);
        setProjectStats({ activeProjects: 0 });
        return;
      }

      const activeCount = data?.length || 0;
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
      const startOfDay = (date: Date) => {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
      };
      const endOfDay = (date: Date) => {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
      };

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // 周一
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = endOfDay(new Date(weekStart));
      weekEnd.setDate(weekStart.getDate() + 6);

      const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const rangeStart = new Date(Math.min(weekStart.getTime(), monthStart.getTime()));
      const rangeEnd = new Date(Math.max(weekEnd.getTime(), monthEnd.getTime()));

      const { data: sessions, error } = await supabase
        .from('pomodoro_sessions')
        .select('duration, started_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('started_at', rangeStart.toISOString())
        .lte('started_at', rangeEnd.toISOString());

      if (error) {
        console.error('获取番茄钟统计失败:', error);
      }

      const completedSessions = sessions || [];
      const sumMinutesInRange = (start: Date, end: Date) => {
        const totalSeconds = completedSessions.reduce((sum, session) => {
          const startedAt = new Date(session.started_at).getTime();

          if (startedAt >= start.getTime() && startedAt <= end.getTime()) {
            return sum + session.duration;
          }

          return sum;
        }, 0);

        return Math.round(totalSeconds / 60);
      };

      const todayMinutes = sumMinutesInRange(startOfDay(now), endOfDay(now));

      const weeklyData = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const minutes = sumMinutesInRange(startOfDay(date), endOfDay(date));

        weeklyData.push({
          date: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
          minutes
        });
      }

      const monthlyData = [];
      let weekNum = 1;
      const currentWeekStart = new Date(monthStart);

      while (currentWeekStart <= monthEnd) {
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

        const endDate = currentWeekEnd > monthEnd ? monthEnd : currentWeekEnd;
        const minutes = sumMinutesInRange(startOfDay(currentWeekStart), endOfDay(endDate));

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

      const projectIds = projects.map((project) => project.id);
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, project_id')
        .eq('user_id', userId)
        .in('project_id', projectIds);

      const taskRows = tasks || [];
      const taskIds = taskRows.map((task) => task.id);
      const projectIdByTaskId = new Map(taskRows.map((task) => [task.id, task.project_id]));
      const focusSecondsByProjectId = new Map<number, number>();

      if (taskIds.length > 0) {
        const { data: sessions } = await supabase
          .from('pomodoro_sessions')
          .select('duration, task_id')
          .eq('user_id', userId)
          .eq('completed', true)
          .in('task_id', taskIds);

        for (const session of sessions || []) {
          const projectId = projectIdByTaskId.get(session.task_id);
          if (!projectId) continue;

          focusSecondsByProjectId.set(
            projectId,
            (focusSecondsByProjectId.get(projectId) || 0) + session.duration
          );
        }
      }

      const projectFocusResults = projects.map((project) => ({
        projectId: project.id,
        projectTitle: project.title,
        focusMinutes: Math.round((focusSecondsByProjectId.get(project.id) || 0) / 60),
        status: project.status
      }));

      // 按专注时长降序排序
      projectFocusResults.sort((a, b) => b.focusMinutes - a.focusMinutes);

      setProjectFocusData(projectFocusResults);
    } catch (error) {
      console.error('加载项目专注时长失败:', error);
      setProjectFocusData([]);
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
        const result = await addExpForTaskCompletion(user.id);

        if (result.success && result.leveledUp) {
          // 显示升级提示
          alert(`🎉 恭喜升级到 Lv.${result.newLevel}！`);
        }
      }

      if (user) {
        await Promise.all([loadTodayTasks(user.id), loadHabitStats(user.id)]);
        setScheduleRefresh((value) => value + 1);
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
                  {formatFocusMinutes(pomodoroStats.todayFocusTime)}
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

        {user && <ScheduleHub
          userId={user.id}
          todayTasks={todayTasks}
          refreshToken={scheduleRefresh}
          onTaskToggle={handleToggleTaskStatus}
          onTaskChanged={() => {
            void Promise.all([loadTodayTasks(user.id), loadHabitStats(user.id)]);
            setScheduleRefresh((value) => value + 1);
          }}
        />}

        {/* 专注时长统计图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 本周专注时长 - 折线图 */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl border border-emerald-300 p-6 shadow-md">
            <h3 className="text-xl font-light text-gray-900 mb-6">本周专注时长</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pomodoroStats.weeklyData} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
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
                  formatter={(value) => [formatChartFocusMinutes(value), '专注时长']}
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
                    formatter={formatChartFocusMinutes}
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
              <BarChart data={pomodoroStats.monthlyData} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
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
                  formatter={(value, _name, props: any) => {
                    const dateRange = props?.payload?.dateRange;
                    const formattedValue = formatChartFocusMinutes(value);
                    return [dateRange ? `${formattedValue} (${dateRange})` : formattedValue, '专注时长'];
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
                    formatter={formatChartFocusMinutes}
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
                            {formatChartFocusMinutes(project.focusMinutes)}
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
