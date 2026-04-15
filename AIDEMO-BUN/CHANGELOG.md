# v0.3.0 — 智谱联网搜索：替代本地数据源

> 集成智谱 `web_search` 联网搜索，让 AI 能搜索最新上映的电视剧，不再依赖本地硬编码数据库。

---

## 核心变化

```
v0.2.0（本地数据）                   v0.3.0（联网搜索）
┌──────────────────────┐            ┌──────────────────────────────────┐
│ DRAMA_DB (27部剧)     │            │ 用户: "2025有什么新甜剧"           │
│ ↓                    │            │ ↓                                │
│ handleRecommend()    │     →      │ detectIntent → webSearch          │
│ ↓                    │            │ ↓                                │
│ filterDramas(本地)    │            │ searchWithZhipuStream()           │
│ ↓                    │            │ ↓                                │
│ DramaCard (固定数据)  │            │ 智谱 API + web_search 联网        │
│                      │            │ ↓                                │
│ 数据截止 2024 年      │            │ Markdown 实时流式返回最新数据       │
└──────────────────────┘            └──────────────────────────────────┘
```

## 新增功能

### 1. 联网搜索意图识别

自动检测以下意图关键词，触发联网搜索：

| 关键词 | 示例 |
|--------|------|
| 最新 / 新上 / 新出 | "最新上映的甜剧有哪些" |
| 最近 + 剧 | "最近有什么好看的甜剧" |
| 新剧 | "2025年有什么新剧" |
| 年份关键词 | "2025年好看的电视剧" |
| 刚出 / 今年 | "今年刚出的甜剧推荐" |

### 2. 智谱 web_search 联网搜索

通过直接调用智谱原生 API（绕过 AI SDK 封装），开启 `web_search` 工具：

```typescript
// src/lib/zhipu-search.ts 核心实现
tools: [{ type: "web_search", web_search: { enable: true, search_result: true } }]
```

**SSE 流转换**：将智谱原生 SSE 格式转换为 Vercel AI SDK 的 UI Message Stream 格式，前端无需任何修改即可接收联网搜索结果。

### 3. 本地数据 → 联网搜索降级策略

| 场景 | 策略 |
|------|------|
| 用户明确要求最新/新剧 | 直接走联网搜索（`handleWebSearch`） |
| 搜索特定类型，本地有结果 | 显示本地结果卡片 |
| 搜索特定类型，本地无结果 | 降级到联网搜索 |
| 查询具体剧名，本地有数据 | 显示本地详细评分 |
| 查询具体剧名，本地无数据 | 联网搜索该剧信息 |
| 热播榜单 | 联网搜索最新榜单 + 本地经典补充 |
| 甜剧推荐（心情） | 保持原有本地推荐逻辑 |

### 4. 搜索引用来源

联网搜索结果自动包含 `source-url` 类型的引用信息，前端可展示来源链接。

## 新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/zhipu-search.ts` | **新建** | 智谱原生 API 调用 + SSE 流转换 |
| `src/app/api/chat/route.ts` | **修改** | 新增 `webSearch` 意图 + `handleWebSearch()` + 降级逻辑 |
| `src/lib/constants.ts` | **修改** | 新增 `tool-webSearch` 标签 |
| `CHANGELOG.md` | **修改** | 本文档 |

## 技术细节

### 为什么绕过 AI SDK？

`@ai-sdk/openai` 的 `createOpenAI` 封装不支持智谱特有的 `web_search` 工具参数。通过 `providerOptions` 透传的方式在某些版本中不可靠。直接调用智谱原生 API 更可控。

### SSE 流格式转换

```
智谱原生 SSE:                    AI SDK UI Message Stream:
data: {"choices":[{              data: {"type":"text-start","id":"xxx"}
  "delta":{"content":"你好"}     data: {"type":"text-delta","id":"xxx","delta":"你好"}
}]}                              data: {"type":"text-end","id":"xxx"}
```

