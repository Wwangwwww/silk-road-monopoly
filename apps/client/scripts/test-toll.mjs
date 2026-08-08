// ============================================================================
// 过路费强制收取修复的自动化逻辑测试
// 驱动真实的 Pinia store（game.ts），验证：
//   1) 人类玩家落在 AI 港口 → 移动时强制扣过路费，点“跳过/结束回合”也无法绕过
//   2) AI 玩家落在人类港口 → 同样强制付费
//   3) 无主港口仍可正常购买（回归）
//   4) 自己的港口不收过路费
//   5) 抵押中的港口不收过路费
// 运行方式: node scripts/test-toll.mjs
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
const esbuildDirs = fs.readdirSync(pnpmDir).filter(d => d.startsWith('esbuild@')).sort();
const esbuildPath = path.join(pnpmDir, esbuildDirs[esbuildDirs.length - 1], 'node_modules', 'esbuild', 'lib', 'main.js');
const esbuild = require(esbuildPath);

// --- 将真实 store 打包为可运行 ESM ---
const outFile = path.join(__dirname, '__toll_test_bundle__.mjs');
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
  if (cond) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.log('  ❌ ' + msg); }
}

function newGame() {
  const store = useGameStore();
  store.initGame('测试船主', 1); // 1 人类 + 1 AI
  return store;
}

const PHASES = { PortAction: 'port_action', TurnEnd: 'turn_end' };

function placeBefore(store, player, targetIndex) {
  const N = store.mapItems.length;
  player.position = (targetIndex - 1 + N) % N; // 停在目标格前一格
}

// ---------- 场景1：人类玩家落在 AI 港口 → 强制扣费，无法绕过 ----------
console.log('场景1: 人类玩家落在 AI 港口');
{
  const store = newGame();
  const human = store.humanPlayer;
  const ai = store.aiPlayers[0];
  const port = store.mapItems.find(p => p.type === 'port');
  store.properties.set(port.id, { portId: port.id, ownerId: ai.id, level: 0, isMortgaged: false });
  ai.ports.push(port.id);
  const fee = port.tollFees[0];

  placeBefore(store, human, port.index);
  const hBefore = human.silver;
  const aBefore = ai.silver;
  store.movePlayer(1); // 掷骰子 1 步，正好落在 AI 港口

  assert(human.silver === hBefore - fee, `人类落脚后过路费已自动扣除 (${hBefore} → ${human.silver}, 应收 ${fee})`);
  assert(ai.silver === aBefore + fee, `港口所有者 AI 已收到过路费 (${aBefore} → ${ai.silver})`);
  assert(store.phase === PHASES.TurnEnd, `有主港口落脚后直接进入回合结束 (phase=${store.phase})，不会出现可“跳过”的 port_action 界面`);

  const afterMove = human.silver;
  store.endTurn(); // 旧 bug 路径：点“跳过/结束回合”
  assert(human.silver === afterMove, '模拟“点跳过”调用 endTurn 后钱仍已扣除（无逃费通道）');
}

// ---------- 场景2：AI 玩家落在人类港口 → AI 同样强制付费 ----------
console.log('场景2: AI 玩家落在人类港口');
{
  const store = newGame();
  const human = store.humanPlayer;
  const ai = store.aiPlayers[0];
  const port = store.mapItems.find(p => p.type === 'port');
  store.properties.set(port.id, { portId: port.id, ownerId: human.id, level: 0, isMortgaged: false });
  human.ports.push(port.id);
  const fee = port.tollFees[0];

  store.endTurn(); // 人类结束回合 → 轮到 AI
  assert(store.currentPlayer.isAI, '已切换到 AI 回合');
  placeBefore(store, store.currentPlayer, port.index);

  const aBefore = store.currentPlayer.silver;
  const hBefore = human.silver;
  store.movePlayer(1); // AI 落在人类港口

  assert(store.currentPlayer.silver === aBefore - fee, `AI 落脚人类港口被自动扣除过路费 ${fee}`);
  assert(human.silver === hBefore + fee, '人类已收到 AI 支付的过路费');
}

// ---------- 场景3：无主港口仍可购买（回归测试） ----------
console.log('场景3: 无主港口购买回归');
{
  const store = newGame();
  const human = store.humanPlayer;
  const port = store.mapItems.find(p => p.type === 'port' && !store.properties.has(p.id));

  placeBefore(store, human, port.index);
  store.movePlayer(1);
  assert(store.phase === PHASES.PortAction, `无主港口落脚后进入购买阶段 (phase=${store.phase})`);

  const before = human.silver;
  const ok = store.buyPort(port.id);
  assert(ok && human.silver === before - port.basePrice, '无主港口仍可正常购买并扣款');
}

// ---------- 场景4：自己的港口不收过路费 ----------
console.log('场景4: 落在自己港口');
{
  const store = newGame();
  const human = store.humanPlayer;
  const port = store.mapItems.find(p => p.type === 'port');
  store.properties.set(port.id, { portId: port.id, ownerId: human.id, level: 0, isMortgaged: false });
  human.ports.push(port.id);

  placeBefore(store, human, port.index);
  const before = human.silver;
  store.movePlayer(1);
  assert(human.silver === before, '落脚自己的港口不扣过路费');
  assert(store.phase === PHASES.TurnEnd, '自己的港口直接进入回合结束');
}

// ---------- 场景5：抵押中的港口不收过路费 ----------
console.log('场景5: 落在抵押中的港口');
{
  const store = newGame();
  const human = store.humanPlayer;
  const ai = store.aiPlayers[0];
  const port = store.mapItems.find(p => p.type === 'port');
  store.properties.set(port.id, { portId: port.id, ownerId: ai.id, level: 0, isMortgaged: true });

  placeBefore(store, human, port.index);
  const before = human.silver;
  store.movePlayer(1);
  assert(human.silver === before, '抵押中的港口不收取过路费');
}

// ---------- 场景6：升级后的港口按对应档位收费 ----------
console.log('场景6: 升级港口按档位收费');
{
  const store = newGame();
  const human = store.humanPlayer;
  const ai = store.aiPlayers[0];
  const port = store.mapItems.find(p => p.type === 'port');
  store.properties.set(port.id, { portId: port.id, ownerId: ai.id, level: 0, isMortgaged: false });
  ai.ports.push(port.id);
  store.properties.get(port.id).level = 2; // 升级到 2 级
  const fee = port.tollFees[2];

  placeBefore(store, human, port.index);
  const hBefore = human.silver;
  store.movePlayer(1);
  assert(human.silver === hBefore - fee, `按 2 级档位收取过路费 ${fee}`);
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
fs.unlinkSync(outFile);
process.exit(failed > 0 ? 1 : 0);
