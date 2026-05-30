'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, RotateCcw, Trash2, X, Pencil } from 'lucide-react';
import type { Habit, Milestone } from '@/lib/types/habit';
import { createClient } from '@/lib/supabase/client';

interface HabitCardProps {
  habit: Habit;
  onCheckin: (habitId: string, note?: string, checkinDate?: string, isMakeup?: boolean) => Promise<boolean>;
  onCancelCheckin: (habitId: string, checkinDate: string) => Promise<boolean>;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onViewCalendar: (habit: Habit) => void;
  makeupRemaining: number;
  makeupLimit: number;
}

function getShanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  date.setDate(date.getDate() + days);
  return getShanghaiDate(date);
}

export default function HabitCard({
  habit,
  onCheckin,
  onCancelCheckin,
  onEdit,
  onDelete,
  onViewCalendar,
  makeupRemaining,
  makeupLimit,
}: HabitCardProps) {
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [canCheckinToday, setCanCheckinToday] = useState(true);
  const [todayCheckinId, setTodayCheckinId] = useState<string | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [checkinNote, setCheckinNote] = useState('');
  const [makeupNote, setMakeupNote] = useState('');
  const [makeupDate, setMakeupDate] = useState(addDays(getShanghaiDate(), -1));
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const loadWeeklyProgress = useCallback(async () => {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // 本周日

      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        return date.toISOString().split('T')[0];
      });

      const { data, error } = await supabase
        .from('habit_checkins')
        .select('checkin_date')
        .eq('habit_id', habit.id)
        .in('checkin_date', dates);

      if (error) throw error;

      const checkedDates = new Set(data?.map(c => c.checkin_date) || []);
      const progress = dates.map(date => checkedDates.has(date));
      setWeeklyProgress(progress);
    } catch (error) {
      console.error('加载本周进度失败:', error);
    }
  }, [habit.id, supabase]);

  const checkTodayCheckin = useCallback(async () => {
    try {
      const today = getShanghaiDate();
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('checkin_date', today)
        .maybeSingle();

      if (error) throw error;
      setTodayCheckinId(data?.id || null);
      setCanCheckinToday(!data);
    } catch (error) {
      console.error('检查今日打卡失败:', error);
      setTodayCheckinId(null);
      setCanCheckinToday(true);
    }
  }, [habit.id, supabase]);

  const refreshCardState = useCallback(async () => {
    await Promise.all([
      loadWeeklyProgress(),
      checkTodayCheckin(),
    ]);
  }, [checkTodayCheckin, loadWeeklyProgress]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshCardState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [habit.id, habit.last_checkin_date, habit.total_checkins, refreshCardState]);

  const handleCheckin = () => {
    if (!canCheckinToday) {
      alert('今天已经打卡过了，可以用取消打卡撤回');
      return;
    }
    setShowCheckinModal(true);
  };

  const confirmCheckin = async () => {
    setSubmitting(true);
    const success = await onCheckin(habit.id, checkinNote);
    if (success) {
      setShowCheckinModal(false);
      setCheckinNote('');
      await refreshCardState();
    }
    setSubmitting(false);
  };

  const handleCancelToday = async () => {
    if (!todayCheckinId) {
      alert('今天还没有打卡记录');
      return;
    }

    if (!confirm('确定要取消今天的打卡吗？会扣回本次打卡获得的经验。')) return;

    setSubmitting(true);
    const success = await onCancelCheckin(habit.id, getShanghaiDate());
    if (success) {
      await refreshCardState();
    }
    setSubmitting(false);
  };

  const openMakeupModal = () => {
    if (makeupRemaining <= 0) {
      alert('本月补打卡次数已经用完啦');
      return;
    }

    setMakeupDate(addDays(getShanghaiDate(), -1));
    setMakeupNote('');
    setShowMakeupModal(true);
  };

  const confirmMakeupCheckin = async () => {
    const today = getShanghaiDate();
    if (!makeupDate || makeupDate >= today) {
      alert('补打卡只能选择今天之前的日期');
      return;
    }

    setSubmitting(true);
    const success = await onCheckin(habit.id, makeupNote, makeupDate, true);
    if (success) {
      setShowMakeupModal(false);
      setMakeupNote('');
      await refreshCardState();
    }
    setSubmitting(false);
  };

  const getMilestones = (): Milestone[] => {
    return [
      { days: 7, title: '坚持一周', icon: '🌱', achieved: habit.current_streak >= 7 },
      { days: 30, title: '坚持一月', icon: '🌿', achieved: habit.current_streak >= 30 },
      { days: 100, title: '百日坚持', icon: '🌳', achieved: habit.current_streak >= 100 },
      { days: 365, title: '坚持一年', icon: '🏆', achieved: habit.current_streak >= 365 },
    ];
  };

  const getFrequencyText = () => {
    const { type, times } = habit.frequency;
    if (type === 'daily') return `每天 ${times} 次`;
    if (type === 'weekly') return `每周 ${times} 次`;
    if (type === 'monthly') return `每月 ${times} 次`;
    return '';
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <>
      <div
        className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all duration-300"
        style={{ borderTopColor: habit.color, borderTopWidth: '4px' }}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md"
              style={{ backgroundColor: `${habit.color}20` }}
            >
              {habit.icon}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{habit.name}</h3>
              <p className="text-sm text-gray-500 font-light">{getFrequencyText()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(habit)}
              title="编辑习惯"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              title="删除习惯"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 描述 */}
        {habit.description && (
          <p className="text-sm text-gray-600 mb-4 font-light">{habit.description}</p>
        )}

        {/* 连续打卡天数 */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-xs text-gray-500 font-light">连续打卡</p>
                <p className="text-2xl font-light text-gray-900">
                  {habit.current_streak} <span className="text-sm text-gray-500">天</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-light">最长记录</p>
              <p className="text-lg font-light text-gray-700">{habit.longest_streak} 天</p>
            </div>
          </div>
        </div>

        {/* 本周打卡情况 */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-light mb-2">本周打卡</p>
          <div className="grid grid-cols-7 gap-2">
            {weeklyProgress.map((checked, index) => (
              <div key={index} className="text-center">
                <p className="text-xs text-gray-400 mb-1">{weekDays[index]}</p>
                <div
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    checked
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  {checked ? '✓' : '○'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 成就徽章 */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 font-light mb-2">成就里程碑</p>
          <div className="flex items-center gap-2">
            {getMilestones().map((milestone) => (
              <div
                key={milestone.days}
                className={`flex-1 text-center p-2 rounded-xl transition-all ${
                  milestone.achieved
                    ? 'bg-gradient-to-br from-yellow-100 to-amber-100 border border-yellow-300'
                    : 'bg-gray-50 border border-gray-200 opacity-50'
                }`}
                title={milestone.title}
              >
                <div className="text-2xl mb-1">{milestone.icon}</div>
                <p className="text-xs text-gray-600 font-light">{milestone.days}天</p>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <div className="flex gap-3">
            {canCheckinToday ? (
              <button
                onClick={handleCheckin}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-wait transition-all"
              >
                <Check className="w-4 h-4" />
                今日打卡
              </button>
            ) : (
              <button
                onClick={handleCancelToday}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium text-sm hover:bg-rose-100 disabled:opacity-60 disabled:cursor-wait transition-all"
              >
                <X className="w-4 h-4" />
                取消打卡
              </button>
            )}
            <button
              onClick={() => onViewCalendar(habit)}
              title="查看日历"
              className="px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-50 transition-all"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openMakeupModal}
            disabled={submitting || makeupRemaining <= 0}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-white border border-emerald-100 text-emerald-700 font-medium text-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            补打卡 剩余 {makeupRemaining}/{makeupLimit}
          </button>
        </div>
      </div>

      {/* 打卡确认模态框 */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-emerald-100/50">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">{habit.icon}</span>
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-2">确认打卡</h3>
              <p className="text-gray-600 font-light">{habit.name}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                添加备注（可选）
              </label>
              <textarea
                value={checkinNote}
                onChange={(e) => setCheckinNote(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
                placeholder="记录今天的感受..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckinModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmCheckin}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-wait transition-all"
              >
                {submitting ? '保存中...' : '确认打卡'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 补打卡模态框 */}
      {showMakeupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full p-8 shadow-2xl border border-emerald-100/50">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-9 h-9 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-light text-gray-900 mb-2">补打卡</h3>
              <p className="text-gray-600 font-light">
                {habit.name} · 本月剩余 {makeupRemaining}/{makeupLimit} 次
              </p>
            </div>

            <div className="space-y-5 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择日期
                </label>
                <input
                  type="date"
                  value={makeupDate}
                  max={addDays(getShanghaiDate(), -1)}
                  onChange={(event) => setMakeupDate(event.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  添加备注（可选）
                </label>
                <textarea
                  value={makeupNote}
                  onChange={(event) => setMakeupNote(event.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
                  placeholder="补记一下当时的完成情况..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMakeupModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={confirmMakeupCheckin}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-wait transition-all"
              >
                {submitting ? '保存中...' : '确认补打卡'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
