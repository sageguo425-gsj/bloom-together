// 任务类型定义

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskTag = 'study' | 'work' | 'life' | 'health' | 'other';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];

  // 时间管理
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  estimated_duration?: number; // 分钟

  // 关联
  project_id?: number;
  habit_id?: number;

  // 伴侣空间
  is_shared?: boolean;

  // 完成信息
  completed_at?: string;

  // 时间戳
  created_at: string;
  updated_at: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  priority: TaskPriority;
  tags: TaskTag[];
  date: string;
  start_time?: string;
  end_time?: string;
  estimated_duration?: number;
  project_id?: number;
  habit_id?: number;
  is_shared?: boolean;
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
};

export const TASK_TAG_LABELS: Record<TaskTag, string> = {
  study: '学习',
  work: '工作',
  life: '生活',
  health: '健康',
  other: '其他',
};

export const TASK_TAG_COLORS: Record<TaskTag, string> = {
  study: 'bg-blue-100 text-blue-700 border-blue-300',
  work: 'bg-purple-100 text-purple-700 border-purple-300',
  life: 'bg-green-100 text-green-700 border-green-300',
  health: 'bg-pink-100 text-pink-700 border-pink-300',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
};
