import type { Task } from '@/lib/types/task';

export type GoalPeriod = 'semester' | 'month' | 'week';
export type ReviewPeriod = 'daily' | 'weekly' | 'monthly' | 'semester';
export type ProgressMode = 'tasks' | 'habit' | 'children';

export interface ScheduleTerm {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export interface ScheduleGoal {
  id: string;
  user_id: string;
  term_id: string;
  parent_goal_id: string | null;
  period: GoalPeriod;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  progress_mode: ProgressMode;
  cadence: 'period' | 'week';
  target_count: number | null;
  habit_id: string | null;
  project_id: number | null;
}

export interface ScheduleReview {
  id: string;
  period: ReviewPeriod;
  period_start: string;
  period_end: string;
  wins: string;
  obstacles: string;
  next_steps: string;
  updated_at: string;
}

export interface ScheduleCheckin {
  habit_id: string;
  checkin_date: string;
}

export function shanghaiToday(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function utcDate(value: string): Date { return new Date(`${value}T00:00:00.000Z`); }
function isoDate(value: Date): string { return value.toISOString().slice(0, 10); }

export function periodRange(period: ReviewPeriod, anchor: string, term?: ScheduleTerm): { start: string; end: string } {
  const date = utcDate(anchor);
  if (period === 'semester' && term) return { start: term.start_date, end: term.end_date };
  if (period === 'daily') return { start: anchor, end: anchor };
  if (period === 'weekly') {
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    const start = isoDate(date);
    date.setUTCDate(date.getUTCDate() + 6);
    return { start, end: isoDate(date) };
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return { start: isoDate(new Date(Date.UTC(year, month, 1))), end: isoDate(new Date(Date.UTC(year, month + 1, 0))) };
}

export function goalProgress(
  goal: ScheduleGoal,
  goals: ScheduleGoal[],
  tasks: Pick<Task, 'schedule_goal_id' | 'status' | 'date'>[],
  checkins: ScheduleCheckin[],
  today: string,
  visited = new Set<string>(),
): { current: number; target: number; percent: number; label: string } {
  if (visited.has(goal.id)) return { current: 0, target: 0, percent: 0, label: '目标关系有循环' };
  const nextVisited = new Set(visited).add(goal.id);
  if (goal.progress_mode === 'children') {
    const children = goals.filter((item) => item.parent_goal_id === goal.id);
    const total = children.reduce((sum, child) => sum + goalProgress(child, goals, tasks, checkins, today, nextVisited).percent, 0);
    const percent = children.length ? Math.round(total / children.length) : 0;
    return { current: children.length, target: children.length, percent, label: `${children.length} 个子目标的平均进度` };
  }
  const target = Math.max(1, goal.target_count || 1);
  let start = goal.start_date;
  let end = goal.end_date;
  if (goal.cadence === 'week') {
    const anchor = today < start ? start : today > end ? end : today;
    const week = periodRange('weekly', anchor);
    start = start > week.start ? start : week.start;
    end = end < week.end ? end : week.end;
  }
  const current = goal.progress_mode === 'habit'
    ? new Set(checkins.filter((item) => item.habit_id === goal.habit_id && item.checkin_date >= start && item.checkin_date <= end).map((item) => item.checkin_date)).size
    : tasks.filter((item) => item.schedule_goal_id === goal.id && item.status === 'completed' && item.date >= start && item.date <= end).length;
  return {
    current, target,
    percent: Math.min(100, Math.round(current / target * 100)),
    label: `${current} / ${target} ${goal.progress_mode === 'habit' ? '个有效打卡日' : '项关联任务'}${goal.cadence === 'week' ? ' · 本周' : ''}`,
  };
}
