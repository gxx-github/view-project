# Agent 接入方案 — 从 Tool Calling 升级为智能体

---

## 一、当前项目 vs Agent 项目，区别在哪？

### 现在（Tool Calling 模式）
```
用户输入 → AI 调一个工具 → 直接返回结果
```
AI 只做一件事：把推荐内容填进表格。**不会自己查数据、不会自己判断调用顺序。**

### 升级后（Agent 模式）
```
用户输入 → AI 自主决定调用哪些工具、调几次、什么顺序
         → 比如先查数据库 → 再查评分 → 再根据结果推荐 → 最后渲染卡片
```
AI 像一个**有自主决策能力的助手**，会根据情况自己规划工作流程。

---

## 二、为什么用 Agent？（面试怎么说）

> "我设计了一个基于 ToolLoopAgent 的甜剧推荐智能体，
> AI 能自主调度 5 个工具：搜索剧集库、查询评分、分析用户偏好、
> 获取追剧日历、渲染推荐卡片。
> Agent 会根据用户输入自动决定调用顺序和次数，
> 比如先搜索 → 再查评分 → 筛选后推荐，最多循环 5 轮自动完成。"

---

## 三、Agent 架构图

```
                    用户输入："最近心情不好，想看点治愈的甜剧"
                              │
                              ▼
                    ┌─────────────────────┐
                    │   ToolLoopAgent     │
                    │   (智能体调度中心)    │
                    │                     │
                    │  instructions:       │
                    │  "你是甜甜，甜剧     │
                    │   推荐官..."          │
                    │                     │
                    │  stopWhen:           │
                    │  stepCountIs(5)      │
                    │  (最多自主决策5轮)    │
                    └────────┬────────────┘
                             │
            AI 自主决定调用哪个工具、什么顺序
                             │
        ┌────────────┬───────┼───────┬────────────┐
        ▼            ▼       ▼       ▼            ▼
  ┌──────────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
  │ search-  │ │ get-   │ │get-  │ │ analyze│ │ render-  │
  │ Dramas   │ │ Rating │ │Trend │ │ Mood   │ │ DramaCard│
  │ 搜索剧集  │ │ 查评分  │ │查热度 │ │ 情绪分析│ │ 渲染卡片  │
  └──────────┘ └────────┘ └──────┘ └────────┘ └──────────┘
       │            │         │         │           │
       └────────────┴─────────┴─────────┘           │
                    │                               │
              Agent 汇总所有工具结果                  │
              自主决定是否需要更多信息                 │
              最终调用 renderDramaCard ──────────────┘
                    │
                    ▼
              前端渲染精美卡片
```

---

## 四、5 个工具详细设计

### 工具 1: searchDramas — 搜索剧集库

**作用：** 根据关键词、类型、年份等条件从"数据库"中搜索剧集

```typescript
// 数据来源：本地 JSON 数据库（模拟真实数据库）
const DRAMA_DB = [
  {
    id: 1,
    title: "一闪一闪亮星星",
    year: 2022,
    genre: ["高甜", "青春", "纯爱"],
    sweetness: 5,
    rating: 8.0,
    description: "穿越时空的双向奔赴，甜到心坎里",
    episodes: 24,
    platform: "爱奇艺",
  },
  // ... 30-50 部甜剧数据
];

const searchDramas = tool({
  description: "根据关键词、类型、年份搜索甜剧数据库",
  inputSchema: zodSchema(
    z.object({
      keyword: z.string().optional().describe("搜索关键词"),
      genre: z.array(z.string()).optional().describe("类型过滤，如 ['高甜','治愈']"),
      minSweetness: z.number().min(1).max(5).optional().describe("最低甜度"),
      yearFrom: z.number().optional().describe("起始年份"),
      yearTo: z.number().optional().describe("结束年份"),
    })
  ),
  execute: async ({ keyword, genre, minSweetness, yearFrom, yearTo }) => {
    // 从 DRAMA_DB 中筛选
    let results = DRAMA_DB;
    if (keyword) results = results.filter(d => d.title.includes(keyword) || d.description.includes(keyword));
    if (genre?.length) results = results.filter(d => genre.some(g => d.genre.includes(g)));
    if (minSweetness) results = results.filter(d => d.sweetness >= minSweetness);
    if (yearFrom) results = results.filter(d => d.year >= yearFrom);
    if (yearTo) results = results.filter(d => d.year <= yearTo);
    return { total: results.length, dramas: results.slice(0, 10) };
  },
});
```

### 工具 2: getRating — 查询评分详情

**作用：** 查某部剧的评分、评价数、热度

