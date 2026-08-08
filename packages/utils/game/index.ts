/** 游戏工具函数 */

/**
 * 标准化游戏阶段配置 (向后兼容)
 */
export function normalizePhases(phases: any[]): any[] {
  if (!phases || !Array.isArray(phases)) return [];
  return phases.map((phase, index) => ({
    ...phase,
    order: phase.order ?? index,
  }));
}

/**
 * 标准化游戏地图 (向后兼容)
 */
export function normalizeGameMap(map: any): any {
  if (!map) return null;
  
  return {
    ...map,
    items: map.items || map.ports || [],
    chanceCards: map.chanceCards || [],
    roles: map.roles || [],
  };
}

/**
 * 计算港口过路费
 */
export function calculateTollFee(basePrice: number, level: number): number {
  const multipliers = [0, 0.5, 1, 2, 4, 8];
  return Math.floor(basePrice * (multipliers[level] || 1));
}

/**
 * 计算港口升级费用
 */
export function calculateUpgradeCost(basePrice: number, currentLevel: number): number {
  const costMultipliers = [0, 1, 1.5, 2, 3, 4];
  return Math.floor(basePrice * (costMultipliers[currentLevel + 1] || 1));
}
