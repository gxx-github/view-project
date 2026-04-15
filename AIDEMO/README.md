# 甜剧推荐 · Sweet Drama AI

> 情绪化小甜剧智能推荐引擎 — 基于 Vercel AI SDK + 智谱 GLM-4 的 Generative UI 聊天应用

---

## 目录

- [项目概述](#项目概述)
- [技术架构](#技术架构)
- [AI 工具集成详解](#ai-工具集成详解)
- [核心依赖说明](#核心依赖说明)
- [项目结构](#项目结构)
- [环境配置](#环境配置)
- [快速开始](#快速开始)
- [数据流全链路](#数据流全链路)
- [API 路由详解](#api-路由详解)
- [前端组件详解](#前端组件详解)
- [UI 设计规范](#ui-设计规范)
- [常见问题](#常见问题)

---

## 项目概述

本项目的核心目标是构建一个**能理解用户情绪并推荐甜蜜治愈系影视剧的 AI 聊天应用**。

核心亮点：
- **智谱 GLM-4 伪装成 OpenAI**：利用智谱 API 完全兼容 OpenAI 接口格式的特性，通过 Vercel AI SDK 的 OpenAI Provider 无缝接入
- **Generative UI**：流式输出 + 毛玻璃效果的现代化聊天界面
- **rem 响应式适配**：全局使用 rem 单位，通过 `clamp()` 实现不同屏幕的等比缩放

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   用户浏览器                      │
│  ┌───────────────────────────────────────────┐  │
│  │         React 前端 (page.tsx)              │  │
│  │  useChat() ←→ sendMessage({ text })       │  │
│  │       ↕ SSE 流式连接                        │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ POST /api/chat             │
│  ┌──────────────────▼────────────────────────┐  │
│  │       Next.js API Route (route.ts)         │  │
│  │  1. 接收 UIMessage[]                       │  │
│  │  2. convertToModelMessages() 转换格式       │  │
│  │  3. streamText() 调用智谱 GLM-4            │  │
│  │  4. toTextStreamResponse() 返回 SSE 流     │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ HTTPS                      │
│  ┌──────────────────▼────────────────────────┐  │
│  │    智谱 AI API (open.bigmodel.cn)          │  │
│  │    POST /api/paas/v4/chat/completions      │  │
│  │    Model: glm-4-flash                      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## AI 工具集成详解

### 1. 为什么选择 Vercel AI SDK？

Vercel AI SDK 是目前 React/Next.js 生态中最成熟的 AI 集成方案，提供：

| 能力 | 说明 |
|------|------|
| `streamText()` | 服务端流式文本生成，自动管理 SSE 连接 |
| `useChat()` | 客户端 React Hook，自动管理消息状态、发送、接收流 |
| `convertToModelMessages()` | ai@6 新增，将前端 UIMessage 格式转为模型可识别的格式 |
| `createOpenAI()` | 可自定义 `baseURL`，指向任何兼容 OpenAI 格式的 API |

### 2. 智谱 GLM-4 如何"伪装"成 OpenAI？

智谱 AI（ZhipuAI）的 API 端点 `https://open.bigmodel.cn/api/paas/v4` **完全兼容 OpenAI 的 Chat Completions 接口格式**：

- 相同的请求格式：`{ model, messages, stream, ... }`
- 相同的响应格式：SSE 事件流 `data: {"choices": [{"delta": {"content": "..."}}]}`
- 相同的认证方式：Bearer Token

因此我们不需要智谱的专用 SDK，直接用 `@ai-sdk/openai` 的 `createOpenAI()` 并把 `baseURL` 指向智谱即可：

```typescript
// src/app/api/chat/route.ts
import { createOpenAI } from "@ai-sdk/openai";

const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",  // 指向智谱端点
  apiKey: process.env.ZHIPU_API_KEY,                  // 智谱的 API Key
});

// 使用方式和 OpenAI 一模一样
streamText({
  model: zhipu.chat("glm-4-flash"),  // 智谱的模型名
  messages: modelMessages,
});
```

### 3. ai@6 版本的重要变化

本项目使用 `ai@6`，与旧版有较大 API 差异：

| 特性 | ai@3 (旧版) | ai@6 (当前) |
|------|-------------|-------------|
| React Hook 导入 | `import { useChat } from "ai/react"` | `import { useChat } from "@ai-sdk/react"` |
| 发送消息 | `handleSubmit(e)` | `sendMessage({ text })` |
| 输入管理 | 内置 `input` + `handleInputChange` | 需自行管理 `useState` |
| 加载状态 | `isLoading: boolean` | `status: "submitted" \| "streaming" \| "ready" \| "error"` |
| 消息格式 | `{ role, content }` | `{ role, parts: [{ type: "text", text }] }` |
| 初始化消息 | `initialMessages` | `messages` |
| 流式响应 | `result.toDataStreamResponse()` | `result.toTextStreamResponse()` |
| 消息转换 | 不需要 | `convertToModelMessages()` (UIMessage → ModelMessage) |

### 4. System Prompt 设计

通过 `system` 参数为 AI 设定角色人设：

```
你是一位温柔、懂生活的"小甜剧推荐官"。你的名字叫"甜甜"。
你的任务是根据用户的心情和偏好，推荐适合的甜蜜、治愈系影视剧。

推荐规则：
1. 先共情用户当前的情绪状态，用温暖的语言给予回应
2. 每次推荐 2-3 部甜剧，包含：剧名、年份、一句话推荐理由
3. 用轻松活泼的语气，适当使用表情符号 🌸✨
4. 如果用户情绪低落，优先推荐治愈系、高甜无虐的作品
5. 如果用户想看虐一点但有甜的，可以推荐先虐后甜的剧
6. 回复简洁有趣，不要太长
```

---

## 核心依赖说明

### AI 相关

| 包名 | 版本 | 用途 |
|------|------|------|
| `ai` | ^6.0.153 | Vercel AI SDK 核心，提供 `streamText`、`convertToModelMessages` |
| `@ai-sdk/openai` | ^3.0.52 | OpenAI 兼容 Provider，通过自定义 baseURL 接入智谱 |
| `@ai-sdk/react` | ^3.0.155 | React Hook（`useChat`），管理聊天状态和流式连接 |
| `zod` | ^4.3.6 | Schema 校验库（为后续 Tool Calling / Structured Output 预留） |

### UI 相关

| 包名 | 版本 | 用途 |
|------|------|------|
| `next` | 14.2.35 | React 全栈框架，App Router 模式 |
| `react` / `react-dom` | ^18 | UI 渲染 |
| `tailwindcss` | ^3.4.1 | 原子化 CSS 框架 |
| `lucide-react` | ^1.7.0 | 图标库（Send、Heart、Sparkles） |
| `framer-motion` | ^12.38.0 | 动画库（为后续交互动效预留） |
| `clsx` | ^2.1.1 | className 条件拼接工具 |
| `tailwind-merge` | ^3.5.0 | Tailwind class 智能合并（去重冲突） |

---

## 项目结构

```
AIDEMO/
├── .env.local                    # 环境变量（智谱 API Key）
├── next.config.mjs               # Next.js 配置
├── tailwind.config.ts            # Tailwind 配置
├── tsconfig.json                 # TypeScript 配置
├── postcss.config.mjs            # PostCSS 配置
├── package.json                  # 项目依赖
│
└── src/
    ├── app/
    │   ├── layout.tsx            # 根布局（字体、viewport、元信息）
    │   ├── globals.css           # 全局样式（渐变背景、毛玻璃、响应式根字号）
    │   ├── page.tsx              # 主页面（聊天 UI + useChat Hook）
    │   ├── favicon.ico           # 网站图标
    │   ├── fonts/                # Geist 字体文件
    │   │   ├── GeistVF.woff
    │   │   └── GeistMonoVF.woff
    │   └── api/
    │       └── chat/
    │           └── route.ts      # AI API 路由（智谱 GLM-4 调用）
    └── ...（其他 Next.js 自动生成文件）
```

---

## 环境配置

### 必需的环境变量

在项目根目录创建 `.env.local` 文件：

```env
# 智谱 AI API Key
# 获取地址：https://open.bigmodel.cn → 注册/登录 → 控制台 → API Keys
ZHIPU_API_KEY=你的智谱API_Key
```

### 如何获取智谱 API Key

1. 访问 [智谱开放平台](https://open.bigmodel.cn)
2. 注册并登录账号
3. 进入「API Keys」管理页面
4. 点击「创建 API Key」，复制生成的 Key
5. 粘贴到 `.env.local` 文件中

> 注意：`.env.local` 已在 `.gitignore` 中，不会被提交到代码仓库。

---

## 快速开始

```bash
# 1. 克隆项目并进入目录
cd AIDEMO

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 编辑 .env.local，填入你的智谱 API Key
ZHIPU_API_KEY=你的Key

# 4. 启动开发服务器
npm run dev

# 5. 打开浏览器访问
# http://localhost:3000
```

---

## 数据流全链路

一次完整的用户发送消息流程：

```
用户输入 "想看点甜甜的剧"
       │
       ▼
┌─ page.tsx (前端) ─────────────────────────────────┐
│  1. setInput("") 清空输入框                         │
│  2. sendMessage({ text: "想看点甜甜的剧" })         │
│     └─ 内部将消息追加到 messages 数组                │
│     └─ 发起 POST /api/chat 请求                     │
│        Body: { messages: UIMessage[] }              │
└──────────────┬────────────────────────────────────┘
               │
               ▼
┌─ route.ts (后端) ─────────────────────────────────┐
│  1. const { messages } = await req.json()           │
│  2. const modelMessages = await                     │
│     convertToModelMessages(messages)                │
│     └─ UIMessage[{parts}] → ModelMessage[{content}] │
│  3. streamText({                                    │
│       model: zhipu.chat("glm-4-flash"),             │
│       system: "你是甜甜...",                         │
│       messages: modelMessages                       │
│     })                                              │
│  4. return result.toTextStreamResponse()            │
│     └─ 转为 SSE 格式的 Response                      │
└──────────────┬────────────────────────────────────┘
               │ HTTPS POST
               ▼
┌─ 智谱 AI 服务器 ─────────────────────────────────┐
│  POST https://open.bigmodel.cn/api/paas/v4/        │
│       chat/completions                              │
│  Authorization: Bearer <ZHIPU_API_KEY>              │
│  Body: { model: "glm-4-flash", messages: [...],    │
│          stream: true }                             │
│                                                     │
│  Response: SSE 事件流                               │
│  data: {"choices":[{"delta":{"content":"当"}}]}    │
│  data: {"choices":[{"delta":{"content":"然"}}]}    │
│  data: {"choices":[{"delta":{"content":"！"}}]}    │
│  ...                                                │
│  data: [DONE]                                       │
└──────────────┬────────────────────────────────────┘
               │ SSE 流逐字返回
               ▼
┌─ page.tsx (前端) ─────────────────────────────────┐
│  useChat 自动接收 SSE 流：                          │
│  1. status 变为 "streaming"                         │
│  2. assistant 消息的 parts[0].text 逐字追加         │
│  3. 组件自动重新渲染，文字逐字显示                    │
│  4. 流结束，status 变回 "ready"                     │
│  5. 消息滚动到底部（useEffect）                      │
└────────────────────────────────────────────────────┘
```

---

## API 路由详解

### 文件：`src/app/api/chat/route.ts`

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages } from "ai";

// 创建智谱 AI Provider（伪装成 OpenAI）
const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.ZHIPU_API_KEY,
});

export async function POST(req: Request) {
  // 1. 解析前端发来的消息
  const { messages } = await req.json();

  // 2. 转换消息格式：UIMessage → ModelMessage
  const modelMessages = await convertToModelMessages(messages);

  // 3. 调用智谱 GLM-4-Flash 模型，流式生成
  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: "你是一位温柔的小甜剧推荐官...", // 角色设定
    messages: modelMessages,
  });

  // 4. 以 SSE 文本流格式返回给前端
  return result.toTextStreamResponse();
}
```

**关键函数说明：**

| 函数 | 来源 | 作用 |
|------|------|------|
| `createOpenAI()` | `@ai-sdk/openai` | 创建 OpenAI 兼容的 Provider 实例，通过 `baseURL` 指向智谱 |
| `zhipu.chat()` | Provider 实例方法 | 选择聊天模型（如 `glm-4-flash`） |
| `convertToModelMessages()` | `ai` | 将前端的 UIMessage（parts 结构）转为模型需要的标准格式 |
| `streamText()` | `ai` | 流式文本生成核心函数，返回 StreamTextResult |
| `toTextStreamResponse()` | StreamTextResult | 将流式结果转为 SSE Response 对象 |

---

## 前端组件详解

### 文件：`src/app/page.tsx`

#### useChat Hook 使用

```typescript
import { useChat } from "@ai-sdk/react";

const { messages, sendMessage, status } = useChat({
  messages: [WELCOME],  // 初始欢迎消息
});
```

**返回值说明：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `messages` | `UIMessage[]` | 所有聊天消息，每条包含 `id`、`role`、`parts` |
| `sendMessage` | `(opts: { text: string }) => Promise<void>` | 发送消息并触发 API 调用 |
| `status` | `"submitted" \| "streaming" \| "ready" \| "error"` | 当前请求状态 |

#### UIMessage 结构（ai@6）

```typescript
interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{
    type: "text";     // 目前主要用 text 类型
    text: string;     // 实际文本内容
    state?: "streaming" | "done";
  }>;
}
```

> 注意：ai@6 中 `UIMessage` 没有 `content` 字段，文本内容在 `parts[].text` 中。

#### 消息渲染

```typescript
// 从 parts 中提取文本
const getText = (msg) =>
  msg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("") ?? "";

// 渲染
{messages.map((msg) => {
  const text = getText(msg);
  const isUser = msg.role === "user";
  return (
    <div className={isUser ? "glass-dark" : "glass"}>
      {text}
    </div>
  );
})}
```

---

## UI 设计规范

### 响应式适配方案

采用 **rem + clamp()** 方案，所有尺寸基于根字号等比缩放：

```css
:root {
  /* 小屏 14px → 大屏 16px，线性插值 */
  font-size: clamp(14px, 1.6vw, 16px);
}
```

| 屏幕 | 根字号 | 1rem 对应 | 效果 |
|------|--------|----------|------|
| 375px (手机) | 14px | 14px | 整体缩小约 12.5% |
| 768px (平板) | ~15px | ~15px | 适中 |
| 1280px+ (桌面) | 16px | 16px | 标准大小 |

### 毛玻璃效果（Glassmorphism）

通过自定义 CSS 类实现，兼容 WebKit：

```css
.glass {
  background: rgba(255, 255, 255, 0.45);      /* 半透明白色 */
  backdrop-filter: blur(1rem);                 /* 毛玻璃模糊 */
  -webkit-backdrop-filter: blur(1rem);         /* Safari 兼容 */
  border: 1px solid rgba(255, 255, 255, 0.5); /* 微透明边框 */
}

.glass-dark {
  background: rgba(236, 72, 153, 0.75);       /* 半透明粉色 */
  backdrop-filter: blur(0.75rem);
  -webkit-backdrop-filter: blur(0.75rem);
}
```

### 配色方案

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景渐变 | `#fdf2f8 → #f472b6` | 淡粉到亮粉 135° 渐变 |
| AI 消息气泡 | `.glass` (白透) | 毛玻璃白底 |
| 用户消息气泡 | `.glass-dark` (粉透) | 毛玻璃粉底 |
| 主强调色 | `pink-500 (#ec4899)` | 按钮、图标 |
| 文字主色 | `pink-900 (#831843)` | 正文内容 |
| 文字辅色 | `pink-500/70` | 次级文字 |

---

## 常见问题

### Q: 为什么选智谱 GLM-4-Flash 而不是 OpenAI GPT？

- 智谱 API 国内可直接访问，无需科学上网
- GLM-4-Flash 响应速度快，中文能力强
- 完全兼容 OpenAI 接口，切换成本低
- 免费额度充足，适合开发调试

### Q: 如何切换到其他 OpenAI 兼容的模型？

修改 `route.ts` 中的 Provider 配置即可：

```typescript
// 切换到 OpenAI 官方
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
model: openai("gpt-4o-mini")

// 切换到 DeepSeek
const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});
model: deepseek("deepseek-chat")
```

### Q: ai@6 的 useChat 没有 input/handleInputChange 怎么办？

ai@6 移除了内置的 input 状态管理，需自行用 `useState` 管理：

```typescript
const [input, setInput] = useState("");
// ...
sendMessage({ text: input });
setInput("");
```

### Q: 修改 .env.local 后不生效？

需要重启开发服务器：

```bash
# Ctrl+C 停止后重新启动
npm run dev
```

### Q: 如何查看 API 调用日志？

查看终端中 Next.js dev server 的输出，每个请求会显示路由和状态码：

```
POST /api/chat 200 in 337ms    # 成功
POST /api/chat 500 in 120ms    # 失败，查看错误堆栈
```

---

## 后续规划

- [ ] 集成 Generative UI（AI 返回 React 组件而非纯文本）
- [ ] 添加 Tool Calling（查询豆瓣评分、获取剧照等）
- [ ] 对话历史持久化（localStorage / 数据库）
- [ ] 多轮对话上下文优化
- [ ] 移动端手势操作（下拉加载历史、滑动删除）
- [ ] 主题切换（浅色 / 深色 / 暖色调）

---

*本文档由 Claude Code 生成，最后更新：2026-04-08*
