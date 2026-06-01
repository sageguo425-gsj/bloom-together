'use client';

import { useCallback, useEffect, useState } from 'react';
import { pomodoroService } from '@/lib/services/pomodoroService';
import type { User } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface PomodoroSession {
  id: string;
  mode: string;
  duration: number;
  completed: boolean;
  started_at: string;
  ended_at?: string;
  interrupted_at?: string;
  tasks?: { title: string };
  projects?: { name: string };
}

interface RecentSessionsProps {
  user: User;
  refreshKey?: number;
}

function getShanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export default function RecentSessions({ user, refreshKey = 0 }: RecentSessionsProps) {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await pomodoroService.getRecentSessions(user.id, 10);

      // 只显示当日完成的番茄钟（排除中断的和前几天的）
      const today = getShanghaiDate();
      const filteredSessions = data.filter(session => {
        // 必须是已完成的
        if (!session.completed) return false;

        // 必须是当日的
        const sessionDate = getShanghaiDate(new Date(session.started_at));
        return sessionDate === today;
      });

      setSessions(filteredSessions);
    } catch (error) {
      console.error('加载最近会话失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadSessions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSessions, refreshKey]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟`;
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'work':
        return '工作';
      case 'shortBreak':
        return '短休息';
      case 'longBreak':
        return '长休息';
      default:
        return mode;
    }
  };

  const getStatusIcon = (session: PomodoroSession) => {
    if (session.completed) {
      return '✅';
    } else if (session.interrupted_at) {
      return '⏸️';
    }
    return '⏱️';
  };

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📝 最近记录</h3>
        <p className="text-gray-500 text-center py-8">暂无番茄钟记录</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">📝 最近记录</h3>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getStatusIcon(session)}</span>
              <div>
                <p className="font-medium text-gray-900">
                  {getModeLabel(session.mode)} · {formatDuration(session.duration)}
                </p>
                <p className="text-sm text-gray-600">
                  {session.tasks?.title || session.projects?.name || '未关联任务'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {session.started_at && session.ended_at &&
                   !isNaN(new Date(session.started_at).getTime()) &&
                   !isNaN(new Date(session.ended_at).getTime())
                    ? `${format(new Date(session.started_at), 'HH:mm', { locale: zhCN })}-${format(new Date(session.ended_at), 'HH:mm', { locale: zhCN })}`
                    : '时间未知'}
                </p>
              </div>
            </div>

            {session.completed && (
              <div className="text-emerald-600 text-sm font-medium">已完成</div>
            )}
            {session.interrupted_at && (
              <div className="text-orange-600 text-sm font-medium">已中断</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
