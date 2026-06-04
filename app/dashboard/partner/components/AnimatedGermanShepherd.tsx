'use client'

import Image from 'next/image'
import { HandHeart, Utensils } from 'lucide-react'

interface AnimatedGermanShepherdProps {
  stageIndex?: number
  hunger?: number
  happiness?: number
  isFeeding?: boolean
  isPetting?: boolean
  onFeedClick?: () => void
  onPetClick?: () => void
}

export function AnimatedGermanShepherd({
  stageIndex = 0,
  hunger = 70,
  happiness = 70,
  isFeeding = false,
  isPetting = false,
  onFeedClick,
  onPetClick,
}: AnimatedGermanShepherdProps) {
  const stageScale = [0.78, 0.86, 0.94, 1, 1.06][stageIndex] ?? 0.94
  const isHungry = hunger < 30
  const isHappy = happiness > 75 || isFeeding || isPetting
  const hungerValue = Math.min(Math.max(Math.round(hunger), 0), 100)

  return (
    <div className="group relative flex w-full max-w-[360px] flex-col items-center justify-end outline-none">
      <div className="absolute right-2 top-2 z-20 flex translate-y-1 gap-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onFeedClick}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-sm transition-all hover:bg-emerald-50 hover:shadow-md"
        >
          <Utensils className="h-3.5 w-3.5" />
          喂食
        </button>
        <button
          type="button"
          onClick={onPetClick}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm backdrop-blur-sm transition-all hover:bg-rose-50 hover:shadow-md"
        >
          <HandHeart className="h-3.5 w-3.5" />
          抚摸
        </button>
      </div>

      <div className="relative flex w-full items-end justify-center">
      <div
        className={`pointer-events-none absolute bottom-2 h-12 w-56 rounded-full bg-emerald-950/15 blur-sm transition-all duration-500 ${
          isFeeding || isPetting ? 'scale-110 opacity-80' : 'opacity-60'
        }`}
      />

      <div
        className={`relative z-10 w-full transition-all duration-500 ${
          isFeeding
            ? 'animate-bounce'
          : isHappy
              ? 'animate-[pet-breathe_2.2s_ease-in-out_infinite]'
              : 'animate-[pet-breathe_3.2s_ease-in-out_infinite]'
        }`}
        style={{
          transform: `scale(${stageScale})`,
          filter: isHungry ? 'saturate(0.9) brightness(0.94)' : 'drop-shadow(0 18px 22px rgba(15, 23, 42, 0.22))',
        }}
      >
        <Image
          src="/pets/german-shepherd-puppy.png"
          alt="可爱又帅气的德牧宠物"
          width={420}
          height={368}
          className="h-auto w-full select-none object-contain"
          priority
        />
      </div>

      {isHungry && !isFeeding && (
        <div className="absolute left-8 top-8 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm">
          有点饿啦
        </div>
      )}

      {isFeeding && (
        <>
          <span className="absolute right-16 top-8 text-2xl animate-[pet-float_1.2s_ease-in-out_infinite]">✨</span>
          <span className="absolute right-8 top-20 text-xl animate-[pet-float_1.4s_ease-in-out_infinite]">💚</span>
        </>
      )}

      {isPetting && (
        <>
          <span className="absolute left-16 top-14 text-2xl animate-[pet-float_1.1s_ease-in-out_infinite]">💕</span>
          <span className="absolute left-8 top-24 text-xl animate-[pet-float_1.35s_ease-in-out_infinite]">✨</span>
        </>
      )}
      </div>

      <div className="relative z-20 mt-1 w-[min(82%,260px)] rounded-full border border-white/70 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-700">
          <span>饥饿值</span>
          <span className={isHungry ? 'text-amber-700' : 'text-emerald-700'}>{hungerValue}/100</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isHungry ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-400 to-teal-500'
            }`}
            style={{ width: `${hungerValue}%` }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes pet-breathe {
          0%,
          100% {
            transform: translateY(0) scale(${stageScale});
          }
          50% {
            transform: translateY(-5px) scale(${stageScale});
          }
        }

        @keyframes pet-float {
          0% {
            transform: translateY(8px) scale(0.8);
            opacity: 0;
          }
          45% {
            opacity: 1;
          }
          100% {
            transform: translateY(-18px) scale(1.05);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
