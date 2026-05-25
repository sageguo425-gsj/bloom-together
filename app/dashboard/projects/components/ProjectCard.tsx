'use client';

import Link from 'next/link';
import type { Project } from '@/lib/types/database';
import { Calendar, TrendingUp, Folder, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const getStatusColor = () => {
    switch (project.status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'archived': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = () => {
    switch (project.status) {
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'archived': return '已归档';
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

  const getProgressColor = () => {
    if (project.status === 'completed') return 'bg-blue-500';
    if (project.status === 'archived') return 'bg-gray-400';
    return 'bg-emerald-500';
  };

  // 计算项目进度（这里简化处理，实际应该从任务数据计算）
  const progress = project.status === 'completed' ? 100 :
                   project.status === 'archived' ? 0 : 45;

  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1 cursor-pointer">
        {/* 顶部：图标和状态 */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm">
            <Folder className="w-6 h-6 text-white" />
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>

        {/* 项目标题 */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors line-clamp-1">
          {project.title}
        </h3>

        {/* 项目描述 */}
        {project.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* 进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>进度</span>
            <span className="font-medium">{progress}%</span>
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
            <span>
              {project.priority === 'high' ? '高' : project.priority === 'medium' ? '中' : '低'}优先级
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
