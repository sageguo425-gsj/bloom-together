'use client'

import { useState } from 'react'
import { PartnerTask, toggleLike } from '@/lib/services/partnerService'
import { Heart, Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface PartnerTasksProps {
  tasks: PartnerTask[]
}

export function PartnerTasks({ tasks: initialTasks }: PartnerTasksProps) {
  const [tasks, setTasks] = useState(initialTasks)

  const handleLike = async (taskId: number) => {
    const success = await toggleLike('task', taskId)
    if (success) {
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            is_liked_by_me: !task.is_liked_by_me,
            likes_count: task.is_liked_by_me ? task.likes_count - 1 : task.likes_count + 1
          }
        }
        return task
      }))
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'in_progress': return <AlertCircle className="w-5 h-5 text-blue-600" />
      default: return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-emerald-900">任务列表</h2>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-emerald-700/70 text-lg">伴侣暂无进行中的任务</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="group bg-white/60 backdrop-blur-sm border border-emerald-100/50 shadow-sm rounded-lg p-3 hover:border-emerald-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(task.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{task.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {task.date && (
                      <span className="flex items-center gap-1">
                        📅 {task.date}
                      </span>
                    )}
                    {task.start_time && task.end_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.start_time} - {task.end_time}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleLike(task.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-pink-50/50 transition-colors flex-shrink-0"
                >
                  <Heart
                    className={`w-4 h-4 ${task.is_liked_by_me ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                  />
                  <span className="text-xs font-medium text-gray-600">{task.likes_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
