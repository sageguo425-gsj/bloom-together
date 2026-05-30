'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Habit, HabitFormData } from '@/lib/types/habit';
import HabitCard from './components/HabitCard';
import HabitForm from './components/HabitForm';
import HabitCalendar from './components/HabitCalendar';
import { addExpForHabitCheckin, removeExpForHabitCheckin } from '@/lib/services/expService';

const MAKEUP_CHECKIN_LIMIT_PER_MONTH = 5;
const MAKEUP_NOTE_PREFIX = '补打卡｜';

type SupabaseErrorLike = {
  message?: string;
};

type HabitCheckinDateRow = {
  checkin_date: string;
};

function getShanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getShanghaiMonthRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    startIso: new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000+08:00`).toISOString(),
    endIso: new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000+08:00`).toISOString(),
  };
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  date.setDate(date.getDate() + days);
  return getShanghaiDate(date);
}

function calculateHabitStats(checkins: HabitCheckinDateRow[], today = getShanghaiDate()) {
  const uniqueDates = Array.from(new Set(checkins.map((checkin) => checkin.checkin_date))).sort();
  const totalCheckins = uniqueDates.length;
  const lastCheckinDate = uniqueDates[uniqueDates.length - 1] || null;

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: string | null = null;

  for (const date of uniqueDates) {
    runningStreak = previousDate && addDays(previousDate, 1) === date ? runningStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  }

  let currentStreak = 0;
  if (lastCheckinDate && (lastCheckinDate === today || lastCheckinDate === addDays(today, -1))) {
    currentStreak = 1;
    for (let index = uniqueDates.length - 2; index >= 0; index -= 1) {
      if (addDays(uniqueDates[index], 1) !== uniqueDates[index + 1]) break;
      currentStreak += 1;
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_checkins: totalCheckins,
    last_checkin_date: lastCheckinDate,
  };
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return (error as SupabaseErrorLike).message || '未知错误';
  }

  return '未知错误';
}

