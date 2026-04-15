# 前端工程师接入大模型 — 学习与实践计划

---

## 定位：前端 + AI 的职业方向

```
前端工程师 × AI = 三个主要方向

方向A: AI 应用前端开发          ← 推荐优先路线
  构建 AI 产品的前端（Chat UI、Copilot、AI 编辑器）
  核心：流式渲染、Prompt 管理、工具调用前端

方向B: AI Infra 前端
  构建 AI 平台的管理后台（训练管理、数据标注、模型评测）
  核心：复杂表单、数据可视化、权限管理

方向C: AI 全栈开发
  从前端到 API 到编排层全链路
  核心：全栈能力 + AI 编排 + 向量数据库
```

---

## 阶段一：基础认知（第 1~2 周）

### 目标：理解 AI 应用全链路，能跑通一个 AI 对话

```
学习清单:
├── 1.1 理解 LLM 基础概念
│   ├── Token、Context Window、Temperature
│   ├── 主流模型 API 调用（OpenAI / Claude）
│   └── 用 curl 或 Postman 调通一次 API
│
├── 1.2 注册并熟悉 API
│   ├── OpenAI API Key 注册与计费理解
│   ├── Anthropic Console 注册
│   └── 阅读 Messages API 文档
│
├── 1.3 跑通第一个 AI Chat
│   ├── 用 Next.js 搭建最简 Chat 界面
│   ├── 后端 API Route 调用 LLM
│   └── 理解请求-响应的数据结构
│
└── 1.4 前端 AI SDK 入门
    ├── Vercel AI SDK (useChat hook)
    └── 理解流式传输的原理
```

### 实战项目：最简 AI Chat

```
技术栈: Next.js + Vercel AI SDK + OpenAI/Claude

项目结构:
  app/
  ├── page.tsx              ← 聊天界面
  ├── api/chat/route.ts     ← API 代理（隐藏 API Key）
  └── layout.tsx

核心代码骨架:
  // page.tsx
  import { useChat } from 'ai/react';

  export default function Chat() {
    const { messages, input, handleInputChange, handleSubmit } = useChat();
    return (
      <div>
        {messages.map(m => <Message key={m.id} {...m} />)}
        <form onSubmit={handleSubmit}>
          <input value={input} onChange={handleInputChange} />
        </form>
      </div>
    );
  }

  // api/chat/route.ts
  import { streamText } from 'ai';
  import { openai } from '@ai-sdk/openai';

  export async function POST(req) {
    const { messages } = await req.json();
    const result = streamText({ model: openai('gpt-4o'), messages });
    return result.toDataStreamResponse();
  }

验收标准:
  ✅ 页面有输入框和消息列表
  ✅ 发送消息后流式显示 AI 回复
  ✅ API Key 不暴露到前端
```

---

## 阶段二：流式渲染与 Chat UI（第 3~4 周）

### 目标：构建生产级 Chat 界面，理解流式传输全链路

```
学习清单:
├── 2.1 SSE 流式传输原理
│   ├── SSE vs WebSocket vs Long Polling 对比
│   ├── ReadableStream API
│   └── 前端如何解析 SSE 数据流
│
├── 2.2 Chat UI 组件开发
│   ├── 消息列表虚拟滚动（长对话性能）
│   ├── Markdown 渲染 + 代码高亮
│   ├── 打字机效果实现
│   └── 复制按钮、重新生成、编辑消息
│
├── 2.3 多模态支持
│   ├── 图片上传 + 预览
│   ├── 文件上传（PDF、Word → 提取文本）
│   └── 拖拽上传交互
│
└── 2.4 对话管理
    ├── 多轮对话上下文管理
    ├── 对话历史存储（localStorage / 数据库）
    └── 多会话切换
```

### 实战项目：生产级 Chat 应用

```
功能清单:
  ┌─────────────────────────────────────┐
  │  左侧边栏          │   聊天区域      │
  │                    │                 │
  │  🔍 搜索对话       │  System: 你好   │
  │  ─────────────    │  User: 解释闭包  │
  │  📅 今天           │  AI: 闭包是指.. │
  │    对话1           │  ```js          │
  │    对话2           │  function outer │
  │  📅 昨天           │  ...            │
  │    对话3           │  ```            │
  │  ─────────────    │                 │
  │  + 新建对话        │  [输入框]  [发送] │
  └─────────────────────────────────────┘

技术要点:
  - 流式渲染 Markdown（react-markdown + remark-gfm）
  - 代码高亮（prism-react-renderer）
  - 消息流式渲染时的自动滚动
  - 停止生成按钮（AbortController）
```

---

## 阶段三：Tool Use 与 Function Calling（第 5~6 周）

### 目标：让 AI 能调用前端定义的工具，构建 AI 助手

