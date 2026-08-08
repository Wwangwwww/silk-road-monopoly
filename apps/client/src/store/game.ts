import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GameData, PlayerInfo, DiceResult, GameLog, PropertyInfo } from '@silk-road-monopoly/types';
import { GamePhaseMark } from '@silk-road-monopoly/types';

// ==================== 默认地图数据（临时内置，后续从地图文件加载） ====================

function createDefaultPorts() {
  const portDefs = [
    { name: '泉州港', region: '中国东南', basePrice: 600, colorGroup: 'blue', specialty: '瓷器' },
    { name: '广州港', region: '中国东南', basePrice: 600, colorGroup: 'blue', specialty: '丝绸' },
    { name: '占城港', region: '东南亚', basePrice: 1000, colorGroup: 'green', specialty: '香料' },
    { name: '满剌加港', region: '东南亚', basePrice: 1200, colorGroup: 'green', specialty: '胡椒' },
    { name: '古里港', region: '印度洋', basePrice: 1400, colorGroup: 'orange', specialty: '宝石' },
    { name: '忽鲁谟斯港', region: '阿拉伯', basePrice: 1600, colorGroup: 'orange', specialty: '乳香' },
    { name: '亚丁港', region: '红海', basePrice: 1800, colorGroup: 'red', specialty: '没药' },
    { name: '亚历山大港', region: '地中海', basePrice: 2000, colorGroup: 'red', specialty: '玻璃' },
    { name: '威尼斯港', region: '欧洲', basePrice: 2200, colorGroup: 'purple', specialty: '金币' },
  ];

  // 构造 32 格地图：起点 + 9 港口 + 事件/税格穿插
  const ports: any[] = [];
  const events = ['chance', 'fate', 'tax', 'chance', 'free_port', 'go_to_jail', 'jail'];

  for (let i = 0; i < 32; i++) {
    if (i === 0) {
      ports.push({ id: 'start', name: '起点·泉州', region: '中国东南', type: 'start_port', index: 0 });
    } else if (i === 16) {
      ports.push({ id: 'free_port', name: '自由停泊', region: '公海', type: 'free_port', index: 16 });
    } else if (i === 24) {
      ports.push({ id: 'go_to_jail', name: '遭遇海盗!', region: '危险海域', type: 'go_to_jail', index: 24 });
    } else if (i === 8) {
      ports.push({ id: 'jail', name: '海盗岛', region: '危险海域', type: 'jail', index: 8 });
    } else if (i % 3 === 0) {
      const portIdx = Math.floor(i / 3) - 1;
      if (portIdx >= 0 && portIdx < portDefs.length) {
        const p = portDefs[portIdx];
        ports.push({
          id: `port_${portIdx}`,
          name: p.name,
          region: p.region,
          type: 'port',
          index: i,
          basePrice: p.basePrice,
          tollFees: [
            Math.floor(p.basePrice * 0.1),
            Math.floor(p.basePrice * 0.25),
            Math.floor(p.basePrice * 0.5),
            p.basePrice,
            Math.floor(p.basePrice * 1.5),
            Math.floor(p.basePrice * 2),
          ],
          upgradeCosts: [
            0,
            Math.floor(p.basePrice * 0.5),
            Math.floor(p.basePrice * 0.75),
            Math.floor(p.basePrice * 1),
            Math.floor(p.basePrice * 1.5),
            Math.floor(p.basePrice * 2),
          ],
          colorGroup: p.colorGroup,
          specialty: p.specialty,
        });
      } else {
        ports.push({ id: `event_${i}`, name: '航海事件', region: '海洋', type: 'chance', index: i });
      }
    } else {
      ports.push({ id: `event_${i}`, name: '航海事件', region: '海洋', type: 'chance', index: i });
    }
  }

  return ports;
}

// ==================== Store 定义 ====================

