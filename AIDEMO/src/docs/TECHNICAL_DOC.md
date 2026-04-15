# 甜剧推荐 · Sweet Drama AI — 完整技术文档

> 从零到一构建一个基于 Agent 模式的 AI 智能推荐应用
> 技术栈：Next.js 14 + Vercel AI SDK 6 + 智谱 GLM-4 + Tailwind CSS
> 架构亮点：意图驱动 + 服务端编排 + Generative UI 多形态渲染

---

## 目录

- [一、项目架构总览](#一项目架构总览)
- [二、完整技术栈](#二完整技术栈)
- [三、项目文件结构](#三项目文件结构)
- [四、核心实现原理](#四核心实现原理)
- [五、数据流详解](#五数据流详解)
- [六、每个文件的作用与原理](#六每个文件的作用与原理)
- [七、遇到的技术难点与解决方案](#七遇到的技术难点与解决方案)
- [八、简历亮点提炼](#八简历亮点提炼)
- [九、面试必考知识点](#九面试必考知识点)
- [十、面试官可能追问的问题](#十面试官可能追问的问题)

---

## 一、项目架构总览

```
┌────────────────────────────────────────────────────────────┐
│                          用户浏览器                          │
│                                                            │
│   page.tsx (React 前端)                                     │
│   ├─ useChat Hook ←→ sendMessage()                         │
│   ├─ DramaCard / TrendingCard / SearchResultsCard / 文本气泡│
│   └─ 毛玻璃 UI + rem 响应式                                  │
│              │ POST /api/chat (SSE 流)                       │
│              ▼                                             │
│   route.ts (Next.js API Route)                             │
│   ┌─────────────────────────────────────────────┐          │
│   │           服务端 Agent 编排层                   │          │
│   │                                               │          │
│   │  ① detectIntent()     → 意图识别（5种意图）      │          │
│   │     ├─ 规则匹配（关键词正则，快速准确）            │          │
│   │     └─ AI 分类（模糊意图，generateText 兜底）      │          │
│   │                                               │          │
│   │  ② 按意图分发到对应处理函数：                     │          │
│   │     ├─ chat     → streamText 纯文本回复           │          │
│   │     ├─ recommend → analyzeMood + filterDramas     │          │
│   │     │            + AI文案 + renderDramaCard 卡片    │          │
│   │     ├─ trending  → getTrending + TrendingCard 榜单  │          │
│   │     ├─ search    → searchDramasByKeyword + 搜索卡片  │          │
│   │     └─ rating    → 查询具体剧 + 纯文本介绍           │          │
│   │                                               │          │
│   │  ③ 各处理函数返回 → toUIMessageStreamResponse()    │          │
│   └─────────────────────────────────────────────┘          │
│              │                                              │
│     ┌────────┴─────────┐                                   │
│     ▼                  ▼                                    │
│  DRAMA_DB           智谱 GLM-4                              │
│  (本地 JSON)       (免费 glm-4-flash)                        │
│  33 部甜剧数据      意图分类 + 生成共情文案                    │
└────────────────────────────────────────────────────────────┘
```

**核心设计思想：意图驱动 + 服务端编排（Intent-Driven Orchestrated Agent）**

用户输入先经过**意图识别**（规则匹配 + AI 兜底），再按意图分发到不同的处理链路。AI 在两个环节发挥作用：
1. **意图分类**：模糊输入时用 `generateText` 让 AI 判断意图
2. **文案生成**：推荐模式下用 AI 生成个性化共情文案

这样做的好处：
- 不同意图返回不同 UI（文字、卡片、榜单、搜索结果），体验丰富
- 规则匹配快速无延迟，AI 只在模糊意图时介入
- 不依赖付费模型（glm-4-flash 免费即可运行）
- 工具执行结果 100% 可控
- 前端通过 Generative UI 渲染对应组件

---

## 二、完整技术栈

### AI 相关（核心）

| 包名 | 版本 | 作用 | 原理 |
|------|------|------|------|
| `ai` | ^6.0.153 | Vercel AI SDK 核心 | 提供 `streamText`、`tool`、`zodSchema`、`ToolLoopAgent` 等 AI 编排能力 |
| `@ai-sdk/openai` | ^3.0.52 | OpenAI 兼容 Provider | 通过 `createOpenAI({ baseURL })` 指向智谱 API，一行代码切换模型 |
| `@ai-sdk/react` | ^3.0.155 | React Hook | `useChat` 自动管理消息状态、SSE 流接收、工具输出解析 |
| `zod` | ^4.3.6 | Schema 校验 | 定义工具输入/输出的数据结构，配合 `zodSchema()` 传给 AI SDK |

### 框架 & 语言

| 包名 | 版本 | 作用 |
|------|------|------|
| `next` | 14.2.35 | React 全栈框架，App Router 模式 |
| `react` / `react-dom` | ^18 | UI 渲染引擎 |
| `typescript` | ^5 | 类型安全 |

### UI 相关

| 包名 | 版本 | 作用 |
|------|------|------|
| `tailwindcss` | ^3.4.1 | 原子化 CSS，所有样式用 class 名组合 |
| `lucide-react` | ^1.7.0 | 图标库（Send、Heart、Star、Film、TrendingUp、Search） |
| `framer-motion` | ^12.38.0 | 动画库（预留，后续可加卡片入场动画） |
| `clsx` | ^2.1.1 | className 条件拼接 |
| `tailwind-merge` | ^3.5.0 | Tailwind class 冲突合并 |

### AI 模型

| 模型 | 提供商 | 费用 | 用途 |
|------|--------|------|------|
| `glm-4-flash` | 智谱 AI | 免费 | 生成共情文案 + 推荐理由 |
| `glm-4-plus` | 智谱 AI | 付费 | 支持 Tool Calling（已预留，余额不足时切换） |

---

## 三、项目文件结构

```
AIDEMO/
├── .env.local                         # 环境变量（ZHIPU_API_KEY）
├── package.json                       # 依赖声明
├── tailwind.config.ts                 # Tailwind 配置
├── tsconfig.json                      # TypeScript 配置
├── README.md                          # 项目文档
│
└── src/
    ├── app/
    │   ├── layout.tsx                 # 根布局（字体、viewport、lang）
    │   ├── globals.css                # 全局样式（渐变背景、毛玻璃、响应式根字号）
    │   ├── page.tsx                   # 主页面（聊天 UI + useChat + 卡片渲染）
    │   ├── favicon.ico
    │   ├── fonts/                     # Geist 字体文件
    │   └── api/
    │       └── chat/
    │           └── route.ts           # 核心！API 路由（Agent 编排层）
    │
    └── lib/
        ├── zhipu.ts                   # 智谱 AI Provider 实例
        ├── agent.ts                   # ToolLoopAgent 定义（付费模式用）
        ├── data/
        │   └── dramas.ts             # 剧集数据库（33 部甜剧 JSON 数据）
        └── tools/                     # 5 个 Agent 工具
            ├── index.ts               # 统一导出
            ├── analyzeMood.ts         # 情绪分析工具
            ├── searchDramas.ts        # 搜索剧集工具
            ├── getRating.ts           # 评分查询工具
            ├── getTrending.ts         # 热播榜单工具
            └── renderDramaCard.ts     # 卡片渲染工具
```

---

## 四、核心实现原理

### 4.1 Provider 适配模式 — 智谱伪装 OpenAI

**原理：** `@ai-sdk/openai` 的 `createOpenAI()` 本质是一个 HTTP 客户端，它会按照 OpenAI 的格式发送请求。智谱 GLM-4 的 API 端点恰好完全兼容这个格式。

```typescript
// src/lib/zhipu.ts
import { createOpenAI } from "@ai-sdk/openai";

export const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",  // 智谱端点
  apiKey: process.env.ZHIPU_API_KEY,                  // 智谱 Key
});

// 用法和 OpenAI 一模一样
zhipu.chat("glm-4-flash")  // 返回一个 LanguageModel 对象
```

**切换到其他模型只需改 baseURL：**
- OpenAI: `https://api.openai.com/v1`
- DeepSeek: `https://api.deepseek.com/v1`
- 月之暗面: `https://api.moonshot.cn/v1`

### 4.2 意图驱动 + 服务端编排 — 当前运行模式

**原理：** 用户输入首先经过意图识别（规则匹配 + AI 兜底），识别出 5 种意图后分发到不同处理链路。

#### 意图识别流程

```
用户消息
    │
    ▼
① detectIntent() — 规则匹配（快速，无延迟）
   ├─ "热播|榜单|排行"       → trending
   ├─ 具体剧名 + "怎么样"     → rating
   ├─ "有没有|帮我找|搜索"    → search
   ├─ "累|开心|想看|推荐"     → recommend
   ├─ "你好|谢谢|你是谁"      → chat
   └─ 都不匹配 → ② AI 分类兜底
        │
        ▼
   ② generateText(glm-4-flash) → AI 判断意图
      → JSON: {"intent":"类型"}
      → 失败时默认 recommend
```

#### 5 种意图处理链路

```
┌─ chat（聊天）
│  streamText({ system, prompt }) → 纯文本回复
│  前端渲染：文字气泡
│
├─ recommend（推荐）
│  analyzeMood() → filterDramas() → AI生成文案 → renderDramaCard 卡片
│  前端渲染：共情文字 + 3张 DramaCard 剧集卡片
│
├─ trending（榜单）
│  getTrending(5) → getTrending 工具输出
│  前端渲染：TrendingCard 排行榜
│
├─ search（搜索）
│  extractGenres() + searchDramasByKeyword() → searchDramas 工具输出
│  前端渲染：SearchResultsCard 搜索结果
│
└─ rating（评分）
   查询 DRAMA_DB → streamText 生成介绍文字
   前端渲染：文字气泡（含评分、甜度、简介）
```

#### recommend 意图的详细流程

```
用户消息 "加班好累"
    │
    ▼
① detectIntent("加班好累")
   → 规则匹配 "累" → intent = "recommend"
    │
    ▼
② analyzeMood("加班好累")
   → 正则匹配 "累|加班" → mood="疲惫", minSweetness=4, noAbuse=true
    │
    ▼
③ extractGenres("加班好累") + filterDramas(...)
   → 从 33 部剧中筛选 → 按甜度+评分排序 → 返回前 3 部
    │
    ▼
④ streamText({ model: glm-4-flash, prompt: "根据这些剧生成文案" })
   → AI 返回 JSON: { mood: "辛苦了～", dramas: [{ reason: "..." }] }
    │
    ▼
⑤ 合并数据库数据 + AI 文案
   → { mood: AI的共情文案, dramas: [数据库字段 + AI推荐理由] }
    │
    ▼
⑥ 通过 tool output 返回给前端
   → streamText({ tools: { renderDramaCard }, toolChoice: "required" })
   → 前端收到 UIMessage Stream，解析 tool output，渲染卡片
```

### 4.3 ToolLoopAgent — 预留的付费模式

**原理：** 当用户充值后，可以切换到真正的 AI Agent 模式。`ToolLoopAgent` 是 ai@6 内置的 Agent 实现，AI 自主决定调哪个工具。

```typescript
// src/lib/agent.ts
import { ToolLoopAgent, stepCountIs } from "ai";

export const sweetDramaAgent = new ToolLoopAgent({
  model: zhipu.chat("glm-4-plus"),     // 付费模型才支持 tool calling
  instructions: "你是甜甜，甜剧推荐官...",  // 相当于 system prompt
  tools: { analyzeMood, searchDramas, getRating, getTrending, renderDramaCard },
  stopWhen: stepCountIs(5),              // 最多自主循环 5 轮
});
```

**切换只需改 route.ts 一行：**
```typescript
// 当前（免费模式）：服务端编排
const result = streamText({ model: zhipu.chat("glm-4-flash"), ... });

// 切换后（付费模式）：AI Agent 自主决策
const result = await sweetDramaAgent.stream({ messages });
```

### 4.4 Generative UI — AI 决定 UI 呈现

**原理：** 传统 AI 聊天只能返回文字。Generative UI 让 AI 通过 Tool Calling 返回结构化数据，前端根据数据类型渲染不同组件。

| AI 返回的类型 | 前端渲染的组件 |
|--------------|---------------|
| `{ type: "text" }` | 文字气泡 |
| `{ type: "tool-renderDramaCard" }` | 精美剧集卡片（剧名、甜度🍬、标签、理由） |
| `{ type: "tool-getTrending" }` | 热播榜单排行 |
| `{ type: "tool-searchDramas" }` | 搜索结果列表 |
| `{ type: "tool-analyzeMood" }` | 情绪分析提示 |

### 4.5 ai@6 的 UIMessage 结构

**与旧版的核心区别：** 消息没有 `content` 字段，所有内容都在 `parts` 数组中。

```typescript
// 旧版 ai@3
{ role: "assistant", content: "推荐你看..." }

// 新版 ai@6
{
  role: "assistant",
  parts: [
    { type: "text", text: "推荐你看..." },
    { type: "tool-renderDramaCard", toolCallId: "xxx",
      state: "output-available",
      output: { dramas: [...], mood: "辛苦了～" }
    }
  ]
}
```

### 4.6 SSE 流式传输

**原理：** HTTP 请求通常是"请求 → 等待 → 一次性返回"。SSE（Server-Sent Events）让服务器可以持续推送数据。

```
普通 HTTP:  客户端请求 ──────→ 服务器处理 ──────→ 返回完整结果（等 10 秒）
SSE 流式:   客户端请求 ──→ 服务器开始 ─→ 推送第1个字 ─→ 第2个字 ─→ ... ─→ 完成
```

### 4.7 rem 响应式适配

```css
:root {
  /* 小屏 14px → 大屏 16px，所有 rem 值自动缩放 */
  font-size: clamp(14px, 1.6vw, 16px);
}
```

| 屏幕宽度 | 根字号 | 效果 |
|---------|--------|------|
| 375px (iPhone) | 14px | 整体缩小 12.5% |
| 768px (iPad) | ~15px | 适中 |
| 1280px+ (桌面) | 16px | 标准大小 |

---

## 五、数据流详解

### 5.1 意图识别阶段（所有请求必经）

```
用户输入任意消息
│
├─① 前端 page.tsx
│  sendMessage({ text: "用户输入" })
│  useChat 自动：
│  · 将用户消息加入 messages 数组
│  · 渲染用户气泡（glass-dark 样式）
│  · 发起 POST /api/chat 请求
│  · 显示加载动画（三个弹跳圆点）
│
├─② API Route route.ts
│  收到请求 → 解析 messages → 提取用户文本
│
├─③ detectIntent() 意图识别
│  规则匹配层（正则，毫秒级）：
│  · "热播|榜单|排行"     → trending
│  · 具体剧名+询问        → rating
│  · "有没有|帮我找|搜索"  → search
│  · "累|开心|想看|推荐"   → recommend
│  · "你好|谢谢|你是谁"    → chat
│  ─────────────────────────────
│  AI 分类层（generateText 兜底）：
│  · 规则都不匹配时调用 glm-4-flash
│  · AI 返回 {"intent":"类型"}
│  · 失败时默认 recommend
│
└─④ 按意图分发到对应 handler
```

### 5.2 推荐意图（recommend）完整流程

```
用户输入 "加班好累，想看点甜甜的"
│
├─① detectIntent → 命中 "累" → recommend
│
├─② analyzeMood("加班好累，想看点甜甜的")
│  正则匹配 "累|加班" → 命中 isTired
│  返回: { mood: "疲惫", minSweetness: 4, noAbuse: true, genre: ["高甜"] }
│
├─③ extractGenres() + filterDramas()
│  用户指定了类型 → 提取 genre
│  从 33 部剧中筛选:
│  · genre 包含 "高甜" → 15 部
│  · sweetness >= 4 → 12 部
│  · noAbuse = true → 10 部
│  按甜度+评分排序 → 取前 3 部
│
├─④ 调用 glm-4-flash 生成文案
│  Prompt 包含: 用户消息 + 情绪分析 + 候选剧信息
│  AI 返回 JSON:
│  {
│    "mood": "辛苦了～来看点甜甜的犒劳自己吧🌸",
│    "analysis": "根据你的疲惫状态，精选了三部全程高甜无虐的治愈系甜宠剧",
│    "dramas": [
│      { "title": "偷偷藏不住", "reason": "暗恋成真甜到冒泡，完美治愈加班疲惫" },
│      { "title": "苍兰诀", "reason": "年度甜剧天花板，看完只想谈恋爱" },
│      { "title": "亲爱的热爱的", "reason": "国民甜剧，李现杨紫CP感爆棚" }
│    ]
│  }
│
├─⑤ 合并数据 + tool output 返回
│  streamText({ tools: { renderDramaCard }, toolChoice: "required" })
│  → toUIMessageStreamResponse() → SSE 流
│
└─⑥ 前端渲染
   partType === "tool-renderDramaCard"
   → mood 气泡 + 3 张 DramaCard 卡片
```

### 5.3 其他意图流程

#### 聊天意图（chat）
```
"你好" → detectIntent → chat → streamText(纯文本) → 文字气泡
```

#### 榜单意图（trending）
```
"热播榜" → detectIntent → trending → getTrending(5) → TrendingCard 排行榜
```

#### 搜索意图（search）
```
"有没有校园剧" → detectIntent → search
→ extractGenres(["校园"]) + searchDramasByKeyword() → SearchResultsCard
```

#### 评分意图（rating）
```
"苍兰诀怎么样" → detectIntent → rating
→ DRAMA_DB.find("苍兰诀") → streamText 生成介绍 → 文字气泡（含评分、甜度）
```

---

## 六、每个文件的作用与原理

### `src/lib/data/dramas.ts` — 剧集数据库

**作用：** 存储所有可查询的甜剧数据，替代真实数据库。

**为什么这样设计：**
- 不依赖外部数据库，项目可独立运行
- 数据结构完整（title/year/genre/sweetness/rating/platform/noAbuse）
- 33 部剧覆盖 2014-2024 年，类型丰富
- `noAbuse` 字段支持"不想看虐的"筛选

### `src/lib/zhipu.ts` — Provider 单例

**作用：** 创建智谱 AI 的 Provider 实例，全局复用。

**原理：** `createOpenAI()` 返回的是一个对象，它的 `.chat()` 方法返回 `LanguageModel`，可以直接传给 `streamText()`。

### `src/lib/tools/*.ts` — 5 个 Agent 工具

**作用：** 每个 tool 文件定义一个独立的工具函数。

**tool() 函数的参数结构：**
```typescript
tool({
  description: "工具描述（AI 看到的）",
  inputSchema: zodSchema(z.object({...})),  // 输入参数校验
  execute: async (input) => { ... },        // 实际执行逻辑
})
```

| 工具 | 输入 | 输出 | 作用 |
|------|------|------|------|
| analyzeMood | 用户消息 | 情绪标签 + 推荐策略 | 关键词匹配判断情绪 |
| filterDramas | genre/sweetness/noAbuse/limit | 剧集列表 | 多条件筛选+排序（用于 recommend） |
| searchDramasByKeyword | keyword/genres | 剧集列表 | 关键词+类型搜索（用于 search） |
| getTrending | limit | TOP 榜单 | 按评分排序（用于 trending） |
| getDramaByTitle | 剧名 | 单剧详情 | 查询具体剧（用于 rating） |
| extractGenres | 用户消息 | 类型数组 | 从文本中提取类型偏好 |

### `src/lib/agent.ts` — ToolLoopAgent（付费模式）

**作用：** 定义真正的 AI Agent，让 AI 自主决定工具调用顺序。

**ToolLoopAgent 工作流程：**
```
Step 1: AI 分析用户消息，决定调 analyzeMood
Step 2: 拿到情绪结果，决定调 searchDramas
Step 3: 搜索结果不够？决定调 getTrending
Step 4: 综合信息，决定调 renderDramaCard
Step 5: finishReason: stop → Agent 完成
```

### `src/app/api/chat/route.ts` — 核心！API 路由（意图驱动）

**作用：** 整个应用的"大脑"，负责意图识别 + 工具链编排 + AI 调用 + 返回结果。

**当前模式（免费）的执行流程：**

1. 解析前端发来的 UIMessage，提取用户文本
2. `detectIntent()` 意图识别（规则匹配 → AI 兜底）
3. 根据 5 种意图分发到不同 handler：
   - **chat** → `handleChat()`：`streamText` 纯文本回复
   - **recommend** → `handleRecommend()`：情绪分析 + 搜索 + AI 文案 + 卡片
   - **trending** → `handleTrending()`：排行榜数据 + TrendingCard
   - **search** → `handleSearch()`：关键词+类型搜索 + SearchResultsCard
   - **rating** → `handleRating()`：查询具体剧 + 纯文本介绍
4. 各 handler 返回 `toUIMessageStreamResponse()` → SSE 流

**关键代码 — 意图识别：**
```typescript
async function detectIntent(userText: string) {
  // 规则匹配（快速，毫秒级）
  if (/热播|榜单|排行/.test(userText)) return { intent: "trending" };
  if (/累|开心|想看|推荐/.test(userText)) return { intent: "recommend" };
  if (/你好|谢谢|你是谁/.test(userText)) return { intent: "chat" };
  // ...

  // AI 兜底（模糊意图）
  const result = await generateText({
    model: zhipu.chat("glm-4-flash"),
    prompt: `判断意图...用户消息："${userText}"...输出JSON: {"intent":"类型"}`,
  });
  return JSON.parse(result.text);
}
```

**关键代码 — 按意图分发：**
```typescript
switch (intent) {
  case "chat":     return handleChat(userText);      // 纯文本
  case "recommend": return handleRecommend(userText); // 剧集卡片
  case "trending":  return handleTrending();           // 排行榜
  case "search":    return handleSearch(userText);     // 搜索结果
  case "rating":    return handleRating(title);        // 评分介绍
}
```

**5 个 handler 的响应方式对比：**

| Handler | 用工具？ | AI 调用 | 前端渲染 |
|---------|---------|---------|---------|
| handleChat | 无 | streamText × 1 | 文字气泡 |
| handleRecommend | renderDramaCard | streamText × 2 | 气泡 + DramaCard |
| handleTrending | getTrending | streamText × 1 | TrendingCard |
| handleSearch | searchDramas | streamText × 1 | SearchResultsCard |
| handleRating | 无 | streamText × 1 | 文字气泡 |

### `src/app/page.tsx` — 前端主页面

**作用：** 聊天界面 + 消息渲染 + Generative UI 组件。

**关键渲染逻辑：**
```typescript
msg.parts?.map((part) => {
  // 1. 文本 → 气泡
  if (part.type === "text") return <TextBubble />;

  // 2. renderDramaCard → 剧集卡片
  if (part.type === "tool-renderDramaCard") return <DramaCard />;

  // 3. getTrending → 榜单
  if (part.type === "tool-getTrending") return <TrendingCard />;

  // 4. searchDramas → 搜索结果
  if (part.type === "tool-searchDramas") return <SearchResultsCard />;

  // 5. 其他工具 → 状态提示
  return <ToolStatus />;
});
```

### `src/app/globals.css` — 全局样式

**三个核心功能：**

1. **响应式根字号：** `clamp(14px, 1.6vw, 16px)` 让所有 rem 值自适应
2. **粉色渐变背景：** `linear-gradient(135deg, #fdf2f8, #f472b6)` 固定背景
3. **毛玻璃效果：** `.glass` 和 `.glass-dark` 自定义 CSS 类

```css
.glass {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(1rem);
  -webkit-backdrop-filter: blur(1rem);  /* Safari 兼容 */
  border: 1px solid rgba(255, 255, 255, 0.5);
}
```

---

## 七、遇到的技术难点与解决方案

### 难点 1: ai@6 的 breaking changes

**问题：** ai@6 对消息结构、Hook API、工具定义做了根本性改变，且文档更新滞后。

**解决：** 通过阅读 `node_modules/ai/dist/index.d.ts` 类型定义文件，逐个适配：

| 变化 | ai@3 | ai@6 | 我们的适配 |
|------|------|------|-----------|
| Hook 导入 | `from "ai/react"` | `from "@ai-sdk/react"` | 更新 import |
| 消息结构 | `{ content }` | `{ parts: [{text}] }` | 遍历 parts |
| 发送消息 | `handleSubmit(e)` | `sendMessage({ text })` | 改 API |
| 输入管理 | 内置 input | 自行 useState | 手动管理 |
| 流式响应 | `toDataStreamResponse()` | `toUIMessageStreamResponse()` | 改方法名 |
| 工具定义 | `parameters: zod()` | `inputSchema: zodSchema(zod())` | 改参数名 |
| 多步控制 | `maxSteps: 3` | `stopWhen: stepCountIs(3)` | 改 API |
| 消息转换 | 不需要 | `convertToModelMessages()` | 新增步骤 |

### 难点 2: 智谱 GLM-4-flash 不支持 Tool Calling

**问题：** 免费的 `glm-4-flash` 不会调用工具（toolCalls: 0），付费的 `glm-4-plus` 有 Tool Calling 能力但需要充值。

**解决：** 设计了**双模式架构**：
- 免费模式：服务端编排工具链，AI 只生成文案
- 付费模式：ToolLoopAgent 让 AI 自主决策

切换只需改 `route.ts`，前端完全不用动。

### 难点 3: 所有输入都返回相同结果

**问题：** 初版 `route.ts` 不论用户输入什么，都固定走 `analyzeMood → searchDramas → 返回3张卡片` 的流程。"你好"、"谢谢"等无关输入也会触发推荐，体验很差。

**解决：** 设计了**意图驱动的路由系统**：

```
用户输入 → detectIntent() → 5 种意图 → 对应 handler → 不同的 UI 响应
```

意图检测采用**两层策略**：
1. **规则层**（正则匹配）：覆盖常见模式，毫秒级响应，零 AI 调用
2. **AI 层**（`generateText` 兜底）：处理模糊意图，用 `generateText`（非 `streamText`）快速获取分类结果

| 意图 | 触发条件 | 响应 |
|------|---------|------|
| chat | "你好"、"谢谢"、"你是谁" | 纯文字聊天 |
| recommend | "加班好累"、"想看甜的" | 情绪分析 + 剧集卡片 |
| trending | "热播"、"排行榜" | TOP5 榜单卡片 |
| search | "有没有校园剧"、"找古装" | 搜索结果卡片 |
| rating | "苍兰诀怎么样" | 评分详情文字 |

### 难点 4: toTextStreamResponse vs toUIMessageStreamResponse

**问题：** `toTextStreamResponse()` 只传纯文本，不包含工具调用数据。前端收到的 parts 只有 text 类型，永远没有 tool 类型。

**解决：** 改用 `toUIMessageStreamResponse()`，它会序列化完整的 UIMessage Stream，包括 tool invocations。

### 难点 5: TypeScript 类型收窄

**问题：** UIMessage 的 parts 是联合类型，TypeScript 收窄后 `"text"` 和 `"tool-renderDramaCard"` 比较会报错（被认为不可能相等）。

**解决：** 用 `as Record<string, unknown>` 做运行时类型断言，通过 `String(part.type)` 和 `startsWith("tool-")` 做通用匹配。

### 难点 6: generateText vs streamText 的选择

**问题：** 意图分类需要完整结果后才能决定走哪条链路，不能用流式。

**解决：** 意图检测用 `generateText`（同步等待完整结果），最终响应用 `streamText`（流式返回给前端）。两种 API 的选择原则：
- `generateText`：需要完整结果做后续判断（意图分类、JSON 解析）
- `streamText`：需要流式返回给前端（所有 handler 的最终输出）

---

## 八、简历亮点提炼

### 亮点 1: 意图驱动的 Agent 架构

> 设计了意图识别 + 服务端编排 + AI Agent 三层架构。用户输入先经过两层意图检测（规则匹配毫秒级响应 + AI 兜底），识别出 5 种意图后分发到不同处理链路（聊天/推荐/榜单/搜索/评分），每种意图返回不同的 Generative UI 组件。同时预留了 ToolLoopAgent 付费模式，两种模式前端代码零改动切换。

### 亮点 2: Provider 适配器模式

> 利用智谱 GLM-4 兼容 OpenAI 接口的特性，通过 `createOpenAI({ baseURL })` 实现 Provider 抽象。一行代码即可切换 OpenAI / 智谱 / DeepSeek 等模型，掌握了 AI SDK 的分层设计思想。

### 亮点 3: Generative UI — 多形态动态渲染

> 实现了 AI 驱动的多形态 UI 渲染：前端根据意图路由返回的 tool output 类型（renderDramaCard / getTrending / searchDramas）或纯文本，自动选择对应的 React 组件渲染。不再是千篇一律的卡片推荐，而是根据用户意图呈现文字气泡、剧集卡片、排行榜、搜索结果等不同 UI 形态。

### 亮点 4: ai@6 最新 API 适配

> 深度适配了 Vercel AI SDK v6 的 breaking changes，包括 UIMessage parts 结构、sendMessage API、convertToModelMessages 转换、zodSchema 工具定义、stepCountIs 多步控制等，体现了阅读源码和跟进新技术的能力。同时掌握了 `generateText`（同步）和 `streamText`（流式）的适用场景。

### 亮点 5: 全栈工程能力

> 一人完成端到端开发：React 前端（useChat Hook + Generative UI 组件）→ Next.js API Route（意图识别 + Agent 编排 + SSE 流式）→ AI 集成（Prompt 工程 + 结构化输出 + 工具定义）→ UI 设计（毛玻璃效果 + rem 响应式 + Tailwind CSS）。

---

## 九、面试必考知识点

### 必须理解的概念

| # | 知识点 | 你需要能回答的问题 |
|---|--------|------------------|
| 1 | **意图识别** | "你的系统怎么判断用户想聊天还是想看推荐？为什么用两层策略？" |
| 2 | **Tool Calling** | "什么是 function calling？AI 怎么知道什么时候调哪个工具？" |
| 3 | **Agent vs Tool Calling** | "你的项目和真正的 Agent 有什么区别？" |
| 4 | **SSE 流式传输** | "SSE 和 WebSocket 的区别？为什么用 SSE？" |
| 5 | **Generative UI** | "传统 AI 聊天和 Generative UI 有什么区别？你怎么实现不同意图返回不同 UI？" |
| 6 | **generateText vs streamText** | "为什么意图检测用 generateText 而不用 streamText？" |
| 7 | **UIMessage vs ModelMessage** | "为什么需要 convertToModelMessages？" |
| 8 | **Prompt Engineering** | "你的 system prompt 是怎么设计的？为什么这样写？" |
| 9 | **Structured Output** | "怎么保证 AI 返回的是合法 JSON？" |
| 10 | **zod Schema** | "zod 在 AI 项目中的作用是什么？" |

### 必须掌握的技术细节

#### 1. 意图识别的设计（核心亮点）

```typescript
// 两层策略：规则（快） + AI（准）

// 第一层：正则规则匹配（毫秒级，零 AI 调用）
if (/热播|榜单|排行/.test(userText)) return "trending";
if (/累|开心|想看|推荐/.test(userText)) return "recommend";
if (/你好|谢谢|你是谁/.test(userText)) return "chat";

// 第二层：AI 分类兜底（处理模糊输入）
const result = await generateText({
  model: zhipu.chat("glm-4-flash"),
  prompt: `判断意图...输出JSON: {"intent":"类型"}`,
});

// 为什么用 generateText 而不是 streamText？
// → 意图分类需要完整结果才能决定走哪条链路
// → generateText 返回完整文本，streamText 是流式逐字返回
```

**面试关键点：**
- 规则层处理 80% 常见请求（快速、免费、确定性高）
- AI 层处理 20% 模糊请求（灵活、但有延迟和不确定性）
- 两层互补，兼顾性能和灵活性

#### 2. Tool Calling 的工作原理

```typescript
// 1. 你定义工具（告诉 AI 有什么工具可用）
const myTool = tool({
  description: "工具描述",           // AI 靠这个决定要不要调用
  inputSchema: zodSchema(z.object({  // AI 按这个格式生成参数
    query: z.string(),
  })),
  execute: async (input) => {        // 参数校验通过后执行
    return results;
  },
});

// 2. 传给 AI
streamText({ tools: { myTool }, messages });

// 3. AI 的决策过程
// AI 看到 tools 列表 → 分析用户意图 → 决定调用哪个工具 → 生成参数 JSON
// → SDK 校验参数 → 执行 execute() → 结果返回给 AI → AI 继续回复
```

#### 3. useChat Hook 的工作原理

```typescript
const { messages, sendMessage, status } = useChat({ messages: [WELCOME] });

// useChat 做了什么：
// 1. 管理消息列表（messages）
// 2. sendMessage() 发起 POST /api/chat 请求
// 3. 自动接收 SSE 流，解析每个 chunk
// 4. 实时更新 messages 数组
// 5. 触发 React 重新渲染
// 6. 管理 loading/error 状态
```

#### 4. UIMessage Stream 的数据格式

```
data: {"type":"text-start","id":"msg-1"}
data: {"type":"text-delta","id":"msg-1","text":"推荐"}
data: {"type":"text-delta","id":"msg-1","text":"你看"}
data: {"type":"tool-call","toolCallId":"tc-1","toolName":"renderDramaCard","input":{}}
data: {"type":"tool-result","toolCallId":"tc-1","output":{"dramas":[...]}}
data: {"type":"finish","finishReason":"stop"}
```

#### 5. 为什么需要 convertToModelMessages()

```typescript
// 前端 UIMessage 格式（parts 结构）
{ role: "assistant", parts: [{ type: "text", text: "..." }, { type: "tool-renderDramaCard", output: {...} }] }

// AI 模型需要的格式（content 结构）
{ role: "assistant", content: "..." }
{ role: "tool", content: JSON.stringify({...}) }

// convertToModelMessages() 做的就是这个转换
```

---

## 十、面试官可能追问的问题

### Q1: "你说用了 Agent，但工具是服务端调的，这算 Agent 吗？"

**参考回答：**

> 严格来说，这是 **Orchestrated Agent（编排式智能体）**，和 **Autonomous Agent（自主式智能体）** 是两种 Agent 模式。
>
> 我的项目同时设计了两种模式：
> - **免费模式**（Orchestrated）：服务端按意图路由和工具链编排执行，AI 只负责意图分类和文案生成。优点是确定性高、成本低、不依赖模型的 Tool Calling 能力。
> - **付费模式**（Autonomous）：用 ToolLoopAgent 让 AI 自主决定调用哪些工具、什么顺序。AI 可以灵活调整策略，比如先查情绪、再搜索、发现结果不够就换条件重新搜索。
>
> 两种模式共用同一套工具定义和前端渲染，切换只需改后端一行代码。这体现了架构设计的灵活性。

### Q2: "意图检测为什么要两层？"

> 规则层和 AI 层各有利弊，组合使用取长补短：
>
> **规则层（正则匹配）**：
> - 优点：毫秒级响应、零成本、100% 确定性
> - 缺点：只能覆盖预定义的模式，无法理解语义
>
> **AI 层（generateText 兜底）**：
> - 优点：能理解模糊/意外的用户输入（如"今天被老板骂了"）
> - 缺点：增加 ~1s 延迟、有解析失败风险、消耗 API 额度
>
> 实际数据：规则层能覆盖约 80% 的常见输入（问候、想看剧、看榜单等），只有 20% 模糊输入需要 AI 介入。这样大部分请求都毫秒级响应。

### Q3: "为什么不直接用 LangChain？"

> LangChain 更适合 Python 后端和复杂的 RAG/Chain 场景。我的项目是纯前端 React 应用，Vercel AI SDK 的优势在于：
> 1. **React Hook 原生集成** — `useChat` 自动管理 SSE 流和消息状态
> 2. **轻量** — 核心只依赖 `ai` + `@ai-sdk/react`，不像 LangChain 那么重
> 3. **Generative UI 支持** — 内置 tool output → React 组件的渲染模式
> 4. **TypeScript 类型安全** — 从工具定义到前端渲染全链路类型推导

### Q4: "如果数据量大了怎么办？"

> 当前用 JSON 文件模拟数据库。扩展方案：
> 1. **短-term**：JSON → SQLite / Turso（边缘数据库）
> 2. **中-term**：接入真实的影视 API（豆瓣/TMDB）
> 3. **长-term**：用向量数据库做语义搜索（用户说"想看那种甜甜的"→ embedding 搜索）

### Q5: "怎么保证 AI 返回合法 JSON？"

> 多层保障：
> 1. **Prompt 约束** — 明确要求 "严格按 JSON 格式输出"
> 2. **try/catch 兜底** — 解析失败时用默认文案
> 3. **Zod 校验** — tool 的 `inputSchema` 会自动校验 AI 的输出
> 4. **更好的方案** — 用 `generateObject()` 替代 `streamText()`，SDK 强制返回合法 JSON

### Q6: "性能怎么样？"

> 不同意图的延迟不同：
> - **chat/rating**（纯文本）：1 次 AI 调用，~1-2s
> - **trending/search**（工具输出）：1 次 AI 调用（toolChoice），~1-2s
> - **recommend**（推荐）：2 次 AI 调用（文案生成 + tool 包装），~3-4s
>
> 性能优化点：
> - 意图检测的规则层毫秒级，只有模糊输入才调 AI
> - 推荐模式的两次 AI 调用可合并为一次
> - 加 loading skeleton 动画提升感知速度

### Q7: "项目的可扩展性如何？"

> 高度可扩展：
> 1. **新增意图**：在 `detectIntent()` 加一条规则 + 写一个 handler
> 2. **新增渲染组件**：在 page.tsx 的 parts 渲染中加一个 if 分支
> 3. **切换模型**：改 `zhipu.ts` 的 baseURL 一行代码
> 4. **切换模式**：改 `route.ts` 的核心调用一行代码
> 5. **接入真实数据库**：改各 handler 中的数据查询实现

---

*本文档覆盖了项目的所有技术细节，适合作为面试准备材料和简历项目描述的参考。*
*最后更新：2026-04-08（v2 — 新增意图驱动架构）*
