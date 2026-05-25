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
        <div className="space-y-2">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-white/60 backdrop-blur-sm border border-emerald-100/50 shadow-sm rounded-lg p-3 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <Folder className="w-4 h-4 text-emerald-600 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate mb-1">{project.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(project.start_date), 'MM/dd', { locale: zhCN })} - {format(new Date(project.end_date), 'MM/dd', { locale: zhCN })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {getStatusBadge(project.status)}

                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 w-8 text-right">{project.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
