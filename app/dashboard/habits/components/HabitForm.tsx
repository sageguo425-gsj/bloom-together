'use client';

import { useState } from 'react';
import type { Habit, HabitFormData, HabitFrequencyType } from '@/lib/types/habit';

interface HabitFormProps {
  habit?: Habit;
  onSubmit: (formData: HabitFormData) => void;
  onCancel: () => void;
}

const HABIT_ICONS = ['🏃', '📚', '💧', '🧘', '🎯', '💪', '🎨', '🎵', '✍️', '🌱', '☕', '🛏️'];
const HABIT_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export default function HabitForm({ habit, onSubmit, onCancel }: HabitFormProps) {
  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [icon, setIcon] = useState(habit?.icon || '🎯');
  const [color, setColor] = useState(habit?.color || '#10b981');
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>(
    habit?.frequency.type || 'daily'
  );
  const [frequencyTimes, setFrequencyTimes] = useState(habit?.frequency.times || 1);
  const [streakGoal, setStreakGoal] = useState(habit?.goal?.streak_days || 30);
  const [totalGoal, setTotalGoal] = useState(habit?.goal?.total_count || 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData: HabitFormData = {
      name,
      description: description || undefined,
      icon,
      color,
      frequency: {
        type: frequencyType,
        times: frequencyTimes,
      },
      goal: {
        streak_days: streakGoal,
        total_count: totalGoal,
      },
    };

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100/50 my-8">
        <div className="p-8 border-b border-emerald-100/50">
          <h2 className="text-3xl font-extralight text-gray-900">
            {habit ? '编辑习惯' : '创建新习惯'}
          </h2>
          <p className="text-gray-600 font-light text-sm mt-2">
            设定你的习惯目标，开始养成好习惯
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* 习惯名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              习惯名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              placeholder="例如：每天阅读30分钟"
            />
          </div>

          {/* 习惯描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              习惯描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light resize-none"
              placeholder="描述这个习惯的目的和意义..."
            />
          </div>

          {/* 图标选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择图标
            </label>
            <div className="grid grid-cols-6 gap-3">
              {HABIT_ICONS.map((iconOption) => (
                <button
                  key={iconOption}
                  type="button"
                  onClick={() => setIcon(iconOption)}
                  className={`aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all ${
                    icon === iconOption
                      ? 'bg-emerald-100 border-2 border-emerald-500 scale-110'
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {iconOption}
                </button>
              ))}
            </div>
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择颜色
            </label>
            <div className="grid grid-cols-8 gap-3">
              {HABIT_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`aspect-square rounded-2xl transition-all ${
                    color === colorOption
                      ? 'ring-4 ring-offset-2 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: colorOption,
                  }}
                />
              ))}
            </div>
          </div>

          {/* 频率设置 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              打卡频率
            </label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setFrequencyType('daily')}
                className={`px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                  frequencyType === 'daily'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                每天
              </button>
              <button
                type="button"
                onClick={() => setFrequencyType('weekly')}
                className={`px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                  frequencyType === 'weekly'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                每周
              </button>
              <button
                type="button"
                onClick={() => setFrequencyType('monthly')}
                className={`px-4 py-3.5 rounded-2xl border-2 transition-all font-light ${
                  frequencyType === 'monthly'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                每月
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {frequencyType === 'daily' && '每天打卡次数'}
                {frequencyType === 'weekly' && '每周打卡次数'}
                {frequencyType === 'monthly' && '每月打卡次数'}
              </label>
              <input
                type="number"
                min="1"
                max={frequencyType === 'daily' ? 10 : frequencyType === 'weekly' ? 7 : 31}
                value={frequencyTimes}
                onChange={(e) => setFrequencyTimes(parseInt(e.target.value))}
                className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
              />
            </div>
          </div>

          {/* 目标设置 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">目标设置</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  连续打卡目标（天）
                </label>
                <input
                  type="number"
                  min="1"
                  value={streakGoal}
                  onChange={(e) => setStreakGoal(parseInt(e.target.value))}
                  className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  总打卡目标（次）
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalGoal}
                  onChange={(e) => setTotalGoal(parseInt(e.target.value))}
                  className="w-full px-4 py-3.5 bg-white border border-emerald-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-light"
                />
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              {habit ? '保存修改' : '创建习惯'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