export default function HabitsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  const [monthlyMakeupUsed, setMonthlyMakeupUsed] = useState(0);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const loadHabits = useCallback(async (userId: string) => {
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
  }, [supabase]);

  const loadMonthlyMakeupUsage = useCallback(async (userId: string) => {
    const { startIso, endIso } = getShanghaiMonthRange();

    const { count, error } = await supabase
      .from('habit_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .ilike('note', `${MAKEUP_NOTE_PREFIX}%`)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (error) {
      console.error('加载补打卡次数失败:', error);
      return;
    }

    setMonthlyMakeupUsed(count || 0);
  }, [supabase]);

  const updateHabitState = useCallback((updatedHabit: Habit) => {
    setHabits((currentHabits) => (
      currentHabits.map((habit) => (habit.id === updatedHabit.id ? updatedHabit : habit))
    ));
    setSelectedHabit((currentHabit) => (
      currentHabit?.id === updatedHabit.id ? updatedHabit : currentHabit
    ));
  }, []);

  const recalculateHabitStats = useCallback(async (habitId: string) => {
    const { data: checkins, error: checkinsError } = await supabase
      .from('habit_checkins')
      .select('checkin_date')
      .eq('habit_id', habitId)
      .order('checkin_date', { ascending: true });

    if (checkinsError) throw checkinsError;

    const stats = calculateHabitStats((checkins || []) as HabitCheckinDateRow[]);
    const { data: updatedHabit, error: updateError } = await supabase
      .from('habits')
      .update(stats)
      .eq('id', habitId)
      .select()
      .single();

    if (updateError) throw updateError;

    updateHabitState(updatedHabit as Habit);
    return updatedHabit as Habit;
  }, [supabase, updateHabitState]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await Promise.all([
        loadHabits(user.id),
        loadMonthlyMakeupUsage(user.id),
      ]);
    };

    getUser();
  }, [loadHabits, loadMonthlyMakeupUsage, router, supabase]);

  const handleCreateHabit = async (formData: HabitFormData) => {
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
    } catch (error) {
      console.error('创建习惯失败:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`创建习惯失败：${getErrorMessage(error) || '请检查数据库是否已正确设置'}`);
    }
  };

  const handleUpdateHabit = async (formData: HabitFormData) => {
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

  const handleCheckin = async (
    habitId: string,
    note?: string,
    checkinDate = getShanghaiDate(),
    isMakeup = false
  ) => {
    if (!user) return false;

    const today = getShanghaiDate();
    const now = new Date().toLocaleTimeString('en-GB', {
      hour12: false,
      timeZone: 'Asia/Shanghai',
    });

    try {
      if (isMakeup) {
        if (checkinDate >= today) {
          alert('补打卡只能选择今天之前的日期');
          return false;
        }

        if (monthlyMakeupUsed >= MAKEUP_CHECKIN_LIMIT_PER_MONTH) {
          alert('本月补打卡次数已经用完啦');
          return false;
        }
      }

      const { data: existingCheckin, error: existingError } = await supabase
        .from('habit_checkins')
        .select('id')
        .eq('habit_id', habitId)
        .eq('checkin_date', checkinDate)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingCheckin) {
        alert(isMakeup ? '这一天已经打卡过了！' : '今天已经打卡过了！');
        return false;
      }

      const { error: checkinError } = await supabase
        .from('habit_checkins')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          checkin_date: checkinDate,
          checkin_time: now,
          note: isMakeup ? `${MAKEUP_NOTE_PREFIX}${note?.trim() || '无备注'}` : note,
          auto_checkin: false,
        });

      if (checkinError) throw checkinError;

      const expResult = await addExpForHabitCheckin(user.id);

      if (expResult.success && expResult.leveledUp) {
        alert(`🎉 恭喜升级到 Lv.${expResult.newLevel}！`);
      }

      await recalculateHabitStats(habitId);

      if (isMakeup) {
        await loadMonthlyMakeupUsage(user.id);
      }

      showCheckinSuccess(isMakeup ? '补打卡成功！' : '打卡成功！');
      return true;
    } catch (error) {
      console.error('打卡失败:', error);
      alert('打卡失败，请重试');
      return false;
    }
  };

  const handleCancelCheckin = async (habitId: string, checkinDate: string) => {
    if (!user) return false;

    try {
      const { data: existingCheckin, error: existingError } = await supabase
        .from('habit_checkins')
        .select('id, auto_checkin, note')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .eq('checkin_date', checkinDate)
        .maybeSingle();

      if (existingError) throw existingError;

      if (!existingCheckin) {
        alert('没有找到这一天的打卡记录');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('habit_checkins')
        .delete()
        .eq('id', existingCheckin.id);

      if (deleteError) throw deleteError;

      if (!existingCheckin.auto_checkin) {
        await removeExpForHabitCheckin(user.id);
      }

      await recalculateHabitStats(habitId);
      if (existingCheckin.note?.startsWith(MAKEUP_NOTE_PREFIX)) {
        await loadMonthlyMakeupUsage(user.id);
      }
      showCheckinSuccess('已取消打卡');
      return true;
    } catch (error) {
      console.error('取消打卡失败:', error);
      alert('取消打卡失败，请重试');
      return false;
    }
  };

  const showCheckinSuccess = (message: string) => {
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl p-8 shadow-2xl z-50 animate-bounce';
    successDiv.innerHTML = `
      <div class="text-center">
        <div class="text-6xl mb-4">✅</div>
        <p class="text-2xl font-light text-gray-900">${message}</p>
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
                onCancelCheckin={handleCancelCheckin}
                onEdit={setEditingHabit}
                onDelete={handleDeleteHabit}
                onViewCalendar={setSelectedHabit}
                makeupRemaining={Math.max(MAKEUP_CHECKIN_LIMIT_PER_MONTH - monthlyMakeupUsed, 0)}
                makeupLimit={MAKEUP_CHECKIN_LIMIT_PER_MONTH}
              />
            ))}
          </div>
        ) : (
          <HabitCalendar
            habits={habits}
            selectedHabit={selectedHabit}
            onSelectHabit={setSelectedHabit}
            onCancelCheckin={handleCancelCheckin}
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
