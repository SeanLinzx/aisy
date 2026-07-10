# AI Camp · 暑期 AI 创作 + 网页实践训练营平台

面向小学生 / 初中生暑期训练营的 **AI 创作 + 可发布网页作品集** 全栈系统。

> 🎯 一周 MVP，本地可跑、链路完整、随时切换真实 / Mock AI 供应商，可演示给学生 / 老师 / 家长 / 管理员四种角色全流程。

## ✨ 功能一览

- **学生**：登录后进入"创作工具入口" — 文本 / 图片 / 视频（异步）/ 图文混合 / 网页 / 海报 / PPT / 代码；自动入库；语音输入提示词；网页工作台 = 提示词 → 实时预览 iframe → 版本 → 一键发布；个人主页 + 课程任务 + 我的素材 + 额度。
- **老师**：班级 / 小组 / 学生账号 / 任务发布 / 作品审核 / 额度分配 / 班级数据。
- **家长**：只能查看绑定学生的作品 + 成长报告。
- **管理员**：用户 / 班级 / 模板 / 供应商 / 模型 / 敏感词 / 审核 / 广场 / 配额 / 日志 / 系统配置。
- **AI 供应商适配层**：`MockProvider`（默认兜底，无 key 也能跑）+ `VolcengineArkProvider`（真实，对接 `/responses` 与 `/contents/generations/tasks`）。
- **儿童安全**：服务端 HTML sanitize + sandbox iframe 预览 + 敏感词拦截 + AI 内容提示框。

完整能力对照见 `docs/volcengine-ark.md` 和源码注释。

---

## 🧰 技术栈

| 层 | 选型 |
|---|---|
| Monorepo | pnpm workspace |
| 后端 | NestJS 10 · Prisma · SQLite(WAL，可切 Postgres) · JWT(Cookie) · Swagger |
| 异步任务 | 进程内轮询器（VideoTaskPoller / MusicTaskPoller，重启自动恢复） |
| 前端 | Next.js 14 (App Router) · TypeScript · Tailwind · TanStack Query |
| 存储 | 本地 `uploads/` (预留 S3/MinIO) |
| 部署 | Docker Compose · `deploy-prod.sh` 一键部署到 122 服务器 |

> ⚠️ 当前架构为**单实例**设计（SQLite + 进程内任务轮询 + 内存缓存）。多端同时访问由
> WAL、按 key 串行写、限流与聚合轮询接口保障；如需水平扩容多实例，需先迁移
> Postgres + Redis 队列。

---

## 🚀 10 分钟启动（推荐）

