# AI Agent 主流架构 & 前端技能路线

## 一、当前最流行的 Agent 架构


| 架构模式                            | 核心思路              | 代表框架                      |
| ------------------------------- | ----------------- | ------------------------- |
| **ReAct**                       | 推理→行动→观察循环        | LangChain, Vercel AI SDK  |
| **Plan-and-Execute**            | 先规划再逐步执行          | LangGraph, AutoGen        |
| **Multi-Agent**                 | 多个专业 Agent 协作     | CrewAI, OpenAI Agents SDK |
| **Tool-Use / Function Calling** | 围绕 LLM 工具调用构建     | Anthropic Claude, OpenAI  |
| **MCP 协议**                      | 标准化 Agent 与外部工具连接 | Claude, 各大平台逐步支持          |


## 二、前端开发 AI Agent 需要学的技能栈

### 第一层：必备基础

- **TypeScript** — 所有主流 AI SDK 都以 TS 优先
- **LLM API 调用** — OpenAI / Anthropic / 国内模型 API，理解 streaming、tool use、structured output
- **Vercel AI SDK** — 前端最友好的 AI 集成方案（`useChat`, `useCompletion`, streaming）

### 第二层：Agent 核心能力

- **LangChain.js / Mastra** — JS/TS 原生 Agent 编排框架
- **RAG（检索增强生成）** — 向量数据库 + embedding，理解 pgvector / Pinecone
- **Tool Calling 设计** — 用 Zod 定义 schema，设计 Agent 可调用的工具函数
- **Prompt Engineering** — System prompt 设计、Few-shot、Chain-of-Thought

### 第三层：工程化 & 进阶

- **Next.js App Router** — AI Agent 前端首选框架（Server Actions + Streaming）
- **MCP 协议** — Agent 连接外部工具的标准化方案
- **Transformers.js** — 浏览器端运行模型推理
- **Agentic UX 设计** — 动态 UI、流式渲染、多模态交互

### 前端专用 AI UI 库

- **CopilotKit** — 开源 AI Copilot 组件库
- **Assistant UI** — 专注 AI 对话界面的 React 组件库
- **Ant Design X** — 蚂蚁集团推出的 AI 对话组件库
- **Vercel AI SDK UI** — `useChat`, `useCompletion` 等 React hooks

## 三、主流框架对比

### AI Agent 框架


| 框架                    | 说明                     |
| --------------------- | ---------------------- |
| LangChain / LangGraph | 编排框架，图结构 Agent 工作流     |
| CrewAI                | 多 Agent 协作，角色化设计       |
| AutoGen (Microsoft)   | 多 Agent 对话框架           |
| Semantic Kernel       | 企业级 AI 编排              |
| LlamaIndex            | 数据驱动的 Agent 和 RAG      |
| OpenAI Agents SDK     | OpenAI 官方 Agent 工具包    |
| Pydantic AI           | 类型安全的 Agent 框架         |
| Mastra                | TypeScript 原生 Agent 框架 |


### 前端 AI 应用框架


| 框架                      | 用途                  |
| ----------------------- | ------------------- |
| Next.js + Vercel AI SDK | 全栈 React + 流式 AI 响应 |
| Streamlit               | Python 快速原型         |
| Gradio                  | ML/AI 演示界面          |
| Chainlit                | LangChain Agent 前端  |
| Flowise / Langflow      | 可视化拖拽构建 Agent       |


## 四、2025-2026 趋势

1. **Agent-as-a-Service 平台化**：Dify、Coze 等平台让前端开发者零模型知识搭建 Agent
2. **浏览器端 Agent**：Transformers.js + WebGPU，更多推理在浏览器中运行
3. **MCP 协议标准化**：成为 Agent 调用外部工具的事实标准
4. **多模态 Agent UI**：支持文本、图片、音频、视频的统一交互界面
5. **Agentic UX 设计范式**：前端从"用户操作驱动"转向"AI 代理驱动"的新交互模式