export const useGameStore = defineStore('game', () => {
  // ---------- 游戏设置 ----------
  const initialSilver = ref(15000);
  const maxPlayers = ref(4);

  // ---------- 游戏状态 ----------
  const phase = ref<GamePhaseMark>(GamePhaseMark.Waiting);
  const currentRound = ref(0);
  const currentPlayerIndex = ref(0);
  const players = ref<PlayerInfo[]>([]);
  const properties = ref<Map<string, PropertyInfo>>(new Map());
  const mapItems = ref<any[]>([]);
  const logs = ref<GameLog[]>([]);
  const diceResult = ref<DiceResult | null>(null);
  const isGameStarted = ref(false);
  const isGameOver = ref(false);
  const winner = ref<PlayerInfo | null>(null);

  // ---------- 计算属性 ----------
  const currentPlayer = computed(() => players.value[currentPlayerIndex.value] ?? null);
  const humanPlayer = computed(() => players.value.find((p) => !p.isAI) ?? null);
  const aiPlayers = computed(() => players.value.filter((p) => p.isAI));

  // ---------- 初始化游戏 ----------
  function initGame(playerName: string, aiCount: number = 3) {
    const totalPlayers = 1 + aiCount;

    // 创建玩家
    const playerList: PlayerInfo[] = [
      {
        id: 'player_0',
        name: playerName || '船主',
        roleId: 'role_merchant',
        silver: initialSilver.value,
        position: 0,
        ports: [],
        cards: [],
        inJail: false,
        jailTurns: 0,
        isBankrupt: false,
        fleetLevel: 1,
        isAI: false,
        isOnline: true,
      },
    ];

    const aiNames = ['郑和', '马可·波罗', '伊本·白图泰', '汪大渊'];
    for (let i = 0; i < aiCount; i++) {
      playerList.push({
        id: `ai_${i}`,
        name: aiNames[i] || `AI商人${i + 1}`,
        roleId: 'role_merchant',
        silver: initialSilver.value,
        position: 0,
        ports: [],
        cards: [],
        inJail: false,
        jailTurns: 0,
        isBankrupt: false,
        fleetLevel: 1,
        isAI: true,
        isOnline: true,
      });
    }

    players.value = playerList;
    currentPlayerIndex.value = 0;
    currentRound.value = 1;
    phase.value = GamePhaseMark.RollingDice;
    isGameStarted.value = true;
    isGameOver.value = false;
    winner.value = null;
    diceResult.value = null;
    properties.value = new Map();
    logs.value = [];
    mapItems.value = createDefaultPorts();

    addLog('system', `🚢 海上丝绸之路大富翁 · 第 ${currentRound.value} 回合开始！`);
    addLog('system', `${playerName} 与 ${aiCount} 位 AI 商人的贸易之旅启程！`);
  }

  // ---------- 掷骰子 ----------
  function rollDice(): DiceResult {
    const v1 = Math.floor(Math.random() * 6) + 1;

    const result: DiceResult = {
      values: [v1],
      total: v1,
      isDouble: false,
    };

    diceResult.value = result;

    const player = currentPlayer.value;
    if (player) {
      addLog('dice', `${player.name} 掷出了 🎲 ${v1}`);
    }

    return result;
  }

  // ---------- 移动玩家 ----------
  function movePlayer(steps: number) {
    const player = currentPlayer.value;
    if (!player || player.isBankrupt) return;

    // 标记移动开始，等待渲染层动画结束后再切换回合
    notifyMoveStarted();

    const oldPos = player.position;
    const newPos = (oldPos + steps) % mapItems.value.length;

    // 经过起点
    if (newPos < oldPos && steps > 0) {
      player.silver += 2000; // 经过起点奖励
      addLog('move', `${player.name} 经过起点·泉州，获得 2000 银两！`);
    }

    player.position = newPos;
    addLog(
      'move',
      `${player.name} 从 ${mapItems.value[oldPos]?.name ?? oldPos} 移动到 ${mapItems.value[newPos]?.name ?? newPos}`
    );

    // 进入阶段转换
    const landedItem = mapItems.value[newPos];
    if (!landedItem) return;

    // 过路费为强制规则：落脚点若为「有主且非自己」的港口，立即自动扣费，无法通过跳过/继续绕过
    if (landedItem.type === 'port') {
      collectToll(player);
    }

    switch (landedItem.type) {
      case 'port':
        // 有主港口（自己的或他人的）：过路费已在上方自动收取，直接结束回合
        if (properties.value.has(landedItem.id)) {
          phase.value = GamePhaseMark.TurnEnd;
        } else {
          // 无主港口：进入购买阶段
          phase.value = GamePhaseMark.PortAction;
        }
        break;
      case 'chance':
      case 'fate':
        phase.value = GamePhaseMark.Event;
        break;
      case 'tax':
        handleTax();
        break;
      case 'go_to_jail':
        sendToJail(player.id);
        break;
      case 'jail':
      case 'free_port':
      case 'start_port':
        phase.value = GamePhaseMark.TurnEnd;
        break;
      default:
        phase.value = GamePhaseMark.TurnEnd;
    }
  }

  // ---------- 港口操作 ----------
  function buyPort(portId: string) {
    const player = currentPlayer.value;
    if (!player || player.isAI) return false;

    const port = mapItems.value.find((p: any) => p.id === portId);
    if (!port || port.basePrice == null) return false;

    // 检查是否已被购买
    if (properties.value.has(portId)) return false;

    if (player.silver < port.basePrice) return false;

    player.silver -= port.basePrice;
    player.ports.push(portId);
    properties.value.set(portId, {
      portId,
      ownerId: player.id,
      level: 0,
      isMortgaged: false,
    });

    addLog('buy', `${player.name} 以 ${port.basePrice} 银两购买了 ${port.name}！`);
    return true;
  }

  function upgradePort(portId: string) {
    const player = currentPlayer.value;
    if (!player || player.isAI) return false;

    const prop = properties.value.get(portId);
    if (!prop || prop.ownerId !== player.id) return false;

    const port = mapItems.value.find((p: any) => p.id === portId);
    if (!port?.upgradeCosts) return false;

    const nextLevel = prop.level + 1;
    if (nextLevel >= port.upgradeCosts.length) return false;

    const cost = port.upgradeCosts[nextLevel];
    if (player.silver < cost) return false;

    player.silver -= cost;
    prop.level = nextLevel;

    addLog('upgrade', `${player.name} 花费 ${cost} 银两将 ${port.name} 升级到 ${nextLevel} 级！`);
    return true;
  }

  // ---------- 过路费（强制规则：落脚即自动扣除，玩家无法跳过） ----------
  function collectToll(player: PlayerInfo) {
    const landedItem = mapItems.value[player.position];
    if (!landedItem || landedItem.type !== 'port') return;

    const prop = properties.value.get(landedItem.id);
    if (!prop || prop.ownerId === player.id || prop.isMortgaged) return;

    const tollFees = landedItem.tollFees;
    if (!tollFees) return;

    const fee = tollFees[prop.level] || tollFees[0];
    const owner = players.value.find((p) => p.id === prop.ownerId);
    if (!owner) return;

    const actualPay = Math.min(fee, player.silver);
    player.silver -= actualPay;
    owner.silver += actualPay;

    addLog('toll', `${player.name} 向 ${owner.name} 支付了 ${actualPay} 银两过路费！`);
  }

  // ---------- 监狱相关 ----------
  function sendToJail(playerId: string) {
    const player = players.value.find((p) => p.id === playerId);
    if (!player) return;

    player.inJail = true;
    player.jailTurns = 0;
    player.position = mapItems.value.findIndex((m: any) => m.type === 'jail');
    addLog('jail', `🏴‍☠️ ${player.name} 被海盗扣留！需要等双骰或支付赎金。`);
    phase.value = GamePhaseMark.TurnEnd;
  }

  function releaseFromJailSilent(playerId: string) {
    const player = players.value.find((p) => p.id === playerId);
    if (!player) return;
    player.inJail = false;
    player.jailTurns = 0;
  }

  function payBail() {
    const player = currentPlayer.value;
    if (!player || !player.inJail) return;

    const bail = 500;
    if (player.silver < bail) return;

    player.silver -= bail;
    player.inJail = false;
    player.jailTurns = 0;
    addLog('jail', `${player.name} 支付 ${bail} 银两赎金，重获自由！`);
  }

  // ---------- 税收 ----------
  function handleTax() {
    const player = currentPlayer.value;
    if (!player) return;

    const tax = Math.floor(player.silver * 0.1);
    player.silver -= tax;
    addLog('tax', `${player.name} 缴纳航海税 ${tax} 银两。`);
    phase.value = GamePhaseMark.TurnEnd;
  }

  // ---------- 回合结束 ----------
  function endTurn() {
    const player = currentPlayer.value;
    if (!player) return;

    // 检查破产
    if (player.silver <= 0 && !player.isBankrupt) {
      player.isBankrupt = true;
      addLog('bankrupt', `💸 ${player.name} 破产了！`);
    }

    // 检查胜利条件：只剩一个玩家
    const alivePlayers = players.value.filter((p) => !p.isBankrupt);
    if (alivePlayers.length <= 1) {
      isGameOver.value = true;
      winner.value = alivePlayers[0] ?? null;
      phase.value = GamePhaseMark.GameOver;
      addLog('system', `🏆 ${winner.value?.name ?? '无人'} 赢得了这场贸易之争！`);
      return;
    }

    // 下一个玩家
    let nextIndex = (currentPlayerIndex.value + 1) % players.value.length;
    // 跳过破产玩家
    while (players.value[nextIndex]?.isBankrupt) {
      nextIndex = (nextIndex + 1) % players.value.length;
    }

    // 如果回到第一个玩家，回合数+1
    if (nextIndex <= currentPlayerIndex.value) {
      currentRound.value++;
      addLog('system', `📜 第 ${currentRound.value} 回合开始`);
    }

    currentPlayerIndex.value = nextIndex;
    phase.value = GamePhaseMark.RollingDice;
    diceResult.value = null;
  }

  // ---------- AI 自动行动 ----------
  async function playAITurn(): Promise<void> {
    const player = currentPlayer.value;
    if (!player || !player.isAI || player.isBankrupt || isGameOver.value) return;

    // 等待让玩家看到 AI 的回合
    await new Promise((r) => setTimeout(r, 800));

    // --- 监狱处理 ---
    if (player.inJail) {
      player.jailTurns++;
      if (player.jailTurns >= 3) {
        if (player.silver >= 500) {
          player.silver -= 500;
          player.inJail = false;
          player.jailTurns = 0;
          addLog('jail', `${player.name} 支付 500 银两赎金，重获自由！`);
        } else {
          addLog('jail', `${player.name} 无力支付赎金，继续被扣留...`);
          endTurn();
          return;
        }
      } else {
        addLog('jail', `${player.name} 被海盗扣留中 (${player.jailTurns}/3)...`);
        endTurn();
        return;
      }
    }

    // --- 掷骰子 & 移动 ---
    const result = rollDice();
    await new Promise((r) => setTimeout(r, 600));
    movePlayer(result.total);

    // --- 根据落脚格子类型处理 ---
    const landedItem = mapItems.value[player.position];

    switch (phase.value) {
      case GamePhaseMark.PortAction: {
        await new Promise((r) => setTimeout(r, 400));
        handleAIPortAction(player, landedItem);
        break;
      }
      case GamePhaseMark.Event: {
        await new Promise((r) => setTimeout(r, 400));
        handleAIEvent(player);
        break;
      }
      // tax / go_to_jail / jail / free_port / start_port 已在 movePlayer 中处理
      // 直接进入 endTurn
    }

    // 等待当前 AI 的帆船动画完全走完，再切换到下一个（保证按顺序行动）
    await waitForMove();
    endTurn();
  }

  // --- AI 港口操作 ---
  function handleAIPortAction(player: PlayerInfo, landedItem: any) {
    if (!landedItem || landedItem.type !== 'port') return;

    const prop = properties.value.get(landedItem.id);
    const basePrice: number = landedItem.basePrice ?? 0;
    const personality = getAIPersonality(player.id);

    // 情况1：港口无主 → 决策是否购买
    if (!prop) {
      if (basePrice === 0) return;

      // AI 购买决策：资金越充裕越倾向买
      const affordRatio = player.silver / Math.max(basePrice, 1);
      const buyThreshold = 2.0 - personality.aggression * 0.8; // 激进型 1.2x, 保守型 2.0x

      if (affordRatio >= buyThreshold) {
        player.silver -= basePrice;
        player.ports.push(landedItem.id);
        properties.value.set(landedItem.id, {
          portId: landedItem.id,
          ownerId: player.id,
          level: 0,
          isMortgaged: false,
        });
        addLog('buy', `${player.name} 以 ${basePrice} 银两购买了 ${landedItem.name}！`);
      } else {
        addLog('system', `${player.name} 放弃购买 ${landedItem.name}（资金不足）。`);
      }
      return;
    }

    // 情况2：港口有主（他人/自己）→ 过路费已在 movePlayer 中强制自动收取，此处无需再处理

    // 情况3：自己的港口 → 考虑是否升级
    // （暂不实现，未来可扩展）
  }

  // --- AI 事件处理 ---
  function handleAIEvent(player: PlayerInfo) {
    // 随机事件效果（简化版）
    const eventRoll = Math.random();
    if (eventRoll < 0.3) {
      // 顺风：获得奖励
      const bonus = 200 + Math.floor(Math.random() * 300);
      player.silver += bonus;
      addLog('event', `${player.name} 遇到顺风，获得 ${bonus} 银两！`);
    } else if (eventRoll < 0.6) {
      // 海盗：损失银两
      const loss = Math.min(200 + Math.floor(Math.random() * 300), player.silver);
      player.silver -= loss;
      addLog('event', `🏴‍☠️ ${player.name} 遭遇海盗，损失 ${loss} 银两！`);
    } else {
      addLog('event', `${player.name} 海上风平浪静，无事发生。`);
    }
  }

  // --- AI 人格系统 ---
  interface AIPersonality {
    aggression: number; // 0-1 攻击性（高→更积极购买/升级）
    riskTolerance: number; // 0-1 风险承受
    tradePreference: number; // 0-1 贸易偏好
  }

  const aiPersonalities: Map<string, AIPersonality> = new Map();

  function getAIPersonality(playerId: string): AIPersonality {
    if (!aiPersonalities.has(playerId)) {
      // 基于玩家 ID 生成确定性人格（同一 AI 始终同一人格）
      const hash = playerId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      aiPersonalities.set(playerId, {
        aggression: 0.3 + (hash % 7) * 0.1, // 0.3 ~ 0.9
        riskTolerance: 0.3 + ((hash * 3) % 7) * 0.1,
        tradePreference: 0.3 + ((hash * 5) % 7) * 0.1,
      });
    }
    return aiPersonalities.get(playerId)!;
  }

  // ---------- 移动动画同步（保证 AI 按顺序行动） ----------
  let moveOngoing = false;
  const moveWaiters: (() => void)[] = [];
  function notifyMoveStarted() {
    moveOngoing = true;
  }
  function notifyMoveFinished() {
    moveOngoing = false;
    const waiters = moveWaiters.splice(0);
    waiters.forEach((w) => w());
  }
  function waitForMove(): Promise<void> {
    if (!moveOngoing) return Promise.resolve();
    return new Promise((resolve) => moveWaiters.push(resolve));
  }

  // ---------- 日志 ----------
  function addLog(type: string, message: string) {
    logs.value.push({
      round: currentRound.value,
      playerId: currentPlayer.value?.id ?? 'system',
      message: `[${type}] ${message}`,
      timestamp: Date.now(),
    });

    // 最多保留 200 条日志
    if (logs.value.length > 200) {
      logs.value = logs.value.slice(-200);
    }
  }

  // ---------- 重置游戏 ----------
  function resetGame() {
    phase.value = GamePhaseMark.Waiting;
    currentRound.value = 0;
    currentPlayerIndex.value = 0;
    players.value = [];
    properties.value = new Map();
    mapItems.value = [];
    logs.value = [];
    diceResult.value = null;
    isGameStarted.value = false;
    isGameOver.value = false;
    winner.value = null;
  }

  return {
    // 状态
    phase,
    currentRound,
    currentPlayerIndex,
    players,
    properties,
    mapItems,
    logs,
    diceResult,
    isGameStarted,
    isGameOver,
    winner,
    initialSilver,
    maxPlayers,
    // 计算属性
    currentPlayer,
    humanPlayer,
    aiPlayers,
    // 动作
    initGame,
    rollDice,
    movePlayer,
    buyPort,
    upgradePort,
    payBail,
    endTurn,
    playAITurn,
    notifyMoveFinished,
    waitForMove,
    resetGame,
  };
});
