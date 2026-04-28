# 影视推荐助手 — 完整技术文档

> AI 全栈项目：Agent 架构 + TMDB 实时数据 + RAG 语义检索 + 生产级工程
> 技术栈：Next.js 14 + Vercel AI SDK 6 + 智谱 GLM-4 + TMDB API + SQLite + Tailwind CSS

---

## 目录

- [一、项目架构总览](#一项目架构总览)
- [二、完整技术栈](#二完整技术栈)
- [三、项目文件结构](#三项目文件结构)
- [四、核心实现原理](#四核心实现原理)
- [五、Agent 工具详解](#五agent-工具详解)
- [六、RAG 管道详解](#六rag-管道详解)
- [七、前端组件架构](#七前端组件架构)
- [八、生产级工程](#八生产级工程)
- [九、技术难点与解决方案](#九技术难点与解决方案)
- [十、面试亮点提炼](#十面试亮点提炼)

---

## 一、项目架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                          用户浏览器                                │
│                                                                  │
│   page.tsx (React 前端)                                          │
│   ├─ SessionProvider → 多会话管理                                  │
│   ├─ Sidebar → 会话列表/搜索/新建                                  │
│   ├─ ChatArea → usePersistedChat + useChat                       │
│   │   ├─ MessageList → AgentStepTracker + MessageBubble           │
│   │   │   ├─ DramaCard / TMDBDetailCard / ComparisonCard          │
│   │   │   ├─ TMDBSearchResults / TMDBTrending / TMDBActorCard     │
│   │   │   ├─ RAG Citation (来源标注 [1][2])                       │
│   │   │   └─ MarkdownRenderer + CodeBlock                         │
│   │   └─ ChatInput → 图片上传 + 拖拽 + Stop/Send                  │
│   └─ Agent Step 可视化（进度条 + 步骤折叠）                         │
│              │ POST /api/chat (SSE UI Message Stream)              │
│              ▼                                                   │
│   route.ts (17 行！)                                              │
│   ├─ rateLimit() → 滑动窗口限流                                    │
│   ├─ detectInjection() → Prompt 注入防护                           │
│   ├─ convertToModelMessages() → 格式转换                           │
│   └─ dramaAgent.stream() → ToolLoopAgent 自主编排                  │
│       │                                                          │
│       ├─ tmdbSearch ──────→ TMDB API (搜索/发现)                  │
│       ├─ tmdbGetDetails ──→ TMDB API (详情/演员/海报)              │
│       ├─ tmdbGetTrending ─→ TMDB API (热播榜)                     │
│       ├─ tmdbGetByActor ──→ TMDB API (演员作品)                    │
│       ├─ ragSearch ───────→ VectorStore (语义检索)                 │
│       ├─ compareDramas ───→ TMDB API (剧集对比)                    │
│       ├─ analyzeMood ─────→ 关键词情绪分析                         │
│       └─ renderDramaCard ─→ 卡片渲染终端                           │
│                                                                  │
│              │                                                    │
│     ┌────────┼──────────┐                                        │
│     ▼        ▼          ▼                                        │
│  TMDB API  智谱 GLM-4   SQLite                                   │
│  (影视数据) (AI 编排)    (会话/消息/收藏)                            │
└─────────────────────────────────────────────────────────────────┘
```

**核心设计思想：ToolLoopAgent 自主决策 + 双数据源（TMDB 实时 + RAG 语义）**

Agent 接收用户消息后，自主决定：
1. 调用哪个工具（搜索/详情/热播/演员/语义搜索/对比/情绪分析）
2. 调用顺序（可多步推理，最多 10 步）
3. 最终通过 renderDramaCard 渲染卡片

---

## 二、完整技术栈

### AI 相关

| 包名 | 版本 | 作用 |
|------|------|------|
| `ai` | ^6.0.153 | Vercel AI SDK 核心：`ToolLoopAgent`、`streamText`、`tool`、`embed`、`cosineSimilarity` |
| `@ai-sdk/openai` | ^3.0.52 | OpenAI 兼容 Provider，`createOpenAI({ baseURL })` 指向智谱 |
| `@ai-sdk/react` | ^3.0.155 | `useChat` Hook 管理 SSE 流 + 消息状态 + 工具输出 |
| `zod` | ^4.3.6 | Schema 校验，配合 `zodSchema()` 定义工具输入 |

### 数据库 & 测试

| 包名 | 版本 | 作用 |
|------|------|------|
| `drizzle-orm` | ^0.45.2 | SQLite ORM（sessions/messages/favorites 表） |
| `better-sqlite3` | ^12.9.0 | SQLite 原生驱动 |
| `vitest` | ^4.1.4 | 单元测试（14 个测试用例） |

### UI 相关

| 包名 | 版本 | 作用 |
|------|------|------|
| `next` | 14.2.35 | React 全栈框架，App Router |
| `tailwindcss` | ^3.4.1 | 原子化 CSS |
| `lucide-react` | ^1.7.0 | 图标库 |
| `react-markdown` | ^10.1.0 | Markdown 渲染 |
| `react-syntax-highlighter` | ^16.1.1 | 代码高亮 |
| `framer-motion` | ^12.38.0 | 动画库 |

### 外部 API

| API | 用途 | 费用 |
|-----|------|------|
| 智谱 GLM-4-plus | Agent 编排（Tool Calling） | 付费 |
| 智谱 GLM-4-flash | 降级备选 | 免费 |
| 智谱 embedding-3 | RAG 向量化 | 免费 |
| TMDB API | 影视数据（搜索/详情/热播/演员） | 免费 |
| Tavily Search | 联网搜索（备用） | 免费 1000 次/月 |

---

## 三、项目文件结构

```
AIDEMO-BUN/
├── .env.local                          # ZHIPU_API_KEY + TMDB_API_KEY + TAVILY_API_KEY
├── .data/                              # 运行时数据（gitignore）
│   ├── vectors.json                    # RAG 向量索引
│   └── app.db                          # SQLite 数据库
│
└── src/
    ├── app/
    │   ├── layout.tsx                  # 根布局
    │   ├── page.tsx                    # 主页面（SessionProvider + Sidebar + ChatArea）
    │   ├── globals.css                 # 渐变背景 + 毛玻璃 + 响应式
    │   ├── error.tsx                   # 全局错误边界
    │   └── api/
    │       ├── chat/route.ts           # API 路由（限流 + 注入防护 + Agent 调用）
    │       └── favorites/route.ts      # 收藏 CRUD API
    │
    ├── components/
    │   ├── providers/
    │   │   └── SessionProvider.tsx     # React Context 全局会话状态
    │   ├── sidebar/
    │   │   ├── Sidebar.tsx             # 会话列表 + 搜索 + 新建
    │   │   └── SessionItem.tsx         # 单个会话条目
    │   └── chat/
    │       ├── ChatArea.tsx            # 主聊天面板
    │       ├── ChatInput.tsx           # 输入框 + 图片上传 + Stop/Send
    │       ├── MessageList.tsx         # 消息滚动列表 + 错误展示
    │       ├── MessageBubble.tsx       # 消息渲染 + Agent Step + 工具卡片
    │       ├── MarkdownRenderer.tsx    # react-markdown + remark-gfm
    │       ├── CodeBlock.tsx           # 语法高亮 + 复制按钮
    │       └── FilePreview.tsx         # 待发送图片预览
    │
    ├── hooks/
    │   ├── useSessionManager.ts        # 会话 CRUD + 搜索
    │   ├── usePersistedChat.ts         # useChat + localStorage 持久化
    │   ├── useAutoScroll.ts            # 流式渲染自动滚动
    │   └── useFileUpload.ts            # 文件选择/拖拽/base64
    │
    ├── lib/
    │   ├── zhipu.ts                    # 智谱 AI Provider
    │   ├── tmdb.ts                     # TMDB API 客户端（搜索/详情/热播/演员）
    │   ├── agent.ts                    # ToolLoopAgent（8 个工具）
    │   ├── types.ts                    # 共享类型
    │   ├── constants.ts                # WELCOME / TAG_COLORS / TOOL_LABELS
    │   ├── storage.ts                  # 客户端 localStorage
    │   ├── storage.server.ts           # 服务端 DB 操作
    │   ├── rate-limit.ts               # 滑动窗口限流
    │   ├── monitoring.ts               # 工具调用耗时追踪
    │   ├── tavily-search.ts            # Tavily 联网搜索
    │   ├── zhipu-search.ts             # 智谱 web_search 联网搜索
    │   ├── data/dramas.ts              # 33 部剧数据（RAG 索引源）
    │   ├── db/
    │   │   ├── schema.ts               # Drizzle ORM 表定义
    │   │   └── index.ts                # SQLite 连接 + 自动建表
    │   ├── rag/
    │   │   ├── vector-store.ts         # 自定义向量存储（余弦相似度）
    │   │   ├── indexer.ts              # DRAMA_DB → embedding → 存储
    │   │   ├── retriever.ts            # query embed → 相似度搜索
    │   │   └── seed.ts                 # CLI 种子脚本
    │   └── tools/
    │       ├── index.ts                # 统一导出
    │       ├── tmdbSearch.ts           # TMDB 搜索（剧名/类型/年份）
    │       ├── tmdbGetDetails.ts       # TMDB 详情（演员/海报/集数）
    │       ├── tmdbGetTrending.ts      # TMDB 热播榜
    │       ├── tmdbGetByActor.ts       # TMDB 演员作品
    │       ├── ragSearch.ts            # RAG 语义搜索
    │       ├── compareDramas.ts        # 剧集对比
    │       ├── analyzeMood.ts          # 情绪分析
    │       └── renderDramaCard.ts      # 卡片渲染终端
    │
    ├── __tests__/
    │   ├── rag/vector-store.test.ts    # 向量存储 6 个测试
    │   ├── rate-limit.test.ts          # 限流 3 个测试
    │   └── security/injection.test.ts  # 注入防护 5 个测试
    │
    └── server/
        └── index.ts                    # Bun 独立服务器
```

---

## 四、核心实现原理

### 4.1 ToolLoopAgent — AI 自主决策

```typescript
// src/lib/agent.ts
export const dramaAgent = new ToolLoopAgent({
  model: zhipu.chat("glm-4-plus"),
  instructions: `你是"甜甜"，影视推荐助手...`,
  tools: {
    tmdbSearch, tmdbGetDetails, tmdbGetTrending, tmdbGetByActor,
    ragSearch, compareDramas, analyzeMood, renderDramaCard,
  },
  stopWhen: stepCountIs(10),
});
```

**Agent 执行示例：**

```
用户: "李乃文最新的剧"
  │
  ├─ Step 1: AI 决定调 tmdbGetByActor({ actorName: "李乃文" })
  │           → 返回演员作品列表
  │
  ├─ Step 2: AI 决定调 renderDramaCard({ mood, dramas })
  │           → 渲染推荐卡片
  │
  └─ 完成，前端收到 2 个 tool output
      → AgentStepTracker 显示 [1] [2] 进度
      → TMDBActorCard + DramaCard 渲染
```

### 4.2 route.ts — 从 200 行到 17 行

**v0.3（过程式）：**
```
detectIntent() → if chat → handleChat()
               → if search → Tavily → Zhipu → JSON 解析 → 卡片
               → fallback → 纯文本
```

**v0.4（Agent）：**
```typescript
export async function POST(req: Request) {
  // 限流
  const { allowed } = rateLimit(ip);
  // 注入防护
  const warning = detectInjection(userText);
  // 格式转换
  const modelMessages = await convertToModelMessages(messages);
  // Agent 自主决策
  const result = await dramaAgent.stream({ messages: modelMessages });
  return result.toUIMessageStreamResponse();
}
```

### 4.3 双数据源设计

| 场景 | 数据源 | 原因 |
|------|--------|------|
| 精确搜索（剧名/年份/类型） | **TMDB API** | 实时、结构化、有海报 |
| 演员作品查询 | **TMDB API** | 精确的演员-作品关联 |
| 热播榜单 | **TMDB API** | 全球影视数据 |
| 情绪/氛围搜索（"甜甜的治愈系"） | **RAG** | 语义匹配，理解感受 |
| 对比功能 | **TMDB API** | 需要精确的数值对比 |

### 4.4 Provider 适配模式

```typescript
// 一行代码切换模型供应商
const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.ZHIPU_API_KEY,
});

// 切换到 OpenAI / DeepSeek / 月之暗面只需改 baseURL
```

---

## 五、Agent 工具详解

### 工具清单（8 个）

| # | 工具名 | 数据源 | 输入 | 输出 |
|---|--------|--------|------|------|
| 1 | `tmdbSearch` | TMDB | query/genre/year/region | 搜索结果（标题/评分/海报） |
| 2 | `tmdbGetDetails` | TMDB | tvId | 详情+演员表+海报+集数 |
| 3 | `tmdbGetTrending` | TMDB | timeWindow/limit | 热播排行榜 |
| 4 | `tmdbGetByActor` | TMDB | actorName | 演员作品列表 |
| 5 | `ragSearch` | VectorStore | query/topK | 语义搜索结果+引用 |
| 6 | `compareDramas` | TMDB | tvId1/tvId2 | 并排对比数据 |
| 7 | `analyzeMood` | 本地 | userMessage | 情绪标签+推荐策略 |
| 8 | `renderDramaCard` | 终端 | dramas/mood/analysis | 卡片渲染数据 |

### 工具定义模式

```typescript
// 以 tmdbSearch 为例
export const tmdbSearch = tool({
  description: "搜索电视剧。...",                           // AI 看到的描述
  inputSchema: zodSchema(                                  // 输入参数校验
    z.object({
      query: z.string().optional().describe("搜索关键词"),
      genre: z.string().optional().describe("类型"),
      year: z.number().optional().describe("年份"),
    })
  ),
  execute: async ({ query, genre, year }) => {             // 实际执行
    if (query) return (await searchTV(query, { year })).map(formatShow);
    return (await discoverTV({ ... })).map(formatShow);
  },
});
```

### Agent 指令中的工具选择策略

```
用户问某部剧的信息     → tmdbSearch → tmdbGetDetails → renderDramaCard
用户问某演员的剧       → tmdbGetByActor → renderDramaCard
用户问热播剧/最新剧    → tmdbGetTrending → renderDramaCard
用户按心情/偏好找剧    → ragSearch → renderDramaCard
用户对比两部剧         → tmdbSearch(找ID) → compareDramas
用户明确搜某类剧       → analyzeMood → tmdbSearch → renderDramaCard
用户闲聊              → 不调用工具，直接回复
```

---

## 六、RAG 管道详解

### 架构

```
DRAMA_DB (33部剧)
  │
  ▼ indexer.ts
  ├─ 为每部剧生成富文本："剧名(2024年)。类型：高甜、纯爱。评分：8.1..."
  ├─ 调用智谱 embedding-3 批量向量化
  └─ 存入 VectorStore + 持久化到 .data/vectors.json
       │
       ▼ retriever.ts
  用户查询 "想看甜甜的治愈系"
  ├─ embed(query) → 查询向量
  ├─ cosineSimilarity(queryVec, allVecs) → 相似度排序
  └─ 返回 top-k 结果（带引用标签 [1][2][3]）
```

### 无依赖设计

```typescript
// vector-store.ts — 自己实现余弦相似度
import { cosineSimilarity } from "ai";  // AI SDK 内置

search(queryEmbedding: number[], topK: number): SearchResult[] {
  const scored = this.entries.map((entry) => ({
    score: cosineSimilarity(queryEmbedding, entry.embedding),
    ...
  }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}
```

### 使用流程

```bash
# 1. 生成向量索引
bun run rag:seed

# 2. 索引自动在 API 启动时加载
# route.ts → ensureVectorsLoaded() → store.load()
```

---

## 七、前端组件架构

### 组件层级

```
page.tsx
  └─ SessionProvider (React Context)
       ├─ Sidebar
       │    ├─ 搜索框
       │    └─ SessionItem × N
       │
       └─ ChatArea [key={sessionId}]
            ├─ Header（标题 + 侧边栏开关）
            ├─ MessageList
            │    └─ MessageBubble × N
            │         ├─ 文本 → MarkdownRenderer → CodeBlock
            │         ├─ 文件 → <img> 图片预览
            │         └─ 工具调用 →
            │              ├─ AgentStepTracker（进度条 + 折叠步骤）
            │              ├─ DramaCard（推荐卡片）
            │              ├─ TMDBDetailCard（详情+海报+演员）
            │              ├─ TMDBSearchResultsCard（搜索结果）
            │              ├─ TMDBTrendingCard（热播榜）
            │              ├─ TMDBActorCard（演员作品）
            │              ├─ ComparisonCard（剧集对比）
            │              └─ RAG Citation（来源标注）
            └─ ChatInput（输入+上传+Stop/Send）
```

### Agent Step 可视化（Stage 5）

当 Agent 执行多步工具调用时，前端展示：

```
┌─────────────────────────────────┐
│ [1]──[2]──[3]  2/3 步完成       │ ← 进度条
│                                 │
│ ▶ ✓ 搜索影视中                  │ ← 可折叠步骤
│ ▶ ✓ 语义搜索中                  │
│ ▶ ... 生成推荐卡片中            │ ← 当前步骤（动画）
│                                 │
│ [最终卡片渲染]                   │
└─────────────────────────────────┘
```

### RAG 引用溯源（Stage 4）

```
┌─────────────────────────────────┐
│ 语义搜索结果（5 部）             │
│ [1] 你也有今天  2024 ★ 7.5      │ ← 引用编号
│ [2] 护心        2023 ★ 7.4      │
│ [3] 苍兰诀      2022 ★ 8.1      │
│ ──────────────────────────────  │
│ 来源：本地影视知识库（语义匹配）  │ ← 来源标签
└─────────────────────────────────┘
```

---

## 八、生产级工程

### 数据库（Drizzle ORM + SQLite）

**表结构：**

```sql
sessions   (id TEXT PK, title TEXT, created_at INT, updated_at INT)
messages   (id TEXT PK, session_id TEXT FK, role TEXT, parts_json TEXT, created_at INT)
favorites  (id TEXT PK, session_id TEXT, tmdb_id INT, title TEXT, poster_url TEXT, ...)
```

**客户端/服务端分离：**
- `storage.ts` → 客户端 localStorage（hooks 使用）
- `storage.server.ts` → 服务端 DB（API routes 使用）
- 避免将 `better-sqlite3`（依赖 `fs`）引入客户端打包

### 限流（rate-limit.ts）

```typescript
// 内存滑动窗口，20 次/分钟/IP
function rateLimit(key: string): { allowed: boolean; remaining: number }
```

### Prompt Injection 防护

```typescript
// 检测常见注入模式
const patterns = [
  /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
  /you\s+are\s+now\s+a/i,
  /system\s*:\s*/i,
  /<\|im_start\|>/i,
];
```

### 全局错误边界（error.tsx）

```tsx
export default function GlobalError({ error, reset }) {
  return (
    <div>
      <p>{error.message || "页面发生了未知错误"}</p>
      <button onClick={reset}>重试</button>
    </div>
  );
}
```

### 测试覆盖（14 个用例）

| 文件 | 测试项 | 用例数 |
|------|--------|--------|
| `vector-store.test.ts` | 添加/搜索/排序/topK/清空/空存储 | 6 |
| `rate-limit.test.ts` | 允许/阻断/独立 key | 3 |
| `injection.test.ts` | 正常输入/注入检测/短消息跳过 | 5 |

---

## 九、技术难点与解决方案

### 难点 1: better-sqlite3 不能打包到客户端

**问题：** `better-sqlite3` 依赖 Node.js `fs` 模块，Next.js 尝试将其打包到客户端时失败。

**解决：** 将存储层分为 `storage.ts`（客户端 localStorage）和 `storage.server.ts`（服务端 DB），确保 `fs` 依赖只在 server 端加载。

### 难点 2: 智谱 GLM-4-flash 不支持 Tool Calling

**问题：** 免费模型无法自主调用工具。

**解决：** 使用 `glm-4-plus` 作为 Agent 模型（支持 Tool Calling），`glm-4-flash` 作为降级备选。

### 难点 3: 智谱 web_search 不被 AI SDK 原生支持

**问题：** `@ai-sdk/openai` 无法透传智谱特有的 `web_search` 参数。

**解决：** 方案三用 TMDB API 替代，直接通过 REST API 调用，完美兼容 AI SDK 的 `tool()` 模式。保留 `zhipu-search.ts` 作为降级。

### 难点 4: AI SDK v6 breaking changes

| 变化 | v3 | v6 | 适配 |
|------|----|----|------|
| 消息结构 | `{ content }` | `{ parts: [] }` | 遍历 parts |
| 发送消息 | `handleSubmit(e)` | `sendMessage({ text })` | 改 API |
| 流式响应 | `toDataStreamResponse()` | `toUIMessageStreamResponse()` | 改方法名 |
| 工具定义 | `parameters: zod()` | `inputSchema: zodSchema(zod())` | 改参数名 |
| 消息转换 | 不需要 | `convertToModelMessages()` | 新增步骤 |
| initialMessages | `initialMessages` | `messages` | 改参数名 |

### 难点 5: RAG 向量持久化

**问题：** 每次请求都重新生成 embedding 太慢（33 部剧需 ~3s）。

**解决：** 种子脚本 `bun run rag:seed` 预生成索引到 `.data/vectors.json`，API 启动时一次性加载到内存。

### 难点 6: Agent 步骤可视化

**问题：** 多步工具调用时，前端显示一堆 tool output，用户看不懂执行过程。

**解决：** `AgentStepTracker` 组件：
- 收集同一消息中所有 tool parts
- 编号展示进度条（[1]──[2]──[3]）
- 中间步骤折叠/展开，最终卡片（renderDramaCard）展开

---

## 十、面试亮点提炼

### 亮点 1: 从过程式到 Agent 架构的演进

> 将 200 行的手动编排路由（detectIntent → Tavily → Zhipu → JSON 解析 → 卡片）重构为 17 行的 ToolLoopAgent 调用。Agent 自主决策调用 8 个工具中的哪一个、以什么顺序。实现了真正的 AI 自主编排，而非硬编码的 if-else 链。

### 亮点 2: 双数据源（TMDB 实时 + RAG 语义）

> 设计了两种互补的数据检索策略：TMDB API 提供精确的结构化数据（剧名搜索、演员查询、热播榜），RAG 提供语义匹配能力（"想看甜甜的治愈系"这种模糊需求）。Agent 根据用户问题自动选择数据源，实现了精准搜索和模糊推荐的统一。

### 亮点 3: 无依赖 RAG 管道

> 不依赖 Chroma/Pinecone 等向量数据库，自己实现向量存储和余弦相似度检索。使用 AI SDK 内置的 `cosineSimilarity` 函数和智谱 `embedding-3` 模型。面试时能清晰展示对 RAG 数学原理的理解。

### 亮点 4: Agent 思考过程可视化

> 实现了 Agent 执行过程的可视化：步骤进度条（编号圆点 + 连线）、可折叠的中间步骤详情、最终卡片渲染。用户能清楚看到 AI 的"思考 → 行动 → 观察"链路，体现了 Agent 交互设计的理解。

### 亮点 5: 生产级工程实践

> 完整的生产化方案：Drizzle ORM + SQLite 数据库（替代 localStorage）、滑动窗口限流（20 次/分钟）、Prompt Injection 防护（正则检测注入模式）、全局错误边界、14 个单元测试、工具调用耗时监控。前后端存储分离避免 Node.js 模块打包到客户端。

### 亮点 6: AI SDK v6 深度适配

> 完整适配了 AI SDK v6 的 breaking changes：`UIMessage.parts` 结构、`convertToModelMessages` 转换、`zodSchema` 工具定义、`ToolLoopAgent` + `stepCountIs` 多步控制、`embed` + `cosineSimilarity` 向量计算。体现了阅读源码和跟进新技术的能力。

---

*本文档覆盖了项目的所有技术细节，适合作为面试准备材料和简历项目描述的参考。*
*最后更新：2026-04-16（v0.4 — Agent + TMDB + RAG + 生产化）*
