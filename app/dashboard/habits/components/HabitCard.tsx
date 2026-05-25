'use client';

import { useState, useEffect } from 'react';
import type { Habit, Milestone } from '@/lib/types/habit';
import { createClient } from '@/lib/supabase/client';

interface HabitCardProps {
  habit: Habit;
  onCheckin: (habitId: string, note?: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onViewCalendar: (habit: Habit) => void;
}

export default function HabitCard({
  habit,
  onCheckin,
  onEdit,
  onDelete,
  onViewCalendar,
}: HabitCardProps) {
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [canCheckinToday, setCanCheckinToday] = useState(true);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinNote, setCheckinNote] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadWeeklyProgress();
    checkTodayCheckin();
  }, [habit.id]);

  const loadWeeklyProgress = async () => {
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
  };

  const checkTodayCheckin = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('id')
        .eq('habit_id', habit.id)
        .eq('checkin_date', today)
        .single();

      setCanCheckinToday(!data);
    } catch (error) {
      // 没有记录说明可以打卡
      setCanCheckinToday(true);
    }
  };

  const handleCheckin = () => {
    if (!canCheckinToday) {
      alert('今天已经打卡过了！');
      return;
    }
    setShowCheckinModal(true);
  };

  const confirmCheckin = () => {
    onCheckin(habit.id, checkinNote);
    setShowCheckinModal(false);
    setCheckinNote('');
    setCanCheckinToday(false);
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
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
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
        <div className="flex gap-3">
          <button
            onClick={handleCheckin}
            disabled={!canCheckinToday}
            className={`flex-1 py-3 rounded-full font-medium text-sm transition-all ${
              canCheckinToday
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canCheckinToday ? '✓ 今日打卡' : '✓ 已打卡'}
          </button>
          <button
            onClick={() => onViewCalendar(habit)}
            className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-50 transition-all"
          >
            📅
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all"
              >
                确认打卡
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
