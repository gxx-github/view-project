# netx.world 项目分析文档

## 一、项目概述

netx.world 是一个面向 Web3/AI 领域的综合平台，采用微前端架构，将主站展示模块与 AI Agent 模块解耦为独立微前端应用，通过自建 Feed Service 实现模块动态加载与热更新。项目涵盖前端微前端 Shell/Pilet 架构、Web3 钱包集成、AI Agent 实时对话、GraphQL API 等完整技术链路。

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 微前端框架 | Piral（Shell / Pilet 架构） |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Webpack 5 + piral-cli |
| UI 组件库 | Ant Design 5 |
| 样式方案 | Styled Components 6 |
| 状态管理 | Unistore + Redux（Piral Redux 集成） |
| 数据请求 | React Query（TanStack Query） |
| 路由 | React Router 5 |
| Web3 | ethers.js 6 + viem + wagmi + RainbowKit |
| 后端 | Node.js + Express 4 |
| 数据库 | PostgreSQL（pg-pool） |
| 缓存 | Redis |
| API 层 | GraphQL（Apollo Server 4）+ REST |
| 实时通信 | Socket.io |
| 代码编辑器 | CodeMirror |
| 进程管理 | PM2 |
| 容器化 | Docker + Docker Compose |
| 反向代理 | Nginx |
| CI/CD | Azure Pipelines |
| 包管理 | Yarn |

---

## 三、项目架构

```
netx/
├── website/                  ← Piral Shell 壳应用，加载所有 Pilet
│   ├── src/
│   │   ├── index.tsx         ← 主入口
│   │   ├── layout.ts         ← 全局布局
│   │   └── components/       ← 壳应用组件
│   ├── Dockerfile
│   ├── default.conf          ← Nginx 配置
│   └── webpack.config.js
│
├── netx-pliet-site/          ← 主站 Pilet（v1.2.7）
│   ├── src/
│   │   ├── Pages/            ← 页面：Home / Agent / Technology / Economy / Proposal / Exchange / AI Engineer
│   │   ├── components/       ← 业务组件
│   │   └── uilts/            ← 工具函数 & API 封装
│   └── webpack.config.js
│
├── netx-pliet-site-agent/    ← Agent Pilet（v1.1.0）
│   ├── src/
│   │   ├── Pages/            ← 页面：Explore / Create Agent / Quest / Exclusive
│   │   └── components/       ← Agent 专用组件
│   └── webpack.config.js
│
└── node-server/              ← 后端服务（piral-pilet-service v1.6.2）
    ├── src/
    │   ├── app.ts            ← Express 应用
    │   ├── endpoints/        ← REST API 路由
    │   ├── resolvers/        ← GraphQL Resolvers
    │   ├── db/               ← 数据库连接
    │   └── auth/             ← 认证模块
    ├── Dockerfile
    ├── docker-compose.yaml
    └── azure-pipelines.yml   ← CI/CD 配置
```

### 数据流

```
用户浏览器
    │
    ▼
  Nginx（反向代理 :8008）
    │
    ├── /           → website（Piral Shell）
    │                    │
    │                    ├── 动态加载 netx-pliet-site（主站模块）
    │                    ├── 动态加载 netx-pliet-site-agent（Agent 模块）
    │                    │
    │                    ▼
    │               node-server（:50023）── Pilet Feed Service
    │                    │                        │
    │                    ├── GraphQL API           ├── PostgreSQL
    │                    ├── REST API              └── Redis 缓存
    │                    └── Socket.io 实时通信
    │
    ├── /api        → 后端 API 服务（:50024）
    ├── /vote       → Vote API 服务（:20021）
    └── /agent      → Agent AI 服务（:18545-18546）
```

---

## 四、核心技能清单

### 前端

- React 18 函数式组件 + Hooks（useState / useEffect / useCallback / useMemo）
- TypeScript 类型系统（泛型、接口、类型守卫）
- Webpack 5 配置与构建优化（代码分割、Loader / Plugin 配置）
- 微前端架构设计（Piral Shell / Pilet 模式）
- React Router 路由管理
- Ant Design 组件库深度使用（Table / Form / Modal / Menu 等）
- Styled Components CSS-in-JS 方案
- React Query 数据请求与缓存管理
- Unistore / Redux 状态管理模式

### Web3 / 区块链

- 以太坊钱包集成（MetaMask 连接、签名登录）
- ethers.js 合约交互（合约调用、事件监听）
- viem + wagmi 链上操作封装
- RainbowKit 钱包连接 UI 组件
- 链上交易构建与状态追踪
- 多链 / 多账户状态管理

### 后端

- Node.js / Express RESTful API 设计
- GraphQL Schema 设计 + Apollo Server 4
- PostgreSQL 数据库设计与查询优化
- Redis 缓存策略
- Socket.io 实时双向通信
- JWT / API Key 认证方案
- 文件上传处理（Busboy）

### 工程化

