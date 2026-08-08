# 团队协作开发规范（海上丝绸之路大富翁）

> 目标：多人并行开发互不阻塞，所有改动经 **Pull Request 审查**合并，`main` 永远可运行。

## 一、前置条件（每位成员都必须做）

| 项目             | 说明                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 安装 Git         | **必须**。下载 https://git-scm.com/download/win，安装后重启终端。<br>⚠️ 本项目的 `pnpm install` 依赖 git，没有 git 会导致安装失败（报 `execGit`/`gitFetcher` 错误） |
| 验证 Git         | 终端运行 `git --version`，能输出版本号才算装好                                                                                                                      |
| 安装 Node.js 20+ | https://nodejs.org/                                                                                                                                                 |
| 安装 pnpm 10+    | `npm install -g pnpm`                                                                                                                                               |
| 代码编辑器       | VS Code（建议安装 Prettier 插件，保存时自动格式化）                                                                                                                 |

## 二、GitHub 仓库设置（维护者一次性完成）

仓库地址：`https://github.com/Wwangwwww/silk-road-monopoly`

### 1. 把成员加进仓库（二选一）

- **小团队（10 人以内）**：仓库页 → Settings → Collaborators → Add people，输入成员 GitHub 账号，角色选 **Write**。
- **大团队**：GitHub 右上角 New organization 创建组织，把仓库转移进组织，再把成员拉进组织的 Team。

### 2. 保护 main 分支（多人协作的**关键**，必做）

仓库页 → Settings → Branches → Add branch ruleset → 选择 `main`：

| 规则                                  | 作用                                     |
| ------------------------------------- | ---------------------------------------- |
| Require a pull request before merging | 禁止直接 push 到 main，所有改动必须走 PR |
| Require approvals                     | 设为 1，至少 1 名成员审查通过才能合并    |
| Require status checks to pass         | 勾选 CI 的 `verify` job，CI 不绿不能合并 |
| Block force pushes                    | 禁止强推覆盖 main                        |

### 3. 启用任务管理

- **Issues**：Settings → General 里打开 Issues。每个功能开一个 Issue，用「功能 / Bug / 文档」标签分类。
- **Projects**：仓库顶部 Projects → 新建看板，列设为 `待办 / 进行中 / 审查中 / 已完成`，把 Issue 拖进去排期。
- **Discussions**（可选）：Settings → 打开，用于方案讨论。

## 三、新成员加入流程

```bash
# 1. 克隆仓库
git clone https://github.com/Wwangwwww/silk-road-monopoly.git
cd silk-road-monopoly

# 2. 配置自己的身份（用 GitHub 同款邮箱，提交记录才能对到人）
git config user.name "你的名字"
git config user.email "你的邮箱"

# 3. 安装依赖（pnpm-lock.yaml 锁定版本，直接装即可）
pnpm install

# 4. 配置环境变量（.env 已被 gitignore，每人在本地各自维护一份）
copy .env.example .env   # Windows
# 然后按自己本地的 MySQL 情况填写数据库密码等

# 5. 验证能跑
pnpm check-all
pnpm dev-server   # 终端 1
pnpm dev-client   # 终端 2
```

> 💡 `pnpm-lock.yaml` 是依赖版本锁定文件，**必须提交**。CI 使用 `--frozen-lockfile`，lockfile 与 package.json 不一致时 CI 会失败——谁新增了依赖，谁就负责把更新后的 lockfile 一起提交。

## 四、分支策略（必须遵守）

```
main（主线，永远可运行，只能通过 PR 合并）
   └── feature/xxx   （功能分支，各自从 main 切出）
   └── fix/xxx       （修复分支）
```

| 操作               | 命令                                                                             |
| ------------------ | -------------------------------------------------------------------------------- |
| 从 main 切功能分支 | `git checkout main && git pull && git checkout -b feature/你的功能名`            |
| 提交               | `git add . && git commit -m "feat: 描述"`                                        |
| 同步 main 最新代码 | `git checkout main && git pull`，切回后 `git rebase main`（或 `git merge main`） |
| 推送自己的分支     | `git push -u origin feature/xxx`                                                 |

**铁律：**

- ❌ 永远不要直接往 `main` 上 push（分支保护规则会直接拦下）。
- ✅ 每次开工前先 `git pull`，避免攒太多冲突。
- ✅ 提交信息用 `<类型>: <描述>`（`feat`/`fix`/`refactor`/`docs`/`chore`），比如 `fix: 修复过路费可被跳过的问题`。

## 五、Pull Request 工作流（每个功能的标准流程）

```bash
# 1. 开工：拉最新
git checkout main && git pull

# 2. 建分支干活
git checkout -b feature/xxx

# 3. 干完：本地自测 + 类型检查
pnpm check-all

# 4. 提交并推送
git add .
git commit -m "feat: 说明你做了什么"
git push -u origin feature/xxx

# 5. 在 GitHub 网页上点 "Compare & pull request" 开 PR
#    标题写清改动内容，描述里关联 Issue（例如 Fixes #12）
```

之后：

1. GitHub Actions（CI）自动对 PR 跑类型检查 + 构建 + 格式检查，**必须等它变绿**；
2. 至少 1 名成员 review 通过；
3. 合并方式选 **Squash and merge**（多次提交压成一条，main 历史干净）；
4. 合并后删除该 feature 分支。

