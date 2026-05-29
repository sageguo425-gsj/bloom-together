'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Utensils, WalletCards } from 'lucide-react'
import {
  CouplePet,
  PET_FOODS,
  PetFoodType,
  feedCouplePet,
  getPetGrowthProgress,
} from '@/lib/services/petService'

interface PartnerPetProps {
  initialPet: CouplePet | null
  initialAvailableExp: number
}

export function PartnerPet({ initialPet, initialAvailableExp }: PartnerPetProps) {
  const [pet, setPet] = useState(initialPet)
  const [availableExp, setAvailableExp] = useState(initialAvailableExp)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const growthInfo = pet ? getPetGrowthProgress(pet.growth) : null
  const stageIndex = growthInfo?.stage.index || 0
  const spritePosition = `${stageIndex * 25}% center`

  const handleFeed = (foodType: PetFoodType) => {
    if (!pet?.id || isPending) return

    setMessage('')
    startTransition(async () => {
      const result = await feedCouplePet(pet.id, foodType)

      if (!result.success || !result.data) {
        setMessage(result.message || '喂食失败，请稍后再试')
        return
      }

      const feedResult = result.data
      setPet(feedResult.pet)
      setAvailableExp(feedResult.available_exp)
      setMessage(`萨摩耶成长 +${feedResult.growth_gain}，开心地摇了摇尾巴`)
    })
  }

  return (
    <div className="h-full backdrop-blur-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60 p-4 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">我们的萨摩耶</h2>
          <p className="text-xs text-emerald-700/70 mt-1">
            {pet ? `${pet.name} · ${growthInfo?.stage.label}` : '等待创建你们的小狗'}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700">
          <WalletCards className="w-3.5 h-3.5" />
          可用 {availableExp} EXP
        </div>
      </div>

      <div className="flex-1 flex min-h-0 items-end justify-center">
        <div
          className="h-44 w-full max-w-[300px] bg-no-repeat"
          style={{
            backgroundImage: 'url(/pets/samoyed-stages-transparent.png)',
            backgroundSize: '500% 100%',
            backgroundPosition: spritePosition,
          }}
          role="img"
          aria-label="白色萨摩耶宠物"
        />
      </div>

      {pet && growthInfo && (
        <div className="mt-3 mb-4">
          <StatusBar
            label="成长"
            value={growthInfo.progress}
            detail={growthInfo.stage.next ? `${growthInfo.current}/${growthInfo.needed}` : '满级'}
            color="bg-emerald-500"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {PET_FOODS.map((food) => {
          const disabled = !pet?.id || availableExp < food.expCost || isPending

          return (
            <button
              key={food.type}
              onClick={() => handleFeed(food.type)}
              disabled={disabled}
              title={food.description}
              className="rounded-xl px-2 py-2.5 text-center hover:bg-white/40 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
            >
              <span className="block text-3xl mb-1">{food.icon}</span>
              <span className="block text-sm font-semibold text-gray-900">{food.name}</span>
              <span className="block text-xs text-gray-500">{food.expCost} EXP</span>
              <span className="mt-0.5 inline-flex items-center justify-center gap-0.5 text-xs text-emerald-700">
                <Sparkles className="w-3 h-3" />成长 +{food.growthGain}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-2 min-h-5 text-xs text-emerald-700 flex items-center gap-1">
        {message && (
          <>
            <Utensils className="w-3.5 h-3.5" />
            <span>{message}</span>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBar({
  label,
  value,
  detail,
  color,
}: {
  label: string
  value: number
  detail: string
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{detail}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}
