'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarDays, ChevronRight, CirclePlus, ClipboardCheck, Clock3, Folder, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskFormData } from '@/lib/types/task';
import TaskForm from '../tasks/components/TaskForm';
import {
  goalProgress, periodRange, shanghaiToday,
  type GoalPeriod, type ProgressMode, type ReviewPeriod,
  type ScheduleCheckin, type ScheduleGoal, type ScheduleReview, type ScheduleTerm,
} from '@/lib/utils/schedule';

type NamedHabit = { id: string; name: string; icon: string };
type NamedProject = { id: number; title: string };
type GoalDraft = {
  title: string; description: string; period: GoalPeriod; start_date: string; end_date: string;
  parent_goal_id: string; progress_mode: ProgressMode; cadence: 'period' | 'week';
  target_count: string; habit_id: string; project_id: string;
};
type GoalMapTab = 'today' | GoalPeriod;

const periodNames: Record<GoalPeriod, string> = { semester: '学期', month: '月', week: '周' };
const reviewNames: Record<ReviewPeriod, string> = { daily: '每日', weekly: '每周', monthly: '每月', semester: '学期' };
const fieldClass = 'w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
const labelClass = 'block text-xs font-medium text-emerald-900 mb-1.5';
const buttonClass = 'rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50';

function describeScheduleLoadError(error: { code?: string; message: string }): string {
  if (error.code === '42501') {
    return '当前账号没有访问日程数据表的权限（42501）。请执行日程权限补充迁移。';
  }
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return `日程数据表不存在或尚未被 API 识别（${error.code}）。请确认已执行日程建表迁移。`;
  }
  return `加载学期失败：${error.message}${error.code ? `（${error.code}）` : ''}`;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-emerald-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4"><h3 className="text-xl font-semibold text-emerald-950">{title}</h3><button type="button" onClick={onClose} aria-label="关闭" className="rounded-full p-2 text-gray-600 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>;
}

function getDefaultGoalDraft(period: GoalPeriod, term: ScheduleTerm, today: string): GoalDraft {
  const anchor = today < term.start_date ? term.start_date : today > term.end_date ? term.end_date : today;
  const range = period === 'semester' ? { start: term.start_date, end: term.end_date } : periodRange(period === 'week' ? 'weekly' : 'monthly', anchor);
  return {
    title: '', description: '', period,
    start_date: range.start < term.start_date ? term.start_date : range.start,
    end_date: range.end > term.end_date ? term.end_date : range.end,
    parent_goal_id: '', progress_mode: period === 'semester' ? 'children' : 'tasks',
    cadence: 'period', target_count: '1', habit_id: '', project_id: '',
  };
}