使用 `createUIMessageStream` + `createUIMessageStreamResponse` 从 `ai` 包直接构建合规的流式响应。

### 与本地数据的关系

本地 `DRAMA_DB` 仍然保留，作为：
- 心情推荐的快速响应数据源
- 联网搜索不可用时的降级方案
- 经典甜剧的准确参考数据

---

# v0.2.0 — 阶段二更新：多会话 · 多模态 · Chat UI 组件化

> 基于 `docs/frontend-ai-learning-plan.md` 阶段二要求，在原有甜剧推荐功能基础上集成四大核心能力。

---

## 更新概览

```
v0.1.0（阶段一）                v0.2.0（阶段二）
┌───────────────────┐          ┌──────────────────────────────────────────┐
│                   │          │ ┌─Sidebar──┐  ┌──ChatArea────────────┐  │
│  单会话 Chat       │    →     │ │ 搜索对话  │  │ Header               │  │
│  纯文本消息        │          │ │ ────────  │  │ MessageList          │  │
│  无持久化          │          │ │ 对话1     │  │  └ MarkdownRenderer │  │
│  无文件上传        │          │ │ 对话2     │  │  └ CodeBlock + Copy │  │
│                   │          │ │ 对话3     │  │  └ ToolCallDisplay  │  │
│  page.tsx (370行)  │          │ │ ────────  │  │ ChatInput            │  │
│                   │          │ │ + 新建对话 │  │  └ 图片上传 + 拖拽  │  │
│                   │          │ │           │  │  └ Stop / Send      │  │
│                   │          │ └──────────┘  └──────────────────────┘  │
└───────────────────┘          └──────────────────────────────────────────┘
```

---

## 一、新增功能

### 1. 多会话管理（Multi-Session）

| 功能 | 说明 |
|------|------|
| 创建新对话 | 点击侧边栏「+ 新建对话」按钮 |
| 切换会话 | 点击侧边栏中的对话条目 |
| 删除会话 | 悬停对话条目，点击删除按钮 |
| 搜索对话 | 侧边栏顶部搜索框，按标题模糊匹配 |
| 会话持久化 | 所有会话和消息存储在 localStorage，刷新不丢失 |
| 自动命名 | 首条用户消息自动截取前 30 字符作为会话标题 |
| 更新时间 | 每次发送消息自动更新会话排序时间 |

**localStorage 存储结构：**

```
aidemo-bun-sessions          → { sessions: SessionMeta[], activeSessionId: string }
aidemo-bun-msgs-{sessionId}  → 序列化的 UIMessage[]
```

每个会话的消息独立存储，避免单一 key 过大。

### 2. 多轮对话上下文（Multi-Turn Context）

- 每个会话拥有独立的 `useChat` 实例（通过 `id` 参数区分）
- 切换会话时通过 React `key` 强制重新挂载，确保干净的聊天状态
- 消息历史随会话持久化，切换后自动恢复上下文

### 3. 多模态支持（Multimodal）

| 功能 | 说明 |
|------|------|
| 图片上传 | 点击输入框左侧图片按钮，选择图片文件 |
| 拖拽上传 | 将图片文件直接拖入输入框区域 |
| 图片预览 | 发送前在输入框上方显示缩略图，可单独删除 |
| 消息内展示 | 用户发送的图片在聊天气泡中以内嵌形式展示 |
| API 透传 | 图片以 FileUIPart 格式通过 Vercel AI SDK 发送到后端 |

**文件上传流程：**

```
用户选择/拖入图片
  → FileReader.readAsDataURL() 转为 base64
  → 存入 pendingFiles 状态
  → sendMessage({ text, files }) 发送
  → SDK 自动转为 FileUIPart 格式
  → API route 提取并处理
```

### 4. Chat UI 组件化

