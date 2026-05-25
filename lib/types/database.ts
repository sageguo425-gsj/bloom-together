// 数据库类型定义
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  partner_id?: string;
  level: number;
  exp: number;
  created_at: string;
}

export interface Project {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectJournal {
  id: number;
  project_id: number;
  content: string;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: string;
  project_id?: number;
  habit_id?: number;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  estimated_duration?: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  tags?: string[];
  is_shared: boolean;
  created_at: string;
  completed_at?: string;
}

export interface Pomodoro {
  id: number;
  task_id?: number;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  is_completed: boolean;
  created_at: string;
}

export interface Habit {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  frequency_type: 'daily' | 'weekly' | 'monthly';
  frequency_value?: number;
  target_days: number;
  is_shared: boolean;
  created_at: string;
}

export interface HabitCheckin {
  id: number;
  habit_id: number;
  user_id: string;
  date: string;
  created_at: string;
}

export interface WhiteNoisePreset {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  sounds?: WhiteNoisePresetSound[];
}

export interface WhiteNoisePresetSound {
  id: number;
  preset_id: number;
  sound_id: string;
  volume: number;
}

export interface DailyStat {
  id: number;
  user_id: string;
  date: string;
  focus_duration: number;
  tasks_completed: number;
  habits_checked: number;
  projects_completed: number;
  created_at: string;
}