```typescript
const getRating = tool({
  description: "查询指定剧目的评分、评价数和热度指数",
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe("剧名"),
    })
  ),
  execute: async ({ title }) => {
    const drama = DRAMA_DB.find(d => d.title === title);
    if (!drama) return { found: false };
    return {
      found: true,
      title: drama.title,
      rating: drama.rating,
      ratingCount: Math.floor(Math.random() * 50000 + 10000),
      heatIndex: Math.floor(Math.random() * 100),
      platform: drama.platform,
    };
  },
});
```

### 工具 3: getTrending — 获取热播榜单

**作用：** 获取当前热门甜剧排行

```typescript
const getTrending = tool({
  description: "获取当前热播甜剧 TOP 榜单",
  inputSchema: zodSchema(
    z.object({
      limit: z.number().min(1).max(10).default(5).describe("返回数量"),
    })
  ),
  execute: async ({ limit }) => {
    // 按评分排序返回热门剧
    return DRAMA_DB
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map(d => ({ title: d.title, rating: d.rating, year: d.year, genre: d.genre }));
  },
});
```

### 工具 4: analyzeMood — 情绪分析

**作用：** 分析用户当前情绪，辅助推荐决策

```typescript
const analyzeMood = tool({
  description: "分析用户消息中的情绪状态，返回情绪标签和推荐策略",
  inputSchema: zodSchema(
    z.object({
      userMessage: z.string().describe("用户输入的消息"),
    })
  ),
  execute: async ({ userMessage }) => {
    // 简单关键词匹配情绪（实际项目中可用 AI 做情绪分析）
    const mood = {
      isTired: /累|辛苦|加班|疲惫/.test(userMessage),
      isSad: /难过|伤心|失恋|心情不好/.test(userMessage),
      isHappy: /开心|高兴|甜蜜|幸福/.test(userMessage),
      isBored: /无聊|没事|打发时间/.test(userMessage),
    };
    // 根据情绪给出推荐策略
    if (mood.isSad) return { mood: "低落", strategy: "优先推荐高甜治愈、无虐、轻松搞笑", minSweetness: 4 };
    if (mood.isTired) return { mood: "疲惫", strategy: "推荐节奏轻快、不用动脑的甜宠剧", minSweetness: 4 };
    if (mood.isBored) return { mood: "无聊", strategy: "推荐有剧情深度的先虐后甜剧", minSweetness: 3 };
    return { mood: "平静", strategy: "常规推荐，各类甜剧均可", minSweetness: 3 };
  },
});
```

### 工具 5: renderDramaCard — 渲染卡片（已有，保留）

**作用：** 最终渲染推荐结果

```typescript
const renderDramaCard = tool({
  description: "渲染精美的甜剧推荐卡片。在所有信息收集完成后调用此工具展示最终推荐。",
  inputSchema: zodSchema(
    z.object({
      dramas: z.array(z.object({
        title: z.string(),
        year: z.string(),
        sweetness: z.number().min(1).max(5),
        tags: z.array(z.string()),
        reason: z.string(),
        rating: z.number().optional(),
        platform: z.string().optional(),
      })),
      mood: z.string().describe("对用户情绪的共情回应"),
      analysis: z.string().optional().describe("推荐分析说明"),
    })
  ),
  execute: async (input) => input,
});
```

---

## 五、Agent 实现代码

### 5.1 创建 Agent（`src/lib/agent.ts`）

```typescript
import { ToolLoopAgent } from "ai";
import { zhipu } from "./zhipu";
import { searchDramas, getRating, getTrending, analyzeMood, renderDramaCard } from "./tools";

export const sweetDramaAgent = new ToolLoopAgent({
  model: zhipu.chat("glm-4-plus"),

  instructions: `你是一位温柔、懂生活的"小甜剧推荐官"，名字叫"甜甜"。

工作流程：
1. 先用 analyzeMood 分析用户情绪
2. 根据情绪分析结果，用 searchDramas 搜索合适的剧
3. 如果需要更多信息，用 getRating 查评分或 getTrending 看热播
4. 综合所有信息后，调用 renderDramaCard 展示最终推荐

规则：
- 每次推荐 2-3 部剧
- 语气轻松活泼，适当用表情符号 🌸✨
- 必须最终调用 renderDramaCard 来展示结果`,

  tools: {
    analyzeMood,
    searchDramas,
    getRating,
    getTrending,
    renderDramaCard,
  },

  // 最多自主决策 5 轮
  stopWhen: stepCountIs(5),
});
```

### 5.2 两种接入方式

#### 方式 A: API Route 接入（推荐，前后端分离）

