# MCP (Model Context Protocol) 实现指南

## 一、核心概念

### MCP 是什么

MCP（Model Context Protocol）是 Anthropic 推出的开放协议，用于标准化 AI 模型与外部工具/数据源的交互方式。

可以理解为 **"AI 的 USB-C 接口"**——不管什么工具，只要符合 MCP 协议，模型就能直接调用。

### MCP 与 Tool Calling 的关系

```
MCP 协议（标准化工具发现 + 调用）
    └── 底层依赖：Tool Calling（模型能决定调什么工具）
        └── 底层依赖：GLM-4 / GPT-4 / Claude 模型本身
```

- **Tool Calling**：模型的能力——能理解"什么时候该调工具"
- **MCP**：工具管理的协议——怎么发现工具、怎么调用工具、怎么返回结果

### 两种实现路径对比

| | 直接 Tool Calling | 通过 MCP |
|---|---|---|
| **工具定义** | 写死在代码里 | 运行时动态发现 |
| **加新工具** | 改代码、重新部署 | 只改 MCP Server，不用动主应用 |
| **工具共享** | 每个应用各写一套 | 一个 MCP Server 给多个应用用 |
| **适合场景** | 工具少、固定的项目 | 工具多、需要灵活扩展的场景 |
| **本项目的选择** | 完全够用 | 如果未来要接很多工具可以考虑 |

## 二、MCP 架构

```
┌──────────────┐   MCP协议    ┌──────────────┐
│  MCP Client  │ ◄──────────► │  MCP Server  │
│  (你的应用)   │   JSON-RPC   │  (工具提供方) │
└──────────────┘              └──────────────┘
       │                             │
       │ 调用 GLM 模型                │ 提供具体工具
       ▼                             ▼
    智谱 API              搜索 / 数据库 / 文件 / API...
```

三个核心角色：

- **MCP Server**：暴露工具、资源、提示词模板
- **MCP Client**：连接 MCP Server，发现并调用工具
- **Host（宿主应用）**：整合 Client + LLM，协调整个流程

## 三、MCP 实现步骤

### 第 1 步：安装依赖

```bash
npm install @modelcontextprotocol/sdk zod
```

### 第 2 步：编写 MCP Server

```typescript
// mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "drama-tools",
  version: "1.0.0",
});

// 注册工具：搜索甜宠剧
server.tool(
  "searchDramas",
  "根据关键词搜索甜宠剧",
  { keyword: z.string().describe("搜索关键词") },
  async ({ keyword }) => {
    const results = await searchDramas(keyword);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  }
);

// 注册工具：获取排行榜
server.tool(
  "getTrending",
  "获取当前热门甜宠剧排行",
  { limit: z.number().optional().describe("返回数量，默认10") },
  async ({ limit = 10 }) => {
    const results = await getTrending(limit);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }],
    };
  }
);

// 注册工具：获取天气
server.tool(
  "getWeather",
  "获取指定城市的天气信息",
  { city: z.string().describe("城市名") },
  async ({ city }) => {
    const weather = await fetchWeather(city);
    return {
      content: [{ type: "text", text: JSON.stringify(weather) }],
    };
  }
);

// 启动 Server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### 第 3 步：MCP Client 发现并调用工具

```typescript
// mcp-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({
  name: "my-app",
  version: "1.0.0",
});

// 连接到 MCP Server
const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-server.ts"],
});
await client.connect(transport);

// 动态获取所有可用工具
const { tools } = await client.listTools();
// 返回示例:
// [
//   { name: "searchDramas", description: "根据关键词搜索甜宠剧", inputSchema: {...} },
//   { name: "getTrending", description: "获取当前热门甜宠剧排行", inputSchema: {...} },
//   { name: "getWeather", description: "获取指定城市的天气信息", inputSchema: {...} },
// ]
```

### 第 4 步：将 MCP 工具桥接到 Vercel AI SDK

```typescript
// bridge.ts — 把 MCP 工具转成 AI SDK 能用的格式
import { tool } from "ai";

