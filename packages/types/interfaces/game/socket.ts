/** Socket 通信类型定义 */

/** Socket 消息类型 */
export enum SocketMsgType {
  // 基础
  Heart = 'heart',
  
  // 房间
  JoinRoom = 'join_room',
  LeaveRoom = 'leave_room',
  CreateRoom = 'create_room',
  RoomList = 'room_list',
  RoomUpdate = 'room_update',
  
  // 游戏
  GameStart = 'game_start',
  GameData = 'game_data',
  GameOver = 'game_over',
  
  // 玩家操作
  PlayerReady = 'player_ready',
  RollDice = 'roll_dice',
  RollDiceResult = 'roll_dice_result',
  PlayerMove = 'player_move',
  PlayerAction = 'player_action',
  
  // 交易
  TradeOffer = 'trade_offer',
  TradeResponse = 'trade_response',
  TradeComplete = 'trade_complete',
  
  // UI
  ButtonRegister = 'button_register',
  UI = 'ui',
  FormDialog = 'form_dialog',
  MessageCard = 'message_card',
  
  // 地图
  MapChunk = 'map_chunk',
  
  // 聊天
  Chat = 'chat',
  
  // 系统
  Error = 'error',
  System = 'system',
}

/** Socket 消息源 */
export enum SocketMsgSource {
  Server = 'server',
  Client = 'client',
}

/** 聊天消息类型 */
export enum ChatMessageType {
  Text = 'text',
  Emoji = 'emoji',
  System = 'system',
}

/** Socket 消息 */
export interface SocketMessage {
  type: SocketMsgType;
  source: SocketMsgSource;
  /** 发送者ID */
  from?: string;
  /** 目标ID (房间/玩家) */
  to?: string;
  /** 消息数据 */
  data: any;
  /** 时间戳 */
  timestamp: number;
}

/** WebSocket 消息 (Monopoly专用) */
export interface MonopolyWebSocketMsg extends SocketMessage {
  /** 房间ID */
  roomId?: string;
  /** 玩家ID */
  playerId?: string;
}

/** 音乐/音效消息 */
export interface Music {
  type: 'bgm' | 'sfx';
  name: string;
  /** 是否循环 */
  loop?: boolean;
  /** 音量 (0-1) */
  volume?: number;
}

/** 房间地图信息 */
export interface RoomMapInfo {
  roomId: string;
  mapId: string;
  mapName: string;
  playerCount: number;
  maxPlayers: number;
}
