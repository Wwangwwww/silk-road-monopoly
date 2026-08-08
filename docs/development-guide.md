# 海上丝绸之路大富翁 - 开发指南

## 技术栈

| 层级      | 技术                             |
| --------- | -------------------------------- |
| 前端框架  | Vue 3.5 + TypeScript             |
| 状态管理  | Pinia                            |
| UI 组件库 | Ant Design Vue 4                 |
| 3D 渲染   | Three.js 0.179                   |
| 2D 渲染   | Pixi.js 8.14                     |
| 桌面端    | Electron 37                      |
| 移动端    | Capacitor 8                      |
| 服务端    | Express 4 + TypeScript           |
| 数据库    | MySQL 8 + TypeORM                |
| 实时通信  | WebSocket (ws) + WebRTC (PeerJS) |
| 构建工具  | Vite 5 + pnpm                    |

## 项目结构

```
silk-road-monopoly/
├── apps/
│   ├── client/         # 游戏客户端
│   │   ├── src/        # Vue 源代码
│   │   │   ├── views/  # 页面视图
│   │   │   ├── router/ # 路由配置
│   │   │   ├── store/  # Pinia 状态
│   │   │   └── core/   # 核心游戏逻辑
│   │   ├── electron/   # Electron 主进程
│   │   └── public/     # 静态资源
│   ├── server/         # 游戏服务端
│   │   └── src/
│   │       ├── routers/  # API 路由
│   │       ├── db/       # 数据库实体
│   │       └── utils/    # 工具函数
│   ├── admin/          # 管理面板
│   └── map-editor/     # 地图编辑器
├── packages/
│   ├── types/          # 类型定义
│   ├── utils/          # 工具库
│   ├── env/            # 环境变量
│   ├── style/          # 样式系统
│   └── components/     # 共享组件
├── docker/             # Docker 部署
├── conf/               # 配置文件
└── docs/               # 文档
```

## 快速开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
SERVER_PORT=8081
ICE_SERVER_PORT=8082
SILKROAD_ADMIN_PORT=8083
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
```

### 3. 启动开发服务

```bash
# 终端 1: 启动服务端
pnpm dev-server

# 终端 2: 启动客户端
pnpm dev-client

# 终端 3 (可选): 启动管理面板
pnpm dev-admin
```

### 4. 访问

- 客户端: http://localhost:5173
- 管理面板: http://localhost:5174
- API 服务: http://localhost:8081

## 游戏主题 - 海上丝绸之路

### 核心概念

| 概念   | 实现                   |
| ------ | ---------------------- |
| 货币   | 银两 (Silver)          |
| 棋盘   | 海上丝绸之路航线       |
| 地产   | 历史港口/商埠          |
| 建筑   | 商埠→商馆→贸易中心     |
| 机会卡 | 航海事件 (台风/海盗等) |
| 命运卡 | 贸易事件 (繁荣/萧条等) |
| 角色   | 历史人物/不同船型      |

### 地图文件格式

地图文件使用 `.srmap` 扩展名，基于 AES-CBC 加密，MAGIC 头为 `SRMP`。

## 构建与部署

```bash
# 构建客户端 (Electron)
pnpm build-client:win

# 构建服务端
pnpm build-server

# Docker 部署
pnpm docker:build
pnpm docker:up
```
