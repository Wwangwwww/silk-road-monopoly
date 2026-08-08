// ============================================================================
// 航海事件系统自动化逻辑测试
// 驱动真实的 Pinia store（game.ts），验证：
//   1) 人类玩家落在事件格 → 自动抽卡并应用效果（phase=event + 卡片展示）
//   2) 事件结束后 endTurn 会清空事件卡片
//   3) AI 玩家落在事件格 → 与人类共用同一套事件系统
//   4) 事件效果类型均在 MapEventType 枚举内
//   5) 压力测试：多次触发不卡死、银两不为负
// 运行方式: node scripts/test-events.mjs
// ============================================================================
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');

// --- 找到 esbuild（pnpm 内部版本） ---
const pnpmDir = path.join(root, 'node_modules', '.pnpm');
const esbuildDirs = fs
  .readdirSync(pnpmDir)
  .filter((d) => d.startsWith('esbuild@'))
  .sort();
const esbuildPath = path.join(
  pnpmDir,
  esbuildDirs[esbuildDirs.length - 1],
  'node_modules',
  'esbuild',
  'lib',
  'main.js'
);
const esbuild = require(esbuildPath);

// --- 将真实 store 打包为可运行 ESM ---
const outFile = path.join(__dirname, '__events_test_bundle__.mjs');
await esbuild.build({
  entryPoints: [path.join(__dirname, '../src/store/game.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: outFile,
  external: ['vue', 'pinia'],
  logLevel: 'error',
});

const { useGameStore } = await import(pathToFileURL(outFile).href);
const { createPinia, setActivePinia } = await import('pinia');
setActivePinia(createPinia());

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✅ ' + msg);
  } else {
    failed++;
    console.log('  ❌ ' + msg);
  }
}

function newGame() {
  const store = useGameStore();
  store.initGame('测试船主', 1); // 1 人类 + 1 AI
  return store;
}

const VALID_EFFECTS = new Set([
  'typhoon',
  'pirates',
  'fair_wind',
  'trade_boom',
  'mirage',
  'imperial_reward',
  'ship_repair',
  'customs_duty',
]);

// 停在目标格前一格
function placeBefore(store, player, targetIndex) {
  const N = store.mapItems.length;
  player.position = (targetIndex - 1 + N) % N;
}

function findEventCell(store) {
  return store.mapItems.find((p) => p.type === 'chance' || p.type === 'fate');
}

// ---------- 场景1：人类玩家落在事件格 → 抽卡 + 效果生效 ----------
console.log('场景1: 人类玩家落在事件格');
{
  const store = newGame();
  const human = store.humanPlayer;
  const cell = findEventCell(store);

  placeBefore(store, human, cell.index);
  const sBefore = human.silver;
  const pBefore = human.position;
  const fBefore = human.fleetLevel;
  store.movePlayer(1);

  assert(store.phase === 'event', `移动后进入事件阶段 (phase=${store.phase})`);
  assert(store.currentEvent === null, '棋子移动到位前事件尚未触发（等动画结束）');

  // 模拟棋子动画到达目标格
  store.notifyMoveFinished();

  assert(store.phase === 'event', `事件展示阶段 (phase=${store.phase})`);
  assert(store.currentEvent !== null, '棋子到位后已抽到事件卡片');
  if (store.currentEvent) {
    assert(VALID_EFFECTS.has(store.currentEvent.effect), `卡片效果类型合法 (${store.currentEvent.effect})`);
  }

  // 移动类事件：卡片展示结束后才移动；纯效果事件：效果已立即生效
  if (store.hasPendingEventMove()) {
    const posBeforeMove = human.position;
    store.executePendingEventMove();
    assert(human.position !== posBeforeMove, '移动类事件：展示结束后才执行移动');
    assert(['event', 'turn_end', 'port_action'].includes(store.phase), `移动后 phase 合法 (phase=${store.phase})`);
  } else {
    assert(human.silver !== sBefore, '纯效果事件：银两已立即变化');
  }
}

// ---------- 场景2：事件结束后卡片被清空 ----------
console.log('场景2: endTurn 清空事件卡片');
{
  const store = newGame();
  const human = store.humanPlayer;
  const cell = findEventCell(store);
  placeBefore(store, human, cell.index);
  store.movePlayer(1);
  assert(store.currentEvent === null, '棋子未到位时事件未触发');
  store.notifyMoveFinished();
  assert(store.currentEvent !== null, '棋子到位后事件卡片已展示');

  if (store.hasPendingEventMove()) {
    store.executePendingEventMove();
  }
  store.endTurn();
  assert(store.currentEvent === null, 'endTurn 后事件卡片已清空');
  assert(store.phase === 'rolling_dice', `下一玩家进入掷骰阶段 (phase=${store.phase})`);
}

// ---------- 场景3：AI 玩家同样触发统一事件系统 ----------
console.log('场景3: AI 玩家落在事件格');
{
  const store = newGame();
  const ai = store.aiPlayers[0];
  const cell = findEventCell(store);

  store.endTurn(); // 人类结束回合 → 轮到 AI
  assert(store.currentPlayer.isAI, '已切换到 AI 回合');
  placeBefore(store, store.currentPlayer, cell.index);

  const sBefore = ai.silver;
  const pBefore = ai.position;
  const fBefore = ai.fleetLevel;
  store.movePlayer(1);

  assert(store.currentEvent === null, 'AI 棋子到位前事件未触发');
  store.notifyMoveFinished();

  assert(store.currentEvent !== null, 'AI 也抽到了事件卡片');
  if (store.hasPendingEventMove()) {
    store.executePendingEventMove();
  }
  const effectHappened = ai.silver !== sBefore || ai.position !== pBefore || ai.fleetLevel !== fBefore;
  assert(effectHappened, 'AI 的事件效果同样生效');
}

// ---------- 场景4：事件卡池覆盖多种类型（抽样统计） ----------
console.log('场景4: 卡池类型覆盖（抽样统计）');
{
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const store = newGame();
    const human = store.humanPlayer;
    const cell = findEventCell(store);
    placeBefore(store, human, cell.index);
    store.movePlayer(1);
    store.notifyMoveFinished();
    if (store.hasPendingEventMove()) {
      store.executePendingEventMove();
    }
    if (store.currentEvent) {
      seen.add(store.currentEvent.effect);
    }
  }
  console.log(`  抽样覆盖类型: ${[...seen].sort().join(', ') || '无'}`);
  assert(seen.size >= 6, `抽样 60 次至少覆盖 6 种事件类型（实际 ${seen.size} 种）`);
}

// ---------- 场景5：压力测试 - 无死循环、银两不为负 ----------
console.log('场景5: 压力测试（50 局）');
{
  let ok = true;
  for (let i = 0; i < 50; i++) {
    const store = newGame();
    const human = store.humanPlayer;
    const cell = findEventCell(store);
    placeBefore(store, human, cell.index);
    store.movePlayer(1);
    store.notifyMoveFinished();
    if (store.hasPendingEventMove()) {
      store.executePendingEventMove();
    }
    if (!['event', 'turn_end', 'port_action'].includes(store.phase)) {
      ok = false;
      console.log(`  ❌ 第 ${i + 1} 局 phase 异常: ${store.phase}`);
      break;
    }
    if (human.silver < 0) {
      ok = false;
      console.log(`  ❌ 第 ${i + 1} 局银两为负: ${human.silver}`);
      break;
    }
  }
  assert(ok, '50 局事件触发无死循环、银两不为负');
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
fs.unlinkSync(outFile);
process.exit(failed > 0 ? 1 : 0);
