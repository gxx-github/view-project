# 甜剧推荐系统：从本地数据到实时搜索的升级方案

> 基于 AIDEMO-BUN 项目，将本地硬编码的 `DRAMA_DB` 替换为大模型驱动的实时影视数据搜索。

## 背景

当前项目的剧集数据全部硬编码在 `src/lib/data/dramas.ts` 中（33 部剧），存在以下问题：

- 数据静态，无法获取最新上映的电视剧
- 覆盖面有限，用户可能问到库里没有的剧
- 维护成本高，需要手动更新

以下四种方案按**从简单到复杂**排列，可根据学习阶段逐步升级。

---

## 方案一：利用大模型自身知识

### 思路

最简单的方式——去掉本地数据库，直接让大模型根据自身训练数据回答。

### 核心改动

```typescript
// src/app/api/chat/route.ts

async function handleRecommend(userText: string) {
  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: `你是甜剧推荐官"甜甜"🌸。根据用户心情推荐 2-3 部甜蜜电视剧。
要求：
- 推荐真实存在的剧，标注年份、平台、集数
- 优先推荐最近一年内上映的新剧
- 严格按 JSON 格式输出：
  {"dramas":[{"title":"剧名","year":2024,"genre":["高甜"],"rating":8.0,"platform":"优酷","episodes":30,"reason":"推荐理由"}]}`,
    prompt: userText,
  });
  return result.toUIMessageStreamResponse();
}
```

### 优点

- 改动量极小，几乎零成本
- 不需要额外 API 或数据源

### 局限

- 大模型知识有截止日期（如 GLM-4 可能只到 2024 年某月），无法知道之后的新剧
- 可能产生"幻觉"——编造不存在的剧
- 无法保证数据准确性（评分、集数等可能有误）

### 适用场景

快速验证、原型阶段、对数据准确性要求不高的场景。

---

## 方案二：大模型 + 联网搜索（推荐首选）

### 思路

智谱 GLM-4 系列支持 `web_search` 内置工具，让模型在回答时自动联网搜索最新信息，解决知识截止日期的问题。

### 实现方式 A：通过 AI SDK 的 providerOptions 透传

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.ZHIPU_API_KEY,
});

async function handleRecommend(userText: string) {
  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: `你是甜剧推荐官"甜甜"。请联网搜索最近新上映的电视剧，
根据用户心情推荐 2-3 部。要求附上真实信息来源。`,
    prompt: userText,
    // 通过 providerOptions 开启智谱联网搜索
    providerOptions: {
      openai: {
        tools: [
          {
            type: "web_search",
            web_search: {
              enable: true,
              search_result: true, // 返回搜索结果引用
            },
          },
        ],
      },
    },
  });
  return result.toUIMessageStreamResponse();
}
```

> ⚠️ `providerOptions` 的兼容性取决于 `@ai-sdk/openai` 版本，如果不支持透传，使用方式 B。

### 实现方式 B：直接调用智谱原生 API（更可控）

```typescript
// src/lib/zhipu-search.ts

export async function searchWithZhipu(userText: string): Promise<ReadableStream> {
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: "system",
          content: `你是甜剧推荐官"甜甜"。请基于联网搜索结果，推荐最近新上映的电视剧。
输出要求：
1. 先用一句话共情用户心情
2. 推荐 2-3 部剧，每部包含：剧名、年份、类型、评分、平台、推荐理由
3. 标注信息来源`,
        },
        { role: "user", content: userText },
      ],
      tools: [
        {
          type: "web_search",
          web_search: {
            enable: true,
            search_result: true,
          },
        },
      ],
      stream: true,
    }),
  });

  return response.body!;
}
```

```typescript
// src/app/api/chat/route.ts 中使用

import { searchWithZhipu } from "@/lib/zhipu-search";

