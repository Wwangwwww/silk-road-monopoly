# 海上丝绸之路大富翁 (Silk Road Monopoly)

基于 MINE-MONOPOLY 框架的海上丝绸之路主题多人在线大富翁游戏。

## 🎮 游戏主题

以海上丝绸之路为背景，玩家扮演古代商贾，从泉州、广州等港口出发，途经东南亚、印度洋、阿拉伯半岛，最终抵达东非和欧洲。通过贸易、投资港口、应对海上风险，积累财富成为海上贸易霸主。

### 主题特色
- 🌊 **航线地图**: 以海上丝绸之路航线取代传统街道
- 🏯 **港口资产**: 泉州、广州、占城、满剌加、古里、忽鲁谟斯等历史港口
- 💰 **银两经济**: 使用银两作为交易货币
- 📦 **贸易商品**: 丝绸、瓷器、茶叶、香料、宝石
- ⛈️ **航海事件**: 台风、海盗、顺风、海市蜃楼等随机事件
- 🚢 **船队系统**: 升级船队提升移动力和贸易效率

## 🏗️ 项目结构

```
silk-road-monopoly/
├── apps/
│   ├── client/          # 游戏客户端 (Vue3 + Three.js + Pixi.js)
│   ├── server/          # 游戏服务端 (Express + TypeORM + MySQL)
│   ├── admin/           # 管理面板 (AntV G2 + Monaco Editor)
│   └── map-editor/      # 地图编辑器 (Electron + MCP AI)
├── packages/
│   ├── types/           # 共享 TypeScript 类型定义
│   ├── utils/           # 共享工具库
│   ├── env/             # 环境变量管理
│   ├── style/           # 统一样式系统 (品牌色: 海蓝 #00838F)
│   └── components/      # 共享 UI 组件
├── docker/              # Docker 部署配置
├── conf/                # 数据库初始化脚本
└── docs/                # 开发文档
```

## 🚀 快速开始

### 环境要求
- Node.js 20+
- pnpm 10+
- MySQL 8.0+

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
# 启动服务端
pnpm dev-server

# 启动客户端
pnpm dev-client

# 启动管理面板
pnpm dev-admin

# 启动地图编辑器
pnpm dev-editor
```

### Docker 部署
```bash
pnpm docker:build
pnpm docker:up
```

## 📜 开源协议

GPL-3.0 License
