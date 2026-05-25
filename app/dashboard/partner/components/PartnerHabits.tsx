'use client'

import { PartnerHabit } from '@/lib/services/partnerService'
import { Flame, Calendar, TrendingUp, Clock, Repeat } from 'lucide-react'

interface PartnerHabitsProps {
  habits: PartnerHabit[]
}

export function PartnerHabits({ habits }: PartnerHabitsProps) {
  const getFrequencyText = (frequency: any) => {
    if (!frequency) return '每天'
    if (typeof frequency === 'string') {
      try {
        frequency = JSON.parse(frequency)
      } catch {
        return '每天'
      }
    }
    if (frequency.type === 'daily') {
      return `每天${frequency.times > 1 ? ` ${frequency.times}次` : ''}`
    } else if (frequency.type === 'weekly') {
      return `每周${frequency.times > 1 ? ` ${frequency.times}次` : ''}`
    }
    return '每天'
  }

  const getDuration = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays < 30) {
      return `${diffInDays}天`
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30)
      return `${months}个月`
    } else {
      const years = Math.floor(diffInDays / 365)
      return `${years}年`
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-emerald-900">习惯打卡</h2>

      {habits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-emerald-700/70 text-lg">伴侣还没有习惯</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(habit => (
            <div
              key={habit.id}
              className="bg-white/60 backdrop-blur-sm border border-emerald-100/50 shadow-sm rounded-lg p-3 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                {/* 图标 */}
                <span className="text-2xl flex-shrink-0">{habit.icon}</span>

                {/* 名称和详情 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate mb-1">{habit.name || habit.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                      {getFrequencyText(habit.frequency)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      已坚持 {getDuration(habit.created_at)}
                    </span>
                  </div>
                </div>

                {/* 统计数据 */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-600" />
                    <span className="text-sm font-bold text-orange-600">{habit.current_streak}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-sm font-bold text-blue-600">{habit.checkins_this_month}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm font-bold text-green-600">{habit.total_checkins}</span>
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
