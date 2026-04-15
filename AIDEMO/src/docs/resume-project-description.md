# 简历项目描述 — Sweet Drama AI

## 项目名称

**Sweet Drama AI — 基于 AI Agent 的智能甜宠剧推荐系统**

## 一句话描述

基于 Next.js 14 + Vercel AI SDK v6 构建的 AI 对话推荐应用，实现了意图识别、情绪分析、Tool Calling 驱动的 Generative UI，支持双模式（规则编排 / Agent 自主决策）架构切换。

## 技术栈

`Next.js 14` `TypeScript` `Vercel AI SDK v6` `Zhipu GLM-4` `Tool Calling` `Zod` `Tailwind CSS` `Server-Sent Events`

## 核心亮点

### 1. 意图识别引擎

设计双层意图检测（规则匹配 + AI fallback），将用户输入分类为 chat/recommend/trending/search/rating 五大意图，规则层覆盖 80% 常见场景，降低 API 调用成本。

### 2. Generative UI 架构

基于 LLM Tool Calling 实现动态 UI 渲染——根据 AI 返回的 tool 调用结果，前端自动渲染对应组件（推荐卡片、排行榜、搜索结果），实现"AI 驱动 UI"的 Agentic 交互模式。

### 3. 双模式 Agent 架构

实现 Free Mode（Server 端 streamText 编排）和 Paid Mode（ToolLoopAgent 自主决策循环）两种运行模式，展示了对 AI Agent 不同实现范式的理解。

### 4. 情绪感知推荐

集成情绪分析工具，根据用户情绪状态（疲惫/悲伤/无聊等）动态调整推荐策略，提供个性化体验。

### 5. Provider 适配器模式

通过 `createOpenAI` 适配器封装，实现 AI 供应商（智谱/OpenAI/DeepSeek）的无缝切换，仅改 baseURL 即可切换模型。

## 简历描述模板（直接复制使用）

> **Sweet Drama AI | 个人项目 | 2026.03**
>
> 基于 Next.js 14 和 Vercel AI SDK v6 构建的 AI 智能推荐对话应用。设计并实现了双层意图识别引擎（规则 + AI），基于 Tool Calling 的 Generative UI 动态渲染架构，以及编排式/自主式双模式 Agent 方案。集成情绪分析模块实现个性化推荐，通过 Provider 适配器模式支持多模型无缝切换。

## 面试加分话术

- "这个项目让我理解了 AI Agent 的核心不是模型本身，而是 **意图识别 → 工具调用 → UI 渲染** 这条链路的设计"
- "双模式架构让我对比了 **编排式（Orchestration）** 和 **自主式（Autonomous Agent）** 两种范式的优劣"
- "Generative UI 是前端 + AI 的最佳结合点——用 Tool Calling 代替传统的接口约定，让 AI 决定渲染什么组件"
- "规则 + AI 的双层意图识别，本质上是一个成本和准确率的工程权衡问题"

## 面试可能被问到的问题 & 参考回答

### Q: 为什么用双层意图识别而不是全交给 AI？

A: 工程权衡。纯 AI 意图识别每次请求都消耗 token，成本高且延迟大。常见场景（"推荐几个甜剧"、"最近有什么火的"）用正则就能准确匹配，只有模糊输入才需要 AI 判断。这样 80% 的请求走规则层，既省成本又快。

### Q: Generative UI 和传统接口有什么区别？

A: 传统模式是前端发请求 → 后端返回固定格式 JSON → 前端按字段渲染。Generative UI 是 AI 通过 Tool Calling 决定返回什么结构，前端根据 tool 类型动态选择组件。好处是交互更灵活——用户同样说"推荐甜剧"，AI 可以根据上下文选择渲染单卡还是列表。

### Q: 两种 Agent 模式各有什么优劣？

A: 编排式（Free Mode）可控性强、成本低、行为可预测，但灵活性有限；自主式（Paid Mode）让 Agent 自己决定调用哪些工具、调用几次，更智能但 token 消耗不可控。实际项目中需要根据场景选择。
