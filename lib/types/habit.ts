// 习惯频率类型
export type HabitFrequencyType = 'daily' | 'weekly' | 'monthly';

// 习惯频率配置
export interface HabitFrequency {
  type: HabitFrequencyType;
  times: number; // 每天/周/月需要打卡的次数
  days?: number[]; // 每周的哪几天 (0-6, 0=周日)
}

// 习惯目标
export interface HabitGoal {
  streak_days?: number; // 连续打卡天数目标
  total_count?: number; // 总打卡次数目标
}

// 习惯数据库类型
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string; // emoji 图标
  color: string; // 颜色代码
  frequency: HabitFrequency;
  goal?: HabitGoal;
  current_streak: number; // 当前连续打卡天数
  longest_streak: number; // 最长连续打卡天数
  total_checkins: number; // 总打卡次数
  last_checkin_date?: string; // 最后打卡日期
  related_task_ids?: string[]; // 关联的任务ID
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 打卡记录
export interface HabitCheckin {
  id: string;
  habit_id: string;
  user_id: string;
  checkin_date: string; // YYYY-MM-DD
  checkin_time: string; // HH:MM:SS
  note?: string;
  auto_checkin: boolean; // 是否自动打卡（通过任务关联）
  created_at: string;
}

// 习惯表单数据
export interface HabitFormData {
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  goal?: HabitGoal;
  related_task_ids?: string[];
}

// 习惯统计
export interface HabitStats {
  habit_id: string;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  this_week_checkins: number;
  this_month_checkins: number;
  completion_rate: number; // 完成率 (0-100)
  weekly_progress: boolean[]; // 本周7天的打卡情况
}

// 成就里程碑
export type MilestoneType = 7 | 30 | 100 | 365;

export interface Milestone {
  days: MilestoneType;
  title: string;
  icon: string;
  achieved: boolean;
}

// 日历日期状态
export interface CalendarDay {
  date: string;
  hasCheckin: boolean;
  checkinCount: number;
  isStreak: boolean;
}
