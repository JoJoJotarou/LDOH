
<p align="center">
  <img src="public/logo.svg" alt="LDOH Logo" width="128" height="128" />
</p>

# LDOH

LDOH（Linux Do Open Hub）是一个开发信息导航平台。

## 功能概览

- 站点列表与卡片展示
- 收藏 / 隐藏（本地存储）
- 关键词搜索 + 标签/等级/特性筛选
- 站点新增 / 编辑（LD OAuth，LV2 及以上）
- 站长可隐藏自己的站点（仅本人可见）
- 站点报告（跑路 / 伪公益 两种类型）
- 跑路站点独立页面与站长恢复
- 根据等级显示站点
- 站点健康检查（HTTPS 基础连通性）
- 更新日志

## 技术栈

- Next.js 15（App Router）
- TypeScript
- Tailwind CSS
- Supabase
- LD OAuth

## 快速开始

```bash
npm install
npm run dev
```

构建/启动：

```bash
npm run build
npm start
```

Cloudflare Workers 构建 / 预览 / 部署：

```bash
npm run build:worker
npm run preview:worker
npm run deploy:worker
```

说明：

- `build:worker` 会调用 OpenNext，把 Next.js 项目构建成 Cloudflare Workers 可运行产物
- 构建产物位于 `.open-next/worker.js` 与 `.open-next/assets`
- `preview:worker` 会先构建，再用 OpenNext 调起 Wrangler 本地预览生产产物
- `deploy:worker` 会先构建，再把 Worker 发布到 Cloudflare
- 这三个脚本直接走 Next.js / OpenNext 的标准环境变量加载逻辑；生产构建请使用仓库根目录的 `.env.production.local`

## 环境变量

必须：

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LD_OAUTH_CLIENT_ID=
LD_OAUTH_CLIENT_SECRET=
LD_OAUTH_REDIRECT_URI=            # 形如 https://your-domain.com/api/oauth/callback
SESSION_SECRET=
```

可选：

```
ENV=dev                           # 业务 dev 模式，跳过 OAuth，返回 mock 用户
LD_DEV_USERNAME=                  # dev 模式 mock 用户名（ENV=dev 必填）
LD_DEV_TRUST_LEVEL=               # dev 模式 mock trust_level（ENV=dev 必填）
LD_DEV_USER_ID=                   # dev 模式 mock user_id（ENV=dev 必填，>0 才写入 created_by）
LD_OAUTH_AUTHORIZATION_ENDPOINT=  # 默认 https://connect.linux.do/oauth2/authorize
LD_OAUTH_TOKEN_ENDPOINT=          # 默认 https://connect.linux.do/oauth2/token
LD_OAUTH_USER_ENDPOINT=           # 默认 https://connect.linux.do/api/user
LD_OAUTH_REFRESH_BUFFER_SECONDS=120
LD_OAUTH_TOKEN_COOKIE_MAX_AGE=2592000 # 会话有效期（秒），默认 30 天
HEALTH_CRON_SECRET=                   # 健康检查 cron 密钥（必填，建议强随机）
HEALTH_CHECK_TIMEOUT_MS=5000          # 健康检查超时（毫秒）
HEALTH_CHECK_SLOW_MS=3000             # 健康检查高延迟阈值（毫秒）
HEALTH_CHECK_INTERVAL_MINUTES=60      # 健康检查间隔（分钟）
HEALTH_CHECK_CONCURRENCY=10           # 健康检查并发数
NEXT_PUBLIC_SWR_FOCUS_THROTTLE_INTERVAL=300000 # SWR 聚焦刷新节流（ms）
NEXT_PUBLIC_SWR_REFRESH_INTERVAL=1800000       # SWR 自动刷新间隔（ms）
NEXT_PUBLIC_REPO_URL=                          # 导航栏 GitHub 按钮链接
```

### Cloudflare 环境变量建议

- 构建期变量继续放在 `.env.production.local`，供本地 `next build` / OpenNext 打包使用。
- 运行期敏感变量建议通过 `wrangler secret put <NAME>` 或 Cloudflare Dashboard Secrets 配置：
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LD_OAUTH_CLIENT_SECRET`
  - `SESSION_SECRET`
  - `HEALTH_CRON_SECRET`
- 运行期非敏感变量建议放在 Cloudflare Dashboard Variables；仓库中的 `wrangler.jsonc` 已开启 `keep_vars: true`，后续 deploy 不会覆盖你在 Dashboard 中手工修改的变量。建议放入的变量包括：
  - `SUPABASE_URL`
  - `LD_OAUTH_CLIENT_ID`
  - `LD_OAUTH_REDIRECT_URI`
  - `LD_OAUTH_AUTHORIZATION_ENDPOINT`
  - `LD_OAUTH_TOKEN_ENDPOINT`
  - `LD_OAUTH_USER_ENDPOINT`
  - `LD_OAUTH_REFRESH_BUFFER_SECONDS`
  - `LD_OAUTH_TOKEN_COOKIE_MAX_AGE`
  - `HEALTH_CHECK_TIMEOUT_MS`
  - `HEALTH_CHECK_SLOW_MS`
  - `HEALTH_CHECK_INTERVAL_MINUTES`
  - `HEALTH_CHECK_CONCURRENCY`
  - `NEXT_PUBLIC_SWR_FOCUS_THROTTLE_INTERVAL`
  - `NEXT_PUBLIC_SWR_REFRESH_INTERVAL`
  - `NEXT_PUBLIC_REPO_URL`

