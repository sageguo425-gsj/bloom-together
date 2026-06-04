import { createClient } from '@/lib/supabase/client'

export type PetFoodType = 'bone' | 'beef' | 'cake'

export interface CouplePet {
  id: string
  couple_key: string
  user1_id: string
  user2_id: string
  name: string
  species: string
  growth: number
  hunger: number
  happiness: number
  cleanliness: number
  last_fed_at?: string | null
  created_at: string
  updated_at: string
}

export interface PetFood {
  type: PetFoodType
  name: string
  icon: string
  expCost: number
  growthGain: number
  hungerGain: number
  happinessGain: number
  description: string
}

export const PET_FOODS: PetFood[] = [
  {
    type: 'bone',
    name: '骨头',
    icon: '🦴',
    expCost: 1,
    growthGain: 1,
    hungerGain: 8,
    happinessGain: 1,
    description: '便宜耐啃，适合日常补一点饱腹',
  },
  {
    type: 'beef',
    name: '牛肉',
    icon: '🥩',
    expCost: 5,
    growthGain: 8,
    hungerGain: 30,
    happinessGain: 5,
    description: '主力成长食物，双方每天共可喂 3 次',
  },
  {
    type: 'cake',
    name: '小蛋糕',
    icon: '🍰',
    expCost: 10,
    growthGain: 20,
    hungerGain: 15,
    happinessGain: 20,
    description: '成长和快乐都很高，双方每天共可喂 2 次',
  },
]

const PET_STAGE_THRESHOLDS = [0, 100, 300, 700, 1500]

export function getPetStage(growth: number) {
  if (growth >= 1500) {
    return { index: 4, label: '闪耀陪伴犬', min: 1500, next: null }
  }
  if (growth >= 700) {
    return { index: 3, label: '漂亮成犬期', min: 700, next: 1500 }
  }
  if (growth >= 300) {
    return { index: 2, label: '少年期', min: 300, next: 700 }
  }
  if (growth >= 100) {
    return { index: 1, label: '小奶狗期', min: 100, next: 300 }
  }
  return { index: 0, label: '幼崽期', min: 0, next: 100 }
}

export function getPetGrowthProgress(growth: number) {
  const stage = getPetStage(growth)
  if (!stage.next) {
    return { stage, progress: 100, current: growth - stage.min, needed: 0 }
  }

  const current = growth - stage.min
  const needed = stage.next - stage.min
  return {
    stage,
    progress: Math.min(Math.round((current / needed) * 100), 100),
    current,
    needed,
  }
}

export function getPetMoodText(pet: CouplePet) {
  if (pet.hunger < 25) return '小德牧有点饿了，正在等饭饭'
  if (pet.happiness < 30) return '它想和你们多待一会儿'
  if (pet.hunger > 80 && pet.happiness > 80) return '它被照顾得很好，尾巴摇个不停'
  return '它乖乖趴在你们的小窝旁'
}

export async function feedCouplePet(petId: string, foodType: PetFoodType) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('feed_couple_pet', {
    p_pet_id: petId,
    p_food_type: foodType,
  })

  if (error) {
    return {
      success: false,
      error,
      message: getFeedErrorMessage(error.message),
    }
  }

  return {
    success: true,
    data: data as {
      pet: CouplePet
      available_exp: number
      exp_spent: number
      growth_gain: number
      hunger_gain: number
      happiness_gain: number
    },
  }
}

function getFeedErrorMessage(message: string) {
  if (message.includes('insufficient_exp')) return '可用经验不够，先去完成一点任务吧'
  if (message.includes('daily_beef_limit_reached')) return '牛肉今天已经喂满 3 次啦'
  if (message.includes('daily_cake_limit_reached')) return '小蛋糕今天已经喂满 2 次啦'
  if (message.includes('not_pet_partner')) return '只有伴侣双方可以照顾这只小狗'
  if (message.includes('pet_not_found')) return '还没有找到你们的小狗'
  return '喂食失败，请稍后再试'
}

export function getFallbackPet(coupleKey: string, userId: string, partnerId: string): CouplePet {
  const [user1Id, user2Id] = [userId, partnerId].sort()

  return {
    id: '',
    couple_key: coupleKey,
    user1_id: user1Id,
    user2_id: user2Id,
    name: '阿凛',
    species: 'german_shepherd',
    growth: 0,
    hunger: 70,
    happiness: 70,
    cleanliness: 80,
    last_fed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export { PET_STAGE_THRESHOLDS }