function convertMcpToolsToAiSdk(mcpTools, mcpClient) {
  const aiTools = {};

  for (const mcpTool of mcpTools) {
    aiTools[mcpTool.name] = tool({
      description: mcpTool.description,
      parameters: z.object(
        // 将 MCP 的 inputSchema 转成 Zod schema
        convertSchemaToZod(mcpTool.inputSchema)
      ),
      execute: async (args) => {
        // 调用 MCP Server 执行工具
        const result = await mcpClient.callTool({
          name: mcpTool.name,
          arguments: args,
        });
        return result;
      },
    });
  }

  return aiTools;
}
```

### 第 5 步：整合到 API Route

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { zhipu } from "@/lib/zhipu";

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. 连接 MCP Server，动态获取工具
  const mcpClient = await connectMcpServer();
  const { tools: mcpTools } = await mcpClient.listTools();

  // 2. 转换为 AI SDK 格式（不再硬编码）
  const aiTools = convertMcpToolsToAiSdk(mcpTools, mcpClient);

  // 3. 传给 GLM 模型使用
  const result = streamText({
    model: zhipu("glm-4-flash"),
    tools: aiTools,  // ← 从 MCP Server 动态获取，不再硬编码
    messages,
    maxSteps: 5,     // 允许多轮工具调用
  });

  return result.toDataStreamResponse();
}
```

## 四、本项目当前实现 vs MCP 实现

### 当前（直接 Tool Calling）

```
tools 硬编码在 route.ts 中：
├── analyzeMood    → 情绪分析
├── searchDramas   → 搜索甜宠剧
├── getRating      → 查评分
├── getTrending    → 排行榜
└── renderDramaCard → 渲染推荐卡
```

工具和业务逻辑耦合在一起，加新工具需要改代码重新部署。

### 如果改成 MCP

```
MCP Server A（甜宠剧工具）:
├── searchDramas   → 搜索甜宠剧
├── getRating      → 查评分
└── getTrending    → 排行榜

MCP Server B（通用工具）:
├── analyzeMood    → 情绪分析
├── getWeather     → 天气查询
└── webSearch      → 网络搜索

主应用只需连接 MCP Client，工具自动发现
```

加新工具只需在对应 MCP Server 中添加，主应用无需改动。

## 五、MCP 的传输方式

| 方式 | 用途 | 说明 |
|---|---|---|
| **Stdio** | 本地进程通信 | Server 作为子进程启动，通过 stdin/stdout 通信 |
| **SSE (HTTP)** | 远程服务 | 通过 HTTP + Server-Sent Events 通信，支持远程部署 |

```typescript
// Stdio 方式（本地开发常用）
const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-server.ts"],
});

// SSE 方式（远程部署）
const transport = new SSEClientTransport(
  new URL("http://localhost:3001/mcp")
);
```

## 六、社区现成的 MCP Server

可以直接拿来用，不用自己写：

| MCP Server | 功能 |
|---|---|
| @modelcontextprotocol/server-filesystem | 读写本地文件 |
| @modelcontextprotocol/server-github | GitHub 操作（PR、Issue） |
| @modelcontextprotocol/server-postgres | PostgreSQL 数据库查询 |
| @modelcontextprotocol/server-brave-search | Brave 搜索引擎 |
| @modelcontextprotocol/server-puppeteer | 浏览器自动化 |

## 七、面试话术

- "MCP 本质上是 Tool Calling 的标准化协议层，解决的是工具的发现、复用和管理问题"
- "直接 Tool Calling 适合工具少且固定的场景；MCP 适合工具多、需要动态扩展、跨应用共享的场景"
- "MCP 的架构类似微服务——工具作为独立服务部署，应用作为客户端动态发现和调用"
- "我的项目用直接 Tool Calling 是因为工具数量有限且固定，如果工具多了会考虑迁移到 MCP"
