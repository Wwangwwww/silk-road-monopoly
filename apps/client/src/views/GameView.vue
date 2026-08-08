<template>
  <div class="game-view">
    <!-- 游戏未开始时：设置界面 -->
    <div v-if="!store.isGameStarted" class="game-view__setup">
      <div class="setup-card">
        <h2>🚢 出海准备</h2>
        <div class="setup-form">
          <label>
            <span>船主大名</span>
            <input v-model="playerName" type="text" placeholder="输入你的名字" maxlength="8" />
          </label>
          <label>
            <span>AI 对手数量</span>
            <select v-model.number="aiCount">
              <option :value="1">1 位</option>
              <option :value="2">2 位</option>
              <option :value="3">3 位</option>
            </select>
          </label>
          <label>
            <span>初始银两</span>
            <select v-model.number="startSilver">
              <option :value="10000">10,000 两</option>
              <option :value="15000">15,000 两</option>
              <option :value="20000">20,000 两</option>
            </select>
          </label>
        </div>
        <button class="sr-btn sr-btn--primary setup-btn" @click="startGame">⛵ 扬帆起航</button>
        <button class="sr-btn sr-btn--secondary setup-btn" @click="$router.push('/')">返回</button>
      </div>
    </div>

    <!-- 游戏进行中 -->
    <template v-else>
      <div class="game-view__board">
        <!-- 3D 棋盘 -->
        <GameBoard />

        <!-- 简易日志 -->
        <div class="game-view__log">
          <div v-for="(log, i) in store.logs.slice(-6)" :key="i" class="log-line">
            {{ log.message }}
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="game-view__panel">
        <!-- 当前玩家 -->
        <div class="panel-section" v-if="store.currentPlayer">
          <h3>⚓ 当前回合</h3>
          <div class="current-player" :class="{ 'is-human': !store.currentPlayer.isAI }">
            <div class="player-avatar">{{ store.currentPlayer.isAI ? '🤖' : '🧑‍✈️' }}</div>
            <div class="player-info">
              <strong>{{ store.currentPlayer.name }}</strong>
              <span>{{ store.currentPlayer.isAI ? 'AI 商人' : '你' }}</span>
            </div>
          </div>
          <div class="player-stats">
            <div>💰 {{ store.currentPlayer.silver.toLocaleString() }} 两</div>
            <div>📍 {{ store.mapItems[store.currentPlayer.position]?.name ?? '未知' }}</div>
            <div v-if="store.currentPlayer.inJail">🔒 被扣留中 ({{ store.currentPlayer.jailTurns }}/3)</div>
          </div>

          <!-- 骰子结果 -->
          <div v-if="store.diceResult" class="dice-display">
            <div class="dice-box" :class="'dice-show-' + store.diceResult.values[0]">
              <div class="dice-cube">
                <div class="dice-face dice-front">
                  <span class="dice-num">{{ store.diceResult.values[0] }}</span>
                </div>
                <div class="dice-face dice-back">
                  <span class="dice-num">6</span>
                </div>
                <div class="dice-face dice-right">
                  <span class="dice-num">3</span>
                </div>
                <div class="dice-face dice-left">
                  <span class="dice-num">4</span>
                </div>
                <div class="dice-face dice-top">
                  <span class="dice-num">2</span>
                </div>
                <div class="dice-face dice-bottom">
                  <span class="dice-num">5</span>
                </div>
              </div>
            </div>
            <span class="dice-total">点数: {{ store.diceResult.total }}</span>
          </div>
        </div>

        <!-- 操作按钮区 -->
        <div class="panel-section panel-actions">
          <!-- 掷骰子 -->
          <button
            v-if="store.phase === 'rolling_dice' && store.currentPlayer && !store.currentPlayer.isAI"
            class="sr-btn sr-btn--primary btn-roll-dice"
            :disabled="isRolling"
            @click="handleRollDice"
          >
            {{ isRolling ? '🎲 掷骰中...' : '🎲 掷骰子' }}
          </button>

          <!-- 港口操作 -->
          <template v-if="store.phase === 'port_action' && store.currentPlayer && !store.currentPlayer.isAI">
            <div class="action-label">停靠在：{{ store.mapItems[store.currentPlayer.position]?.name }}</div>
            <button class="sr-btn sr-btn--primary" @click="handleBuyPort" v-if="canBuyPort">🏪 购买港口</button>
            <button class="sr-btn sr-btn--secondary" @click="store.endTurn">⏭ 跳过</button>
          </template>

          <!-- 事件阶段（详情由屏幕中央弹窗展示） -->
          <template v-if="store.phase === 'event' && store.currentPlayer && !store.currentPlayer.isAI">
            <p style="color: #546e7a">📜 航海事件触发，请看屏幕中央…</p>
            <button class="sr-btn sr-btn--primary" @click="store.endTurn">⏭ 继续</button>
          </template>

          <!-- 回合结束 -->
          <button
            v-if="store.phase === 'turn_end' && store.currentPlayer && !store.currentPlayer.isAI"
            class="sr-btn sr-btn--primary"
            @click="store.endTurn"
          >
            ✅ 结束回合
          </button>

          <!-- 监狱 -->
          <button
            v-if="store.currentPlayer?.inJail && !store.currentPlayer.isAI"
            class="sr-btn sr-btn--secondary"
            @click="store.payBail"
          >
            🔓 支付赎金 (500两)
          </button>

          <!-- 游戏结束 -->
          <button v-if="store.isGameOver" class="sr-btn sr-btn--primary" @click="handleRestart">🔄 再来一局</button>
        </div>

        <!-- 所有玩家列表 -->
        <div class="panel-section">
          <h3>👥 船员</h3>
          <div
            v-for="p in store.players"
            :key="p.id"
            class="player-row"
            :class="{ 'is-active': p.id === store.currentPlayer?.id, 'is-bankrupt': p.isBankrupt }"
          >
            <span>{{ p.isAI ? '🤖' : '🧑‍✈️' }} {{ p.name }}</span>
            <span :class="p.silver < 1000 ? 'text-danger' : ''">
              {{ p.isBankrupt ? '💸 破产' : `💰 ${p.silver.toLocaleString()}` }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- 航海事件弹窗：屏幕中央展示触发的事件及详细说明 -->
    <transition name="event-modal">
      <div v-if="showEventModal" class="event-modal" @click.self="dismissEventModal">
        <div class="event-modal__card">
          <button class="event-modal__close" @click="dismissEventModal" title="关闭">✕</button>
          <SRChanceCard
            v-if="store.currentEvent"
            :title="store.currentEvent.title"
            :description="store.currentEvent.description"
            :type="store.currentEvent.type"
          />
          <div class="event-modal__effects">
            <h4>📋 事件详情</h4>
            <ul>
              <li v-for="(e, i) in eventEffectSummary" :key="i">{{ e }}</li>
            </ul>
          </div>
          <div class="event-modal__actions">
            <button v-if="showEventConfirm" class="sr-btn sr-btn--primary" @click="handleEventConfirm">✅ 确认</button>
            <button v-else-if="!store.currentPlayer?.isAI" class="sr-btn sr-btn--secondary" @click="dismissEventModal">
              知道了
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '../store/game';
import GameBoard from '../components/GameBoard.vue';
import { SRChanceCard } from '@silk-road-monopoly/ui';

const store = useGameStore();

// 设置表单
const playerName = ref('船主');
const aiCount = ref(2);
const startSilver = ref(15000);

const isRolling = ref(false);

function startGame() {
  store.initialSilver = startSilver.value;
  store.initGame(playerName.value, aiCount.value);
}

async function handleRollDice() {
  if (isRolling.value) return;
  isRolling.value = true;

  const result = store.rollDice();

  // 停留 2 秒展示点数
  await new Promise((r) => setTimeout(r, 2000));

  store.movePlayer(result.total);
  isRolling.value = false;
}

// AI 回合自动行动
watch(
  () => store.currentPlayer,
  (player) => {
    if (player?.isAI && !store.isGameOver && store.isGameStarted) {
      store.playAITurn();
    }
  },
  { immediate: true }
);

const canBuyPort = computed(() => {
  const player = store.currentPlayer;
  if (!player) return false;
  const item = store.mapItems[player.position];
  if (!item || item.type !== 'port') return false;
  if (store.properties.has(item.id)) return false;
  return player.silver >= (item.basePrice ?? Infinity);
});

function handleBuyPort() {
  const player = store.currentPlayer;
  if (!player) return;
  const item = store.mapItems[player.position];
  if (item) store.buyPort(item.id);
}

function handleRestart() {
  store.resetGame();
}

// ===== 航海事件弹窗 =====
const eventModalVisible = ref(false);

const showEventModal = computed(() => store.currentEvent !== null && eventModalVisible.value);
const eventEffectSummary = computed(() => (store.currentEvent ? store.getEventEffectSummary(store.currentEvent) : []));
const showEventConfirm = computed(() => store.phase === 'event' && !!store.currentPlayer && !store.currentPlayer.isAI);

function dismissEventModal() {
  eventModalVisible.value = false;
}

function handleEventConfirm() {
  store.endTurn();
}

// 事件触发（currentEvent 被设置）时弹出居中弹窗
watch(
  () => store.currentEvent,
  (ev) => {
    if (ev) eventModalVisible.value = true;
  }
);
</script>

<style scoped>
/* ===== 设置界面 ===== */
.game-view__setup {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d3b42 0%, #00838f 50%, #00acc1 100%);
}
.setup-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  width: 380px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
}
.setup-card h2 {
  text-align: center;
  color: #00695c;
  margin-bottom: 24px;
  font-size: 24px;
}
.setup-form label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  color: #37474f;
  font-size: 15px;
}
.setup-form input,
.setup-form select {
  width: 180px;
  padding: 8px 12px;
  border: 1px solid #b2dfdb;
  border-radius: 8px;
  font-size: 14px;
  background: #f0f7f8;
}
.setup-btn {
  width: 100%;
  margin-top: 12px;
}

