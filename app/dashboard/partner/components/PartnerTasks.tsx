'use client'

import { useState } from 'react'
import { PartnerTask, toggleLike } from '@/lib/services/partnerService'
import { Heart, Clock, CheckCircle2, Circle, AlertCircle, Folder } from 'lucide-react'

interface PartnerTasksProps {
  allTasks: PartnerTask[]
  completedTodayTasks: PartnerTask[]
}

export function PartnerTasks({ allTasks: initialAllTasks, completedTodayTasks: initialCompletedTasks }: PartnerTasksProps) {
  const [allTasks, setAllTasks] = useState(initialAllTasks)
  const [completedTasks, setCompletedTasks] = useState(initialCompletedTasks)

  const handleLike = async (taskId: number, isInCompletedSection: boolean) => {
    const success = await toggleLike('task', taskId)
    if (success) {
      const updateTask = (task: PartnerTask) => {
        if (task.id === taskId) {
          return {
            ...task,
            is_liked_by_me: !task.is_liked_by_me,
            likes_count: task.is_liked_by_me ? task.likes_count - 1 : task.likes_count + 1
          }
        }
        return task
      }

      setAllTasks(allTasks.map(updateTask))
      if (isInCompletedSection) {
        setCompletedTasks(completedTasks.map(updateTask))
      }
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

  const renderTask = (task: PartnerTask, isInCompletedSection: boolean = false) => (
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

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            {task.project_title && (
              <span
                className="inline-flex min-w-0 max-w-[220px] items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
                title={`项目：${task.project_title}`}
              >
                <Folder className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">项目：{task.project_title}</span>
              </span>
            )}
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
          onClick={() => handleLike(task.id, isInCompletedSection)}
          className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-pink-50/50 transition-colors flex-shrink-0"
        >
          <Heart
            className={`w-4 h-4 ${task.is_liked_by_me ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          />
          <span className="text-xs font-medium text-gray-600">{task.likes_count}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* 今日未完成 */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-emerald-900">今日未完成</h2>
        {allTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-emerald-700/70">伴侣今天没有未完成任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTasks.map(task => renderTask(task, false))}
          </div>
        )}
      </div>

      {/* 今日已完成 */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-emerald-900">今日已完成</h2>
        {completedTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-emerald-700/70">伴侣今天还没有完成任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map(task => renderTask(task, true))}
          </div>
        )}
      </div>
    </div>
  )
}
