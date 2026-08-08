/**
 * 棋盘布局算法
 *
 * 32 格经典大富翁方环：每边 9 格（4 * 9 - 4 = 32）。
 * 角格为下标 0、8、16、24，其余格子沿四条边依次排列。
 *
 * 坐标平面：XZ 平面（Y 轴向上）。
 *   - 底边 (index 0..8)  ：左 → 右，z 固定 -HALF
 *   - 右边 (index 8..16) ：下 → 上，x 固定 +HALF
 *   - 顶边 (index 16..24)：右 → 左，z 固定 +HALF
 *   - 左边 (index 24..32)：上 → 下，x 固定 -HALF
 */

export const CELLS_PER_SIDE = 9;
/** 每个格子的边长（世界单位） */
export const CELL_SIZE = 1.7;
/** 格子凸起高度 */
export const CELL_HEIGHT = 0.35;
/** 中心海面边界（半宽） */
export const HALF_WIDTH = ((CELLS_PER_SIDE - 1) / 2) * CELL_SIZE;

export interface CellPosition {
  x: number;
  z: number;
}

/**
 * 计算指定下标格子的中心坐标。
 * 下标越界时按环绕(取模 4*N-4)处理，保证只会得到 0..31 的有效格子。
 */
export function getCellPosition(index: number): CellPosition {
  const N = CELLS_PER_SIDE;
  const total = 4 * N - 4; // 32
  const i = ((index % total) + total) % total;
  const HALF = HALF_WIDTH;
  let x: number;
  let z: number;

  if (i <= N - 1) {
    // 底边 0..8：左 → 右
    x = -HALF + i * CELL_SIZE;
    z = -HALF;
  } else if (i <= 2 * N - 2) {
    // 右边 9..16：下 → 上
    const t = i - (N - 1);
    x = HALF;
    z = -HALF + t * CELL_SIZE;
  } else if (i <= 3 * N - 3) {
    // 顶边 17..24：右 → 左
    const t = i - (2 * N - 2);
    x = HALF - t * CELL_SIZE;
    z = HALF;
  } else {
    // 左边 25..31：上 → 下
    const t = i - (3 * N - 3);
    x = -HALF;
    z = HALF - t * CELL_SIZE;
  }

  return { x, z };
}

/**
 * 返回棋盘上的格子总数（当前固定为 32）。
 */
export function getTotalCells(): number {
  return 4 * CELLS_PER_SIDE - 4;
}
