# 双人协作开发规范（海上丝绸之路大富翁）

> 目标：两人并行开发互不阻塞，最终合在一起**一定能跑**。

## 一、前置条件（两人都必须做）

| 项目 | 说明 |
|------|------|
| 安装 Git | **必须**。下载 https://git-scm.com/download/win，安装后重启终端。<br>⚠️ 本项目的 `pnpm install` 依赖 git，没有 git 会导致安装失败（报 `execGit`/`gitFetcher` 错误） |
| 验证 Git | 终端运行 `git --version`，能输出版本号才算装好 |
| 安装 Node.js 20+ | https://nodejs.org/ |
| 安装 pnpm 10+ | `npm install -g pnpm` |
| 代码编辑器 | VS Code（建议安装 Prettier 插件，保存时自动格式化） |

> ⚠️ 当前项目目录**还没有 git 仓库**，第一步就是把项目纳入版本控制（见下）。

## 二、初始化仓库（一次性）

```bash
cd C:\DFW\silk-road-monopoly

# 1. 确认 git 已安装
git --version

# 2. 初始化 git
git init
git checkout -b main

# 3. 安装依赖（首次会安装 prettier 并更新 pnpm-lock.yaml）
pnpm install

# 4. 一次性格式化，统一两人代码风格（只做这一次，之后大家写代码都会符合规范）
pnpm format

# 5. 确认格式检查通过
pnpm format:check

# 6. 提交基线（包含更新后的 pnpm-lock.yaml！）
git add .
git commit -m "chore: 项目基线（含过路费修复与协作配置）"

# 7. 添加远程仓库（二选一，推荐 GitHub，国内用 Gitee）
git remote add origin https://github.com/<你的账号>/silk-road-monopoly.git
git push -u origin main
```

之后另一方 `git clone https://github.com/<账号>/silk-road-monopoly.git` 即可。

> 💡 `pnpm-lock.yaml` 是依赖版本锁定文件，**必须提交**。CI 使用 `--frozen-lockfile`，lockfile 与 package.json 不一致时 CI 会失败——谁新增了依赖，谁就负责把更新后的 lockfile 一起提交。

## 三、分支策略（必须遵守）

```
main（主线，永远可运行）
   └── feature/xxx   （功能分支，各自从 main 切出）
```

| 操作 | 命令 |
|------|------|
| 从 main 切功能分支 | `git checkout main && git pull && git checkout -b feature/你的功能名` |
| 提交 | `git add . && git commit -m "feat: 描述"` |
| 同步 main 最新代码 | `git checkout main && git pull`，再切回 `git rebase main`（或 merge） |
| 合并回 main | `git checkout main && git merge feature/xxx`，**合并前必须过第 5 节验证** |

**铁律：**
- ❌ 永远不要直接往 `main` 上 push，各自在 `feature/xxx` 开发，合并时先本地验证。
- ✅ 每次开工前先 `git pull`，收工前先合并验证，避免攒太多冲突。
- ✅ 提交信息用 `<类型>: <描述>`（`feat`/`fix`/`refactor`/`docs`/`chore`），比如 `fix: 修复过路费可被跳过的问题`。

## 四、职责分工建议（降低冲突面）

项目是 pnpm monorepo，天然适合按目录分工：

```
silk-road-monopoly/
├── apps/
│   ├── client/      ← A 负责（游戏核心玩法：回合、骰子、港口、过路费、3D 场景）
│   ├── server/      ← B 负责（房间、对战 API、WebSocket、数据库）
│   ├── admin/       ← B 负责（管理后台）
│   └── map-editor/  ← A 负责（地图编辑器）
├── packages/
│   ├── types/       ← ⚠️ 双方共用，改动必须通知对方（见下）
│   ├── utils/
│   ├── env/
│   ├── style/
│   └── components/
```

**⚠️ 最容易踩的坑：`packages/types`（共享类型）**

`client` 和 `server` 都依赖 `@silk-road-monopoly/types`。谁改它都可能影响对方编译。

