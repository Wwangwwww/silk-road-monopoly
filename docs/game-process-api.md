# 海上丝绸之路大富翁 - 游戏流程 API

## 游戏阶段

```
等待开始 → 掷骰子 → 移动 → 港口操作 → 事件处理 → 回合结束 → (循环/结束)
```

## WebSocket 消息类型

### 房间管理
| 消息 | 方向 | 说明 |
|------|------|------|
| `create_room` | C→S | 创建房间 |
| `join_room` | C→S | 加入房间 |
| `room_update` | S→C | 房间状态更新 |

### 游戏流程
| 消息 | 方向 | 说明 |
|------|------|------|
| `game_start` | S→C | 游戏开始 |
| `roll_dice` | C→S | 请求掷骰子 |
| `roll_dice_result` | S→C | 骰子结果 |
| `player_move` | S→C | 玩家移动 |
| `player_action` | C→S | 玩家操作 |
| `game_over` | S→C | 游戏结束 |

### 数据同步
| 消息 | 方向 | 说明 |
|------|------|------|
| `game_data` | S→C | 完整游戏状态 |
| `map_chunk` | S→C | 地图分块传输 |

## REST API

### 用户
- `POST /user/register` - 注册
- `POST /user/login` - 登录

### 地图
- `GET /game-map/list` - 地图列表
- `GET /game-map/:id` - 地图详情

### 房间
- `GET /room-router/list` - 房间列表

### 统计
- `GET /statistics/overview` - 游戏统计概览
