'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import type { Habit, Milestone } from '@/lib/types/habit';
import { createClient } from '@/lib/supabase/client';

interface HabitCardProps {
  habit: Habit;
  onCheckin: (habitId: string, note?: string, checkinDate?: string, isMakeup?: boolean) => Promise<boolean>;
  onCancelCheckin: (habitId: string, checkinDate: string) => Promise<boolean>;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  makeupRemaining: number;
  makeupLimit: number;
}

type HabitCheckinSummary = {
  id: string;
  checkin_date: string;
};

type MonthDay = {
  date: string;
  dayNumber: number;
};

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

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

function getShanghaiDayOfWeek(dateStr: string) {
  return new Date(`${dateStr}T12:00:00+08:00`).getUTCDay();
}

function getMonthStart(dateStr: string) {
  return `${dateStr.slice(0, 7)}-01`;
}

function addMonths(monthStart: string, offset: number) {
  const [year, month] = monthStart.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}-01`;
}

function getMonthCalendar(monthDate: string) {
  const [year, month] = monthDate.split('-').map(Number);
  const monthText = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${monthText}-01`;
  const endDate = `${year}-${monthText}-${String(daysInMonth).padStart(2, '0')}`;
  const leadingBlanks = (getShanghaiDayOfWeek(startDate) + 6) % 7;
  const days = Array.from<unknown, MonthDay>({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    return {
      date: `${year}-${monthText}-${String(dayNumber).padStart(2, '0')}`,
      dayNumber,
    };
  });
  const trailingBlanks = (7 - ((leadingBlanks + days.length) % 7)) % 7;

  return {
    days,
    endDate,
    label: `${year}年${month}月`,
    leadingBlanks,
    startDate,
    trailingBlanks,
  };
}

