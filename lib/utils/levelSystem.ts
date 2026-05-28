// 等级系统工具函数

/**
 * 计算指定等级所需的总经验值
 * 公式: 100 × (level - 1) + 50 × (level - 1)²
 */
export function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  const l = level - 1;
  return 100 * l + 50 * l * l;
}

/**
 * 根据经验值计算当前等级
 */
export function getLevelFromExp(exp: number): number {
  let level = 1;
  while (getExpForLevel(level + 1) <= exp) {
    level++;
  }
  return level;
}

/**
 * 获取当前等级的经验进度
 * 返回: { currentLevel, currentLevelExp, nextLevelExp, progress }
 */
export function getLevelProgress(totalExp: number) {
  const currentLevel = getLevelFromExp(totalExp);
  const currentLevelExp = getExpForLevel(currentLevel);
  const nextLevelExp = getExpForLevel(currentLevel + 1);
  const expInCurrentLevel = totalExp - currentLevelExp;
  const expNeededForNextLevel = nextLevelExp - currentLevelExp;
  const progress = (expInCurrentLevel / expNeededForNextLevel) * 100;

  return {
    currentLevel,
    currentLevelExp,
    nextLevelExp,
    expInCurrentLevel,
    expNeededForNextLevel,
    progress: Math.min(progress, 100),
  };
}

/**
 * 获取等级称号
 */
export function getLevelTitle(level: number): { emoji: string; title: string } {
  if (level >= 51) return { emoji: '👑', title: '大师期' };
  if (level >= 31) return { emoji: '🌟', title: '绽放期' };
  if (level >= 21) return { emoji: '🌲', title: '繁茂期' };
  if (level >= 11) return { emoji: '🌳', title: '茁壮期' };
  if (level >= 6) return { emoji: '🌿', title: '成长期' };
  return { emoji: '🌱', title: '萌芽期' };
}

/**
 * 增加经验值
 * 每完成一个任务或打卡一次：+10 EXP
 */
export const EXP_PER_ACTION = 10;
