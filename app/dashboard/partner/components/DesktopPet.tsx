'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GripHorizontal, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  CouplePet,
  PET_FOODS,
  PetFoodType,
  feedCouplePet,
} from '@/lib/services/petService'
import { AnimatedGermanShepherd } from './AnimatedGermanShepherd'

interface PetContext {
  pet: CouplePet
  availableExp: number
  coupleKey: string
}

interface PetPosition {
  x: number
  y: number
}

const PET_POSITION_STORAGE_KEY = 'bloom-desktop-pet-position'
const DEFAULT_POSITION: PetPosition = { x: 24, y: 24 }
const PET_WIDTH = 210
const PET_HEIGHT = 330
const EDGE_PADDING = 12

function clampPosition(position: PetPosition) {
  if (typeof window === 'undefined') return position

  return {
    x: Math.min(Math.max(position.x, EDGE_PADDING), Math.max(window.innerWidth - PET_WIDTH - EDGE_PADDING, EDGE_PADDING)),
    y: Math.min(Math.max(position.y, EDGE_PADDING), Math.max(window.innerHeight - PET_HEIGHT - EDGE_PADDING, EDGE_PADDING)),
  }
}

export function DesktopPet() {
  const [context, setContext] = useState<PetContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedingType, setFeedingType] = useState<PetFoodType | null>(null)
  const [isPetting, setIsPetting] = useState(false)
  const [showFoods, setShowFoods] = useState(false)
  const [message, setMessage] = useState('')
  const [position, setPosition] = useState<PetPosition>(DEFAULT_POSITION)
  const [dragOffset, setDragOffset] = useState<PetPosition | null>(null)

  const isFeeding = feedingType !== null

  useEffect(() => {
    const savedPosition = window.localStorage.getItem(PET_POSITION_STORAGE_KEY)

    if (!savedPosition) return

    try {
      const parsedPosition = JSON.parse(savedPosition) as PetPosition

      if (Number.isFinite(parsedPosition.x) && Number.isFinite(parsedPosition.y)) {
        setPosition(clampPosition(parsedPosition))
      }
    } catch {
      window.localStorage.removeItem(PET_POSITION_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        const nextPosition = clampPosition(current)
        window.localStorage.setItem(PET_POSITION_STORAGE_KEY, JSON.stringify(nextPosition))
        return nextPosition
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!dragOffset) return

    const handlePointerMove = (event: PointerEvent) => {
      const nextPosition = clampPosition({
        x: window.innerWidth - event.clientX - dragOffset.x,
        y: window.innerHeight - event.clientY - dragOffset.y,
      })

      setPosition(nextPosition)
    }

    const handlePointerUp = () => {
      setDragOffset(null)
      setPosition((current) => {
        const nextPosition = clampPosition(current)
        window.localStorage.setItem(PET_POSITION_STORAGE_KEY, JSON.stringify(nextPosition))
        return nextPosition
      })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
    window.addEventListener('pointercancel', handlePointerUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragOffset])

  useEffect(() => {
    let isMounted = true
    const supabase = createClient()

    const loadPet = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (isMounted) setLoading(false)
        return
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('partner_id, exp, exp_spent')
        .eq('id', user.id)
        .single()

      if (!currentUser?.partner_id) {
        if (isMounted) setLoading(false)
        return
      }

      const [user1Id, user2Id] = [user.id, currentUser.partner_id].sort()
      const coupleKey = `${user1Id}:${user2Id}`

      const { data: existingPet } = await supabase
        .from('couple_pets')
        .select('*')
        .eq('couple_key', coupleKey)
        .maybeSingle()

      let pet = existingPet as CouplePet | null

      if (!pet) {
        const { data: createdPet } = await supabase
          .from('couple_pets')
          .insert({
            couple_key: coupleKey,
            user1_id: user1Id,
            user2_id: user2Id,
            name: '阿凛',
            species: 'german_shepherd',
          })
          .select('*')
          .single()

        pet = createdPet as CouplePet | null
      }

      if (!pet) {
        if (isMounted) setLoading(false)
        return
      }

      const totalExp = currentUser.exp || 0
      const spentExp = currentUser.exp_spent || 0

      if (isMounted) {
        setContext({
          pet,
          coupleKey,
          availableExp: Math.max(totalExp - spentExp, 0),
        })
        setLoading(false)
      }
    }

    loadPet()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!context?.coupleKey) return

    const supabase = createClient()
    const channel = supabase
      .channel(`desktop-pet:${context.coupleKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_pets',
          filter: `couple_key=eq.${context.coupleKey}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setContext((current) =>
              current ? { ...current, pet: payload.new as CouplePet } : current
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [context?.coupleKey])

  const handleFeedShortcut = () => {
    setShowFoods((visible) => !visible)
    setMessage('选一个小零食给阿凛吧')
  }

  const handlePet = () => {
    setIsPetting(true)
    setMessage('阿凛开心地蹭了蹭你')
    window.setTimeout(() => setIsPetting(false), 1400)
  }

  const handleDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragOffset({
      x: window.innerWidth - event.clientX - position.x,
      y: window.innerHeight - event.clientY - position.y,
    })
  }

  const handleFeed = async (foodType: PetFoodType) => {
    if (!context || isFeeding) return

    const food = PET_FOODS.find((item) => item.type === foodType)
    if (!food) return

    if (context.availableExp < food.expCost) {
      setMessage('可用经验不够，先完成一点任务吧')
      return
    }

    setFeedingType(foodType)

    try {
      const result = await feedCouplePet(context.pet.id, foodType)

      if (!result.success || !result.data) {
        setMessage(result.message || '喂食失败，请稍后再试')
        return
      }

      setContext({
        ...context,
        pet: result.data.pet,
        availableExp: result.data.available_exp,
      })
      setShowFoods(false)
      setMessage(`阿凛吃掉了${food.name}`)
    } finally {
      setFeedingType(null)
    }
  }

  if (loading || !context) return null

  return (
    <div
      className="fixed z-40 hidden w-[210px] select-none sm:block"
      style={{ right: position.x, bottom: position.y }}
    >
      <div className={`relative rounded-[1.75rem] border border-white/50 bg-white/20 p-3 shadow-2xl shadow-emerald-950/20 backdrop-blur-md transition-shadow ${
        dragOffset ? 'cursor-grabbing shadow-emerald-950/35' : ''
      }`}>
        <button
          type="button"
          onPointerDown={handleDragStart}
          className="absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-emerald-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
          aria-label="拖动桌宠"
          title="拖动阿凛"
        >
          <GripHorizontal className="h-3.5 w-3.5" />
        </button>

        {showFoods && (
          <div className="absolute bottom-[calc(100%-0.5rem)] right-2 z-30 mb-2 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-xl backdrop-blur-md">
            <div className="grid grid-cols-3 gap-1.5">
              {PET_FOODS.map((food) => {
                const unavailable = context.availableExp < food.expCost
                const active = feedingType === food.type

                return (
                  <button
                    key={food.type}
                    type="button"
                    onClick={() => handleFeed(food.type)}
                    disabled={isFeeding}
                    title={`${food.name} · ${food.expCost} EXP`}
                    className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl text-lg transition-all hover:bg-emerald-50 disabled:cursor-wait ${
                      unavailable ? 'opacity-45' : 'opacity-100'
                    }`}
                  >
                    <span>{food.icon}</span>
                    {active && <Sparkles className="h-3 w-3 text-emerald-600" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <AnimatedGermanShepherd
          stageIndex={2}
          hunger={context.pet.hunger}
          happiness={context.pet.happiness}
          isFeeding={isFeeding}
          isPetting={isPetting}
          onFeedClick={handleFeedShortcut}
          onPetClick={handlePet}
        />

        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <p className="min-h-4 flex-1 truncate text-xs font-medium text-emerald-900">
            {message || '阿凛在这里陪你'}
          </p>
          <Link
            href="/dashboard/partner"
            className="shrink-0 rounded-full bg-white/75 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-all hover:bg-white"
          >
            小窝
          </Link>
        </div>
      </div>
    </div>
  )
}
