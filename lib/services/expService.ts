import { createClient } from '@/lib/supabase/client';
import { EXP_PER_ACTION, EXP_PER_POMODORO, getLevelFromExp } from '@/lib/utils/levelSystem';

/**
 * 增加用户经验值
 * @param userId 用户ID
 * @param expAmount 经验值数量（默认10）
 */
export async function addUserExp(userId: string, expAmount: number = EXP_PER_ACTION) {
  const supabase = createClient();

  try {
    // 获取当前用户信息
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('exp, level')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('获取用户信息失败:', fetchError);
      return { success: false, error: fetchError };
    }

    const currentExp = currentUser?.exp || 0;
    const newExp = currentExp + expAmount;
    const newLevel = getLevelFromExp(newExp);
    const oldLevel = currentUser?.level || 1;

    // 更新用户经验和等级
    const { error: updateError } = await supabase
      .from('users')
      .update({
        exp: newExp,
        level: newLevel,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('更新用户经验失败:', updateError);
      return { success: false, error: updateError };
    }

    // 检查是否升级
    const leveledUp = newLevel > oldLevel;

    return {
      success: true,
      newExp,
      newLevel,
      oldLevel,
      leveledUp,
      expGained: expAmount,
    };
  } catch (error) {
    console.error('增加经验失败:', error);
    return { success: false, error };
  }
}

/**
 * 减少用户经验值，用于撤销已产生经验的动作
 */
export async function removeUserExp(userId: string, expAmount: number = EXP_PER_ACTION) {
  const supabase = createClient();

  try {
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('exp, level')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('获取用户信息失败:', fetchError);
      return { success: false, error: fetchError };
    }

    const currentExp = currentUser?.exp || 0;
    const oldLevel = currentUser?.level || 1;
    const newExp = Math.max(currentExp - expAmount, 0);
    const newLevel = getLevelFromExp(newExp);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        exp: newExp,
        level: newLevel,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('扣减用户经验失败:', updateError);
      return { success: false, error: updateError };
    }

    return {
      success: true,
      newExp,
      newLevel,
      oldLevel,
      expRemoved: expAmount,
    };
  } catch (error) {
    console.error('扣减经验失败:', error);
    return { success: false, error };
  }
}

/**
 * 任务完成时增加经验
 */
export async function addExpForTaskCompletion(userId: string) {
  return await addUserExp(userId, EXP_PER_ACTION);
}

/**
 * 习惯打卡时增加经验
 */
export async function addExpForHabitCheckin(userId: string) {
  return await addUserExp(userId, EXP_PER_ACTION);
}

/**
 * 撤销习惯打卡时扣回经验
 */
export async function removeExpForHabitCheckin(userId: string) {
  return await removeUserExp(userId, EXP_PER_ACTION);
}

/**
 * 工作番茄钟完成时增加经验
 */
export async function addExpForPomodoroCompletion(userId: string) {
  return await addUserExp(userId, EXP_PER_POMODORO);
}