规则：
1. 改 `types` 前，先和对方确认新增/修改的字段名与含义。
2. 只做**加法**（新增字段/枚举），尽量不做破坏性修改（改名、删字段）。
3. 改动后立刻跑 `pnpm check-all`，确认两端类型都通过再提交。

## 五、合并前验证清单（"合在一起能跑"的关键）

**任何一次合并回 main 之前，依次跑下面命令，全部通过才算合并成功：**

```bash
# 1. 安装依赖（确保 lockfile 一致，新增依赖必须两人都装）
pnpm install --frozen-lockfile

# 2. 类型检查（client + map-editor）
pnpm check-all

# 3. 构建客户端
pnpm --filter @silk-road-monopoly/client run build:web

# 4. 构建服务端
pnpm --filter @silk-road-monopoly/server run build

# 5. 构建管理面板
pnpm --filter @silk-road-monopoly/admin run build

# 6. 代码风格检查
pnpm format:check

# 7.（可选）过路费回归测试
node apps/client/scripts/test-toll.mjs
```

> 这些命令已被 CI（GitHub Actions）自动执行，推送到远程后 GitHub 会替你把关（见第七节）。
> **"CI 绿了" = 合在一起能跑**，以 CI 结果为准，不要只看本地。

## 六、日常协作流程（每人每轮）

```bash
# 1. 开工：拉最新
git checkout main && git pull

# 2. 建分支干活
git checkout -b feature/xxx

# 3. 干完：本地自测（自己负责的 app 至少能 build）
pnpm --filter @silk-road-monopoly/client run check   # A
pnpm --filter @silk-road-monopoly/server run build   # B

# 4. 提交并推送
git add .
git commit -m "feat: 说明你做了什么"
git push -u origin feature/xxx

# 5. 合并：回 main，拉取，过第 5 节验证
git checkout main && git pull
git merge feature/xxx
# 跑第 5 节验证清单
git push
```

**冲突处理：**
- 冲突主要会发生在 `package.json`（各自加了依赖）和 `apps/client`（若两人都碰）。
- 解决冲突后必须重新跑 `pnpm install`（更新 lockfile）+ 第 5 节验证。
- 遇到解不开的冲突，`git merge --abort` 放弃，和对方商量后再合并。

## 七、CI 自动验证（已配置好）

已创建 `.github/workflows/ci.yml`：

- 每次 `push` 到 `main` 或提交 PR 时，GitHub 自动执行：
  - `pnpm install --frozen-lockfile`
  - `pnpm check-all`（类型检查）
  - 构建 client / server / admin
  - `pnpm format:check`（风格检查）
- 推送到 GitHub 后，仓库页面会显示 ✔ / ✘，**绿了再合并**。

## 八、环境变量与数据库

- `.env` 包含数据库密码、COS 密钥等**敏感信息**，已被 `.gitignore` 排除，**绝不提交**。
- 仓库只有 `.env.example` 模板。两人各自 `cp .env.example .env` 并填写自己的本地配置。
- 新增环境变量时，**同时更新 `.env.example`**，并告诉对方。
- 改数据库表结构（TypeORM 实体/init.sql）时，把 `conf/sql/init.sql` 同步更新，并跑 `pnpm dev-server` 验证能启动。

## 九、遇到"合起来跑不起来"的排查顺序

1. `pnpm install --frozen-lockfile` → 若报 lockfile 不一致，说明有人加了依赖没提交 lockfile。
2. `pnpm check-all` → 类型错误：通常是 `packages/types` 被一方改了但没同步。
3. 构建 client/server → 构建错误：环境变量缺失（看 `.env.example`）。
4. 运行 `pnpm dev-client` + `pnpm dev-server` → 端口冲突/数据库未启动（见 `docs/development-guide.md`）。

## 十、快速参考（常用命令）

```bash
pnpm install            # 安装依赖
pnpm dev-client         # 客户端开发服务器 (http://localhost:5173)
pnpm dev-server         # 服务端 (http://localhost:8081)
pnpm check-all          # 全部类型检查
pnpm build:web          # 构建客户端
pnpm format             # 全仓代码格式化
pnpm format:check       # 检查格式
node apps/client/scripts/test-toll.mjs   # 过路费回归测试
```