| 组件 | 功能 |
|------|------|
| **MarkdownRenderer** | AI 回复中的 Markdown 实时渲染（标题、列表、表格、引用等） |
| **CodeBlock** | 代码块语法高亮（PrismAsyncLight）+ 一键复制按钮 |
| **Stop 按钮** | 流式生成中显示停止按钮，调用 `AbortController` 中断请求 |
| **Regenerate 按钮** | 最后一条 AI 消息下方显示重新生成按钮 |
| **响应式侧边栏** | 桌面端固定显示，移动端抽屉式弹出 + 背景遮罩 |

---

## 二、技术架构

### 项目结构（新增/修改的文件）

```
src/
├── app/
│   ├── page.tsx                          [重构] 从 370 行精简为 ~33 行外壳
│   ├── api/chat/route.ts                [修改] 新增 FileUIPart 图片处理
│   └── globals.css                       [修改] 新增侧边栏/markdown/拖拽样式
│
├── lib/
│   ├── types.ts                          [新增] 共享类型定义
│   ├── constants.ts                      [新增] WELCOME / TAG_COLORS / TOOL_LABELS
│   └── storage.ts                        [新增] localStorage 读写工具函数
│
├── hooks/
│   ├── useSessionManager.ts              [新增] 会话 CRUD + 搜索过滤
│   ├── usePersistedChat.ts               [新增] useChat + localStorage 持久化封装
│   ├── useAutoScroll.ts                  [新增] 流式渲染自动滚动
│   └── useFileUpload.ts                  [新增] 文件选择/拖拽/base64 转换
│
├── components/
│   ├── providers/
│   │   └── SessionProvider.tsx           [新增] React Context 提供全局会话状态
│   ├── sidebar/
│   │   ├── Sidebar.tsx                   [新增] 左侧边栏容器（搜索 + 列表 + 新建）
│   │   └── SessionItem.tsx               [新增] 单个会话条目
│   └── chat/
│       ├── ChatArea.tsx                  [新增] 主聊天面板
│       ├── MessageList.tsx               [新增] 消息滚动列表
│       ├── MessageBubble.tsx             [新增] 单条消息渲染
│       ├── MarkdownRenderer.tsx          [新增] react-markdown + remark-gfm
│       ├── CodeBlock.tsx                 [新增] 代码高亮 + 复制按钮
│       ├── ChatInput.tsx                 [新增] 输入框 + 文件上传 + 发送/停止
│       └── FilePreview.tsx               [新增] 待发送图片预览条
│
└── server/
    └── index.ts                          [修改] 修复 lint 警告
```

### 组件层级关系

```
page.tsx
  └─ SessionProvider (React Context)
       ├─ Sidebar
       │    ├─ SessionSearch（搜索框）
       │    └─ SessionList
       │         └─ SessionItem × N（会话条目）
       │
       └─ ChatArea [key={sessionId}]
            ├─ Header（标题 + 侧边栏开关）
            ├─ MessageList
            │    └─ MessageBubble × N
            │         ├─ 文本 → MarkdownRenderer → CodeBlock
            │         ├─ 文件 → <img> 图片预览
            │         └─ 工具 → ToolCallDisplay → DramaCard / TrendingCard / SearchResultsCard
            └─ ChatInput
                 ├─ FilePreview（图片缩略图）
                 ├─ textarea（自动高度）
                 ├─ 图片上传按钮 + hidden file input
                 └─ Send / Stop 按钮
```

### 数据流

```
SessionProvider (Context)
  ├─ sessions: SessionMeta[]          ← localStorage
  ├─ activeSessionId: string
  ├─ createSession() → UUID
  ├─ switchSession(id)
  ├─ deleteSession(id)
  └─ renameSession(id, title)
       │
       └─ ChatArea
            └─ usePersistedChat(sessionId)
                 ├─ useChat({ id, messages })
                 ├─ status → 'ready' 时 → saveMessages()
                 └─ 首条消息 → renameSession() 自动标题
```

---

