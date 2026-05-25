'use client'

import { useState, useEffect } from 'react'
import { SharedGoal, getSharedGoals, createSharedGoal, updateSharedGoalProgress } from '@/lib/services/partnerService'
import { Target, Plus, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function SharedGoals() {
  const [goals, setGoals] = useState<SharedGoal[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goalType: 'task' as 'project' | 'habit' | 'task',
    targetValue: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  })

  useEffect(() => {
    loadGoals()
  }, [])

  const loadGoals = async () => {
    const data = await getSharedGoals()
    setGoals(data)
  }

  const handleCreate = async () => {
    const success = await createSharedGoal(
      formData.title,
      formData.description,
      formData.goalType,
      formData.targetValue,
      formData.startDate,
      formData.endDate || undefined
    )

    if (success) {
      setShowCreateForm(false)
      setFormData({
        title: '',
        description: '',
        goalType: 'task',
        targetValue: 10,
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      })
      await loadGoals()
    }
  }

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'project': return '项目'
      case 'habit': return '习惯'
      case 'task': return '任务'
      default: return type
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          <h2 className="text-xl font-bold">共同目标</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 创建表单 */}
      {showCreateForm && (
        <div className="mb-4 p-4 border rounded-lg space-y-3">
          <input
            type="text"
            placeholder="目标名称"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <textarea
            placeholder="目标描述"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.goalType}
              onChange={(e) => setFormData({ ...formData, goalType: e.target.value as any })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="task">任务</option>
              <option value="habit">习惯</option>
              <option value="project">项目</option>
            </select>

            <input
              type="number"
              placeholder="目标值"
              value={formData.targetValue}
              onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="结束日期（可选）"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!formData.title}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 目标列表 */}
      <div className="space-y-3">
        {goals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">还没有共同目标</p>
        ) : (
          goals.map(goal => {
            const progress = goal.target_value > 0
              ? Math.round((goal.current_value / goal.target_value) * 100)
              : 0

            return (
              <div key={goal.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                    {getGoalTypeLabel(goal.goal_type)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {goal.current_value} / {goal.target_value}
                    </span>
                    <span className="font-semibold text-purple-600">{progress}%</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {format(new Date(goal.start_date), 'MM/dd', { locale: zhCN })}
                      {goal.end_date && ` - ${format(new Date(goal.end_date), 'MM/dd', { locale: zhCN })}`}
                    </span>
                    <span className={`px-2 py-1 rounded ${
                      goal.status === 'active' ? 'bg-green-100 text-green-700' :
                      goal.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {goal.status === 'active' ? '进行中' :
                       goal.status === 'completed' ? '已完成' : '已取消'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
