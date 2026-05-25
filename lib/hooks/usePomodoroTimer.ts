import { useState, useRef, useCallback, useEffect } from 'react';
import type { PomodoroMode, PomodoroStatus } from '@/lib/types/pomodoro';

interface UsePomodoroTimerProps {
  workDuration: number;
  breakDuration: number;
  onComplete?: (mode: PomodoroMode) => void;
  onTick?: (timeLeft: number) => void;
}

export function usePomodoroTimer({
  workDuration,
  breakDuration,
  onComplete,
  onTick,
}: UsePomodoroTimerProps) {
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [status, setStatus] = useState<PomodoroStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getTotalDuration = useCallback(() => {
    return mode === 'work' ? workDuration * 60 : breakDuration * 60;
  }, [mode, workDuration, breakDuration]);

  const getProgress = useCallback(() => {
    return ((getTotalDuration() - timeLeft) / getTotalDuration()) * 100;
  }, [timeLeft, getTotalDuration]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (status === 'idle') {
      setSessionStartTime(new Date());
    }

    setStatus('running');

    clearTimer();
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;

        if (onTick) {
          onTick(newTime);
        }

        if (newTime <= 0) {
          clearTimer();
          setStatus('completed');
          if (onComplete) {
            onComplete(mode);
          }
          return 0;
        }

        return newTime;
      });
    }, 1000);
  }, [status, mode, onComplete, onTick, clearTimer]);

  const pause = useCallback(() => {
    setStatus('paused');
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    setStatus('idle');
    clearTimer();
    setTimeLeft(getTotalDuration());
    setSessionStartTime(null);
  }, [getTotalDuration, clearTimer]);

  const switchMode = useCallback((newMode: PomodoroMode) => {
    setMode(newMode);
    setStatus('idle');
    clearTimer();
    const duration = newMode === 'work' ? workDuration : breakDuration;
    setTimeLeft(duration * 60);
    setSessionStartTime(null);
  }, [workDuration, breakDuration, clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (status === 'idle') {
      setTimeLeft(getTotalDuration());
    }
  }, [workDuration, breakDuration, status, getTotalDuration]);

  return {
    mode,
    status,
    timeLeft,
    sessionStartTime,
    progress: getProgress(),
    start,
    pause,
    reset,
    switchMode,
  };
}