## 三、新增依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `react-markdown` | ^10.1.0 | AI 回复 Markdown 渲染 |
| `remark-gfm` | ^4.0.1 | GitHub 风格 Markdown（表格、删除线等） |
| `react-syntax-highlighter` | ^16.1.1 | 代码块语法高亮 |
| `@types/react-syntax-highlighter` | ^15.5.13 | TypeScript 类型定义 |

---

## 四、关键设计决策

### 1. React `key` 实现会话切换

切换会话时，`ChatArea` 组件使用 `key={sessionId}` 强制重新挂载。这比 `setMessages()` 更可靠，因为 `useChat` 内部维护了与 `id` 绑定的 `Chat` 实例，直接替换消息可能导致流式状态不一致。

### 2. localStorage 分 key 存储

每个会话的消息独立存储在 `aidemo-bun-msgs-{sessionId}` 中，避免单一 key 超出 localStorage 5MB 限制。删除会话时一条 `removeItem` 即可清理。

### 3. 图片 base64 内联

图片以 data URL 形式存储在消息中，无需额外的文件上传接口。适用于学习项目规模，生产环境建议改为服务端上传 + CDN。

### 4. 全量 Markdown 渲染

所有 AI 回复文本均通过 `MarkdownRenderer` 渲染。纯文本也能正确通过 Markdown 管线，同时为模型输出 Markdown 格式内容做好准备。

### 5. 代码高亮按需加载

使用 `PrismAsyncLight` + 手动注册语言（js/ts/python/json/css/bash/jsx/tsx），减小打包体积。

---

## 五、API Route 变更

`src/app/api/chat/route.ts` 新增：

```typescript
// 提取用户消息中的图片附件
const imageParts = (userMsg?.parts ?? [])
  .filter((p) => p.type === "file" && p.mediaType?.startsWith("image/"))
  .map((p) => ({ type: "image", image: p.url }));

// handleChat 函数签名变更
function handleChat(userText: string, imageParts?: { type: "image"; image: string }[])
```

当前 GLM-4-Flash 模型以文本方式提示用户发送了图片，后续可切换到 `glm-4v-flash` 实现真正的图片理解。

---

## 六、验证清单

| # | 测试项 | 预期结果 |
|---|--------|---------|
| 1 | `bun run dev` 启动 | 无报错，页面正常加载 |
| 2 | 创建 3 个会话并切换 | 消息独立，互不干扰 |
| 3 | 刷新页面 | 所有会话和消息从 localStorage 恢复 |
| 4 | 删除会话 | 从侧边栏和 localStorage 中移除 |
| 5 | 搜索会话 | 按标题模糊匹配过滤 |
| 6 | 发送带图片的消息 | 输入框上方显示预览，消息中展示图片 |
| 7 | 拖拽图片到输入框 | 触发上传，显示预览 |
| 8 | AI 回复含 Markdown | 正确渲染标题、列表、粗体等 |
| 9 | AI 回复含代码块 | 语法高亮 + 复制按钮可用 |
| 10 | 流式生成中点击停止 | 立即中断生成 |
| 11 | 点击重新生成 | 重新发送最后一条用户消息 |
| 12 | 移动端视口 | 侧边栏收起，点击汉堡菜单展开 |
| 13 | 原有甜剧推荐功能 | 推荐卡片、榜单、搜索结果正常显示 |

---

## 七、与学习计划的对应关系

| 阶段二学习项 | 对应实现 |
|-------------|---------|
| 2.1 SSE 流式传输原理 | 保留原有 streamText + useChat 流式架构，新增 Stop (AbortController) |
| 2.2 Chat UI 组件开发 | MessageBubble / MarkdownRenderer / CodeBlock / Stop / Regenerate |
| 2.3 多模态支持 | useFileUpload + FilePreview + 图片上传/拖拽/预览 |
| 2.4 对话管理 | SessionProvider + useSessionManager + localStorage 持久化 + 多会话切换 |