async function handleRecommend(userText: string) {
  const stream = await searchWithZhipu(userText);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### 智谱 web_search 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `enable` | boolean | 是否开启联网搜索 |
| `search_result` | boolean | 是否在响应中返回搜索结果引用 |
| `search_query` | string | 自定义搜索关键词（可选，默认模型自动提取） |

### 优点

- 能获取**实时信息**，解决知识截止问题
- 实现成本低，不需要维护额外数据源
- 搜索结果带引用来源，提高可信度

### 局限

- 搜索结果质量取决于搜索引擎
- 联网搜索会**增加响应延迟**（约 1-3 秒）
- 会额外消耗 token

### 适用场景

学习阶段的最佳选择，性价比最高。

---

## 方案三：Tool Calling + 外部影视 API

### 思路

让大模型通过 Function Calling（工具调用）查询外部影视数据 API，获取**结构化的真实数据**，再由模型生成推荐文案。

### 可用的影视数据 API

| API | 说明 | 费用 |
|-----|------|------|
| [TMDB](https://www.themoviedb.org/) | 全球最大影视数据库，有中文支持 | 免费（需注册获取 API Key） |
| [豆瓣非官方 API](https://github.com/iiiiiii1/douban-imdb-api) | 社区维护，数据丰富 | 免费但不稳定 |
| [MDB List](https://mdblist.com/) | 聚合多个数据源 | 免费有限制 |

### 实现示例（以 TMDB 为例）

#### 1. 环境变量

```env
# .env.local
ZHIPU_API_KEY=your_zhipu_key
TMDB_API_KEY=your_tmdb_key   # 从 https://www.themoviedb.org/settings/api 获取
```

#### 2. 定义搜索工具

```typescript
// src/lib/tools/searchNewDramas.ts

import { tool, zodSchema } from "ai";
import { z } from "zod";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

// TMDB 类型 ID 映射
const GENRE_MAP: Record<string, number> = {
  爱情: 10749,
  喜剧: 35,
  动作: 28,
  悬疑: 9648,
  科幻: 878,
  古装: 36,     // History
  家庭: 10751,
  动画: 16,
};

function mapGenreToId(genre?: string): string {
  if (!genre) return "";
  const id = GENRE_MAP[genre];
  return id ? String(id) : "";
}

export const searchNewDramas = tool({
  description: "搜索最近新上映的电视剧，支持按类型、地区、年份筛选",
  inputSchema: zodSchema(
    z.object({
      query: z.string().optional().describe("搜索关键词，如剧名"),
      genre: z.string().optional().describe("类型：爱情、喜剧、古装、悬疑等"),
      region: z.string().optional().describe("地区代码：CN（中国）、KR（韩国）、JP（日本）"),
      year: z.number().optional().describe("年份，默认为当前年份"),
    })
  ),
  execute: async ({ query, genre, region, year }) => {
    const currentYear = new Date().getFullYear();
    const targetYear = year ?? currentYear;

    // 如果有具体关键词，走搜索接口
    if (query) {
      const params = new URLSearchParams({
        api_key: TMDB_API_KEY!,
        language: "zh-CN",
        query,
      });
      const res = await fetch(`${TMDB_BASE}/search/tv?${params}`);
      const data = await res.json();
      return formatResults(data.results?.slice(0, 5) ?? []);
    }

    // 否则走发现接口，按条件筛选
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY!,
      language: "zh-CN",
      sort_by: "first_air_date.desc",
      "first_air_date.gte": `${targetYear}-01-01`,
      with_origin_country: region ?? "CN",
    });
    const genreId = mapGenreToId(genre);
    if (genreId) params.set("with_genres", genreId);

    const res = await fetch(`${TMDB_BASE}/discover/tv?${params}`);
    const data = await res.json();
    return formatResults(data.results?.slice(0, 5) ?? []);
  },
});

function formatResults(results: any[]) {
  return results.map((d) => ({
    title: d.name,
    overview: d.overview,
    firstAirDate: d.first_air_date,
    rating: d.vote_average,
    popularity: d.popularity,
    posterUrl: d.poster_path
      ? `https://image.tmdb.org/t/p/w200${d.poster_path}`
      : null,
  }));
}
```

#### 3. 在 Agent 中注册工具

```typescript
// src/lib/agent.ts

import { ToolLoopAgent, stepCountIs } from "ai";
import { zhipu } from "./zhipu";
import { searchNewDramas } from "./tools/searchNewDramas";
import { renderDramaCard } from "./tools/renderDramaCard";

export const sweetDramaAgent = new ToolLoopAgent({
  model: zhipu.chat("glm-4-plus"),

  instructions: `你是甜剧推荐官"甜甜"🌸

工作流程：
1. 理解用户心情和偏好
2. 调用 searchNewDramas 搜索最新的电视剧
3. 从搜索结果中挑选最合适的 2-3 部
4. 调用 renderDramaCard 展示推荐结果

规则：
- 只推荐 searchNewDramas 返回的真实剧集，不要编造
- 语气轻松活泼，适当用 emoji
- 优先推荐最近上映的新剧`,

  tools: {
    searchNewDramas,
    renderDramaCard,
  },

  stopWhen: stepCountIs(5),
});
```

#### 4. 在 API Route 中使用

```typescript
// src/app/api/chat/route.ts