/* ===== 游戏主区域 ===== */
.game-view {
  width: 100%;
  height: 100%;
  display: flex;
}
.game-view__board {
  flex: 1;
  background: #0d3b42;
  position: relative;
  overflow: hidden;
}
.game-view__log {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  max-height: 120px;
  overflow-y: auto;
}
.log-line {
  color: #b2dfdb;
  font-size: 11px;
  line-height: 1.5;
  font-family: monospace;
}

/* ===== 右侧面板 ===== */
.game-view__panel {
  width: 320px;
  background: #fff;
  border-left: 1px solid #e0f2f1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.panel-section {
  padding: 16px;
  border-bottom: 1px solid #e0f2f1;
}
.panel-section h3 {
  font-size: 13px;
  color: #78909c;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.current-player {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.current-player.is-human {
  background: #e0f7fa;
  border-radius: 10px;
  padding: 10px;
}
.player-avatar {
  font-size: 28px;
}
.player-info {
  display: flex;
  flex-direction: column;
}
.player-info strong {
  font-size: 16px;
  color: #00695c;
}
.player-info span {
  font-size: 12px;
  color: #90a4ae;
}
.player-stats {
  font-size: 13px;
  color: #546e7a;
  line-height: 1.8;
}

.dice-display {
  margin-top: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* ===== 3D 骰子立方体 (mine-monopoly 风格) ===== */
.dice-box {
  width: 72px;
  height: 72px;
  perspective: 240px;
}

.dice-cube {
  width: 72px;
  height: 72px;
  position: relative;
  transform-style: preserve-3d;
  animation: dice-roll 0.6s ease-out;
}

.dice-face {
  position: absolute;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 3px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
  backface-visibility: hidden;
  overflow: hidden;
}

.dice-num {
  font-size: 28px;
  font-weight: 800;
  color: #334155;
  line-height: 1;
}

.dice-front {
  transform: translateZ(36px);
}
.dice-back {
  transform: rotateY(180deg) translateZ(36px);
}
.dice-right {
  transform: rotateY(90deg) translateZ(36px);
}
.dice-left {
  transform: rotateY(-90deg) translateZ(36px);
}
.dice-top {
  transform: rotateX(90deg) translateZ(36px);
}
.dice-bottom {
  transform: rotateX(-90deg) translateZ(36px);
}

/* 各面点数显示 */
.dice-show-1 .dice-cube {
  transform: rotateX(0deg) rotateY(0deg);
}
.dice-show-2 .dice-cube {
  transform: rotateX(-90deg) rotateY(0deg);
}
.dice-show-3 .dice-cube {
  transform: rotateX(0deg) rotateY(-90deg);
}
.dice-show-4 .dice-cube {
  transform: rotateX(0deg) rotateY(90deg);
}
.dice-show-5 .dice-cube {
  transform: rotateX(90deg) rotateY(0deg);
}
.dice-show-6 .dice-cube {
  transform: rotateX(0deg) rotateY(180deg);
}

@keyframes dice-roll {
  0% {
    transform: rotateX(720deg) rotateY(360deg) rotateZ(180deg);
  }
  30% {
    transform: rotateX(540deg) rotateY(270deg) rotateZ(90deg);
  }
  60% {
    transform: rotateX(180deg) rotateY(90deg) rotateZ(30deg);
  }
  100% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
}

.dice-total {
  font-size: 15px;
  color: #37474f;
  font-weight: 600;
}

/* ===== 掷骰子按钮呼吸动画 (mine-monopoly 风格) ===== */
.btn-roll-dice {
  animation: btn-breathe 1.5s linear infinite !important;
}

@keyframes btn-breathe {
  0% {
    background: linear-gradient(135deg, #00838f, #00acc1);
  }
  50% {
    background: linear-gradient(135deg, #00acc1, #26c6da);
  }
  100% {
    background: linear-gradient(135deg, #00838f, #00acc1);
  }
}

.panel-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-actions .sr-btn {
  width: 100%;
}
.action-label {
  font-size: 13px;
  color: #546e7a;
  text-align: center;
  padding: 4px 0;
}

/* ===== 航海事件弹窗 ===== */
.event-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 20, 24, 0.65);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.event-modal__card {
  position: relative;
  background: #f8fbfb;
  border-radius: 18px;
  padding: 24px 24px 20px;
  width: 420px;
  max-width: 92vw;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.5);
  text-align: center;
}
.event-modal__card :deep(.sr-chance-card) {
  width: 100%;
  max-width: 100%;
}
.event-modal__close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: none;
  background: none;
  font-size: 16px;
  color: #90a4ae;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.event-modal__close:hover {
  color: #37474f;
}
.event-modal__effects {
  margin-top: 16px;
  text-align: left;
  background: #eef6f7;
  border-radius: 10px;
  padding: 12px 16px;
}
.event-modal__effects h4 {
  font-size: 12px;
  color: #00838f;
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.event-modal__effects ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.event-modal__effects li {
  font-size: 14px;
  color: #37474f;
  line-height: 1.9;
}
.event-modal__effects li + li {
  border-top: 1px dashed #cfd8dc;
}
.event-modal__actions {
  margin-top: 16px;
}
.event-modal__actions .sr-btn {
  width: 100%;
}
/* 弹窗过渡动画 */
.event-modal-enter-active,
.event-modal-leave-active {
  transition: opacity 0.25s ease;
}
.event-modal-enter-active .event-modal__card,
.event-modal-leave-active .event-modal__card {
  transition: transform 0.25s ease;
}
.event-modal-enter-from,
.event-modal-leave-to {
  opacity: 0;
}
.event-modal-enter-from .event-modal__card,
.event-modal-leave-to .event-modal__card {
  transform: scale(0.9) translateY(10px);
}

.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}
.player-row.is-active {
  background: #e8f5e9;
  margin: 0 -16px;
  padding: 8px 16px;
  border-radius: 6px;
}
.player-row.is-bankrupt {
  opacity: 0.5;
  text-decoration: line-through;
}
.text-danger {
  color: #e53935;
}
</style>