- Docker 容器化 + Docker Compose 多服务编排
- Nginx 反向代理与负载均衡配置
- PM2 Node 进程管理与监控
- Azure Pipelines CI/CD 自动化
- Yarn 包管理与 Git Submodule 共享方案
- 多环境配置管理（dev / test / prod）

---

## 五、项目亮点

### 1. 微前端架构落地

基于 Piral 框架实现 Shell / Pilet 微前端方案。主站（netx-pliet-site）与 Agent 模块（netx-pliet-site-agent）作为独立 Pilet 开发部署，通过自建 Feed Service（node-server）动态加载，实现多团队并行开发与模块热更新，单模块更新不影响全局。

### 2. 全链路 Web3 集成

从钱包连接（RainbowKit）→ 链上交互（wagmi / viem）→ 签名认证 → 交易处理，构建完整的 Web3 DApp 体验。覆盖提案投票、代币交换等链上业务场景，钱包状态在 Shell 与所有 Pilet 之间实时同步。

### 3. AI Agent 平台

实现 Agent 创建、实时对话（Socket.io 流式输出）、任务系统（Quest）、代码编辑（CodeMirror），支持 Markdown + KaTeX 渲染的富文本交互，形成完整的 AI Agent 生态。

### 4. GraphQL + REST 混合 API

后端采用 Apollo Server + Express 双协议架构。Pilet 模块管理走 GraphQL（灵活查询、强类型 Schema），业务接口走 REST（简单高效），灵活适配不同场景需求。

### 5. 全栈 Docker 容器化部署

前端 Nginx 静态托管 + 反向代理，后端 Docker 容器化，Docker Compose 编排多服务（Node Server + Redis + PostgreSQL + 多个 AI/API 后端），Azure Pipelines 实现自动化构建与部署。

---

## 六、项目难点

### 1. 微前端状态共享与隔离

多个 Pilet 之间既要共享全局状态（用户登录信息、钱包地址），又要保持模块间的独立性与可替换性。通过 Piral 依赖注入机制 + Unistore / Redux 设计状态边界，Shell 维护全局状态，Pilet 通过 Piral API 订阅所需数据片段，避免模块间耦合。

### 2. Piral Feed Service 动态发布

自建 Pilet Feed Service 实现 Webpack 打包产物的版本管理。需要处理：版本兼容性校验、灰度发布策略、回滚机制。node-server 通过 PostgreSQL 存储版本元数据，Redis 缓存最新版本信息，API Key 鉴权保护发布流程安全。

### 3. Web3 钱包跨模块状态同步

钱包连接 / 断开、链切换、账户变更等事件需要在 Shell 和所有 Pilet 之间实时同步。方案：Shell 层统一监听 wagmi 钱包事件，通过 Piral 事件总线广播至所有 Pilet，Pilet 内部通过自定义 Hook 响应变化并触发 UI 更新。

### 4. AI Agent 实时流式交互

基于 Socket.io 实现大模型流式对话输出。难点包括：长连接稳定性保障（心跳 + 断线重连）、消息有序性（序列号 + 本地队列）、Markdown / KaTeX 实时渲染性能优化（虚拟滚动 + 增量渲染）、CodeMirror 代码编辑器与对话上下文的联动。

### 5. 多环境多服务协调

项目对接 Agent 服务、API 服务、Vote 服务、Trias Convert 等多个后端。Nginx 需配置多条反向代理规则，Docker Compose 需编排服务依赖和网络拓扑，环境变量需区分 dev / test / prod 三套配置。通过统一配置中心管理环境差异，保证各环境一致性。

---

## 七、简历参考写法

### 项目名称

netx.world — Web3 / AI 微前端平台

### 项目描述

基于 Piral 微前端架构的 Web3 + AI 综合平台。采用 Shell / Pilet 模式将主站与 AI Agent 模块解耦，实现独立开发与动态加载。集成以太坊钱包全链路交互，提供 AI Agent 创建、实时对话、任务系统等功能。后端采用 GraphQL + REST 混合 API，全栈 Docker 容器化部署。

### 技术栈

React 18 / TypeScript / Piral 微前端 / Webpack 5 / Ant Design / ethers.js / wagmi / viem / RainbowKit / Node.js / Express / GraphQL / Apollo Server / PostgreSQL / Redis / Socket.io / Docker / Nginx / Azure Pipelines

### 核心职责

- 负责前端微前端架构搭建，基于 Piral 实现 Shell / Pilet 模块化开发，通过自建 Feed Service 实现模块动态加载与版本管理
- 实现 Web3 全链路集成，包括钱包连接、签名认证、链上交易、提案投票等功能，钱包状态在跨微前端模块间实时同步
- 开发 AI Agent 平台，基于 Socket.io 实现流式对话、Markdown 实时渲染、CodeMirror 代码编辑，构建完整的 Agent 创建与管理流程
- 设计 GraphQL + REST 混合 API，Pilet 管理走 GraphQL，业务接口走 REST
- 搭建全栈 Docker 容器化部署方案，Nginx 反向代理 + Docker Compose 多服务编排 + Azure Pipelines CI/CD 自动化
