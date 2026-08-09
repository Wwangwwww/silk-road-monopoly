<template>
  <div class="game-board">
    <div ref="containerRef" class="game-board__canvas"></div>
    <!-- 信息覆层 -->
    <div class="game-board__hud">
      <span class="hud-round">第 {{ store.currentRound }} 回合</span>
      <span class="hud-phase">{{ phaseText }}</span>
    </div>
    <div v-if="store.isGameOver && store.winner" class="game-board__winner">🏆 {{ store.winner.name }} 赢得胜利！</div>
    <div v-if="!store.isGameStarted" class="game-board__empty">🐚 等待出海…</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useGameStore } from '../store/game';
import { BoardScene } from '../three/BoardScene';

const store = useGameStore();
const containerRef = ref<HTMLElement | null>(null);

let board: BoardScene | null = null;

// 记录每个玩家上一次已知位置，用于计算逐格游走路径
const lastPositions = new Map<string, number>();

// 计算沿棋盘向前（环绕）从 from 走到 to 的路径下标序列
function buildForwardPath(from: number, to: number, total: number): number[] {
  const path: number[] = [];
  let cur = from;
  while (cur !== to) {
    cur = (cur + 1) % total;
    path.push(cur);
  }
  return path;
}

const phaseText = computed(() => {
  const p = store.phase;
  if (store.isGameOver) return '贸易结束';
  if (p === 'rolling_dice') return '等待掷骰子…';
  if (p === 'moving') return '航行中…';
  if (p === 'port_action') return '港口停泊';
  if (p === 'event') return '航海事件';
  if (p === 'turn_end') return '回合结束';
  return '';
});

// 将 store 数据转换为场景所需的最小数据
function toCellData(cells: any[]) {
  return cells.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    index: c.index,
    colorGroup: c.colorGroup,
    region: c.region,
    basePrice: c.basePrice,
    theme: c.theme,
    landmark: c.landmark,
    specialty: c.specialty,
    description: c.description,
  }));
}

function toBoardPlayer(players: any[]) {
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    isAI: p.isAI,
  }));
}

function toBoardProperty(properties: Map<string, any>) {
  const list: any[] = [];
  properties.forEach((p) => {
    list.push({ id: p.id ?? p.portId, ownerId: p.ownerId, level: p.level });
  });
  return list;
}

function syncBoard() {
  if (!board) return;
  if (store.mapItems.length) {
    board.buildBoard(toCellData(store.mapItems));
  }
  board.updatePlayers(toBoardPlayer(store.players));
  board.updateProperties(toBoardProperty(store.properties));
  board.highlightCell(store.currentPlayer?.position ?? null);
}

function onResize() {
  board?.resize();
}

onMounted(async () => {
  await nextTick();
  if (!containerRef.value) return;

  board = new BoardScene(containerRef.value);
  // 帆船动画全部走完后，通知 store 解开"等待移动"（保证 AI 按顺序行动）
  board.onMoveEnd(() => store.notifyMoveFinished());
  syncBoard();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  board?.dispose();
  board = null;
});

// 响应 store 状态变化
watch(
  () => store.isGameStarted,
  (started) => {
    // 新开一局时清空上次位置记录，避免把旧棋子的位置误当移动路径
    if (started) lastPositions.clear();
    syncBoard();
  }
);
watch(
  () => store.mapItems,
  () => syncBoard(),
  { deep: true }
);
watch(
  () => store.players,
  (players) => {
    syncBoard();
    // 位置发生变化的玩家走"逐格游走"动画
    const total = store.mapItems.length || 32;
    for (const p of players) {
      const prev = lastPositions.get(p.id);
      if (prev !== undefined && prev !== p.position) {
        board?.moveShipAlongPath(p.id, buildForwardPath(prev, p.position, total));
      }
      lastPositions.set(p.id, p.position);
    }
  },
  { deep: true }
);
watch(
  () => store.properties,
  () => syncBoard(),
  { deep: true }
);
watch(
  () => store.currentPlayer?.position,
  () => board?.highlightCell(store.currentPlayer?.position ?? null)
);
</script>

<style scoped>
.game-board {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.game-board__canvas {
  position: absolute;
  inset: 0;
}
.game-board__hud {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  z-index: 3;
  font-family: monospace;
}
.hud-round {
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 13px;
  padding: 5px 10px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.hud-phase {
  background: rgba(0, 131, 143, 0.75);
  color: #fff;
  font-size: 13px;
  padding: 5px 10px;
  border-radius: 16px;
}
.game-board__winner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 30px;
  font-weight: 800;
  color: #ffd700;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.55);
  padding: 14px 28px;
  border-radius: 14px;
  border: 2px solid #ffd700;
  z-index: 4;
  animation: sr-win-pop 0.5s ease-out;
}
@keyframes sr-win-pop {
  0% {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0;
  }
  80% {
    transform: translate(-50%, -50%) scale(1.05);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}
.game-board__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 20px;
  background: linear-gradient(135deg, #0e7c86, #006064);
  z-index: 2;
}
</style>

<!-- CSS2D 标签样式（动态创建的元素，需用非 scoped 样式） -->
<style>
.sr-cell-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  text-align: center;
  transform: translate(-50%, -50%);
  width: 72px;
  line-height: 1.1;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}
.sr-cell-icon {
  font-size: 18px;
  margin-bottom: 1px;
}
.sr-cell-name {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.2px;
  background: rgba(0, 0, 0, 0.32);
  border-radius: 3px;
  padding: 1px 4px;
  white-space: nowrap;
}
.sr-cell-price {
  font-size: 8px;
  color: #ffd54f;
  margin-top: 1px;
}
.sr-compass-label {
  color: #ffe9a8;
  font-size: 13px;
  font-weight: 700;
  font-family: serif;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  transform: translate(-50%, -50%);
  pointer-events: none;
  user-select: none;
}
</style>