export default function ScheduleHub({ userId, todayTasks: todayTasksProp, onTaskChanged, onTaskToggle, refreshToken = 0 }: { userId: string; todayTasks?: Task[]; onTaskChanged?: () => void; onTaskToggle?: (taskId: string, currentStatus: string) => Promise<void>; refreshToken?: number }) {
  const supabase = useMemo(() => createClient(), []);
  const today = shanghaiToday();
  const [terms, setTerms] = useState<ScheduleTerm[]>([]);
  const [activeTermId, setActiveTermId] = useState('');
  const [goals, setGoals] = useState<ScheduleGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkins, setCheckins] = useState<ScheduleCheckin[]>([]);
  const [habits, setHabits] = useState<NamedHabit[]>([]);
  const [projects, setProjects] = useState<NamedProject[]>([]);
  const [reviews, setReviews] = useState<ScheduleReview[]>([]);
  const [goalPeriod, setGoalPeriod] = useState<GoalMapTab>('semester');
  const [reviewPeriod, setReviewPeriod] = useState<ReviewPeriod>('daily');
  const [reviewAnchor, setReviewAnchor] = useState(today);
  const [reviewDraft, setReviewDraft] = useState({ wins: '', obstacles: '', next_steps: '' });
  const [termModal, setTermModal] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termDraft, setTermDraft] = useState({ name: '', start_date: '', end_date: '' });
  const [goalModal, setGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState<GoalDraft | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState<Partial<TaskFormData> | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [termsLoadFailed, setTermsLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const activeTerm = terms.find((term) => term.id === activeTermId);
  const selectedGoal = goals.find((goal) => goal.id === detailId);

  const loadTerms = useCallback(async () => {
    const result = await supabase.from('schedule_terms').select('*').eq('user_id', userId).order('start_date', { ascending: false });
    if (result.error) {
      console.error('加载学期失败:', result.error);
      setTermsLoadFailed(true);
      setError(describeScheduleLoadError(result.error));
      setLoading(false);
      return;
    }
    const rows = (result.data || []) as ScheduleTerm[];
    setTermsLoadFailed(false);
    setError('');
    setTerms(rows);
    setActiveTermId((current) => current && rows.some((item) => item.id === current) ? current : (rows.find((item) => item.start_date <= today && item.end_date >= today)?.id || rows[0]?.id || ''));
    setLoading(false);
  }, [supabase, userId, today]);

  useEffect(() => { void loadTerms(); }, [loadTerms]);
  useEffect(() => {
    if (activeTerm && (reviewAnchor < activeTerm.start_date || reviewAnchor > activeTerm.end_date)) {
      setReviewAnchor(today < activeTerm.start_date ? activeTerm.start_date : today > activeTerm.end_date ? activeTerm.end_date : today);
    }
  }, [activeTerm, reviewAnchor, today]);

  useEffect(() => {
    if (!activeTerm) { setGoals([]); setReviews([]); return; }
    let cancelled = false;
    const load = async () => {
      const [goalResult, taskResult, checkinResult, habitResult, projectResult, reviewResult] = await Promise.all([
        supabase.from('schedule_goals').select('*').eq('user_id', userId).eq('term_id', activeTerm.id).order('created_at'),
        supabase.from('tasks').select('*').eq('user_id', userId).gte('date', activeTerm.start_date).lte('date', activeTerm.end_date).order('date'),
        supabase.from('habit_checkins').select('habit_id, checkin_date').eq('user_id', userId).gte('checkin_date', activeTerm.start_date).lte('checkin_date', activeTerm.end_date),
        supabase.from('habits').select('id, name, icon').eq('user_id', userId).eq('is_active', true).order('name'),
        supabase.from('projects').select('id, title').eq('user_id', userId).in('status', ['pending', 'in_progress']).order('title'),
        supabase.from('schedule_reviews').select('*').eq('user_id', userId).eq('term_id', activeTerm.id),
      ]);
      if (cancelled) return;
      const firstError = [goalResult, taskResult, checkinResult, habitResult, projectResult, reviewResult].find((result) => result.error)?.error;
      if (firstError) { setError(firstError.message); return; }
      setError('');
      setGoals((goalResult.data || []) as ScheduleGoal[]);
      setTasks((taskResult.data || []) as Task[]);
      setCheckins((checkinResult.data || []) as ScheduleCheckin[]);
      setHabits((habitResult.data || []) as NamedHabit[]);
      setProjects((projectResult.data || []) as NamedProject[]);
      setReviews((reviewResult.data || []) as ScheduleReview[]);
    };
    void load();
    return () => { cancelled = true; };
  }, [activeTerm, supabase, userId, version, refreshToken]);

  const reviewRange = activeTerm ? periodRange(reviewPeriod, reviewAnchor, activeTerm) : { start: today, end: today };
  const savedReview = reviews.find((item) => item.period === reviewPeriod && item.period_start === reviewRange.start);
  useEffect(() => { setReviewDraft({ wins: savedReview?.wins || '', obstacles: savedReview?.obstacles || '', next_steps: savedReview?.next_steps || '' }); }, [savedReview?.id, savedReview?.updated_at, savedReview?.wins, savedReview?.obstacles, savedReview?.next_steps, reviewPeriod, reviewRange.start]);
  const todayTasks = todayTasksProp ?? tasks.filter((task) => task.date === today);
  const periodTasks = tasks.filter((task) => task.date >= reviewRange.start && task.date <= reviewRange.end);
  const periodCheckins = new Set(checkins.filter((item) => item.checkin_date >= reviewRange.start && item.checkin_date <= reviewRange.end).map((item) => `${item.habit_id}|${item.checkin_date}`));
  const semesterGoals = goals.filter((goal) => goal.period === 'semester');
  const semesterProgress = semesterGoals.length ? Math.round(semesterGoals.reduce((sum, goal) => sum + goalProgress(goal, goals, tasks, checkins, today).percent, 0) / semesterGoals.length) : 0;

  function setPreset(type: 'fall' | 'spring') {
    const year = Number(today.slice(0, 4));
    const startYear = type === 'fall' ? year : (Number(today.slice(5, 7)) >= 8 ? year + 1 : year);
    setTermDraft(type === 'fall'
      ? { name: `${startYear} 秋季学期`, start_date: `${startYear}-09-01`, end_date: `${startYear + 1}-01-20` }
      : { name: `${startYear} 春季学期`, start_date: `${startYear}-02-20`, end_date: `${startYear}-07-10` });
  }

  async function saveTerm(event: React.FormEvent) {
    event.preventDefault();
    if (!termDraft.name.trim() || termDraft.end_date < termDraft.start_date) { setError('请检查学期名称与日期。'); return; }
    if (editingTermId && goals.some((goal) => goal.start_date < termDraft.start_date || goal.end_date > termDraft.end_date)) { setError('已有目标超出新的学期日期，请先调整目标时间。'); return; }
    setBusy(true);
    const payload = { ...termDraft, name: termDraft.name.trim(), user_id: userId };
    const result = editingTermId
      ? await supabase.from('schedule_terms').update(payload).eq('id', editingTermId).eq('user_id', userId).select().single()
      : await supabase.from('schedule_terms').insert(payload).select().single();
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setTermModal(false); setEditingTermId(null); setError('');
    setActiveTermId(result.data.id);
    await loadTerms();
  }

  function openGoal(period: GoalPeriod, goal?: ScheduleGoal) {
    if (!activeTerm) return;
    setError('');
    setEditingGoalId(goal?.id || null);
    setGoalDraft(goal ? {
      title: goal.title, description: goal.description, period: goal.period, start_date: goal.start_date, end_date: goal.end_date,
      parent_goal_id: goal.parent_goal_id || '', progress_mode: goal.progress_mode, cadence: goal.cadence,
      target_count: String(goal.target_count || 1), habit_id: goal.habit_id || '', project_id: String(goal.project_id || ''),
    } : getDefaultGoalDraft(period, activeTerm, today));
    setGoalModal(true);
  }

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!activeTerm || !goalDraft) return;
    if (!goalDraft.title.trim() || goalDraft.end_date < goalDraft.start_date || goalDraft.start_date < activeTerm.start_date || goalDraft.end_date > activeTerm.end_date) { setError('目标日期需要落在当前学期内。'); return; }
    if (goalDraft.period === 'week' && goalDraft.progress_mode === 'children') { setError('本周目标应由任务完成或习惯打卡更新进度。'); return; }
    if (editingGoalId && goals.find((goal) => goal.id === editingGoalId)?.period !== goalDraft.period) { setError('编辑目标时不能更改周期，请新建另一周期的目标。'); return; }
    if (goalDraft.progress_mode === 'habit' && !goalDraft.habit_id) { setError('请为习惯打卡型目标选择习惯。'); return; }
    const payload = {
      user_id: userId, term_id: activeTerm.id, title: goalDraft.title.trim(), description: goalDraft.description.trim(),
      period: goalDraft.period, start_date: goalDraft.start_date, end_date: goalDraft.end_date,
      parent_goal_id: goalDraft.parent_goal_id || null, progress_mode: goalDraft.progress_mode,
      cadence: goalDraft.cadence, target_count: goalDraft.progress_mode === 'children' ? null : Number(goalDraft.target_count),
      habit_id: goalDraft.progress_mode === 'habit' ? goalDraft.habit_id : null,
      project_id: goalDraft.project_id ? Number(goalDraft.project_id) : null,
    };
    if (payload.target_count !== null && (!Number.isInteger(payload.target_count) || payload.target_count < 1)) { setError('目标数量必须是大于 0 的整数。'); return; }
    setBusy(true);
    const result = editingGoalId
      ? await supabase.from('schedule_goals').update(payload).eq('id', editingGoalId).eq('user_id', userId)
      : await supabase.from('schedule_goals').insert(payload);
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setGoalModal(false); setError(''); setVersion((value) => value + 1);
  }

  async function deleteGoal(goal: ScheduleGoal) {
    if (!window.confirm(`删除“${goal.title}”？关联任务会保留，但不再关联此目标。`)) return;
    const result = await supabase.from('schedule_goals').delete().eq('id', goal.id).eq('user_id', userId);
    if (result.error) { setError(result.error.message); return; }
    setDetailId(null); setVersion((value) => value + 1);
  }

  async function createTask(formData: TaskFormData) {
    setBusy(true);
    const result = await supabase.from('tasks').insert({ ...formData, user_id: userId, status: formData.status || 'pending' });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setTaskDraft(null); setDetailId(null); setError(''); setVersion((value) => value + 1); onTaskChanged?.();
  }

  async function saveReview(event: React.FormEvent) {
    event.preventDefault();
    if (!activeTerm) return;
    setBusy(true);
    const result = await supabase.from('schedule_reviews').upsert({
      user_id: userId, term_id: activeTerm.id, period: reviewPeriod,
      period_start: reviewRange.start, period_end: reviewRange.end,
      ...reviewDraft, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,period,period_start' });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setError(''); setVersion((value) => value + 1);
  }

  if (loading) return <section className="mb-8 rounded-3xl bg-white/90 p-8 text-emerald-900">正在加载目标地图…</section>;

  return <section className="mb-10 space-y-5" aria-label="目标地图与阶段复盘">
    <div className="rounded-3xl border border-white/40 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold tracking-[.2em] text-emerald-100">YOUR GROWTH MAP</p><h2 className="text-2xl font-light sm:text-3xl">从今天的行动，走向长期目标</h2><p className="mt-2 text-sm text-emerald-50/85">学期定方向，月度抓重点，每周安排可以完成的任务。</p></div>
        <div className="flex flex-wrap gap-2"><select aria-label="选择学期" className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm text-white [&>option]:text-gray-900" value={activeTermId} onChange={(event) => setActiveTermId(event.target.value)}><option value="" disabled>选择学期</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select><button type="button" onClick={() => { setEditingTermId(null); setTermDraft({ name: '', start_date: '', end_date: '' }); setTermModal(true); }} className="rounded-full border border-white/50 px-4 py-2 text-sm hover:bg-white/15">＋ 管理学期</button></div>
      </div>
      {activeTerm && <div className="mt-7 flex flex-wrap items-end gap-5"><div className="min-w-44"><p className="text-xs text-emerald-100">{activeTerm.name} · {activeTerm.start_date} — {activeTerm.end_date}</p><p className="mt-1 text-3xl font-light">{semesterProgress}%</p></div><div className="h-2 max-w-lg flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${semesterProgress}%` }} /></div><span className="text-xs text-emerald-100">{semesterGoals.length} 项学期目标的平均进度</span></div>}
    </div>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {error && (termModal || goalModal || taskDraft) && <div role="alert" className="fixed left-1/2 top-24 z-[80] w-[min(90vw,36rem)] -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-xl">{error}</div>}
    {!activeTerm ? termsLoadFailed ? <div className="rounded-3xl bg-white/95 p-8 text-center shadow-lg"><h3 className="text-xl text-emerald-950">学期暂时无法加载</h3><p className="mt-2 text-sm text-gray-600">请先处理上方提示，再重新加载。</p><button type="button" className={`${buttonClass} mt-5`} onClick={() => void loadTerms()}>重新加载</button></div> : <div className="rounded-3xl bg-white/95 p-8 text-center shadow-lg"><CalendarDays className="mx-auto mb-3 h-10 w-10 text-emerald-500" /><h3 className="text-xl text-emerald-950">先创建一个学期</h3><p className="mt-2 text-sm text-gray-600">可以从春季或秋季模板开始，再按实际校历调整日期。</p><button type="button" className={`${buttonClass} mt-5`} onClick={() => setTermModal(true)}>＋ 创建学期</button></div> : <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <div className="rounded-3xl border border-emerald-100 bg-white/95 p-5 shadow-lg sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-xl font-semibold text-emerald-950"><Target className="h-5 w-5 text-emerald-600" />我的目标地图</h3><p className="mt-1 text-xs text-gray-600">今日待办与项目、目标和习惯共用同一份任务记录。</p></div>
            <button type="button" className={buttonClass} onClick={() => goalPeriod === 'today' ? setTaskDraft({ date: today }) : openGoal(goalPeriod)}>{goalPeriod === 'today' ? '＋ 新建任务' : '＋ 新建目标'}</button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-b border-emerald-100 pb-3" role="tablist" aria-label="目标周期">{(['today', 'semester', 'month', 'week'] as GoalMapTab[]).map((period) => <button key={period} type="button" role="tab" aria-selected={goalPeriod === period} onClick={() => setGoalPeriod(period)} className={`rounded-full px-4 py-2 text-sm ${goalPeriod === period ? 'bg-emerald-600 text-white' : 'text-emerald-800 hover:bg-emerald-50'}`}>{period === 'today' ? '今日' : periodNames[period]}</button>)}</div>
          {goalPeriod === 'today' ? (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500"><span>{today} · 今日待办</span><span>{todayTasks.filter((task) => task.status === 'completed').length} / {todayTasks.length} 已完成</span></div>
              {todayTasks.length ? todayTasks.map((task) => {
                const project = projects.find((item) => item.id === task.project_id);
                const habit = habits.find((item) => item.id === task.habit_id);
                const goal = goals.find((item) => item.id === task.schedule_goal_id);
                return <div key={task.id} className={`flex items-start gap-3 rounded-2xl border p-4 transition ${task.status === 'completed' ? 'border-gray-200 bg-gray-50/80 opacity-65' : 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 hover:border-emerald-300 hover:shadow-sm'}`}>
                  <input type="checkbox" aria-label={`完成任务：${task.title}`} checked={task.status === 'completed'} disabled={!onTaskToggle} onChange={() => void onTaskToggle?.(task.id, task.status)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed" />
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-emerald-950'}`}>{task.title}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      {task.start_time && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{task.start_time.slice(0, 5)}{task.end_time ? `–${task.end_time.slice(0, 5)}` : ''}</span>}
                      {project && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700"><Folder className="h-3.5 w-3.5" />{project.title}</span>}
                      {goal && <span className="rounded-full bg-teal-50 px-2 py-1 text-teal-700">目标 · {goal.title}</span>}
                      {habit && <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">{habit.icon} {habit.name}</span>}
                    </div>
                  </div>
                </div>;
              }) : <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center"><p className="text-sm text-gray-600">今天还没有待办。</p><button type="button" onClick={() => setTaskDraft({ date: today })} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"><Plus className="h-4 w-4" />添加今日任务</button></div>}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{goals.filter((goal) => goal.period === goalPeriod).length ? goals.filter((goal) => goal.period === goalPeriod).map((goal) => {
              const progress = goalProgress(goal, goals, tasks, checkins, today);
              const parent = goals.find((item) => item.id === goal.parent_goal_id);
              return <button key={goal.id} type="button" onClick={() => setDetailId(goal.id)} className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-4 text-left transition hover:border-emerald-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><h4 className="font-semibold text-emerald-950">{goal.title}</h4><ChevronRight className="h-4 w-4 shrink-0 text-emerald-500" /></div><p className="mt-1 line-clamp-2 min-h-8 text-xs text-gray-600">{goal.description || (parent ? `上级目标 · ${parent.title}` : '点击查看关联内容')}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${progress.percent}%` }} /></div><div className="mt-2 flex justify-between gap-2 text-xs text-emerald-800"><span className="truncate">{progress.label}</span><strong>{progress.percent}%</strong></div></button>;
            }) : <div className="col-span-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center text-sm text-gray-600">还没有{periodNames[goalPeriod]}目标。点击“新建目标”开始。</div>}</div>
          )}
        </div>
        <div className="space-y-5"><div className="rounded-3xl border border-emerald-100 bg-white/95 p-5 shadow-lg sm:p-6"><h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-950"><ClipboardCheck className="h-5 w-5 text-emerald-600" />本周联动</h3><p className="mt-1 text-xs text-gray-600">完成任务后，这里的目标进度会自动变化。</p><div className="mt-4 space-y-3">{goals.filter((goal) => goal.period === 'week' || goal.cadence === 'week').slice(0, 4).map((goal) => { const progress = goalProgress(goal, goals, tasks, checkins, today); return <button key={goal.id} type="button" onClick={() => setDetailId(goal.id)} className="block w-full rounded-xl bg-emerald-50 p-3 text-left"><div className="flex justify-between gap-3 text-sm"><span className="font-medium text-emerald-950">{goal.title}</span><span className="text-emerald-700">{progress.percent}%</span></div><p className="mt-1 text-xs text-gray-600">{progress.label}</p></button>; })}{!goals.some((goal) => goal.period === 'week' || goal.cadence === 'week') && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-gray-600">可以创建“每周运动 3 次”等习惯打卡目标。</p>}</div></div><div className="rounded-3xl border border-emerald-100 bg-white/95 p-5 shadow-lg sm:p-6"><h3 className="text-lg font-semibold text-emerald-950">今日完成</h3><p className="mt-1 text-xs text-gray-600">勾选左侧“今日”待办后会同步更新。</p><p className="mt-4 text-3xl font-light text-emerald-800">{todayTasks.filter((task) => task.status === 'completed').length}<span className="text-lg text-gray-400"> / {todayTasks.length}</span></p></div></div>
      </div>

      <div className="rounded-3xl border border-emerald-100 bg-white/95 p-5 shadow-lg sm:p-7" id="reviews"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold text-emerald-950">阶段复盘</h3><p className="mt-1 text-xs text-gray-600">自动汇总真实行动，再写下观察与调整。</p></div><div className="flex flex-wrap gap-2" role="tablist" aria-label="复盘周期">{(['daily', 'weekly', 'monthly', 'semester'] as ReviewPeriod[]).map((period) => <button key={period} type="button" role="tab" aria-selected={reviewPeriod === period} onClick={() => setReviewPeriod(period)} className={`rounded-full px-3 py-2 text-xs font-medium ${reviewPeriod === period ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>{reviewNames[period]}复盘</button>)}</div></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(250px,.8fr)_minmax(0,1.2fr)]"><div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5"><label className={labelClass} htmlFor="review-anchor">回顾日期</label><input id="review-anchor" type="date" className={fieldClass} value={reviewAnchor} min={activeTerm.start_date} max={activeTerm.end_date} disabled={reviewPeriod === 'semester'} onChange={(event) => setReviewAnchor(event.target.value)} /><p className="mt-3 text-sm font-medium text-emerald-950">{reviewRange.start} — {reviewRange.end}</p><div className="mt-5 space-y-2 text-sm text-emerald-900"><p className="rounded-xl bg-white/80 p-3">完成任务：{periodTasks.filter((task) => task.status === 'completed').length} / {periodTasks.length} 项</p><p className="rounded-xl bg-white/80 p-3">习惯打卡：{periodCheckins.size} 个有效记录</p><p className="rounded-xl bg-white/80 p-3">本期目标：{goals.filter((goal) => goal.start_date <= reviewRange.end && goal.end_date >= reviewRange.start).length} 项</p></div></div><form onSubmit={saveReview} className="space-y-3"><div><label className={labelClass} htmlFor="review-wins">做得好的事</label><textarea id="review-wins" rows={2} className={fieldClass} value={reviewDraft.wins} onChange={(event) => setReviewDraft({ ...reviewDraft, wins: event.target.value })} placeholder="值得保留的做法" /></div><div><label className={labelClass} htmlFor="review-obstacles">遇到的阻碍</label><textarea id="review-obstacles" rows={2} className={fieldClass} value={reviewDraft.obstacles} onChange={(event) => setReviewDraft({ ...reviewDraft, obstacles: event.target.value })} placeholder="卡住的地方及原因" /></div><div><label className={labelClass} htmlFor="review-next">下一步调整</label><textarea id="review-next" rows={2} className={fieldClass} value={reviewDraft.next_steps} onChange={(event) => setReviewDraft({ ...reviewDraft, next_steps: event.target.value })} placeholder="下一个阶段的具体行动" /></div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-gray-500">{savedReview ? `上次保存：${new Date(savedReview.updated_at).toLocaleString('zh-CN')}` : '尚未保存'}</span><button type="submit" className={buttonClass} disabled={busy}>保存{reviewNames[reviewPeriod]}复盘</button></div></form></div>
      </div>
    </>}

    {termModal && <Modal title={editingTermId ? '编辑学期' : '创建学期'} onClose={() => setTermModal(false)}><div className="mb-4 flex gap-2"><button type="button" className="rounded-full bg-emerald-50 px-3 py-2 text-xs text-emerald-800" onClick={() => setPreset('fall')}>秋季模板</button><button type="button" className="rounded-full bg-emerald-50 px-3 py-2 text-xs text-emerald-800" onClick={() => setPreset('spring')}>春季模板</button><span className="self-center text-xs text-gray-500">日期可按校历修改</span></div><form onSubmit={saveTerm} className="space-y-4"><div><label className={labelClass} htmlFor="term-name">学期名称</label><input id="term-name" required className={fieldClass} value={termDraft.name} onChange={(event) => setTermDraft({ ...termDraft, name: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass} htmlFor="term-start">开始日期</label><input id="term-start" type="date" required className={fieldClass} value={termDraft.start_date} onChange={(event) => setTermDraft({ ...termDraft, start_date: event.target.value })} /></div><div><label className={labelClass} htmlFor="term-end">结束日期</label><input id="term-end" type="date" required className={fieldClass} value={termDraft.end_date} onChange={(event) => setTermDraft({ ...termDraft, end_date: event.target.value })} /></div></div><div className="flex justify-between gap-2"><button type="button" className="text-sm text-emerald-700 hover:underline" disabled={!activeTerm} onClick={() => { if (!activeTerm) return; setEditingTermId(activeTerm.id); setTermDraft({ name: activeTerm.name, start_date: activeTerm.start_date, end_date: activeTerm.end_date }); }}>编辑当前学期</button><button type="submit" className={buttonClass} disabled={busy}>保存学期</button></div></form></Modal>}

    {goalModal && goalDraft && activeTerm && <Modal title={editingGoalId ? '编辑目标' : '新建目标'} onClose={() => setGoalModal(false)}><form onSubmit={saveGoal} className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className={labelClass} htmlFor="goal-period">周期</label><select id="goal-period" className={fieldClass} value={goalDraft.period} onChange={(event) => { const period = event.target.value as GoalPeriod; setGoalDraft({ ...getDefaultGoalDraft(period, activeTerm, today), title: goalDraft.title, description: goalDraft.description }); }}><option value="semester">学期目标</option><option value="month">月度目标</option><option value="week">本周目标</option></select></div><div><label className={labelClass} htmlFor="goal-parent">上级目标</label><select id="goal-parent" className={fieldClass} value={goalDraft.parent_goal_id} onChange={(event) => setGoalDraft({ ...goalDraft, parent_goal_id: event.target.value })}><option value="">无</option>{goals.filter((goal) => goal.id !== editingGoalId && (goalDraft.period === 'month' ? goal.period === 'semester' : goalDraft.period === 'week' ? goal.period === 'month' : false)).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div></div><div><label className={labelClass} htmlFor="goal-title">目标名称</label><input id="goal-title" required maxLength={80} className={fieldClass} value={goalDraft.title} onChange={(event) => setGoalDraft({ ...goalDraft, title: event.target.value })} placeholder="例如：每周运动 3 次" /></div><div><label className={labelClass} htmlFor="goal-description">说明</label><textarea id="goal-description" rows={2} className={fieldClass} value={goalDraft.description} onChange={(event) => setGoalDraft({ ...goalDraft, description: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass} htmlFor="goal-start">开始日期</label><input id="goal-start" type="date" min={activeTerm.start_date} max={activeTerm.end_date} required className={fieldClass} value={goalDraft.start_date} onChange={(event) => setGoalDraft({ ...goalDraft, start_date: event.target.value })} /></div><div><label className={labelClass} htmlFor="goal-end">结束日期</label><input id="goal-end" type="date" min={activeTerm.start_date} max={activeTerm.end_date} required className={fieldClass} value={goalDraft.end_date} onChange={(event) => setGoalDraft({ ...goalDraft, end_date: event.target.value })} /></div></div><div className="grid grid-cols-2 gap-3"><div><label className={labelClass} htmlFor="goal-mode">进度来源</label><select id="goal-mode" className={fieldClass} value={goalDraft.progress_mode} onChange={(event) => setGoalDraft({ ...goalDraft, progress_mode: event.target.value as ProgressMode })}><option value="tasks">关联任务完成数</option><option value="habit">关联习惯打卡日</option><option value="children">子目标平均进度</option></select></div><div><label className={labelClass} htmlFor="goal-project">关联项目（可选）</label><select id="goal-project" className={fieldClass} value={goalDraft.project_id} onChange={(event) => setGoalDraft({ ...goalDraft, project_id: event.target.value })}><option value="">无</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></div></div>{goalDraft.progress_mode !== 'children' && <div className="grid grid-cols-2 gap-3"><div><label className={labelClass} htmlFor="goal-target">目标数量</label><input id="goal-target" type="number" min="1" required className={fieldClass} value={goalDraft.target_count} onChange={(event) => setGoalDraft({ ...goalDraft, target_count: event.target.value })} /></div><div><label className={labelClass} htmlFor="goal-cadence">统计窗口</label><select id="goal-cadence" className={fieldClass} value={goalDraft.cadence} onChange={(event) => setGoalDraft({ ...goalDraft, cadence: event.target.value as 'period' | 'week' })}><option value="period">整个目标周期</option><option value="week">每周重新统计</option></select></div></div>}{goalDraft.progress_mode === 'habit' && <div><label className={labelClass} htmlFor="goal-habit">关联习惯</label><select id="goal-habit" className={fieldClass} required value={goalDraft.habit_id} onChange={(event) => setGoalDraft({ ...goalDraft, habit_id: event.target.value })}><option value="">选择习惯</option>{habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.icon} {habit.name}</option>)}</select><p className="mt-1 text-xs text-gray-500">例如：数量 3、统计窗口“每周”，即每周运动 3 次；同一天只计一次。</p></div>}<div className="flex justify-end"><button type="submit" className={buttonClass} disabled={busy}>保存目标</button></div></form></Modal>}

    {selectedGoal && <Modal title={selectedGoal.title} onClose={() => setDetailId(null)}><p className="text-sm text-gray-600">{selectedGoal.description || '暂无说明'}</p>{(() => { const progress = goalProgress(selectedGoal, goals, tasks, checkins, today); const linked = tasks.filter((task) => task.schedule_goal_id === selectedGoal.id); return <><div className="mt-5 rounded-2xl bg-emerald-50 p-5"><p className="text-3xl font-light text-emerald-800">{progress.percent}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full bg-emerald-500" style={{ width: `${progress.percent}%` }} /></div><p className="mt-2 text-xs text-emerald-900">{progress.label}</p></div><div className="mt-5"><h4 className="text-sm font-semibold text-emerald-950">关联任务 · {linked.filter((task) => task.status === 'completed').length}/{linked.length}</h4><div className="mt-2 max-h-36 space-y-1 overflow-y-auto">{linked.length ? linked.map((task) => <div key={task.id} className="flex gap-2 rounded-xl bg-gray-50 p-2 text-xs text-gray-700"><span>{task.status === 'completed' ? '✓' : '○'}</span><span>{task.title} · {task.date}</span></div>) : <p className="text-xs text-gray-500">还没有关联任务，可在这里创建，或在任务界面编辑已有任务。</p>}</div></div></>; })()}<div className="mt-6 flex flex-wrap justify-between gap-2"><div className="flex gap-3"><button type="button" onClick={() => { setDetailId(null); openGoal(selectedGoal.period, selectedGoal); }} className="flex items-center gap-1 text-sm text-emerald-700"><Pencil className="h-4 w-4" />编辑</button><button type="button" onClick={() => void deleteGoal(selectedGoal)} className="flex items-center gap-1 text-sm text-red-600"><Trash2 className="h-4 w-4" />删除</button></div><button type="button" className={buttonClass} onClick={() => { setDetailId(null); setTaskDraft({ date: today < selectedGoal.start_date || today > selectedGoal.end_date ? selectedGoal.start_date : today, schedule_goal_id: selectedGoal.id, habit_id: selectedGoal.habit_id || undefined, project_id: selectedGoal.project_id || undefined }); }}><CirclePlus className="mr-1 inline h-4 w-4" />创建关联任务</button></div></Modal>}

    {taskDraft && <TaskForm initialValues={taskDraft} onSubmit={createTask} onCancel={() => { setTaskDraft(null); setError(''); }} />}
  </section>;
}
