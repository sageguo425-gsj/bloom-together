'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskFormData, TaskPriority, TaskStatus } from '@/lib/types/task';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/types/task';
import { Check, Plus, Trash2, X } from 'lucide-react';
import styles from './TaskForm.module.css';

interface TaskFormProps {
  task?: Task;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

interface Project {
  id: number;
  title: string;
}

interface Habit {
  id: string; // UUID
  title: string;
  icon: string;
}

interface UserTag {
  id: number;
  name: string;
  color: string;
}

interface TagContextMenu {
  tag: UserTag;
  x: number;
  y: number;
}

export default function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'pending',
    tags: task?.tags || [],
    date: task?.date || new Date().toISOString().split('T')[0],
    start_time: task?.start_time || '',
    end_time: task?.end_time || '',
    estimated_duration: task?.estimated_duration || undefined,
    project_id: task?.project_id || undefined,
    habit_id: task?.habit_id || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagContextMenu, setTagContextMenu] = useState<TagContextMenu | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
  const [deletedTagName, setDeletedTagName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProjectsAndHabits();
    loadUserTags();
  }, []);

  const loadProjectsAndHabits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 新建或编辑任务时只允许关联未完成项目
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, title')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('title');

      if (projectsError) {
        console.error('加载项目失败:', projectsError);
      }

      // 加载习惯 - 只加载活跃的习惯
      const { data: habitsData } = await supabase
        .from('habits')
        .select('id, name, icon')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      const availableProjects = projectsData || [];
      setProjects(availableProjects);
      setFormData(prev => {
        if (!prev.project_id || availableProjects.some(project => project.id === prev.project_id)) {
          return prev;
        }

        return { ...prev, project_id: undefined };
      });
      setHabits(habitsData?.map(h => ({ id: h.id, title: h.name, icon: h.icon })) || []);
    } catch (error) {
      console.error('加载项目和习惯失败:', error);
    }
  };

  const loadUserTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tagsData } = await supabase
        .from('user_tags')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('name');

      setUserTags(tagsData || []);
    } catch (error) {
      console.error('加载用户标签失败:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入任务标题';
    }

    if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
      newErrors.time = '结束时间必须晚于开始时间';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const addTag = async () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;

    // 检查标签是否已经在任务中
    if (formData.tags.includes(trimmedTag as any)) {
      setNewTag('');
      setShowTagInput(false);
      return;
    }

    // 检查标签是否已存在于用户标签库中
    const existingTag = userTags.find(t => t.name === trimmedTag);

    if (!existingTag) {
      // 创建新标签到数据库
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: newTagData, error } = await supabase
          .from('user_tags')
          .insert([{ user_id: user.id, name: trimmedTag, color: '#10b981' }])
          .select()
          .single();

        if (error) {
          console.error('创建标签失败:', error);
          alert('创建标签失败，请重试');
          return;
        }

        // 添加到用户标签列表
        setUserTags([...userTags, newTagData]);
      } catch (error) {
        console.error('创建标签失败:', error);
        return;
      }
    }

    // 添加标签到当前任务
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, trimmedTag as any],
    }));
    setNewTag('');
    setShowTagInput(false);
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const showTagContextMenu = (event: React.MouseEvent<HTMLElement>, tag: UserTag) => {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 152;
    const menuHeight = 48;
    const pagePadding = 12;

    setTagContextMenu({
      tag,
      x: Math.min(event.clientX, window.innerWidth - menuWidth - pagePadding),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - pagePadding),
    });
  };

  const deleteUserTag = async () => {
    if (!tagContextMenu || deletingTagId !== null) return;

    const tagToDelete = tagContextMenu.tag;
    setDeletingTagId(tagToDelete.id);

    try {
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('id', tagToDelete.id);

      if (error) throw error;

      setUserTags(prev => prev.filter(tag => tag.id !== tagToDelete.id));
      setFormData(prev => ({
        ...prev,
        tags: prev.tags.filter(tag => tag !== tagToDelete.name),
      }));
      setTagContextMenu(null);
      setDeletedTagName(tagToDelete.name);
    } catch (error) {
      console.error('删除标签失败:', error);
      alert('删除标签失败，请重试');
    } finally {
      setDeletingTagId(null);
    }
  };

  useEffect(() => {
    if (!tagContextMenu) return;

    const closeContextMenu = () => setTagContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContextMenu();
    };

    document.addEventListener('pointerdown', closeContextMenu);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', closeContextMenu);
      window.removeEventListener('resize', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tagContextMenu]);

  useEffect(() => {
    if (!deletedTagName) return;

    const timer = window.setTimeout(() => setDeletedTagName(null), 2200);
    return () => window.clearTimeout(timer);
  }, [deletedTagName]);

  const calculateDuration = () => {
    if (formData.start_time && formData.end_time) {
      const [startHour, startMin] = formData.start_time.split(':').map(Number);
      const [endHour, endMin] = formData.end_time.split(':').map(Number);
      const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      if (duration > 0) {
        setFormData(prev => ({ ...prev, estimated_duration: duration }));
      }
    }
  };

  useEffect(() => {
    calculateDuration();
  }, [formData.start_time, formData.end_time]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-6">
          <h2 className="text-2xl font-light">
            {task ? '编辑任务' : '创建新任务'}
          </h2>
          <p className="text-emerald-100 text-sm font-light mt-1">
            {task ? '修改任务信息' : '填写任务详细信息'}
          </p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="关闭任务表单"
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className={`${styles.scrollArea} min-h-0 flex-1 overflow-y-auto px-8 py-7`}>
            <div className="space-y-6 pr-2">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="输入任务标题..."
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
              placeholder="添加任务描述..."
            />
          </div>

          {/* 选择归属 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择归属
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* 项目选择 */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">关联项目</label>
                <select
                  value={formData.project_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    project_id: e.target.value ? Number(e.target.value) : undefined,
                    habit_id: undefined // 清除习惯选择
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">无关联项目</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 习惯选择 */}
              <div>
                <label className="block text-xs text-gray-600 mb-2">关联习惯</label>
                <select
                  value={formData.habit_id || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      habit_id: value || undefined,
                      project_id: undefined // 清除项目选择
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                >
                  <option value="">无关联习惯</option>
                  {habits.map((habit) => (
                    <option key={habit.id} value={habit.id}>
                      {habit.icon} {habit.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              任务只能关联项目或习惯中的一个
            </p>
          </div>

          {/* 任务状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              任务状态
            </label>
            <div className="flex gap-3">
              {(['pending', 'in_progress', 'completed'] as TaskStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({ ...formData, status })}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    formData.status === status
                      ? status === 'pending'
                        ? 'bg-gray-500 text-white shadow-lg'
                        : status === 'in_progress'
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {TASK_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          {/* 优先级 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              优先级
            </label>
            <div className="flex gap-3">
              {(['high', 'medium', 'low'] as TaskPriority[]).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority })}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    formData.priority === priority
                      ? priority === 'high'
                        ? 'bg-red-500 text-white shadow-lg'
                        : priority === 'medium'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {TASK_PRIORITY_LABELS[priority]}
                </button>
              ))}
            </div>
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              标签
            </label>

            {/* 已选标签 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.tags.map((tag) => {
                const savedTag = userTags.find(userTag => userTag.name === tag);

                return (
                  <div
                    key={tag}
                    onContextMenu={savedTag ? (event) => showTagContextMenu(event, savedTag) : undefined}
                    aria-haspopup={savedTag ? 'menu' : undefined}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`从当前任务移除${tag}标签`}
                      className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 可选标签列表 */}
            {userTags.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">选择已有标签：</p>
                <div className="flex flex-wrap gap-2">
                  {userTags
                    .filter(tag => !formData.tags.includes(tag.name as any))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          tags: [...prev.tags, tag.name as any]
                        }))}
                        onContextMenu={(event) => showTagContextMenu(event, tag)}
                        aria-haspopup="menu"
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* 添加新标签 */}
            <div className="flex items-center gap-2">
              {showTagInput ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    onBlur={addTag}
                    placeholder="输入新标签名称..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowTagInput(false);
                      setNewTag('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTagInput(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  创建新标签
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              创建的标签会保存到标签库；右键单击标签可将其删除
            </p>
          </div>

          {/* 日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              日期
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 时间范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                开始时间
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                结束时间
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          {errors.time && (
            <p className="text-red-500 text-sm">{errors.time}</p>
          )}

          {/* 预计时长 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预计时长（分钟）
            </label>
            <input
              type="number"
              value={formData.estimated_duration || ''}
              onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value ? Number(e.target.value) : undefined })}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="自动计算或手动输入..."
            />
            {formData.estimated_duration && (
              <p className="text-sm text-gray-500 mt-1">
                约 {Math.floor(formData.estimated_duration / 60)}小时 {formData.estimated_duration % 60}分钟
              </p>
            )}
          </div>

            </div>
          </div>

          {/* 固定操作栏 */}
          <div className="shrink-0 flex gap-3 border-t border-emerald-100 bg-white px-8 py-4 shadow-[0_-8px_24px_rgba(16,185,129,0.06)]">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all"
            >
              {task ? '保存修改' : '创建任务'}
            </button>
          </div>
        </form>
      </div>

      {tagContextMenu && (
        <div
          role="menu"
          aria-label={`${tagContextMenu.tag.name}标签操作`}
          className="fixed z-[60] w-38 rounded-xl border border-gray-200 bg-white p-1.5 shadow-2xl"
          style={{ left: tagContextMenu.x, top: tagContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={deleteUserTag}
            disabled={deletingTagId === tagContextMenu.tag.id}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {deletingTagId === tagContextMenu.tag.id ? '正在删除...' : '删除标签'}
          </button>
        </div>
      )}

      {deletedTagName && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-xl"
        >
          <Check className="h-4 w-4" />
          “{deletedTagName}”标签已删除
        </div>
      )}
    </div>
  );
}
