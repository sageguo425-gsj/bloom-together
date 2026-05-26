'use client';

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Project } from '@/lib/types/database';
import { Calendar, TrendingUp, Folder, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
}

export default function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const [completedTasks, setCompletedTasks] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadCompletedTasks();
  }, [project.id]);

  const loadCompletedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', project.id)
        .eq('status', 'completed');

      if (error) throw error;
      setCompletedTasks(data?.length || 0);
    } catch (error) {
      console.error('加载已完成任务失败:', error);
    }
  };

  const getStatusColor = () => {
    switch (project.status) {
      case 'pending': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'in_progress': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = () => {
    switch (project.status) {
      case 'pending': return '未开始';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      default: return project.status;
    }
  };

  const getPriorityColor = () => {
    switch (project.priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityLabel = () => {
    switch (project.priority) {
      case 'high': return '高优先级';
      case 'medium': return '中优先级';
      case 'low': return '低优先级';
      default: return '';
    }
  };

  const getProgressColor = () => {
    if (project.status === 'completed') return 'bg-blue-500';
    if (project.status === 'pending') return 'bg-orange-400';
    return 'bg-emerald-500';
  };

  // 计算实际进度
  const totalTasks = project.total_tasks || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1 h-full flex flex-col relative">
      {/* 顶部：图标和状态 */}
      <div className="flex items-start justify-between mb-4">
        <Link href={`/dashboard/projects/${project.id}`} className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm cursor-pointer">
            <Folder className="w-6 h-6 text-white" />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit?.(project);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-500 hover:text-emerald-600" />
          </button>
        </div>
      </div>

      {/* 项目标题 */}
      <Link href={`/dashboard/projects/${project.id}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1 cursor-pointer">
          {project.title}
        </h3>
      </Link>

      {/* 项目描述 */}
      <Link href={`/dashboard/projects/${project.id}`} className="flex-1 mb-4 cursor-pointer">
        {project.description && (
          <p className="text-sm text-gray-500 line-clamp-2">
            {project.description}
          </p>
        )}
      </Link>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>进度</span>
          <span className="font-medium">
            {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '未设定'}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500 rounded-full`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 底部：日期和优先级 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {format(new Date(project.start_date), 'MM/dd', { locale: zhCN })} - {format(new Date(project.end_date), 'MM/dd', { locale: zhCN })}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${getPriorityColor()}`}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{getPriorityLabel()}</span>
        </div>
      </div>
    </div>
  );
}