```
学习清单:
├── 3.1 Function Calling 原理
│   ├── Tools 定义格式（JSON Schema）
│   ├── LLM 如何决定调用哪个工具
│   └── 多轮工具调用的交互流程
│
├── 3.2 Vercel AI SDK 的 Tool Use
│   ├── defineTool / tool 函数
│   ├── 前端工具（浏览器端执行）
│   └── 服务端工具（API 端执行）
│
├── 3.3 实用工具开发
│   ├── 天气查询工具
│   ├── 网页搜索工具
│   ├── 代码执行工具（沙箱）
│   └── 数据库查询工具
│
└── 3.4 前端工具调用 UI
    ├── 工具调用状态显示（加载中/成功/失败）
    ├── 工具结果渲染
    └── 人工确认机制（敏感操作前询问用户）
```

### 实战项目：AI 代码助手

```
让 AI 助手能操作前端工具:

  用户: "帮我查一下 React 的最新版本"
    ↓
  AI: 调用 search_web 工具
    ↓
  工具返回: React 19.1.0
    ↓
  AI: "React 最新版本是 19.1.0"

  用户: "帮我运行这段代码: console.log(1+1)"
    ↓
  AI: 调用 execute_code 工具
    ↓
  工具返回: { output: "2" }
    ↓
  AI: "运行结果是 2"

前端实现:
  // 定义前端可执行的工具
  const tools = {
    execute_code: {
      description: '在浏览器沙箱中执行 JavaScript 代码',
      parameters: { code: { type: 'string' } },
      execute: async ({ code }) => {
        // 安全沙箱执行
        const result = await runInSandbox(code);
        return result;
      }
    },
    search_web: {
      description: '搜索互联网',
      parameters: { query: { type: 'string' } },
      execute: async ({ query }) => {
        const res = await fetch('/api/search?q=' + query);
        return res.json();
      }
    }
  };
```

---

## 阶段四：RAG 应用前端（第 7~8 周）

### 目标：理解 RAG 流程，构建知识库问答前端

```
学习清单:
├── 4.1 RAG 流程理解
│   ├── 文档上传 → 分块 → Embedding → 入库
│   ├── 用户提问 → 检索 → 构造 Prompt → 生成
│   └── 前端在 RAG 中的角色
│
├── 4.2 向量数据库入门
│   ├── Pinecone / Supabase pgvector 注册使用
│   ├── Embedding API 调用
│   └── 相似度搜索接口
│
├── 4.3 知识库管理前端
│   ├── 文档上传（拖拽 + 进度条）
│   ├── 文档列表与状态管理
│   ├── 分块预览与编辑
│   └── 知识库统计面板
│
└── 4.4 RAG 问答前端
    ├── 基于知识库的 Chat 界面
    ├── 引用溯源 UI（点击跳转到原文）
    │   AI 回答中标注 [1] [2] 来源
    │   点击显示原文片段
    └── 文档上下文预览
```

### 实战项目：团队知识库问答系统

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  ┌── 知识库管理 ──────────────────────────────┐   │
│  │                                             │   │
│  │  [上传文档]  [上传文件夹]                     │   │
│  │                                             │   │
│  │  📄 React官方文档.pdf     ✅ 已索引 128 块   │   │
│  │  📄 团队技术规范.docx     ✅ 已索引 45 块    │   │
│  │  📁 src/components/       ✅ 已索引 89 块    │   │
│  │  📄 API设计指南.md        🔄 索引中...       │   │
│  └─────────────────────────────────────────────┘   │
│                                                   │
│  ┌── 问答界面 ────────────────────────────────┐   │
│  │                                             │   │
│  │  User: 我们项目的错误处理规范是什么?         │   │
│  │                                             │   │
│  │  AI: 根据团队技术规范 [1]，错误处理遵循:     │   │
│  │  1. API 错误统一用 ErrorHandler ...          │   │
│  │  2. 组件内用 ErrorBoundary ...               │   │
│  │                                             │   │
│  │  📎 来源:                                   │   │
│  │  [1] 团队技术规范.docx - 第3章 错误处理      │   │
│  │  [2] API设计指南.md - 错误响应格式           │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘

技术栈:
  前端: Next.js + shadcn/ui
  后端: Next.js API Routes + LangChain.js
  向量库: Supabase pgvector
  Embedding: OpenAI text-embedding-3-small
```

---

## 阶段五：Agent 前端交互（第 9~10 周）

### 目标：构建 Agent 可视化前端，展示思考过程和工具调用

```
学习清单:
├── 5.1 Agent 交互模式
│   ├── 思考过程可视化（Thought → Action → Observation）
│   ├── 多步执行进度展示
│   └── 中间状态实时更新
│
├── 5.2 复杂 UI 状态管理
│   ├── 步骤折叠/展开
│   ├── 工具调用结果实时流式展示
│   ├── 错误处理与重试
│   └── 执行中可取消
│
├── 5.3 多 Agent 协作前端
│   ├── Agent 状态面板
│   ├── Agent 间消息流可视化
│   └── 任务分配进度展示
│
└── 5.4 人工介入（Human-in-the-loop）
    ├── 关键操作确认弹窗
    ├── 审批工作流 UI
    └── 人工纠正与反馈