import { sweetDramaAgent } from "@/lib/agent";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = sweetDramaAgent.stream(messages);
  return result.toUIMessageStreamResponse();
}
```

### 优点

- 数据真实、结构化、可控
- 与现有 ToolLoopAgent 架构完全兼容
- 可以组合多个工具（搜索 + 评分 + 卡片渲染）

### 局限

- 需要申请 TMDB API Key
- TMDB 的中国剧数据不如豆瓣全面
- 外部 API 可能有请求频率限制

### 适用场景

需要结构化数据、追求准确性的正式应用。

---

## 方案四：RAG（检索增强生成）

### 思路

构建自己的影视知识库，通过向量检索 + 大模型生成实现精准推荐。

### 架构

```
用户提问
   ↓
Embedding 向量化（智谱 embedding-3 / OpenAI text-embedding-3-small）
   ↓
向量数据库检索（Pinecone / Chroma / Milvus）
   ↓
Top-K 相关剧集
   ↓
喂给大模型 + 用户问题
   ↓
生成个性化推荐
```

### 技术栈选型

| 组件 | 推荐选择 | 说明 |
|------|---------|------|
| 向量数据库 | Chroma（轻量）/ Pinecone（云端） | Chroma 适合本地开发，Pinecone 适合生产 |
| Embedding 模型 | 智谱 `embedding-3` | 与现有智谱生态一致 |
| 数据源 | 定期爬取 / API 同步 | 每周更新最新剧集信息 |
| 框架 | LangChain.js / LlamaIndex.TS | 提供 RAG 开箱即用的管道 |

### 简化实现示例

```typescript
// src/lib/rag.ts（伪代码，展示核心流程）

import { ChromaClient } from "chromadb";

const chroma = new ChromaClient();
const collection = await chroma.getOrCreateCollection({ name: "dramas" });

// 1. 数据入库（定期运行）
async function indexDramas(dramas: DramaInfo[]) {
  const embeddings = await zhipuEmbed(dramas.map((d) => d.description));
  await collection.add({
    ids: dramas.map((d) => d.id),
    embeddings,
    documents: dramas.map((d) => JSON.stringify(d)),
  });
}

// 2. 检索相关剧集
async function retrieveDramas(query: string, topK = 5) {
  const queryEmbedding = await zhipuEmbed([query]);
  const results = await collection.query({
    queryEmbeddings: queryEmbedding,
    nResults: topK,
  });
  return results.documents[0]?.map((doc) => JSON.parse(doc!)) ?? [];
}

// 3. 生成推荐
async function recommend(userText: string) {
  const relevantDramas = await retrieveDramas(userText);

  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: `你是甜剧推荐官"甜甜"。基于以下检索到的剧集信息进行推荐，不要编造。`,
    prompt: `用户说："${userText}"
检索到的相关剧集：
${JSON.stringify(relevantDramas, null, 2)}
请从中挑选 2-3 部最合适的推荐给用户。`,
  });

  return result;
}
```

### 优点

- 数据完全自主可控
- 支持语义搜索（"像苍兰诀那样的剧"也能理解）
- 可以持续扩充知识库

### 局限

- 实现复杂度最高
- 需要维护向量数据库和数据管道
- 数据更新需要定期同步

### 适用场景

做正式产品、追求精准语义匹配的场景。学习阶段可以了解概念，不建议一开始就上。

---

## 方案对比总结

| 维度 | 方案一：纯 LLM | 方案二：联网搜索 | 方案三：Tool + API | 方案四：RAG |
|------|---------------|-----------------|-------------------|------------|
| 实现难度 | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 数据实时性 | ❌ 有截止日期 | ✅ 实时 | ✅ 实时 | ⚠️ 取决于更新频率 |
| 数据准确性 | ⚠️ 可能幻觉 | ⚠️ 取决于搜索质量 | ✅ 结构化真实数据 | ✅ 自主可控 |
| 改动量 | 极小 | 小 | 中等 | 大 |
| 额外依赖 | 无 | 无 | TMDB API Key | 向量数据库 + Embedding |
| 响应速度 | 快 | 中（+1~3s） | 中（+1~2s） | 中（+1~2s） |
| 适合阶段 | 原型验证 | **学习首选** | 正式应用 | 生产级产品 |

## 推荐升级路径

```
方案一（快速验证）
  ↓  理解 LLM 基础能力和局限
方案二（联网搜索）  ← 当前推荐起点
  ↓  理解 Tool Use / Function Calling
方案三（外部 API）
  ↓  理解 RAG 架构
方案四（RAG）
```

建议从**方案二**开始，改动量最小、效果最直观，能立刻体验到大模型联网搜索的能力。熟悉后再逐步升级到方案三，与现有的 `ToolLoopAgent` 架构完美衔接。
