'use client';

import { useEffect, useState } from 'react';
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
}

export default function RecentSessions({ user }: RecentSessionsProps) {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    try {
      const data = await pomodoroService.getRecentSessions(user.id, 10);
      setSessions(data);
    } catch (error) {
      console.error('加载最近会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

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
                  {session.started_at && !isNaN(new Date(session.started_at).getTime())
                    ? format(new Date(session.started_at), 'MM月dd日 HH:mm', { locale: zhCN })
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
