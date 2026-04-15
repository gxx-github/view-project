# 简历高光时刻 — 甜剧推荐 · Sweet Drama AI

## 项目一句话描述

> 基于 Vercel AI SDK（ai@6）+ 智谱 GLM-4 的 Generative UI 智能聊天应用，实现了 AI Tool Calling 驱动的动态剧集卡片渲染。

---

## 可写进简历的技术亮点

### 1. AI 大模型集成 — Provider 适配模式

通过 Vercel AI SDK 的 `createOpenAI({ baseURL })` 将智谱 GLM-4（国内模型）伪装成 OpenAI 兼容接口，实现零改造切换国内外模型，掌握了 **AI Provider 抽象层** 的设计思想。

```
技术栈: @ai-sdk/openai / ai@6 / streamText / tool / zodSchema
```

### 2. Generative UI — AI Tool Calling 驱动动态组件渲染

设计了 `renderDramaCard` 工具，让 AI 通过 Function Calling 返回结构化数据（剧名、甜度、标签、推荐理由），前端根据 tool invocation 状态（input-streaming → output-available）动态渲染精美剧集卡片，实现了 **AI 决定 UI 呈现** 的 Generative UI 范式。

```
技术栈: tool() + zodSchema + zod / useChat + parts 渲染 / toUIMessageStreamResponse()
```

### 3. ai@6 新 API 适配

深度适配 Vercel AI SDK v6 的 breaking changes：
- `UIMessage.parts[]` 替代 `content` 字段（文本从 parts 中提取）
- `sendMessage({ text })` 替代 `handleSubmit`
- `convertToModelMessages()` 处理前端 UIMessage → 模型 Message 的格式转换
- `stopWhen: stepCountIs()` 替代 `maxSteps`
- `toUIMessageStreamResponse()` 支持工具调用数据的流式传输

### 4. 流式 SSE 全链路打通

从用户输入 → API Route → 智谱 GLM-4 → SSE 流式响应 → 前端逐字渲染，完整实现了 **流式 AI 聊天** 的端到端数据流。

### 5. 毛玻璃 + rem 响应式 UI

- CSS 自定义 `.glass` / `.glass-dark` 类实现 Glassmorphism（`backdrop-filter: blur()`）
- `clamp(14px, 1.6vw, 16px)` 根字号 + rem 单位实现移动端到桌面端的等比缩放
- Tailwind CSS 原子化 + 自定义 CSS 类混合方案

---

## 面试可讲的架构决策

| 决策 | 理由 |
|------|------|
| 选 Vercel AI SDK 而非 LangChain | 前端场景 AI SDK 更轻量，React Hook 生态无缝集成 |
| 智谱 GLM-4 伪装 OpenAI | 国内可直连、中文能力强、免费额度充足、兼容 OpenAI 格式迁移成本低 |
| Tool Calling 而非 Prompt 解析 JSON | 类型安全（zod schema 校验）、SDK 自动处理流式传输、结构化输出更可靠 |
| ai@6 而非 ai@3 | 最新版，hooks 拆分为 @ai-sdk/react，消息结构支持多模态 parts |
| rem + clamp 响应式 | 不依赖额外库，纯 CSS 方案，性能最优 |

---

## 项目技术栈一览

```
前端:  Next.js 14 (App Router) / React 18 / TypeScript
样式:  Tailwind CSS 3 / Glassmorphism / rem 响应式
AI:    Vercel AI SDK 6 / @ai-sdk/openai / @ai-sdk/react / zod
模型:  智谱 GLM-4-Flash (兼容 OpenAI 接口)
UI库:  lucide-react / framer-motion / clsx / tailwind-merge
```

---

## 难点与解决方案（面试可展开）

### 难点 1: ai@6 大版本 breaking changes

ai@6 对消息结构做了根本性改变（`content` → `parts[]`），且文档较少。通过阅读 `index.d.ts` 类型定义，逐个适配了 `useChat`、`sendMessage`、`UIMessage`、`streamText` 等核心 API 的变化。

### 难点 2: Tool Calling 跨模型兼容

智谱 GLM-4 对 `tool_choice: "required"` 的支持与 OpenAI 有差异。通过服务端日志 + `onStepFinish` 回调追踪 `finishReason` 和 `toolCalls` 数量，定位模型是否真正调用了工具。

### 难点 3: UIMessage Stream 格式

`toTextStreamResponse()` 只传纯文本不传工具数据，需改用 `toUIMessageStreamResponse()` 才能把 tool invocation 序列化到 SSE 流中。这个差异在文档中没有明确说明，是通过排查前端 `parts` 始终为 text 类型才发现的。

---

*适用于：前端开发工程师 / 全栈开发工程师 / AI 应用开发工程师 的简历项目经历*
