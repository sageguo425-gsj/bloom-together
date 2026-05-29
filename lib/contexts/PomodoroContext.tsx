'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { usePomodoroTimer } from '@/lib/hooks/usePomodoroTimer';
import { useWhiteNoise } from '@/lib/hooks/useWhiteNoise';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { useNotification } from '@/lib/hooks/useNotification';
import { useMediaSession } from '@/lib/hooks/useMediaSession';
import { pomodoroService } from '@/lib/services/pomodoroService';
import { addExpForPomodoroCompletion } from '@/lib/services/expService';
import { vibrateSuccess } from '@/lib/utils/vibration';
import { playSuccessSound } from '@/lib/utils/audio';
import type { PomodoroMode } from '@/lib/types/pomodoro';
import type { Task } from '@/lib/types/task';

interface PomodoroContextType {
  // 番茄钟状态
  pomodoroTimer: ReturnType<typeof usePomodoroTimer>;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  workDuration: number;
  setWorkDuration: (duration: number) => void;
  breakDuration: number;
  setBreakDuration: (duration: number) => void;
  completedSessions: number;

  // 番茄钟操作
  handleStart: () => Promise<void>;
  handlePause: () => Promise<void>;
  handleReset: () => Promise<void>;

  // 白噪音状态
  whiteNoise: ReturnType<typeof useWhiteNoise>;

  // 用户信息
  userId: string | null;
  setUserId: (id: string | null) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [workDuration, setWorkDurationState] = useState(() => {
    if (typeof window === 'undefined') return 25;
    const savedWorkDuration = localStorage.getItem('pomodoro_work_duration');
    return savedWorkDuration ? parseInt(savedWorkDuration) : 25;
  });
  const [breakDuration, setBreakDurationState] = useState(() => {
    if (typeof window === 'undefined') return 5;
    const savedBreakDuration = localStorage.getItem('pomodoro_break_duration');
    return savedBreakDuration ? parseInt(savedBreakDuration) : 5;
  });
  const [completedSessions, setCompletedSessions] = useState(0);
  const currentSessionIdRef = useRef<string | null>(null);

  // 保存设置到 localStorage
  const setWorkDuration = (duration: number) => {
    setWorkDurationState(duration);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pomodoro_work_duration', duration.toString());
    }
  };

  const setBreakDuration = (duration: number) => {
    setBreakDurationState(duration);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pomodoro_break_duration', duration.toString());
    }
  };

  // 加载今日完成的番茄钟数量
  useEffect(() => {
    const loadTodayCompletedSessions = async () => {
      if (!userId) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data, error } = await supabase
          .from('pomodoro_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('completed', true)
          .gte('started_at', `${today}T00:00:00`)
          .lte('started_at', `${today}T23:59:59`);

        if (!error && data) {
          setCompletedSessions(data.length);
        }
      } catch (error) {
        console.error('加载今日完成番茄钟数量失败:', error);
      }
    };

    loadTodayCompletedSessions();
  }, [userId]);

  // Hooks
  const { isSupported: isWakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock();
  const { showNotification, requestPermission: requestNotificationPermission } = useNotification();
  const whiteNoise = useWhiteNoise();

  const pomodoroTimer = usePomodoroTimer({
    workDuration,
    breakDuration,
    onComplete: handleTimerComplete,
    onTick: handleTimerTick,
  });

  // Media Session API
  useMediaSession({
    title: pomodoroTimer.mode === 'work' ? '专注工作中' : '休息时间',
    artist: selectedTask?.title || '番茄钟',
    album: 'Bloom Together',
    onPlay: () => {
      if (pomodoroTimer.status !== 'running') {
        handleStart();
      }
    },
    onPause: () => {
      if (pomodoroTimer.status === 'running') {
        handlePause();
      }
    },
    onStop: () => {
      handleReset();
    },
  });

  // 请求通知权限
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // 处理计时器每秒更新
  function handleTimerTick(timeLeft: number) {
    if (typeof document !== 'undefined') {
      const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };
      document.title = `${formatTime(timeLeft)} - ${pomodoroTimer.mode === 'work' ? '专注' : '休息'} | Bloom Together`;
    }
  }

  // 处理计时器完成
  async function handleTimerComplete(mode: PomodoroMode) {
    vibrateSuccess();
    playSuccessSound();

    const notificationTitle = mode === 'work' ? '🎉 番茄钟完成！' : '✨ 休息结束！';
    const notificationBody = mode === 'work' ? '休息一下吧！' : '继续加油！';

    showNotification(notificationTitle, {
      body: notificationBody,
      tag: 'pomodoro-complete',
      requireInteraction: true,
    });

    if (mode === 'work' && userId && currentSessionIdRef.current) {
      try {
        await pomodoroService.completeSession(
          currentSessionIdRef.current,
          new Date().toISOString()
        );
        await addExpForPomodoroCompletion(userId);
        setCompletedSessions((prev) => prev + 1);
      } catch (error) {
        console.error('保存番茄钟记录失败:', error);
      }
      currentSessionIdRef.current = null;
    }

    setTimeout(() => {
      if (mode === 'work') {
        pomodoroTimer.switchMode('shortBreak');
      } else {
        pomodoroTimer.switchMode('work');
      }
    }, 2000);
  }

  const handleStart = async () => {
    if (isWakeLockSupported) {
      await requestWakeLock();
    }

    if (pomodoroTimer.mode === 'work' && pomodoroTimer.status === 'idle' && userId) {
      try {
        const session = await pomodoroService.createSession({
          user_id: userId,
          task_id: selectedTask?.id ? Number(selectedTask.id) : undefined,
          mode: pomodoroTimer.mode,
          duration: workDuration * 60,
        });
        currentSessionIdRef.current = session.id;
      } catch (error) {
        console.error('创建番茄钟会话失败:', error);
      }
    }

    pomodoroTimer.start();
  };

  const handlePause = async () => {
    pomodoroTimer.pause();
    await releaseWakeLock();
  };

  const handleReset = async () => {
    if (currentSessionIdRef.current && pomodoroTimer.mode === 'work') {
      try {
        await pomodoroService.interruptSession(
          currentSessionIdRef.current,
          new Date().toISOString()
        );
      } catch (error) {
        console.error('中断番茄钟会话失败:', error);
      }
      currentSessionIdRef.current = null;
    }

    pomodoroTimer.reset();
    await releaseWakeLock();
  };

  const value: PomodoroContextType = {
    pomodoroTimer,
    selectedTask,
    setSelectedTask,
    workDuration,
    setWorkDuration,
    breakDuration,
    setBreakDuration,
    completedSessions,
    handleStart,
    handlePause,
    handleReset,
    whiteNoise,
    userId,
    setUserId,
  };

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
