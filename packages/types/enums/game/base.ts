/** 游戏基础枚举 */

// 从 game-process 重新导出的核心枚举已在 game-process 中定义
// 此处定义更多基础枚举

/** 地图文件格式 */
export enum MapFileFormat {
  /** JSON */
  JSON = 'json',
  /** 加密地图 .srmap (Silk Road Map) */
  SRMAP = 'srmap',
}

/** 平台类型 */
export enum PlatformType {
  Web = 'web',
  Electron = 'electron',
  Android = 'android',
  IOS = 'ios',
}

/** 游戏模式 */
export enum GameMode {
  /** 在线多人 */
  Online = 'online',
  /** 本地多人 */
  Local = 'local',
  /** 人机对战 */
  AI = 'ai',
}