## 六、代码审查约定

**提 PR 前自查：**

1. 本地 `pnpm check-all` 和 `pnpm format:check` 通过。
2. 改了 `packages/types` 或 `.env.example`，在 PR 描述里**明确标出**（这两处影响所有人）。
3. 新增依赖时，确认 `pnpm-lock.yaml` 已一起提交。
4. 描述清楚改动范围：改了哪几个 app/package、影响哪些页面或接口。

**审查时重点看：**

- 共享类型改动是否**只做加法**（新增字段/枚举），避免改名、删字段破坏别人编译；
- `.env` 是否误提交（.gitignore 已排除，若出现立即从仓库移除并改密码）；
- 命名是否统一、有无调试遗留代码（console.log、硬编码路径）。

## 七、职责分工建议（降低冲突面）

项目是 pnpm monorepo，天然适合按目录分工：

```
silk-road-monopoly/
├── apps/
│   ├── client/      ← 成员 A（游戏核心玩法：回合、骰子、港口、过路费、3D 场景）
│   ├── server/      ← 成员 B（房间、对战 API、WebSocket、数据库）
│   ├── admin/       ← 成员 B（管理后台）
│   └── map-editor/  ← 成员 A（地图编辑器）
├── packages/
│   ├── types/       ← ⚠️ 所有人共用，改动必须通知其他人（见下）
│   ├── utils/
│   ├── env/
│   ├── style/
│   └── components/
```

**⚠️ 最容易踩的坑：`packages/types`（共享类型）**

`client` 和 `server` 都依赖 `@silk-road-monopoly/types`。谁改它都可能影响别人编译。

规则：

1. 改 `types` 前，先和相关成员确认新增/修改的字段名与含义。
2. 只做**加法**（新增字段/枚举），尽量不做破坏性修改（改名、删字段）。
3. 改动后立刻跑 `pnpm check-all`，确认所有端类型都通过再提交。

## 八、合并前验证清单（"合在一起能跑"的关键）

**CI 会自动执行以下检查；PR 提交前建议本地也过一遍：**

```bash
# 1. 安装依赖（确保 lockfile 一致，新增依赖必须大家都装）
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

> 这些命令已被 CI（GitHub Actions）自动执行，PR 提交后 GitHub 会替你把关。
> **"CI 绿了" = 合在一起能跑**，以 CI 结果为准，不要只看本地。

## 九、冲突处理

冲突主要会发生在 `package.json`（各自加了依赖）和 `apps/client`（若多人同时碰）。

**PR 冲突（最常见）：** GitHub 会提示 "This branch has conflicts"。在自己本地分支上解决：

```bash
git checkout feature/xxx
git merge main
# 在编辑器里解决冲突后：
git add .
git commit
git push
# PR 会自动更新
```

- 解决冲突后必须重新跑 `pnpm install`（更新 lockfile）+ 第八节验证。
- 遇到解不开的冲突，`git merge --abort` 放弃，和相关成员商量后再合并。

## 十、环境变量与数据库

- `.env` 包含数据库密码、COS 密钥等**敏感信息**，已被 `.gitignore` 排除，**绝不提交**。
- 仓库只有 `.env.example` 模板。每人在本地 `copy .env.example .env` 并填写自己的配置。
- 新增环境变量时，**同时更新 `.env.example`**，并在 PR 描述里通知其他人。
- 改数据库表结构（TypeORM 实体/init.sql）时，把 `conf/sql/init.sql` 同步更新，并跑 `pnpm dev-server` 验证能启动。
- 数据库结构改动属于高影响改动，建议单独开一个 PR。

## 十一、任务管理（推荐做法）

1. 每个功能/修复在 **Issues** 开一个 Issue，写清目标和验收标准。
2. 把 Issue 拖进 **Projects** 看板，自己认领（Assignees 指给自己）。
3. 分支命名与 Issue 关联，如 `feature/issue-12-港口交易`。
4. 提 PR 时写 `Fixes #12`，合并后 GitHub 会自动关闭该 Issue。
5. 拿不准的设计问题先在 Issue/Discussions 里讨论再动手，避免白做。

## 十二、遇到"合起来跑不起来"的排查顺序

1. `pnpm install --frozen-lockfile` → 若报 lockfile 不一致，说明有人加了依赖没提交 lockfile。
2. `pnpm check-all` → 类型错误：通常是 `packages/types` 被一方改了但没同步。
3. 构建 client/server → 构建错误：环境变量缺失（看 `.env.example`）。
4. 运行 `pnpm dev-client` + `pnpm dev-server` → 端口冲突/数据库未启动（见 `docs/development-guide.md`）。

## 十三、快速参考（常用命令）

```bash
pnpm install            # 安装依赖
pnpm dev-client         # 客户端开发服务器 (http://localhost:5173)
pnpm dev-server         # 服务端 (http://localhost:8081)
pnpm dev-admin          # 管理面板 (http://localhost:8083)
pnpm dev-editor         # 地图编辑器
pnpm check-all          # 全部类型检查
pnpm format:check       # 检查格式
node apps/client/scripts/test-toll.mjs   # 过路费回归测试
```
