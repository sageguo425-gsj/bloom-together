'use client';

import { useState, useEffect } from 'react';
import type { Habit, CalendarDay } from '@/lib/types/habit';
import { createClient } from '@/lib/supabase/client';

interface HabitCalendarProps {
  habits: Habit[];
  selectedHabit: Habit | null;
  onSelectHabit: (habit: Habit | null) => void;
}

export default function HabitCalendar({
  habits,
  selectedHabit,
  onSelectHabit,
}: HabitCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateDetails, setDateDetails] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    if (selectedHabit) {
      loadCalendarData();
    }
  }, [selectedHabit, currentMonth]);

  const loadCalendarData = async () => {
    if (!selectedHabit) return;

    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const { data, error } = await supabase
        .from('habit_checkins')
        .select('*')
        .eq('habit_id', selectedHabit.id)
        .gte('checkin_date', firstDay.toISOString().split('T')[0])
        .lte('checkin_date', lastDay.toISOString().split('T')[0]);

      if (error) throw error;

      // 构建日历数据
      const days: CalendarDay[] = [];
      const checkinMap = new Map<string, any[]>();

      data?.forEach((checkin) => {
        const date = checkin.checkin_date;
        if (!checkinMap.has(date)) {
          checkinMap.set(date, []);
        }
        checkinMap.get(date)?.push(checkin);
      });

      // 获取月份的所有日期
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toISOString().split('T')[0];
        const checkins = checkinMap.get(dateStr) || [];

        days.push({
          date: dateStr,
          hasCheckin: checkins.length > 0,
          checkinCount: checkins.length,
          isStreak: false, // 可以后续计算连续性
        });
      }

      setCalendarDays(days);
    } catch (error) {
      console.error('加载日历数据失败:', error);
    }
  };

  const handleDateClick = async (day: CalendarDay) => {
    setSelectedDate(day.date);

    if (!selectedHabit || !day.hasCheckin) {
      setDateDetails(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('*')
        .eq('habit_id', selectedHabit.id)
        .eq('checkin_date', day.date);

      if (error) throw error;
      setDateDetails(data);
    } catch (error) {
      console.error('加载日期详情失败:', error);
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getMonthName = () => {
    return currentMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  };

  const getFirstDayOfMonth = () => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：习惯列表 */}
      <div className="lg:col-span-1">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/50 p-6 shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">选择习惯</h3>
          <div className="space-y-3">
            {habits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => onSelectHabit(habit)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
                  selectedHabit?.id === habit.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    selectedHabit?.id === habit.id ? 'bg-white/20' : ''
                  }`}
                  style={
                    selectedHabit?.id !== habit.id
                      ? { backgroundColor: `${habit.color}20` }
                      : {}
                  }
                >
                  {habit.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{habit.name}</p>
                  <p
                    className={`text-sm ${
                      selectedHabit?.id === habit.id ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    🔥 {habit.current_streak} 天
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：日历视图 */}
      <div className="lg:col-span-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-white/50 p-6 shadow-lg">
          {!selectedHabit ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📅</span>
              </div>
              <p className="text-gray-500 font-light">请选择一个习惯查看打卡日历</p>
            </div>
          ) : (
            <>
              {/* 日历头部 */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900">{getMonthName()}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 星期标题 */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* 日历格子 */}
              <div className="grid grid-cols-7 gap-2">
                {/* 空白格子（月初前的日期） */}
                {Array.from({ length: getFirstDayOfMonth() }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* 日期格子 */}
                {calendarDays.map((day) => {
                  const date = new Date(day.date);
                  const dayNum = date.getDate();
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  const isSelected = day.date === selectedDate;

                  return (
                    <button
                      key={day.date}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                        isSelected
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
                          : day.hasCheckin
                          ? 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 hover:shadow-md'
                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                      } ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                    >
                      <span className="text-sm font-medium">{dayNum}</span>
                      {day.hasCheckin && (
                        <span className="text-xs mt-1">
                          {isSelected ? '✓' : day.checkinCount > 1 ? `${day.checkinCount}✓` : '✓'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 图例 */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-100 to-teal-100"></div>
                  <span className="text-gray-600">已打卡</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-50"></div>
                  <span className="text-gray-600">未打卡</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded ring-2 ring-emerald-500"></div>
                  <span className="text-gray-600">今天</span>
                </div>
              </div>

              {/* 日期详情 */}
              {selectedDate && dateDetails && dateDetails.length > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    {new Date(selectedDate).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h4>
                  <div className="space-y-2">
                    {dateDetails.map((checkin: any) => (
                      <div key={checkin.id} className="bg-white rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {checkin.checkin_time.slice(0, 5)}
                          </span>
                          {checkin.auto_checkin && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              自动打卡
                            </span>
                          )}
                        </div>
                        {checkin.note && (
                          <p className="text-sm text-gray-600 font-light">{checkin.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
