'use client';

import { useState } from 'react';
import type { Task } from '@/lib/types/task';
import { TASK_PRIORITY_LABELS, TASK_TAG_LABELS } from '@/lib/types/task';
import { Clock, Calendar, Play, Edit2, Trash2, Copy, Check, Circle, MoreHorizontal } from 'lucide-react';

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

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high': return 'border-l-red-400';
      case 'medium': return 'border-l-amber-400';
      case 'low': return 'border-l-blue-400';
      default: return 'border-l-gray-400';
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'study': return 'bg-blue-50 text-blue-700';
      case 'work': return 'bg-purple-50 text-purple-700';
      case 'life': return 'bg-green-50 text-green-700';
      case 'health': return 'bg-pink-50 text-pink-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border-l-4 ${getPriorityColor()} border border-gray-100 p-5 transition-all duration-300 hover:shadow-lg hover:border-emerald-200 ${
        task.status === 'completed' ? 'opacity-60' : ''
      } ${isSelected ? 'ring-2 ring-emerald-400' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-4">
        {/* 复选框 */}
        <button
          onClick={handleCheckboxChange}
          className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110"
        >
          {task.status === 'completed' ? (
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            </div>
          ) : (
            <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-500 transition-colors" />
          )}
        </button>

        {/* 任务内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h3
            className={`text-base font-medium mb-2 ${
              task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {task.title}
          </h3>

          {/* 描述 */}
          {task.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
          )}

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 时间 */}
            {task.start_time && task.end_time && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(task.start_time)} - {formatTime(task.end_time)}</span>
              </div>
            )}

            {/* 优先级 */}
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getPriorityBadge()}`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>

            {/* 标签 */}
            {task.tags && task.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-md text-xs font-medium ${getTagColor(tag)}`}
              >
                {TASK_TAG_LABELS[tag]}
              </span>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className={`flex-shrink-0 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-1">
            {task.status !== 'completed' && (
              <button
                onClick={() => onStartPomodoro(task)}
                className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                title="开始番茄钟"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onEdit(task)}
              className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicate(task)}
              className="p-2 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
              title="复制"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm('确定要删除这个任务吗？')) {
                  onDelete(task.id);
                }
              }}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 完成时间 */}
      {task.completed_at && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            完成于 {new Date(task.completed_at).toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      )}
    </div>
  );
}
