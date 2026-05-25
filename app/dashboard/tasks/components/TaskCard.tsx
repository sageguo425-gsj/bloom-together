'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types/task';
import { TASK_PRIORITY_LABELS, TASK_TAG_LABELS, TASK_TAG_COLORS } from '@/lib/types/task';

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
      className={`relative group bg-white/80 backdrop-blur-sm rounded-2xl border-l-4 ${priorityColors[task.priority]} border-t border-r border-b border-emerald-100/50 p-5 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 ${
        isSelected ? 'ring-2 ring-emerald-500 shadow-lg' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-4">
        {/* 完成状态复选框 */}
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={handleCheckboxChange}
            className="w-6 h-6 rounded-lg border-2 border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all hover:border-emerald-500"
          />
        </div>

        {/* 任务内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题和优先级 */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4
              className={`text-base font-medium text-gray-900 ${
                task.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}
            >
              {task.title}
            </h4>
            <span
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[task.status]}`}
            >
              {task.status === 'pending' && '待办'}
              {task.status === 'in_progress' && '进行中'}
              {task.status === 'completed' && '已完成'}
            </span>
          </div>

          {/* 描述 */}
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
          )}

          {/* 时间信息 */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-3">
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
          </div>

          {/* 标签 */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${TASK_TAG_COLORS[tag]}`}
                >
                  {TASK_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}

          {/* 完成时间 */}
          {task.completed_at && (
            <p className="text-xs text-gray-400 mt-2">
              完成于 {new Date(task.completed_at).toLocaleString('zh-CN')}
            </p>
          )}
        </div>
      </div>

      {/* 快速操作按钮 */}
      {showActions && task.status !== 'completed' && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-emerald-200/50 p-1.5">
          <button
            onClick={() => onStartPomodoro(task)}
            className="p-2 hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50 rounded-lg transition-all group/btn"
            title="开始番茄钟"
          >
            <svg className="w-5 h-5 text-red-600 group-hover/btn:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" opacity="0.2"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </button>
          <button
            onClick={() => {
              if (task.status === 'pending') {
                onStatusChange(task.id, 'in_progress');
              } else {
                onStatusChange(task.id, 'pending');
              }
            }}
            className="p-2 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 rounded-lg transition-all group/btn"
            title={task.status === 'pending' ? '开始任务' : '暂停任务'}
          >
            {task.status === 'pending' ? (
              <svg className="w-5 h-5 text-emerald-600 group-hover/btn:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-600 group-hover/btn:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            )}
          </button>
          <button
            onClick={() => onDuplicate(task)}
            className="p-2 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 rounded-lg transition-all group/btn"
            title="复制任务"
          >
            <svg className="w-5 h-5 text-purple-600 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-2 hover:bg-gradient-to-br hover:from-amber-50 hover:to-yellow-50 rounded-lg transition-all group/btn"
            title="编辑任务"
          >
            <svg className="w-5 h-5 text-amber-600 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除这个任务吗？')) {
                onDelete(task.id);
              }
            }}
            className="p-2 hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 rounded-lg transition-all group/btn"
            title="删除任务"
          >
            <svg className="w-5 h-5 text-red-600 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