## 部署到 Cloudflare Workers

仓库已内置 OpenNext 与 Wrangler 配置文件：

- `open-next.config.ts`
- `wrangler.jsonc`

首次部署前：

1. 确认 `wrangler.jsonc` 里的 `name` 是你自己的唯一 Worker 名称
2. 用 `.env.production.local` 准备构建期变量
3. 在 Cloudflare Dashboard 中配置运行期 Variables 与 Secrets
4. 在已登录 Wrangler 的环境中执行部署命令

常用命令：

```bash
# 仅生成 Cloudflare 产物
npm run build:worker

# 本地预览 Cloudflare 生产产物
npm run preview:worker

# 部署到 Cloudflare
npm run deploy:worker
```

当前 `open-next.config.ts` 使用默认 dummy 缓存，不要求额外的 KV / R2 / D1 绑定。如果后续要接入 ISR 或更激进的缓存策略，再补 Cloudflare 存储绑定即可。

### 构建时与运行时环境变量说明

`npm run deploy:worker` 的构建发生在本地机器上，因此要区分“构建时变量”和“Cloudflare 运行时变量”：

- 构建时变量：影响 `next build` / OpenNext 打包过程。比如静态预渲染、`NEXT_PUBLIC_*`、构建期读取的服务端变量。
- 运行时变量：Worker 已部署到 Cloudflare 后，在请求处理阶段通过 Cloudflare Variables / Secrets 读取。

为避免本地开发的 `.env.local` 误参与生产打包，生产构建请把变量直接写进 `.env.production.local`，并尽量写完整，不要依赖 `.env.local` 补值。业务代码里的 `ENV` 是项目自己的 dev/mock 开关，和 Next.js / OpenNext 的生产构建模式不是一回事。

推荐做法：

- `.env.production.local`：只负责构建期变量
- Cloudflare Dashboard Variables：只负责运行期非敏感变量
- Cloudflare Dashboard Secrets：只负责运行期敏感变量

不建议把敏感变量写进 `wrangler.jsonc` 的 `vars`，即使先留空也不建议。敏感值应直接在 Cloudflare 的 Secrets 中维护。

## 项目结构（简化）

```
app/                     # 路由与 API
components/              # 通用 UI（无业务）
features/sites/          # 站点模块（组件 + 服务）
lib/auth/                # LD OAuth
lib/db/                  # Supabase admin client
lib/server/              # 纯服务端数据层
lib/contracts/           # 类型定义
```

## 数据与迁移

- 数据结构说明：`docs/database.md`
- 迁移与数据清单：`docs/migrations.md`
  - OAuth 会话表：`auth_sessions`（refresh_token 仅服务端存储）

## API（内部）

- `GET /api/sites`：拉取站点与推荐标签
  - `GET /api/sites?mode=runaway`：拉取跑路站点列表
- `POST /api/sites`：新增站点（LV2）
- `PATCH /api/sites/[id]`：编辑站点（LV2）
- `POST /api/sites/[id]/report`：提交站点报告（跑路/伪公益）
- `PATCH /api/sites/[id]/restore-runaway`：站长恢复跑路站点
- `GET /api/sites/[id]/logs`：站点操作日志
- `GET /api/notifications`：系统通知（有效期内、已启用）
- `GET /api/ld/user`：当前用户信息（用于权限判断）
- `GET /api/health/cron`：站点健康检查（cron 调用，需 `x-cron-secret`）

## 站点可见性规则

- 普通公益站列表仅展示：`is_active = true`、`is_runaway = false`、`is_fake_charity = false`
- 标记为“仅站长可见”的站点，站长本人仍可见
- 跑路站点在 `/runaway-sites` 页面集中展示

## 标签策略

- tag 仅为字符串（无 id/name 区分）
- 推荐标签默认包含：Claude Code / Codex / Gemini CLI
- 推荐标签与站点已有 tag 去重合并

## 系统通知

- 表：`system_notifications`（见 `docs/system-notifications.md` / `docs/database.md`）
- 获取通知：`GET /api/notifications`
- 需登录可见；支持设置最小可见等级（`min_trust_level`，为空表示所有已登录用户可见）
- 生效规则：
  - `is_active = true`
  - `valid_from <= now()`
  - `valid_until is null 或 valid_until >= now()`
  - `min_trust_level is null 或 min_trust_level <= 当前用户等级`

## 维护者规则

- 输入 LinuxDo 个人主页链接：`https://linux.do/u/xxx/summary`
- 自动解析 `xxx` 作为显示名（若为空）与站长识别依据
- profile_url 为空则不显示

## 站点健康检查

- 仅检查 `apiBaseUrl` 的 HTTPS 连通性，不请求业务接口
- 401/403 视为正常响应
- 红色表示不可达（DNS/TCP/TLS/超时/私网/非 HTTPS 等）
- 黄色表示高延迟（>= 3000ms）或 HTTP 5xx
- 绿色表示正常
- 灰色表示尚未检查

### GitHub Actions 定时触发

使用 `.github/workflows/health-cron.yml` 触发定时检查，需要在仓库 Secrets 配置：

- `HEALTH_CRON_SECRET`：与环境变量一致的密钥
- `HEALTH_CRON_URL`：例如 `https://your-domain.com/api/health/cron`

部署到 Cloudflare 后，这个健康检查接口仍然可以继续沿用“外部 HTTP 定时调用”的方式；如果你已经有 GitHub Actions，就不必额外改成 Cloudflare Cron Trigger。
