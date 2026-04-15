# AIDEMO → AIDEMO-BUN 迁移说明

## 项目结构变化

```
AIDEMO (Node.js)                  AIDEMO-BUN (Bun)
├── package.json                   ├── package.json          ← scripts 改用 bun
├── package-lock.json (218K)       ├── bun.lock (132K)       ← 锁文件更小
├── next.config.mjs                ├── next.config.mjs       ← 无需改动
├── node_modules/                  ├── node_modules/
│                                  ├── bunfig.toml           ← Bun 运行时配置 (新增)
│                                  └── src/server/index.ts   ← Bun 原生 HTTP 服务 (新增)
```

## 改动清单

| 文件 | 变化 |
|------|------|
| `package.json` | scripts 中 `next` → `bun --bun next`；新增 `@types/bun`；新增 `server` 脚本 |
| `bunfig.toml` | **新增** — Bun 运行时配置 |
| `src/server/index.ts` | **新增** — 演示 Bun 原生 `Bun.serve` API |
| 其余源码 | **零改动** — 业务代码完全兼容 |

## Bun vs Node.js 对比（本项目实测）

### 1. 安装速度

| 指标 | npm (Node.js) | Bun | 提升 |
|------|--------------|-----|------|
| 冷安装耗时 | **16.4s** | **0.6s** | **~27x 更快** |
| 锁文件体积 | 218K | 132K | 小 39% |

### 2. 运行方式

```bash
# Node.js 方式
npm run dev          # → node → next dev

# Bun 方式
bun run dev          # → bun --bun next dev（用 Bun 运行时替代 Node.js）
bun run server       # → bun run src/server/index.ts（纯 Bun 原生服务）
```

### 3. Bun 的核心优势

| 优势 | 说明 |
|------|------|
| **原生 TypeScript** | 直接运行 `.ts` 文件，无需 `tsx`、`ts-node`、编译步骤 |
| **原生 JSX** | 内置 JSX/TSX 支持，无需 Babel 配置 |
| **内置包管理** | `bun install` 替代 npm/yarn/pnpm，速度极快 |
| **内置打包器** | `bun build` 替代 webpack/esbuild/rollup |
| **内置测试** | `bun test` 替代 jest/vitest，零配置 |
| **内置 .env** | 自动读取 `.env`/`.env.local`，无需 dotenv |
| **原生 HTTP 服务** | `Bun.serve()` 零依赖启动 HTTP 服务器，无需 Express |
| **Web 标准 API** | 内置 `fetch`、`Request`、`Response`、`WebSocket`、`URLPattern` |
| **热重载** | `bun --hot` 文件修改自动重载，无需 nodemon |
| **Node.js 兼容** | 绝大多数 Node.js API 和 npm 包可直接使用 |

### 4. 代码对比示例

**启动 HTTP 服务器：**

```ts
// Node.js — 需要 express + body-parser（或手动处理）
import express from "express";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/dramas", (req, res) => { /* ... */ });
app.listen(3001);

// Bun — 零依赖，内置一切
Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/dramas") return Response.json(data);
  },
});
```

**运行 TypeScript：**

```bash
# Node.js
npx tsx src/server/index.ts    # 需要安装 tsx

# Bun
bun run src/server/index.ts    # 开箱即用
```

## 快速开始

```bash
cd AIDEMO-BUN

# 安装依赖
bun install

# 启动 Next.js 开发服务（Bun 运行时）
bun run dev

# 或启动纯 Bun HTTP 服务（演示原生 API）
bun run server
```

## 注意事项

- `bun --bun next dev` 使用 Bun 运行时替代 Node.js 来执行 Next.js
- 如果遇到兼容性问题，去掉 `--bun` 回退到 Node.js 运行：`bun next dev`
- Bun 1.x 已高度兼容 Node.js 生态，但少数原生模块（如 `node-gyp`）可能仍有问题
