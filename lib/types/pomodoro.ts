// 番茄钟类型定义

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';
export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface PomodoroSettings {
  workDuration: number; // 分钟
  shortBreakDuration: number; // 分钟
  longBreakDuration: number; // 分钟
  sessionsUntilLongBreak: number; // 几个番茄钟后长休息
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_id?: string;
  project_id?: number;
  mode: PomodoroMode;
  duration: number; // 秒
  completed: boolean;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
};

export const POMODORO_MODE_LABELS: Record<PomodoroMode, string> = {
  work: '专注工作',
  shortBreak: '短休息',
  longBreak: '长休息',
};
