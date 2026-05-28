'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/lib/types/task';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_TAG_LABELS, TASK_TAG_COLORS } from '@/lib/types/task';

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStartPomodoro: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string) => void;
}

export default function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  onStartPomodoro,
  onDuplicate,
  isSelected = false,
  onSelect,
}: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const [habitName, setHabitName] = useState<string>('');
  const supabase = createClient();

  // 加载项目名称和习惯名称
  useEffect(() => {
    const loadRelations = async () => {
      if (task.project_id) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('title')
            .eq('id', task.project_id)
            .single();

          if (!error && data) {
            setProjectName(data.title);
          }
        } catch (error) {
          console.error('加载项目名称失败:', error);
        }
      }

      if (task.habit_id) {
        try {
          const { data, error } = await supabase
            .from('habits')
            .select('name')
            .eq('id', task.habit_id)
            .single();

          if (!error && data) {
            setHabitName(data.name);
          }
        } catch (error) {
          console.error('加载习惯名称失败:', error);
        }
      }
    };

    loadRelations();
  }, [task.project_id, task.habit_id, supabase]);

  const priorityColors = {
    high: 'border-l-rose-500 bg-gradient-to-r from-rose-50/50 to-pink-50/30',
    medium: 'border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-yellow-50/30',
    low: 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/50 to-teal-50/30',
  };

  const statusColors = {
    pending: 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700',
    in_progress: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700',
    completed: 'bg-gradient-to-r from-teal-100 to-green-100 text-teal-700',
  };

  const handleCheckboxChange = () => {
    if (task.status === 'completed') {
      onStatusChange(task.id, 'pending');
    } else {
      onStatusChange(task.id, 'completed');
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time.slice(0, 5);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  return (
    <div
      className={`relative group bg-white/80 backdrop-blur-sm rounded-2xl border-l-4 ${priorityColors[task.priority]} border-t border-r border-b border-emerald-100/50 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 min-h-[120px] flex flex-col ${
        isSelected ? 'ring-2 ring-emerald-500 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 完成状态复选框 */}
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={handleCheckboxChange}
            className="w-5 h-5 rounded-lg border-2 border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all hover:border-emerald-500"
          />
        </div>

        {/* 任务内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题和状态 */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4
              className={`text-base font-medium text-gray-900 ${
                task.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}
              >
                {TASK_STATUS_LABELS[task.status]}
              </span>
              {/* 删除按钮 */}
              <button
                onClick={() => onDelete(task.id)}
                className="flex-shrink-0 p-1.5 hover:bg-red-50 rounded-lg transition-colors group/delete"
                title="删除任务"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover/delete:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {/* 设置图标 */}
              <button
                onClick={() => onEdit(task)}
                className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="编辑任务"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            {task.start_time && task.end_time && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-lg border border-gray-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {formatTime(task.start_time)} - {formatTime(task.end_time)}
                </span>
              </span>
            )}
            {task.estimated_duration && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 rounded-lg border border-gray-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>预计 {formatDuration(task.estimated_duration)}</span>
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium shadow-sm ${
              task.priority === 'high' ? 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 border border-rose-200' :
              task.priority === 'medium' ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200' :
              'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200'
            }`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
            {projectName && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>{projectName}</span>
              </span>
            )}
            {habitName && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{habitName}</span>
              </span>
            )}
          </div>

          {/* 标签 */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    TASK_TAG_COLORS[tag] || 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {TASK_TAG_LABELS[tag] || tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
