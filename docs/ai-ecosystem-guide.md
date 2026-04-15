# AI 生态全景 — 核心概念深度解析

---

## 目录

- [一、大语言模型（LLM）基础](#一大语言模型llm基础)
- [二、Agent 智能体](#二agent-智能体)
- [三、MCP 协议（Model Context Protocol）](#三mcp-协议model-context-protocol)
- [四、RAG 检索增强生成](#四rag-检索增强生成)
- [五、Harness Engineering](#五harness-engineering)
- [六、Skills / Tool Use](#六skills--tool-use)
- [七、Prompt Engineering](#七prompt-engineering)
- [八、向量数据库与 Embedding](#八向量数据库与-embedding)
- [九、AI 应用架构总览](#九ai-应用架构总览)
- [十、术语速查表](#十术语速查表)

---

## 一、大语言模型（LLM）基础

### 什么是 LLM？

```
LLM = Large Language Model（大语言模型）

本质：一个超大规模的 "下一个 token 预测器"

输入: "今天天气"
预测: "很好" (概率最高)
输出: "今天天气很好"

训练过程:
  互联网海量文本 → Transformer 架构学习 → 模型学会语言规律
```

### 核心概念图解

```
┌─────────────────────────────────────────────────────┐
│                    LLM 工作流程                      │
│                                                      │
│  用户输入 (Prompt)                                    │
│       ↓                                              │
│  Tokenization (分词)                                  │
│  "你好世界" → [101, 2769, 1962, 6858]                 │
│       ↓                                              │
│  Embedding (向量化)                                   │
│  每个 token → 高维向量 (如 4096 维)                    │
│       ↓                                              │
│  Transformer 层 (注意力机制)                           │
│  ┌─────┐  ┌─────┐  ┌─────┐       ┌─────┐            │
│  │Layer│→ │Layer│→ │Layer│→ ... →│Layer│            │
│  │  1  │  │  2  │  │  3  │       │  N  │            │
│  └─────┘  └─────┘  └─────┘       └─────┘            │
│       ↓                                              │
│  输出概率分布 → 选择下一个 token                        │
│  "很" (85%) "非" (8%) "真" (3%) ...                   │
│       ↓                                              │
│  循环直到遇到 <EOS> 或达到长度上限                      │
└─────────────────────────────────────────────────────┘
```

### 主流模型对比

```
模型系列          厂商          特点                        API 方式
─────────────    ────────     ──────────────────          ──────────
GPT-4o / o1      OpenAI       综合能力强，多模态            REST API
Claude 4         Anthropic    长上下文(200K)，安全性高       Messages API
Gemini 2         Google       多模态原生，生态整合          Vertex AI
Llama 4          Meta         开源，可本地部署              自部署 / HuggingFace
Qwen 3           阿里         中文能力强，开源              DashScope API
DeepSeek V3      深度求索      性价比高，推理能力突出        REST API
```

### 关键参数

```
参数名              含义                           调参建议
──────────────     ──────────────                ──────────
temperature        随机性 (0~2)                   创作任务 0.7~1.0
                                                 代码/事实 0~0.3
top_p              核采样范围 (0~1)               和 temperature 二选一
max_tokens         最大输出长度                    根据任务设置
frequency_penalty  频率惩罚 (-2~2)                >0 减少重复
presence_penalty   存在惩罚 (-2~2)                >0 鼓励新话题
```

---

## 二、Agent 智能体

### 什么是 Agent？

```
普通 LLM 调用:
  用户 → LLM → 回答文字

Agent:
  用户 → LLM → 思考 → 调用工具 → 观察结果 → 再思考 → ... → 最终回答

核心区别：Agent 有 "行动能力"，能使用工具，能多步推理
```

### Agent 架构

```
┌──────────────────────────────────────────────────────┐
│                   Agent 系统架构                       │
│                                                       │
│  ┌─────────┐                                          │
│  │  用户    │                                          │
│  └────┬────┘                                          │
│       ↓                                               │
│  ┌──────────────────────────────────────────────┐     │
│  │            LLM (大脑 / 推理引擎)               │     │
│  │                                               │     │
│  │  System Prompt (角色 + 规则)                   │     │
│  │       ↓                                       │     │
│  │  思考链 (Chain of Thought):                    │     │
│  │    1. 分析用户意图                              │     │
│  │    2. 制定行动计划                              │     │
│  │    3. 选择工具执行                              │     │
│  │    4. 观察执行结果                              │     │
│  │    5. 决定是否继续或回答                         │     │
│  └──────────┬───────────────────────────────────┘     │
│             ↓ 调用                                    │
│  ┌──────────────────────────────────┐                 │
│  │          工具集 (Tools)            │                │
│  │                                   │                │
│  │  🌐 搜索引擎   📁 文件系统         │                │
│  │  🗄️ 数据库     🧮 代码执行         │                │
│  │  📧 发邮件     🗺️ 地图服务         │                │
│  │  🤖 调用其他Agent                  │                │
│  └──────────────────────────────────┘                 │
│                                                       │
│  ┌──────────────────────────────────┐                 │
│  │         记忆系统 (Memory)          │                │
│  │                                   │                │
│  │  短期记忆: 当前对话上下文           │                │
│  │  长期记忆: 向量数据库 / 文件        │                │
│  │  工作记忆: scratchpad / 思维缓冲    │                │
│  └──────────────────────────────────┘                 │
└──────────────────────────────────────────────────────┘
```

### Agent 的核心循环（ReAct 模式）

```
                    ┌──────────→
                    │           │
                    │    ┌──────┴──────┐
                    │    │  Thought    │  LLM 思考下一步
                    │    └──────┬──────┘
                    │           ↓
                    │    ┌──────┴──────┐
                    │    │   Action    │  选择工具并执行
                    │    └──────┬──────┘
                    │           ↓
                    │    ┌──────┴──────┐
                    │    │ Observation │  获取工具返回结果
                    │    └──────┬──────┘
                    │           │
                    │    结果是否充分？
                    │      ↓         ↓
                    │     否         是
                    └─────┘         ↓
                              ┌─────┴─────┐
                              │  Answer   │  返回最终答案
                              └───────────┘
```

### 多 Agent 协作模式

```
模式1: 主从模式 (Orchestrator)
┌──────────┐
│ 主 Agent  │ ← 负责任务分解和协调
└──┬───┬───┘
   ↓   ↓   ↓
  子A  子B  子C  ← 各司其职

模式2: 辩论模式 (Debate)
  Agent A ←→ Agent B ←→ Agent C
  互相质疑、验证，提高答案质量

模式3: 流水线模式 (Pipeline)
  Agent A → Agent B → Agent C
  每个处理一步，顺序传递

模式4: 层级模式 (Hierarchical)
       ┌── 管理Agent ──┐
       ↓               ↓
  ┌─小组Agent─┐   ┌─小组Agent─┐
  ↓    ↓     ↓   ↓    ↓     ↓
  工人 工人  工人 工人 工人  工人
```

### 主流 Agent 框架

```
框架              语言      特点                         适用场景
─────────────    ──────   ───────────────              ──────────
LangChain        Python   生态最全，组件丰富             通用 Agent 开发
LangGraph        Python   图状态机，复杂流程控制         多步骤工作流
AutoGen (AG2)    Python   多 Agent 对话协作             多 Agent 系统
CrewAI           Python   角色扮演式多 Agent            团队协作场景
Claude Agent SDK TS/Py    Anthropic 官方，Tool Use      Claude 生态集成
OpenAI Agents    Python   OpenAI 官方 Agent 框架        GPT 生态集成
Dify             低代码    可视化编排，API 即服务        快速搭建 AI 应用
Coze             低代码    字节出品，插件生态丰富        快速搭建 Bot
```

---

## 三、MCP 协议（Model Context Protocol）

### 什么是 MCP？

```
MCP = Model Context Protocol（模型上下文协议）
由 Anthropic 于 2024 年 11 月发布

解决的问题：
  每个 AI 应用接入外部工具都要写一套适配代码
  ↓
  MCP 定义统一标准，类似 USB 接口
  一次开发，所有支持 MCP 的客户端都能用
```

### 类比理解

```
传统方式（N×M 问题）:
  App A ──适配──→ 数据库
  App A ──适配──→ 文件系统
  App A ──适配──→ GitHub
  App B ──适配──→ 数据库    (重复开发)
  App B ──适配──→ 文件系统  (重复开发)

MCP 方式（N+M 问题）:
  App A ─┐                    ┌──→ MCP Server (数据库)
  App B ─┤── MCP 协议 ───────┤──→ MCP Server (文件系统)
  App C ─┘                    └──→ MCP Server (GitHub)

  每个 App 只需实现 MCP Client
  每个工具只需实现 MCP Server
```

### MCP 架构

```
┌────────────────────────────────────────────────────────────┐
│                     MCP 架构                                │
│                                                             │
│  ┌───────────────┐         ┌───────────────────────────┐   │
│  │   MCP Host    │         │       MCP Server          │   │
│  │  (宿主应用)    │         │      (工具服务端)          │   │
│  │               │         │                           │   │
│  │  Claude Code  │  stdio  │  提供 3 类能力:            │   │
│  │  Cursor       │←───────→│                           │   │
│  │  Zed          │  SSE    │  1. Tools (工具调用)       │   │
│  │  ...          │         │     搜索代码、执行命令      │   │
│  │               │         │                           │   │
│  │  ┌─────────┐  │         │  2. Resources (资源读取)   │   │
│  │  │MCP      │  │         │     读取文件、获取数据      │   │
│  │  │Client   │  │         │                           │   │
│  │  └─────────┘  │         │  3. Prompts (提示模板)     │   │
│  └───────────────┘         │     预定义的 Prompt 片段   │   │
│                             └───────────────────────────┘   │
│                                                             │
│  一个 Host 可以连接多个 Server:                               │
│                                                             │
│  Host                                                       │
│    ├── Client A ──→ Server A (GitHub)                       │
│    ├── Client B ──→ Server B (数据库)                       │
│    └── Client C ──→ Server C (文件系统)                     │
└────────────────────────────────────────────────────────────┘
```

### MCP 通信协议

```
传输方式:
  1. stdio (标准输入输出) — 本地进程，最常用
  2. SSE (Server-Sent Events) — 远程服务

消息格式 (JSON-RPC 2.0):

请求:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_code",
    "arguments": { "query": "useState" }
  }
}

响应:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      { "type": "text", "text": "找到 3 处 useState 使用..." }
    ]
  }
}
```

### 配置示例

```json
// ~/.claude/settings.json 中配置 MCP Server
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxx"
      }
    },
    "database": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "postgresql://localhost/mydb"
      }
    }
  }
}
```

### 如何开发自己的 MCP Server

```typescript
// 最简 MCP Server 示例 (TypeScript)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "my-tools", version: "1.0.0" });

// 注册一个工具
server.tool(
  "get_weather",                                    // 工具名
  "获取指定城市的天气",                               // 描述 (LLM 会读到)
  { city: z.string().describe("城市名") },           // 参数 Schema
  async ({ city }) => {                              // 执行函数
    const weather = await fetchWeather(city);
    return {
      content: [{ type: "text", text: `${city}: ${weather.temp}°C, ${weather.desc}` }]
    };
  }
);

// 注册一个资源
server.resource("config", "config://app", async () => ({
  contents: [{ uri: "config://app", text: JSON.stringify(appConfig) }]
}));

// 启动
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 四、RAG 检索增强生成

### 什么是 RAG？

```
RAG = Retrieval-Augmented Generation（检索增强生成）

问题: LLM 的知识有截止日期，且不了解私有数据
方案: 先检索相关信息，再让 LLM 基于检索结果回答

类比:
  普通LLM = 闭卷考试（只能靠记忆）
  RAG     = 开卷考试（可以查资料再回答）
```

### RAG 完整流程

```
┌─────────────────────────────────────────────────────────────┐
│                     RAG 完整流程                              │
│                                                              │
│  ── 离线索引阶段 (Indexing) ──────────────────────────────    │
│                                                              │
│  文档集合                分块                 向量化           │
│  ┌──────┐            ┌────────┐          ┌────────┐         │
│  │PDF   │            │chunk 1 │          │[0.1,   │         │
│  │Word  │──→ 解析 ──→│chunk 2 │──→Embed──→│ 0.3,   │──→ 入库 │
│  │HTML  │            │chunk 3 │          │ 0.7...] │         │
│  │代码   │            │...     │          │        │         │
│  └──────┘            └────────┘          └────────┘         │
│                                                ↓             │
│                                          向量数据库           │
│                                          (Milvus/Pinecone)   │
│                                                              │
│  ── 在线查询阶段 (Query) ────────────────────────────────    │
│                                                              │
│  用户问题                                                     │
│  "React Fiber 是什么?"                                       │
│       ↓                                                      │
│  Embedding (向量化问题)                                       │
│       ↓                                                      │
│  向量相似度搜索 (Top-K)                                       │
│       ↓                                                      │
│  检索到: [chunk_12, chunk_45, chunk_78]                       │
│       ↓                                                      │
│  构建 Prompt:                                                │
│  ┌──────────────────────────────────────────┐               │
│  │ System: 根据以下参考资料回答问题            │               │
│  │                                          │               │
│  │ 参考资料:                                 │               │
│  │ [chunk_12] Fiber 是 React 16 的新架构...  │               │
│  │ [chunk_45] Fiber 使用链表结构...          │               │
│  │ [chunk_78] 双缓冲机制...                  │               │
│  │                                          │               │
│  │ 用户问题: React Fiber 是什么?             │               │
│  └──────────────────────────────────────────┘               │
│       ↓                                                      │
│  LLM 生成回答 (基于检索到的上下文)                              │
│       ↓                                                      │
│  "Fiber 是 React 16 引入的新协调引擎..."                      │
└─────────────────────────────────────────────────────────────┘
```

### 分块策略（Chunking）

```
策略             方法                      适用场景
───────────     ────────────              ──────────
固定大小         每 500 tokens 一块         通用
按段落           按换行/标题分割             结构化文档
语义分块         用 Embedding 相似度切分     高质量需求
递归分块         按层级分隔符递归切分        代码/Markdown
重叠分块         块之间重叠 50~100 tokens   防止上下文断裂

推荐: 代码文件 → 递归分块 (LangChain 的 RecursiveCharacterTextSplitter)
      文档   → 按 Markdown 标题 + 固定大小
```

### 高级 RAG 优化

```
┌──────────────────────────────────────────────────────────┐
│                  高级 RAG 优化技术                         │
│                                                           │
│  1. 查询优化                                              │
│     ├─ 查询改写 (Query Rewriting)                         │
│     ├─ 查询扩展 (Query Expansion) — 生成多个相关查询       │
│     └─ HyDE — 先让 LLM 生成假设性回答，再用它去检索        │
│                                                           │
│  2. 检索优化                                              │
│     ├─ 混合检索 (向量 + 关键词 BM25)                      │
│     ├─ 重排序 (Reranker) — 对检索结果二次排序              │
│     └─ 父子文档 (Parent-Child) — 检索小块，返回大块       │
│                                                           │
│  3. 生成优化                                              │
│     ├─ 引用溯源 — 标注回答来自哪个文档                     │
│     ├─ 自我评估 — 让 LLM 检查回答是否有依据               │
│     └─ 幻觉检测 — 验证回答是否忠实于检索内容               │
│                                                           │
│  4. 索引优化                                              │
│     ├─ 知识图谱 RAG (GraphRAG)                            │
│     ├─ 多级索引 (摘要索引 + 细节索引)                     │
│     └─ 增量索引 (只索引新增/修改的文档)                    │
└──────────────────────────────────────────────────────────┘
```

---

## 五、Harness Engineering

### 什么是 Harness Engineering？

```
Harness Engineering（工具工程/脚手架工程）
指为 AI Agent 构建可靠执行环境、工具链和安全约束的工程实践

核心思想：
  Agent 的能力上限 = 模型能力 × 工具质量 × 安全护栏

类比：
  LLM   = 大脑
  Tools = 双手
  Harness = 手套、安全绳、工作台 — 让"双手"安全高效地工作
```

### Harness 的核心组成

```
┌──────────────────────────────────────────────────────┐
│              Harness 工程全景                          │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │            安全边界 (Guardrails)                │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ 输入过滤  │  │ 输出审查  │  │ 权限控制  │     │  │
│  │  │ 恶意指令  │  │ 敏感信息  │  │ 文件读写  │     │  │
│  │  │ 注入检测  │  │ 合规检查  │  │ 网络访问  │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │            执行环境 (Runtime)                   │  │
│  │                                                │  │
│  │  Sandbox (沙箱)     代码执行隔离环境             │  │
│  │  Worktree (工作树)  Git 隔离的工作空间           │  │
│  │  Container (容器)   Docker 隔离的运行环境        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │            工具链 (Toolchain)                   │  │
│  │                                                │  │
│  │  文件操作 (Read/Write/Edit)                     │  │
│  │  命令执行 (Bash)                                │  │
│  │  搜索工具 (Grep/Glob)                          │  │
│  │  代码分析 (AST/LSP)                            │  │
│  │  浏览器操作 (Playwright)                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │            观测性 (Observability)               │  │
│  │                                                │  │
│  │  日志记录    每次 Tool 调用的 input/output       │  │
│  │  审计追踪    Agent 的决策路径                    │  │
│  │  成本监控    Token 消耗统计                      │  │
│  │  质量指标    准确率、幻觉率、完成率               │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Claude Code 中的 Harness 实例

```
Claude Code 的 Harness 设计:

  安全层:
    ├── 沙箱模式 (sandbox) — 限制文件系统和命令权限
    ├── 用户确认机制 — 危险操作前必须用户批准
    │     rm, git push, 发送消息 → 需要 explicit approval
    └── Hook 系统 — 用户可自定义安全检查脚本
          pre-tool-use, post-tool-use 等

  工具层:
    ├── Read / Write / Edit    文件操作
    ├── Bash                   命令执行
    ├── Glob / Grep            搜索
    └── Agent                  子任务委派

  环境层:
    ├── Worktree (git worktree) — 隔离的工作空间
    └── 权限模式 (auto-accept / plan / manual)

  观测层:
    ├── 对话历史 (完整的 tool 调用链)
    └── Hook 反馈 (自定义检查结果)
```

---

## 六、Skills / Tool Use

### 什么是 Tool Use（函数调用）？

```
Tool Use = 让 LLM 能够调用外部工具（函数/API）

本质:
  LLM 输出的不是纯文本，而是结构化的 "工具调用请求"
  应用层解析后执行对应函数，将结果返回给 LLM

类比：
  LLM 就像一个只会说话的经理
  Tool Use 就是给经理配了电话，可以叫人做事
```

### Tool Use 流程图解

```
┌────────┐      ┌─────────┐      ┌──────────────┐
│  用户   │      │   LLM   │      │   工具函数    │
└───┬────┘      └────┬────┘      └──────┬───────┘
    │                │                   │
    │  "北京天气?"    │                   │
    │──────────────→│                   │
    │                │                   │
    │                │ 我需要调用天气工具   │
    │                │ { name: "get_weather"
    │                │   args: {city: "北京"} }
    │                │──────────────────→│
    │                │                   │
    │                │          执行 API 调用
    │                │                   │
    │                │  { temp: 22°C,    │
    │                │    desc: "晴" }    │
    │                │←──────────────────│
    │                │                   │
    │                │ 综合结果生成回答    │
    │  "北京今天22°C" │                   │
    │←──────────────│                   │
```

### Function Calling 定义格式

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_code",
        "description": "在代码库中搜索指定关键词",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "搜索关键词"
            },
            "file_type": {
              "type": "string",
              "enum": ["js", "ts", "py", "all"],
              "description": "文件类型过滤"
            }
          },
          "required": ["query"]
        }
      }
    }
  ]
}
```

### Skills（技能系统）

```
Skills = 预定义的 Tool + Prompt 组合，封装成可复用的能力单元

类比:
  Tool  = 一把锤子（单一工具）
  Skill = 木工技能（知道何时用锤子、怎么用、用什么姿势）

Skill 的组成:
  ┌─────────────────────────────┐
  │  Skill                      │
  │                             │
  │  触发条件 (trigger)          │
  │    用户说 "/commit"          │
  │                             │
  │  Prompt 模板 (prompt)        │
  │    分析变更、生成提交信息     │
  │                             │
  │  工具列表 (tools)            │
  │    git status, git diff     │
  │                             │
  │  执行流程 (workflow)         │
  │    1. 获取 diff              │
  │    2. 生成 message           │
  │    3. 执行 commit            │
  └─────────────────────────────┘

Claude Code 中的 Skills 示例:
  /commit    → 分析 git diff，生成提交信息
  /review-pr → 审查 PR 代码质量
  /simplify  → 审查代码并优化
  /loop      → 定时循环执行任务
```

---

## 七、Prompt Engineering

### 核心 Prompt 技术

```
技术                  说明                        示例
──────────────       ──────────────              ──────────
Zero-shot            直接提问，不给示例            "翻译这段话"
Few-shot             给几个示例再提问              "例子1...例子2...现在翻译"
CoT (链式思考)       让模型分步推理               "请一步一步思考"
System Prompt        设定角色和规则               "你是一个资深前端工程师"
Self-Ask             模型自问自答分解问题          "我需要先知道..."
ReAct                推理+行动交替                 Thought→Action→Observation
Meta Prompting       用 Prompt 生成 Prompt         "帮我写一个Prompt用于..."
```

### Prompt 模板最佳实践

```
结构化 Prompt 模板:

  ┌─────────────────────────────────────────┐
  │  # Role (角色)                           │
  │  你是一个 {role}，擅长 {skill}            │
  │                                         │
  │  # Context (背景)                        │
  │  {背景信息}                               │
  │                                         │
  │  # Task (任务)                           │
  │  请完成以下任务: {task}                    │
  │                                         │
  │  # Constraints (约束)                    │
  │  - {约束1}                               │
  │  - {约束2}                               │
  │                                         │
  │  # Format (输出格式)                     │
  │  请按以下格式输出:                         │
  │  {format}                               │
  │                                         │
  │  # Examples (示例)                       │
  │  输入: {example_input}                   │
  │  输出: {example_output}                  │
  └─────────────────────────────────────────┘
```

---

## 八、向量数据库与 Embedding

### Embedding 原理

```
Embedding = 将文本转换为固定长度的数值向量

"React 是一个前端框架" → [0.12, -0.34, 0.56, ..., 0.78]  (如 1536 维)
"Vue 是一个前端框架"   → [0.11, -0.32, 0.55, ..., 0.76]  (语义相近，向量相近)
"今天中午吃火锅"       → [0.87, 0.21, -0.45, ..., 0.03]  (语义不同，向量差异大)

相似度计算:
  cosine_similarity(A, B) = (A · B) / (|A| × |B|)
  值域: [-1, 1]，越大越相似
```

### 主流向量化模型

```
模型                      维度    特点                     提供方
─────────────────        ─────   ────────────            ──────────
text-embedding-3-small   1536    性价比高                 OpenAI
text-embedding-3-large   3072    精度最高                 OpenAI
BGE-M3                   1024    多语言，开源              BAAI
Cohere Embed v3          1024    多语言，搜索优化          Cohere
voyage-3                 1024    代码和文档都好            Voyage AI
```

### 主流向量数据库对比

```
数据库         类型      特点                        适用场景
──────────    ──────    ──────────────              ──────────
Pinecone      云托管    全托管，零运维                快速上线
Weaviate      开源      混合搜索(向量+关键词)         通用
Milvus        开源      高性能，可水平扩展            大规模生产
Qdrant        开源      Rust 写的，性能好             性能敏感
Chroma        开源      Python 友好，轻量             原型开发
pgvector      扩展      PostgreSQL 扩展              已有 PG 的项目
LanceDB       开源      Serverless，向量优先          嵌入式场景
```

---

## 九、AI 应用架构总览

### 典型 AI 应用技术栈

```
┌─────────────────────────────────────────────────────────┐
│                  AI 应用技术栈                            │
│                                                          │
│  ┌─── 前端层 ─────────────────────────────────────────┐ │
│  │  Chat UI  │  流式渲染(SSE)  │  Markdown  │ 代码高亮 │ │
│  │  React/Vue/Next.js                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↕ REST/WebSocket/SSE              │
│  ┌─── API 层 ─────────────────────────────────────────┐ │
│  │  认证鉴权  │  限流  │  日志  │  流式代理             │ │
│  │  Next.js API Routes / Express / FastAPI            │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↕                                 │
│  ┌─── 编排层 ─────────────────────────────────────────┐ │
│  │  Agent 编排  │  Tool 调用  │  Prompt 管理           │ │
│  │  LangChain / Vercel AI SDK / 自研                   │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↕                                 │
│  ┌─── 模型层 ─────────────────────────────────────────┐ │
│  │  OpenAI API  │  Claude API  │  本地模型             │ │
│  │  文本生成    │  Embedding   │  多模态               │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↕                                 │
│  ┌─── 数据层 ─────────────────────────────────────────┐ │
│  │  向量数据库    │  关系数据库   │  对象存储            │ │
│  │  Pinecone     │  PostgreSQL  │  S3                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 前端流式渲染架构

```
SSE (Server-Sent Events) 流式传输:

  ┌────────┐         ┌──────────┐         ┌──────────┐
  │  LLM   │   SSE   │   后端    │   SSE   │   前端    │
  │  API   │────────→│   代理    │────────→│   渲染    │
  └────────┘         └──────────┘         └──────────┘

  LLM 返回 (chunk by chunk):
    data: {"content": "React"}
    data: {"content": " 是"}
    data: {"content": " 一个"}
    data: {"content": " 前端"}
    data: {"content": " 框架"}
    data: [DONE]

  前端逐步渲染:
    R
    Re
    Rea
    Reac
    React
    React 是
    React 是 一个
    React 是 一个 前端
    React 是 一个 前端 框架
```

---

## 十、术语速查表

| 术语 | 全称 | 一句话解释 |
|------|------|-----------|
| LLM | Large Language Model | 大语言模型，能理解和生成文本 |
| GPT | Generative Pre-trained Transformer | OpenAI 的模型系列 |
| Agent | Autonomous Agent | 能使用工具、多步推理的 AI |
| MCP | Model Context Protocol | AI 连接外部工具的统一协议 |
| RAG | Retrieval-Augmented Generation | 检索+生成，让 LLM 基于外部知识回答 |
| Tool Use | Function Calling | LLM 调用外部函数的能力 |
| Embedding | Vector Embedding | 将文本转为数值向量 |
| Token | — | LLM 处理文本的最小单位（约 0.75 个英文单词） |
| CoT | Chain of Thought | 链式思考，分步推理 |
| Few-shot | — | 给少量示例引导模型输出 |
| Fine-tuning | — | 在特定数据上继续训练模型 |
| Hallucination | — | 幻觉，模型生成看起来合理但错误的内容 |
| Context Window | — | 上下文窗口，模型一次能处理的最大 token 数 |
| Temperature | — | 采样随机性参数 |
| Top-p | — | 核采样，控制候选 token 范围 |
| System Prompt | — | 系统提示词，定义模型角色和行为规则 |
| Vector DB | Vector Database | 专门存储和检索向量的数据库 |
| Semantic Search | — | 语义搜索，基于含义而非关键词匹配 |
| Chunking | — | 将长文档切分成小块用于索引 |
| Reranker | — | 对初步检索结果重新排序的模型 |
| Knowledge Graph | — | 知识图谱，实体和关系的结构化表示 |
| Multi-modal | — | 多模态，能处理文本+图片+音频等 |
| LoRA | Low-Rank Adaptation | 低秩适配，高效的微调方法 |
| SFT | Supervised Fine-Tuning | 监督微调 |
| RLHF | Reinforcement Learning from Human Feedback | 基于人类反馈的强化学习 |
| Harness | — | Agent 的安全执行环境和工具链基础设施 |
| Skill | — | 封装了 Prompt + Tool 的可复用能力单元 |
| Hook | — | 在特定事件前后触发的自定义脚本 |
| Sandbox | — | 沙箱，隔离的安全执行环境 |
| Worktree | — | Git 工作树，用于隔离修改的并行工作空间 |
