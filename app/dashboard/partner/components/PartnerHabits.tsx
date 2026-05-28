'use client'

import { PartnerHabit } from '@/lib/services/partnerService'
import { CheckCircle2, Circle } from 'lucide-react'

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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-emerald-900">习惯打卡</h2>

      {habits.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-emerald-700/70 text-lg">伴侣还没有习惯</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => (
            <div
              key={habit.id}
              className="bg-white/80 backdrop-blur-sm border border-emerald-100/50 shadow-sm rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                {/* 简约图标 */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  {habit.icon}
                </div>

                {/* 习惯信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base mb-1">{habit.name || habit.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{getFrequencyText(habit.frequency)}</span>
                    <span>已坚持 {habit.current_streak} 天</span>
                  </div>
                </div>

                {/* 今日完成状态 */}
                <div className="flex-shrink-0">
                  {habit.checked_in_today ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-sm font-medium">已完成</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Circle className="w-6 h-6" />
                      <span className="text-sm font-medium">未完成</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