> 前置：已安装 [Node 18.18+](https://nodejs.org)。Docker 可选（默认 SQLite，无需 Docker）。pnpm 会通过 corepack 自动启用。

### 第一步：环境安装（首次运行）

**macOS / Linux：**

```bash
cd ai-camp
./install-env.sh
```

**Windows：** 双击 `install-env.bat`，或在 PowerShell：

```powershell
cd ai-camp
.\install-env.bat
```

安装脚本会自动完成：

1. 检查 Node / pnpm / Docker（可选）
2. 从 `.env.example` 生成 `.env.local`（自动写入本地开发 ARK_API_KEY）
3. 按需启动 PostgreSQL 容器（仅当 `DATABASE_URL` 为 PostgreSQL 时）
4. `pnpm install`
5. `prisma generate` + `prisma db push` + `prisma seed`

### 第二步：启动开发服务器

**macOS / Linux：**

```bash
./start-dev.sh
```

**Windows：** 双击 `start-dev.bat`，或：

```powershell
.\start-dev.bat
```

启动后会同时运行 API（`http://localhost:3001/api`）和 Web（`http://localhost:3000`）。

完成后浏览器打开 [http://localhost:3000](http://localhost:3000)。

### 默认演示账号（密码均为 `123456`）

| 用户名 | 角色 | 说明 |
| --- | --- | --- |
| `admin` | 管理员 | 看一切、改一切 |
| `teacher1` | 老师 | 已是 "2026 暑期 A 班" 班主任 |
| `teacher2` | 老师 | 备用老师 |
| `parent1` | 家长 | 已绑定学生 alice |
| `alice` | 学生 | 已有 demo 素材和发布的网页 `/p/alice-demo` |
| `bob` | 学生 | 干净账号 |
| `charlie` | 学生 | 干净账号 |
| `dora` | 学生 | 干净账号 |

API Swagger 文档：[http://localhost:3001/api/docs](http://localhost:3001/api/docs)
公开发布页：[http://localhost:3000/p/alice-demo](http://localhost:3000/p/alice-demo)
作品广场：[http://localhost:3000/plaza](http://localhost:3000/plaza)

---

## 🐳 Docker 一键容器化启动

```bash
./start-docker.sh        # macOS / Linux
.\start-docker.bat       # Windows
```

第一次会编译镜像（数分钟），完成后 `web/api/postgres/redis` 全部以容器方式跑起来。
真实 ARK key 通过 `.env`（脚本会从 `.env.example` 复制并提示填入）注入；不填则自动 Mock。

---

## 🌐 生产部署（122 服务器）

```bash
./deploy-prod.sh                 # rsync 代码 → 远程 docker compose 构建重启 → 健康检查
DEPLOY_NGINX=1 ./deploy-prod.sh  # 同时更新 Nginx 配置并 reload
```

- 服务器：`root@122.51.185.212:/opt/ai-camp`，对外 `http://122.51.185.212/aisy`
- 数据持久化：SQLite 在 `data/db/prod.db`、上传文件在 `data/uploads/`（均为宿主机挂载卷，重建容器不丢数据；首次启动自动用种子库初始化）
- 密钥：服务器上的 `/opt/ai-camp/.env`（提供 `ARK_API_KEY` 等），部署脚本不会覆盖或删除它
- Nginx：`deploy/nginx-ip.conf`（`/aisy/uploads` 直连 API 容器，其余走 Next.js）

---

## 🔑 AI 供应商配置

详见 [`docs/volcengine-ark.md`](docs/volcengine-ark.md)，包含：

- 两个官方 curl 样例 → 我们项目里的实现位置；
- 异步视频任务的轮询机制 + 扩展点说明；
- 如何在管理员后台动态启停 / 切换。

> ⚠️ 真实 Key 只能放在 `.env.local` / `.env` 中，**已加入 `.gitignore`**，不会进入仓库或前端 bundle。

---

## 📁 目录结构

```
ai-camp/
├── apps/
│   ├── api/                 # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/     # auth / users / classes / groups / tasks / submissions / assets / web-projects / homepages / ai / ai-providers / ai-generate / reviews / quotas / dashboard / configs / logs / storage / parents / plaza / publish
│   │   │   └── common/      # filters / guards / interceptors / decorators / utils
│   │   ├── prisma/          # schema.prisma + seed.ts
│   │   └── uploads/         # 本地素材
│   └── web/                 # Next.js 前端
│       └── src/app/
│           ├── (root) /login /plaza /forbidden /not-found
│           ├── student/     # 学生端 13 个页面
│           ├── teacher/     # 老师端
│           ├── parent/      # 家长端
│           └── admin/       # 管理员端
├── packages/types/          # 预留共享类型
├── docs/volcengine-ark.md
├── docker-compose.yml
├── install-env.{sh,bat}     # 首次环境安装（不启动服务）
├── start-dev.{sh,bat}       # 启动开发服务器
├── start-docker.{sh,bat}
├── .env.example             # 模板（无敏感数据）
└── README.md
```

---

## 🧱 数据模型（Prisma）

26 个核心实体：`User`、`StudentProfile`、`ParentStudentRelation`、`Class` / `ClassMember`、`Group` / `GroupMember`、`Task` / `TaskSubmission`、`Asset` / `AssetVersion`、`WebProject` / `WebProjectVersion`、`StudentHomepage` / `HomepageBlock`、`AiProvider` / `AiModel` / `AiGenerationJob`、`PromptTemplate`、`ReviewRecord`、`QuotaAccount` / `QuotaTransaction`、`AuditLog`、`SystemConfig`、`SensitiveWord`、`PlazaItem`。

完整 schema 见 [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)。

---

## ✅ MVP 验收对照表

| 场景 | 入口 | 状态 |
|---|---|---|
| 1. 生成一段文本并保存 | `/student/text` | ✅ |
| 2. 图文混合理解 | `/student/mixed` | ✅ |
| 3. 视频任务（queued → succeeded） | `/student/video` | ✅ |
| 4. 提示词生网页实时预览 | `/student/web` | ✅ |
| 5. 把素材插入网页 | `/student/web` 左侧素材库 | ✅ |
| 6. 发布网页拿访问地址 | 工作台「🚀 发布」 → `/p/{slug}` | ✅ |
| 7. 自动生成的个人主页 | `/student/homepage` + `/api/homepages/by-slug/{slug}` | ✅ |
| 8. 老师创建任务 + 查看提交 | `/teacher/tasks` | ✅ |
| 9. 家长查看孩子作品 + 报告 | `/parent` + `/parent/report/{id}` | ✅ |
| 10. 管理员开/关 provider 看日志 | `/admin/providers` `/admin/logs` | ✅ |
| 11. 无真实 key 走 Mock 演示 | 删除 `.env.local` 的 ARK_API_KEY | ✅ |
| 12. 一键启动脚本 | `./start-dev.sh` / `.bat` / docker | ✅ |
| 13. 有 key 自动走 Volcengine Ark | start-dev 脚本自动写入 dev key | ✅ |
| 14. README 10 分钟跑起来 | 本文 | ✅ |

---

## 🛠 常用命令

```bash
pnpm dev                # 同时跑前后端
pnpm dev:api            # 只跑后端
pnpm dev:web            # 只跑前端

pnpm db:push            # prisma db push
pnpm db:migrate         # prisma migrate dev
pnpm db:seed            # 重新跑 seed
pnpm db:reset           # 重置数据库（小心）
```

---

## 🆕 进阶能力（已实现）

### 1. 真实图像生成（Volcengine Ark `/images/generations`）

- Provider：`apps/api/src/modules/ai/providers/volcengine-ark.provider.ts → generateImage()`
- 默认模型：`doubao-seedream-3-0-t2i-250415`（可在 `ARK_IMAGE_MODEL` 或管理员后台切换）
- 前端 `/student/image` 暴露：尺寸、张数、参考图 URL（图生图）
- 失败自动 fallback 到 Mock，保证演示链路不中断

### 2. 服务端 PPT(.pptx) / 海报(.pdf) 导出

- 后端模块：`apps/api/src/modules/exports/`，依赖 `pptxgenjs` + `pdfkit`，**纯 Node.js**，无需 Chromium
- 接口：
  - `GET /api/exports/ppt/{assetId}.pptx` —— 把 AI 生成的 slides JSON 转成可直接打开的 PowerPoint
  - `GET /api/exports/poster/{assetId}.pdf` —— A4 PDF 海报（自动嵌入图片）
- 入口：
  - `/student/ppt` 生成后 → "⬇️ 下载 .pptx"
  - `/student/poster` 生成后 → "⬇️ 下载 PDF"
  - `/student/assets` 列表里每条 PPT/海报/图片素材均有快捷下载按钮

### 3. 家长 / 老师 IM（站内即时沟通）

- 数据模型：新增 `Conversation`（按 parent×teacher×student 三元组聚合）+ `Message`
- 接口：`apps/api/src/modules/messages/`
- 前端：
  - `/parent/messages` —— 家长端：左侧自动列出可联系的老师 + 历史会话，右侧聊天窗口
  - `/teacher/messages` —— 老师端：左侧按班级 / 学生展开家长，右侧聊天窗口
- 共用组件：`components/chat-window.tsx` + `components/conversation-list.tsx`
- 行为：5 秒轮询、未读数小红点、敏感词拦截、Enter 发送 / Shift + Enter 换行
- Seed 已自动创建一条 `teacher1 ↔ parent1`（关于 alice）的示例对话

> 想升级到 WebSocket 实时？复用现有 REST 接口，加一个 `@nestjs/websockets` Gateway 推送 `messages.created` 即可，前端把 5 秒轮询换成订阅。

---

## 📌 说明 / 已知限制

- 视频任务轮询使用最常见的 `GET {videoTasksPath}/{id}`，若官方调整路径仅需改一处（`volcengine-ark.provider.ts → pollVideoTask`）。
- 所有 AI 输出页面均带"⚠️ AI 内容可能有误，请老师或家长协助核对"提示。
- 网页发布走 `sanitize-html` + sandbox iframe 双层防护，禁止脚本注入。
- PDF 海报使用 PDFKit 默认 Helvetica 字体，纯中文文字会被映射为缺字符——封面短标题没问题；如果你想做大篇幅中文 PDF，把 `apps/api` 装一份 NotoSansCJK 字体文件，在 `exports.service.ts` 里 `doc.registerFont('cjk', './fonts/NotoSansCJK-Regular.otf')` 后再 `doc.font('cjk')` 即可。
- IM 会话当前只在 parent / teacher 之间，未做学生侧入口；如需扩展只要在 layout 加 `/student/messages` 路由 + 复用 `ChatWindow` 即可。

---

祝开课顺利 🎉，有任何想要扩展的方向（更多模板、点赞评论、家长 IM、社群活动）都可以基于已有结构低成本叠加。
