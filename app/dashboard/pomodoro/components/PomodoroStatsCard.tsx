'use client';

import { useEffect, useState } from 'react';
import { pomodoroService, type PomodoroStats } from '@/lib/services/pomodoroService';
import type { User } from '@supabase/supabase-js';

interface PomodoroStatsCardProps {
  user: User;
}

export default function PomodoroStatsCard({ user }: PomodoroStatsCardProps) {
  const [stats, setStats] = useState<PomodoroStats>({
    totalSessions: 0,
    completedSessions: 0,
    totalFocusTime: 0,
    todaySessions: 0,
    weekSessions: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const data = await pomodoroService.getUserStats(user.id);
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-6">📊 统计数据</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">今日完成</p>
          <p className="text-3xl font-light text-emerald-600">{stats.todaySessions}</p>
          <p className="text-xs text-gray-500 mt-1">个番茄钟</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">本周完成</p>
          <p className="text-3xl font-light text-blue-600">{stats.weekSessions}</p>
          <p className="text-xs text-gray-500 mt-1">个番茄钟</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">总专注时长</p>
          <p className="text-2xl font-light text-purple-600">{formatTime(stats.totalFocusTime)}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-1">完成率</p>
          <p className="text-3xl font-light text-orange-600">{stats.completionRate.toFixed(0)}%</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">总计完成</span>
          <span className="font-medium text-gray-900">
            {stats.completedSessions} / {stats.totalSessions} 个番茄钟
          </span>
        </div>
      </div>
    </div>
  );
}
