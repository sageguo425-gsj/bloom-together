import { createClient } from '@/lib/supabase/client';
import type { PomodoroMode } from '@/lib/types/pomodoro';

export interface PomodoroSessionData {
  user_id: string;
  task_id?: number;
  mode: PomodoroMode;
  duration: number;
  completed_at?: string;
  interrupted_at?: string;
}

export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusTime: number;
  todaySessions: number;
  weekSessions: number;
  completionRate: number;
}

class PomodoroService {
  private supabase = createClient();

  async createSession(data: Omit<PomodoroSessionData, 'completed_at' | 'interrupted_at'>) {
    try {
      console.log('Creating pomodoro session with data:', data);

      const { data: session, error } = await this.supabase
        .from('pomodoro_sessions')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Session created successfully:', session);
      return session;
    } catch (error: any) {
      console.error('创建番茄钟会话失败:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async completeSession(sessionId: string, completedAt: string) {
    try {
      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .update({
          completed_at: completedAt,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('完成番茄钟会话失败:', error);
      throw error;
    }
  }

  async interruptSession(sessionId: string, interruptedAt: string) {
    try {
      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .update({
          interrupted_at: interruptedAt,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('中断番茄钟会话失败:', error);
      throw error;
    }
  }

  async getUserStats(userId: string): Promise<PomodoroStats> {
    try {
      const { data: allSessions, error: allError } = await this.supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', 'work');

      if (allError) throw allError;

      const completedSessions = allSessions?.filter((s) => s.completed_at) || [];
      const totalFocusTime = completedSessions.reduce((sum, s) => sum + s.duration, 0);

      const today = new Date().toISOString().split('T')[0];
      const todaySessions = allSessions?.filter(
        (s) => s.completed_at && s.completed_at.startsWith(today)
      ).length || 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekSessions = allSessions?.filter(
        (s) => s.completed_at && new Date(s.completed_at) >= weekAgo
      ).length || 0;

      const completionRate = allSessions?.length
        ? (completedSessions.length / allSessions.length) * 100
        : 0;

      return {
        totalSessions: allSessions?.length || 0,
        completedSessions: completedSessions.length,
        totalFocusTime,
        todaySessions,
        weekSessions,
        completionRate,
      };
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        totalFocusTime: 0,
        todaySessions: 0,
        weekSessions: 0,
        completionRate: 0,
      };
    }
  }

  async getTaskSessions(taskId: number) {
    try {
      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('task_id', taskId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取任务番茄钟记录失败:', error);
      return [];
    }
  }

  async getProjectSessions(projectId: number) {
    try {
      // 由于 pomodoro_sessions 表没有 project_id 字段，
      // 我们需要通过 tasks 表来关联
      // 暂时返回空数组
      return [];
    } catch (error) {
      console.error('获取项目番茄钟记录失败:', error);
      return [];
    }
  }

  async getRecentSessions(userId: string, limit: number = 10) {
    try {
      const { data, error } = await this.supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取最近番茄钟记录失败:', error);
      return [];
    }
  }
}

export const pomodoroService = new PomodoroService();
