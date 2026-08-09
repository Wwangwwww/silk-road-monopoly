/**
 * 棋盘布局算法
 *
 * 40 格「圆环」棋盘：格子均匀分布在圆周上，起点（泉州）位于正下方，
 * 按顺时针方向绕行航行（泉州 → 广州 → 占城 → … → 威尼斯 → 回到泉州）。
 * 中心为开放海域（蓝色海洋 + 罗盘玫瑰 + 古代商船）。
 *
 * 坐标平面：XZ 平面（Y 轴向上）。
 *   - index 0  位于 (0, -R) 正下方（出发港）
 *   - 角度随 index 增加，顺时针绕行
 */

export const CELLS_PER_SIDE = 11;
/** 每个格子的边长（世界单位） */
export const CELL_SIZE = 1.7;
/** 格子凸起高度 */
export const CELL_HEIGHT = 0.35;
/** 圆环半径（棋盘中心到格子中心的距离） */
export const BOARD_RADIUS = 11.0;
/** 内海半径（圆环内侧到中心的距离） */
export const HALF_WIDTH = BOARD_RADIUS - CELL_SIZE * 0.6;

export interface CellPosition {
  x: number;
  z: number;
}

/**
 * 计算指定下标格子的中心坐标。
 * 下标越界时按环绕(取模 40)处理，保证只会得到 0..39 的有效格子。
 */
export function getCellPosition(index: number): CellPosition {
  const total = getTotalCells(); // 40
  const i = ((index % total) + total) % total;
  const angle = (i / total) * Math.PI * 2;
  const x = Math.sin(angle) * BOARD_RADIUS;
  const z = -Math.cos(angle) * BOARD_RADIUS;
  return { x, z };
}

/**
 * 返回棋盘上的格子总数（当前固定为 40）。
 */
export function getTotalCells(): number {
  return 4 * CELLS_PER_SIDE - 4;
}
