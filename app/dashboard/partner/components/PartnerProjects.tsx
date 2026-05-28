'use client'

import { PartnerProject } from '@/lib/services/partnerService'
import { Folder, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface PartnerProjectsProps {
  projects: PartnerProject[]
}

export function PartnerProjects({ projects }: PartnerProjectsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">进行中</span>
      case 'completed': return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">已完成</span>
      case 'archived': return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">已归档</span>
      default: return null
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-emerald-900">项目进度</h2>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-emerald-700/70 text-lg">伴侣还没有项目</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-white/80 backdrop-blur-sm border border-emerald-100/50 shadow-sm rounded-2xl p-5 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-base mb-1">{project.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(project.start_date), 'MM/dd', { locale: zhCN })} - {format(new Date(project.end_date), 'MM/dd', { locale: zhCN })}
                    </span>
                  </div>
                </div>

                {getStatusBadge(project.status)}
              </div>

              {/* 进度条 */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600 min-w-[60px] text-right">
                  {project.completed_tasks || 0}/{project.total_tasks || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
