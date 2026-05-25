'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Habit, HabitCheckin, HabitStats } from '@/lib/types/habit';
import HabitCard from './components/HabitCard';
import HabitForm from './components/HabitForm';
import HabitCalendar from './components/HabitCalendar';

export default function HabitsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
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
      loadHabits(user.id);
    };

    getUser();
  }, [router, supabase]);

  const loadHabits = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error('加载习惯失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreateHabit = async (formData: any) => {
    if (!user) return;

    try {
      console.log('Creating habit with data:', formData);
      console.log('User ID:', user.id);

      const { data, error } = await supabase
        .from('habits')
        .insert([
          {
            ...formData,
            user_id: user.id,
            current_streak: 0,
            longest_streak: 0,
            total_checkins: 0,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Habit created successfully:', data);
      setHabits([data, ...habits]);
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('创建习惯失败:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`创建习惯失败：${error.message || '请检查数据库是否已正确设置'}`);
    }
  };

  const handleUpdateHabit = async (formData: any) => {
    if (!editingHabit) return;

    try {
      const { data, error } = await supabase
        .from('habits')
        .update(formData)
        .eq('id', editingHabit.id)
        .select()
        .single();

      if (error) throw error;
      setHabits(habits.map((h) => (h.id === editingHabit.id ? data : h)));
      setEditingHabit(null);
    } catch (error) {
      console.error('更新习惯失败:', error);
      alert('更新习惯失败，请重试');
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('确定要删除这个习惯吗？')) return;

    try {
      const { error } = await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('id', habitId);

      if (error) throw error;
      setHabits(habits.filter((h) => h.id !== habitId));
    } catch (error) {
      console.error('删除习惯失败:', error);
      alert('删除习惯失败，请重试');
    }
  };

  const handleCheckin = async (habitId: string, note?: string) => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    try {
      // 检查今天是否已经打卡
      const { data: existingCheckin } = await supabase
        .from('habit_checkins')
        .select('*')
        .eq('habit_id', habitId)
        .eq('checkin_date', today)
        .single();

      if (existingCheckin) {
        alert('今天已经打卡过了！');
        return;
      }

      // 创建打卡记录
      const { error: checkinError } = await supabase
        .from('habit_checkins')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          checkin_date: today,
          checkin_time: now,
          note,
          auto_checkin: false,
        });

      if (checkinError) throw checkinError;

      // 更新习惯统计
      const habit = habits.find((h) => h.id === habitId);
      if (habit) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const isConsecutive = habit.last_checkin_date === yesterdayStr;
        const newStreak = isConsecutive ? habit.current_streak + 1 : 1;

        const { data: updatedHabit, error: updateError } = await supabase
          .from('habits')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, habit.longest_streak),
            total_checkins: habit.total_checkins + 1,
            last_checkin_date: today,
          })
          .eq('id', habitId)
          .select()
          .single();

        if (updateError) throw updateError;
        setHabits(habits.map((h) => (h.id === habitId ? updatedHabit : h)));
      }

      // 显示成功动画
      showCheckinSuccess();
    } catch (error) {
      console.error('打卡失败:', error);
      alert('打卡失败，请重试');
    }
  };

  const showCheckinSuccess = () => {
    // 简单的成功提示，可以后续增强为动画
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-8 shadow-2xl z-50 animate-bounce';
    successDiv.innerHTML = `
      <div class="text-center">
        <div class="text-6xl mb-4">✅</div>
        <p class="text-2xl font-light text-gray-900">打卡成功！</p>
      </div>
    `;
    document.body.appendChild(successDiv);
    setTimeout(() => {
      successDiv.remove();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071)',
            filter: 'brightness(0.85) blur(3px)',
          }}
        />
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

      {/* Header - 毛玻璃效果 */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/60 via-teal-800/50 to-green-900/60"></div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-12">
              <Link href="/dashboard" className="text-2xl font-extralight tracking-tight text-white">
                Bloom <span className="font-light">Together</span>
              </Link>
              <nav className="hidden md:flex space-x-1">
                <Link
                  href="/dashboard"
                  className="text-white/80 hover:text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all text-sm"
                >
                  首页
                </Link>
                <Link
                  href="/dashboard/tasks"
                  className="text-white/80 hover:text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all text-sm"
                >
                  任务
                </Link>
                <Link
                  href="/dashboard/pomodoro"
                  className="text-white/80 hover:text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all text-sm"
                >
                  番茄钟
                </Link>
                <Link
                  href="/dashboard/projects"
                  className="text-white/80 hover:text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all text-sm"
                >
                  项目
                </Link>
                <Link
                  href="/dashboard/habits"
                  className="text-white bg-white/20 px-5 py-2.5 rounded-full font-medium text-sm transition-all"
                >
                  习惯
                </Link>
                <Link
                  href="/dashboard/partner"
                  className="text-white/80 hover:text-white px-5 py-2.5 rounded-full hover:bg-white/10 transition-all text-sm"
                >
                  伴侣空间
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="hidden sm:block text-sm text-white/90 font-light">
                {user?.user_metadata?.username || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all font-light"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extralight text-white mb-2">习惯养成</h1>
            <p className="text-white/80 font-light text-lg">培养良好习惯，坚持每一天</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3.5 bg-white/95 text-emerald-700 rounded-full font-medium hover:bg-white hover:shadow-lg hover:scale-105 transition-all text-sm"
          >
            + 新建习惯
          </button>
        </div>

        {/* 视图切换 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white/95 text-emerald-700'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              📊 卡片视图
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white/95 text-emerald-700'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              📅 日历视图
            </button>
          </div>
        </div>

        {/* 习惯列表 */}
        {habits.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/50 p-16 text-center shadow-xl">
            <div className="w-24 h-24 rounded-3xl bg-emerald-100 shadow-lg flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🎯</span>
            </div>
            <h3 className="text-2xl font-light text-gray-900 mb-3">还没有习惯</h3>
            <p className="text-gray-600 font-light mb-8 max-w-md mx-auto">
              创建你的第一个习惯，开始养成好习惯的旅程
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              创建习惯
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onCheckin={handleCheckin}
                onEdit={setEditingHabit}
                onDelete={handleDeleteHabit}
                onViewCalendar={setSelectedHabit}
              />
            ))}
          </div>
        ) : (
          <HabitCalendar
            habits={habits}
            selectedHabit={selectedHabit}
            onSelectHabit={setSelectedHabit}
          />
        )}
      </main>

      {/* 习惯表单模态框 */}
      {(showCreateModal || editingHabit) && (
        <HabitForm
          habit={editingHabit || undefined}
          onSubmit={editingHabit ? handleUpdateHabit : handleCreateHabit}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingHabit(null);
          }}
        />
      )}
    </div>
  );
}