```

### 实战项目：AI 编程助手（类 Claude Code Web 版）

```
┌──────────────────────────────────────────────────────┐
│  AI 编程助手                                          │
│                                                       │
│  用户: 帮我给这个组件加上 loading 状态                  │
│                                                       │
│  ── Agent 执行过程 ──────────────────────────────────  │
│                                                       │
│  💭 思考: 需要先了解当前组件结构                        │
│     ↓                                                 │
│  🔧 读取文件: src/components/UserList.tsx              │
│     ✅ 已读取 (234 行)                                 │
│     ↓                                                 │
│  💭 思考: 这是一个数据列表组件，需要添加加载状态         │
│     ↓                                                 │
│  🔧 读取文件: src/hooks/useUsers.ts                   │
│     ✅ 已读取 (56 行)                                  │
│     ↓                                                 │
│  💭 思考: hook 已经返回 isLoading，只需在组件中使用      │
│     ↓                                                 │
│  ✏️ 编辑文件: src/components/UserList.tsx              │
│     ┌─ diff ────────────────────────────────┐         │
│     │ +  if (isLoading) return <Spinner />  │         │
│     │ +  if (error) return <Error />        │         │
│     └────────────────────────────────────────┘         │
│     ⚠️ 需要确认修改 [确认] [拒绝]                       │
│                                                       │
│  ✅ 完成！已为 UserList 组件添加 loading 和 error 状态   │
└──────────────────────────────────────────────────────┘
```

---

## 阶段六：高级主题与生产化（第 11~12 周）

### 目标：掌握生产级 AI 前端的关键技术

```
学习清单:
├── 6.1 性能优化
│   ├── Token 消耗统计与控制
│   ├── 消息列表虚拟化（万条消息不卡顿）
│   ├── Markdown 流式渲染性能优化
│   └── 前端缓存策略（相同问题不重复请求）
│
├── 6.2 安全与合规
│   ├── API Key 安全（后端代理、不暴露到前端）
│   ├── 用户输入过滤（Prompt Injection 防护）
│   ├── 敏感信息脱敏
│   └── 内容审核（AI 输出过滤）
│
├── 6.3 可观测性
│   ├── 埋点: Token 用量、响应时间、用户满意度
│   ├── 日志: 完整的对话 + 工具调用链路
│   ├── 监控: 错误率、延迟、成本
│   └── A/B 测试: 不同 Prompt / 模型的效果对比
│
├── 6.4 MCP 前端集成
│   ├── 在 Web 应用中接入 MCP Server
│   ├── 动态发现和展示 MCP 工具
│   └── MCP 工具调用结果渲染
│
└── 6.5 AI SDK 深入
    ├── Vercel AI SDK 高级用法
    ├── 结构化输出 (Structured Output)
    ├── 多模型切换与 Fallback
    └── Provider 打包与成本优化
```

---

## 推荐技术栈路线

```
优先级1 — 必学
  Next.js 14+ (App Router)
  Vercel AI SDK (ai + @ai-sdk/openai + @ai-sdk/anthropic)
  TypeScript
  SSE 流式传输

优先级2 — 重要
  LangChain.js (前端可用，RAG/Agent 编排)
  Supabase (pgvector + Auth + Realtime)
  react-markdown + prism-react-renderer
  shadcn/ui

优先级3 — 进阶
  MCP SDK (@modelcontextprotocol/sdk)
  Streaming HTML / React Server Components 流式
  PGLite / DuckDB-wasm (浏览器端向量搜索)
  Web Workers (浏览器端 Embedding 计算)
```

---

## 学习资源

### 文档

```
Vercel AI SDK:     sdk.vercel.ai/docs
Anthropic API:     docs.anthropic.com
OpenAI API:        platform.openai.com/docs
LangChain.js:      js.langchain.com
MCP 规范:          modelcontextprotocol.io
```

### 推荐开源项目参考

```
项目                    学习点
──────────────         ──────────
chatbot-ui             生产级 Chat UI 设计
lobe-chat              功能丰富的开源 Chat 应用
next-ai-chat           Next.js + AI SDK 最佳实践
langchain-nextjs       LangChain.js + Next.js 模板
vercel-ai-chatgpt      Vercel 官方示例
```

---

## 职业路线图

```
当前位置                  3个月目标                  6个月目标
─────────               ──────────                ──────────
React 前端开发           AI 应用前端开发             AI 全栈开发
                        能独立构建                  能独立负责
                        Chat / RAG 应用             完整 AI 产品

技能树:
  ✅ React/Next.js      + SSE 流式渲染              + LangChain.js 编排
  ✅ TypeScript         + AI SDK 使用               + RAG 全链路
  ✅ 状态管理            + Function Calling          + Agent 系统设计
  ✅ 组件开发            + MCP 理解                  + MCP Server 开发
                        + Prompt Engineering         + 生产化运维
```

---

## 每周学习节奏建议

```
工作日 (每天 1.5h):
  0.5h — 阅读文档/文章（理解概念）
  1.0h — 写代码（动手实践）

周末 (每天 3h):
  1.0h — 深度学习（源码/原理）
  2.0h — 项目实战

关键原则:
  1. 每个"阶段"一定要有产出（可运行的 demo）
  2. 先跑通再优化，不要追求完美
  3. 关注 AI SDK 的更新，迭代很快
  4. 多看开源项目的实现方式
```