```typescript
// src/app/api/chat/route.ts
import { sweetDramaAgent } from "@/lib/agent";
import { convertToModelMessages } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // 用 Agent 替代 streamText
  const result = await sweetDramaAgent.stream({
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
```

**前端代码不用改！** useChat 照常工作，因为传输格式（UIMessage Stream）不变。

#### 方式 B: DirectChatTransport（前端直连 Agent，无需 API Route）

```typescript
// src/app/page.tsx
import { DirectChatTransport } from "ai";
import { sweetDramaAgent } from "@/lib/agent";

export default function Home() {
  const transport = new DirectChatTransport({ agent: sweetDramaAgent });

  const { messages, sendMessage, status } = useChat({ transport });

  // ... 其余渲染逻辑不变
}
```

> 注意：方式 B 在 Server Component 中使用，API Key 不会暴露到前端。
> 方式 A 更通用，推荐首选。

---

## 六、Agent 运行示例

### 用户输入："最近加班好累，想看点不用动脑的甜剧"

```
Step 1: AI 决定调用 analyzeMood
  → { mood: "疲惫", strategy: "推荐节奏轻快、不用动脑的甜宠剧", minSweetness: 4 }

Step 2: AI 根据 mood 分析结果，调用 searchDramas
  → { genre: ["高甜"], minSweetness: 4 }
  → 返回 5 部符合条件的剧

Step 3: AI 选了其中 3 部，调用 getRating 查评分
  → getRating("致我们单纯的小美好") → { rating: 8.2, heatIndex: 89 }
  → getRating("一闪一闪亮星星") → { rating: 8.0, heatIndex: 95 }

Step 4: AI 综合所有信息，调用 renderDramaCard
  → {
      mood: "辛苦了～加班后就是要看点甜甜的犒劳自己！",
      dramas: [
        { title: "一闪一闪亮星星", sweetness: 5, rating: 8.0, ... },
        { title: "致我们单纯的小美好", sweetness: 5, rating: 8.2, ... },
      ]
    }

Step 5: finishReason: stop，Agent 完成
```

**对比现在：** 现在 AI 只做 Step 4 这一步。升级后 AI 会自己规划 Step 1→2→3→4 的完整流程。

---

## 七、文件结构变更

```
src/
├── lib/
│   ├── agent.ts              # NEW: Agent 定义（ToolLoopAgent）
│   ├── zhipu.ts              # NEW: 智谱 Provider（复用）
│   ├── tools/                # NEW: 工具集
│   │   ├── index.ts          # 统一导出
│   │   ├── searchDramas.ts   # 搜索剧集
│   │   ├── getRating.ts      # 查询评分
│   │   ├── getTrending.ts    # 热播榜单
│   │   ├── analyzeMood.ts    # 情绪分析
│   │   └── renderDramaCard.ts # 渲染卡片（已有，迁移过来）
│   └── data/
│       └── dramas.ts         # NEW: 剧集数据库（30-50 条 JSON 数据）
│
├── app/
│   ├── api/chat/
│   │   └── route.ts          # MODIFY: 改用 Agent 替代 streamText
│   └── page.tsx              # 基本不变，增加对新工具输出的渲染
```

---

## 八、简历话术升级

**Before（Tool Calling）：**
> 使用 Vercel AI SDK 的 Tool Calling 实现结构化输出

**After（Agent）：**
> 设计并实现了基于 ToolLoopAgent 的甜剧推荐智能体，
> AI 能自主调度 5 个工具（搜索、评分、热度、情绪分析、卡片渲染），
> 通过多轮工具调用循环完成从需求分析到推荐展示的全流程自动化，
> 支持 SSE 流式传输和 Generative UI 动态卡片渲染。

---

## 九、实施步骤（建议顺序）

| 步骤 | 内容 | 预估改动量 |
|------|------|-----------|
| 1 | 创建 `lib/data/dramas.ts` 剧集数据库 | 新增 1 文件 |
| 2 | 将 renderDramaCard 迁移到 `lib/tools/` | 搬迁 + 拆分 |
| 3 | 实现 searchDramas、getRating、getTrending、analyzeMood | 新增 4 文件 |
| 4 | 创建 `lib/agent.ts`，用 ToolLoopAgent 组装 | 新增 1 文件 |
| 5 | 修改 `route.ts`，用 Agent 替代 streamText | 改 1 文件 |
| 6 | 前端 page.tsx 增加对多工具的渲染（搜索结果、评分等） | 改 1 文件 |
| 7 | 测试 & 调优 Agent 的 instructions | 迭代 |

---

*方案设计完成，随时可以开始实施。*