function formatDisplayDate(dateStr: string) {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${month}月${day}日`;
}

export default function HabitCard({
  habit,
  onCheckin,
  onCancelCheckin,
  onEdit,
  onDelete,
  makeupRemaining,
  makeupLimit,
}: HabitCardProps) {
  const today = getShanghaiDate();
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(getShanghaiDate()));
  const monthCalendar = useMemo(() => getMonthCalendar(visibleMonth), [visibleMonth]);
  const [monthCheckins, setMonthCheckins] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(today);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showMakeupModal, setShowMakeupModal] = useState(false);
  const [checkinNote, setCheckinNote] = useState('');
  const [makeupNote, setMakeupNote] = useState('');
  const [makeupDate, setMakeupDate] = useState(addDays(today, -1));
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const selectedHasCheckin = Boolean(monthCheckins[selectedDate]);
  const selectedIsToday = selectedDate === today;
  const selectedIsPast = selectedDate < today;
  const isViewingCurrentMonth = today >= monthCalendar.startDate && today <= monthCalendar.endDate;

  const loadMonthCheckins = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('id, checkin_date')
        .eq('habit_id', habit.id)
        .gte('checkin_date', monthCalendar.startDate)
        .lte('checkin_date', monthCalendar.endDate);

      if (error) throw error;

      const checkins: Record<string, string> = {};
      (data as HabitCheckinSummary[] | null)?.forEach((checkin) => {
        checkins[checkin.checkin_date] = checkin.id;
      });
      setMonthCheckins(checkins);
    } catch (error) {
      console.error('加载本月打卡失败:', error);
    }
  }, [habit.id, monthCalendar.endDate, monthCalendar.startDate, supabase]);

  const refreshCardState = useCallback(async () => {
    await loadMonthCheckins();
  }, [loadMonthCheckins]);

  const selectDefaultDateForMonth = useCallback((monthStart: string) => {
    const calendar = getMonthCalendar(monthStart);
    return today >= calendar.startDate && today <= calendar.endDate ? today : calendar.startDate;
  }, [today]);

  const changeVisibleMonth = (offset: number) => {
    const nextMonth = addMonths(visibleMonth, offset);
    setVisibleMonth(nextMonth);
    setSelectedDate(selectDefaultDateForMonth(nextMonth));
  };

  const resetToCurrentMonth = () => {
    const currentMonth = getMonthStart(today);
    setVisibleMonth(currentMonth);
    setSelectedDate(today);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshCardState();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [habit.id, habit.last_checkin_date, habit.total_checkins, refreshCardState]);

  const handleCheckin = () => {
    if (!selectedIsToday || selectedHasCheckin) return;
    setShowCheckinModal(true);
  };

  const confirmCheckin = async () => {
    if (!selectedIsToday || selectedHasCheckin) return;

    setSubmitting(true);
    try {
      const success = await onCheckin(habit.id, checkinNote, selectedDate);
      if (success) {
        setShowCheckinModal(false);
        setCheckinNote('');
        await refreshCardState();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSelectedDate = async () => {
    if (!selectedHasCheckin) return;

    if (!confirm(`确定要取消 ${formatDisplayDate(selectedDate)} 的打卡吗？会扣回本次打卡获得的经验。`)) return;

    setSubmitting(true);
    try {
      const success = await onCancelCheckin(habit.id, selectedDate);
      if (success) {
        await refreshCardState();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openMakeupModal = (date: string) => {
    if (date >= today) return;

    if (monthCheckins[date]) {
      alert('这一天已经打卡过了');
      return;
    }

    if (makeupRemaining <= 0) {
      alert('本月补打卡次数已经用完啦');
      return;
    }

    setMakeupDate(date);
    setMakeupNote('');
    setShowMakeupModal(true);
  };

  const confirmMakeupCheckin = async () => {
    if (!makeupDate || makeupDate >= today) {
      alert('补打卡只能选择今天之前的日期');
      return;
    }

    if (monthCheckins[makeupDate]) {
      alert('这一天已经打卡过了');
      return;
    }

    setSubmitting(true);
    try {
      const success = await onCheckin(habit.id, makeupNote, makeupDate, true);
      if (success) {
        setSelectedDate(makeupDate);
        setShowMakeupModal(false);
        setMakeupNote('');
        await refreshCardState();
      }
    } finally {
      setSubmitting(false);
    }
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

  const renderActionButtons = () => {
    const statusButtonClass = 'h-12 inline-flex items-center justify-center gap-2 rounded-full font-medium text-sm transition-all';
    const quietStatusClass = `${statusButtonClass} bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-default`;
    const secondaryButtonClass = 'w-24 h-12 inline-flex items-center justify-center gap-2 rounded-full bg-white border border-emerald-100 text-emerald-700 font-medium text-sm hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all';

    if (selectedHasCheckin) {
      return (
        <div className="flex gap-3">
          <button type="button" disabled className={`${quietStatusClass} flex-1`}>
            <Check className="w-4 h-4" />
            已打卡
          </button>
          <button
            type="button"
            onClick={handleCancelSelectedDate}
            disabled={submitting}
            className="w-24 h-12 inline-flex items-center justify-center gap-2 rounded-full bg-rose-50 text-rose-600 border border-rose-100 font-medium text-sm hover:bg-rose-100 disabled:opacity-50 disabled:cursor-wait transition-all"
          >
            <X className="w-4 h-4" />
            取消
          </button>
        </div>
      );
    }

    if (selectedIsPast) {
      return (
        <div className="space-y-2">
          <div className="flex gap-3">
            <button type="button" disabled className={`${quietStatusClass} flex-1`}>
              未打卡
            </button>
            <button
              type="button"
              onClick={() => openMakeupModal(selectedDate)}
              disabled={submitting || makeupRemaining <= 0}
              className={secondaryButtonClass}
            >
              <RotateCcw className="w-4 h-4" />
              补打卡
            </button>
          </div>
          <p className="text-center text-xs text-emerald-700/80">
            本月补打卡剩余 {makeupRemaining}/{makeupLimit}
          </p>
        </div>
      );
    }

    if (selectedIsToday) {
      return (
        <button
          type="button"
          onClick={handleCheckin}
          disabled={submitting}
          className={`${statusButtonClass} w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg disabled:opacity-60 disabled:cursor-wait`}
        >
          <Check className="w-4 h-4" />
          打卡
        </button>
      );
    }

    return (
      <button type="button" disabled className={`${quietStatusClass} w-full`}>
        未到日期
      </button>
    );
  };

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
              type="button"
              onClick={() => onEdit(habit)}
              title="编辑习惯"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              type="button"
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

        {/* 月历 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-light">打卡日历</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeVisibleMonth(-1)}
                title="上个月"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetToCurrentMonth}
                title="回到本月"
                className={`min-w-20 h-7 px-2 rounded-full text-xs font-light transition-all ${
                  isViewingCurrentMonth
                    ? 'text-gray-500 cursor-default'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {monthCalendar.label}
              </button>
              <button
                type="button"
                onClick={() => changeVisibleMonth(1)}
                title="下个月"
                className="h-7 w-7 inline-flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {weekDays.map((day) => (
              <div key={day} className="h-5 text-center text-xs text-gray-400">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: monthCalendar.leadingBlanks }).map((_, index) => (
              <div key={`leading-${index}`} className="h-10" />
            ))}

            {monthCalendar.days.map((day) => {
              const hasCheckin = Boolean(monthCheckins[day.date]);
              const isSelected = day.date === selectedDate;
              const isToday = day.date === today;
              const isFuture = day.date > today;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  title={`${formatDisplayDate(day.date)}${hasCheckin ? ' 已打卡' : ''}`}
                  className={`relative flex h-10 min-w-0 flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
                      : hasCheckin
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : isFuture
                      ? 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  } ${isToday && !isSelected ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                >
                  <span>{day.dayNumber}</span>
                  {hasCheckin && <Check className="mt-0.5 w-3 h-3" />}
                </button>
              );
            })}

            {Array.from({ length: monthCalendar.trailingBlanks }).map((_, index) => (
              <div key={`trailing-${index}`} className="h-10" />
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
        <div>{renderActionButtons()}</div>
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
                onChange={(event) => setCheckinNote(event.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
                placeholder="记录今天的感受..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCheckinModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmCheckin}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg disabled:opacity-60 disabled:cursor-wait transition-all"
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
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs text-emerald-700/70 mb-1">补打日期</p>
                <p className="text-base font-medium text-emerald-800">{formatDisplayDate(makeupDate)}</p>
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
                type="button"
                onClick={() => setShowMakeupModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmMakeupCheckin}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg disabled:opacity-60 disabled:cursor-wait transition-all"
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
