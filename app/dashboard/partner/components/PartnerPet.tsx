'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Utensils, WalletCards } from 'lucide-react'
import {
  CouplePet,
  PET_FOODS,
  PetFoodType,
  feedCouplePet,
  getPetGrowthProgress,
} from '@/lib/services/petService'
import { createClient } from '@/lib/supabase/client'

interface PartnerPetProps {
  initialPet: CouplePet | null
  initialAvailableExp: number
  coupleKey: string
  currentUserId: string
  partnerId: string
}

const PET_STAGE_DISPLAY = [
  { width: 260, height: 190 },
  { width: 260, height: 260 },
  { width: 250, height: 320 },
  { width: 230, height: 320 },
  { width: 220, height: 325 },
]

export function PartnerPet({
  initialPet,
  initialAvailableExp,
  coupleKey,
  currentUserId,
  partnerId,
}: PartnerPetProps) {
  const [pet, setPet] = useState(initialPet)
  const [availableExp, setAvailableExp] = useState(initialAvailableExp)
  const [message, setMessage] = useState('')
  const [feedingType, setFeedingType] = useState<PetFoodType | null>(null)

  const growthInfo = getPetGrowthProgress(pet?.growth ?? 0)
  const stageIndex = growthInfo.stage.index
  const stageDisplay = PET_STAGE_DISPLAY[stageIndex] ?? PET_STAGE_DISPLAY[0]
  const isFeeding = feedingType !== null

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`couple-pet:${coupleKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_pets',
          filter: `couple_key=eq.${coupleKey}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setPet(payload.new as CouplePet)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [coupleKey])

  const ensurePet = async () => {
    if (pet?.id) return pet

    const supabase = createClient()

    const { data: existingPet, error: selectError } = await supabase
      .from('couple_pets')
      .select('*')
      .eq('couple_key', coupleKey)
      .maybeSingle()

    if (existingPet?.id) {
      setPet(existingPet)
      return existingPet as CouplePet
    }

    if (selectError && selectError.code !== 'PGRST116') {
      setMessage(`小狗资料读取失败：${selectError.message}`)
      return null
    }

    const [user1Id, user2Id] = [currentUserId, partnerId].sort()
    const { data: createdPet, error: insertError } = await supabase
      .from('couple_pets')
      .insert({
        couple_key: coupleKey,
        user1_id: user1Id,
        user2_id: user2Id,
        name: '小雪球',
        species: 'samoyed',
      })
      .select('*')
      .single()

    if (createdPet?.id) {
      setPet(createdPet)
      return createdPet as CouplePet
    }

    if (insertError?.code === '23505') {
      const { data: reloadedPet, error: reloadError } = await supabase
        .from('couple_pets')
        .select('*')
        .eq('couple_key', coupleKey)
        .maybeSingle()

      if (reloadedPet?.id) {
        setPet(reloadedPet)
        return reloadedPet as CouplePet
      }

      setMessage(`小狗资料读取失败：${reloadError?.message || insertError.message}`)
      return null
    }

    setMessage(`小狗资料创建失败：${insertError?.message || '请稍后再试'}`)
    return null
  }

  const handleFeed = async (foodType: PetFoodType) => {
    if (isFeeding) return

    const food = PET_FOODS.find((item) => item.type === foodType)
    if (!food) return

    if (availableExp < food.expCost) {
      setMessage('可用经验不够，先去完成一点任务吧')
      return
    }

    setFeedingType(foodType)
    setMessage('')

    try {
      const activePet = await ensurePet()

      if (!activePet?.id) return

      const result = await feedCouplePet(activePet.id, foodType)

      if (!result.success || !result.data) {
        setMessage(result.message || '喂食失败，请稍后再试')
        return
      }

      const feedResult = result.data
      setPet(feedResult.pet)
      setAvailableExp(feedResult.available_exp)
      setMessage(`萨摩耶成长 +${feedResult.growth_gain}，开心地摇了摇尾巴`)
    } finally {
      setFeedingType(null)
    }
  }

  return (
    <div className="h-full backdrop-blur-xl bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-2xl sm:rounded-3xl shadow-xl border border-white/60 p-4 sm:p-6 flex flex-col">
      <div className="flex justify-end mb-2">
        <div className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700">
          <WalletCards className="w-3.5 h-3.5" />
          可用 {availableExp} EXP
        </div>
      </div>

      <div className="flex-1 flex min-h-[210px] items-end justify-center">
        <div
          className="bg-no-repeat"
          style={{
            width: `min(100%, ${stageDisplay.width}px)`,
            height: `${stageDisplay.height}px`,
            backgroundImage: 'url(/pets/samoyed-stages-transparent.png)',
            backgroundSize: '500% auto',
            backgroundPosition: `${stageIndex * 25}% 100%`,
          }}
          role="img"
          aria-label="白色萨摩耶宠物"
        />
      </div>

      <div className="mt-3 mb-4">
        <StatusBar
          label={`成长 · ${growthInfo.stage.label}`}
          value={growthInfo.progress}
          detail={growthInfo.stage.next ? `${growthInfo.current}/${growthInfo.needed}` : '满级'}
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PET_FOODS.map((food) => {
          const unavailable = availableExp < food.expCost
          const isCurrentFood = feedingType === food.type

          return (
            <button
              key={food.type}
              type="button"
              onClick={() => handleFeed(food.type)}
              disabled={isFeeding}
              aria-disabled={unavailable || isFeeding}
              title={food.description}
              className={`rounded-xl px-2 py-2.5 text-center transition-all hover:bg-white/55 disabled:cursor-wait ${
                unavailable ? 'opacity-55' : 'opacity-100'
              }`}
            >
              <span className="block text-3xl mb-1">{food.icon}</span>
              <span className="block text-sm font-semibold text-gray-900">{food.name}</span>
              <span className="block text-xs text-gray-500">{food.expCost} EXP</span>
              <span className="mt-0.5 inline-flex items-center justify-center gap-0.5 text-xs text-emerald-700">
                <Sparkles className="w-3 h-3" />
                {isCurrentFood ? '喂食中' : `成长 +${food.growthGain}`}
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
