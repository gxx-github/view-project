# netx.world 微前端架构深度分析文档

---

## 一、微前端架构全景对比

### 1.1 市面主流微前端方案总览

| 框架 | 创建者 | 核心机制 | GitHub Stars | 社区活跃度 |
|------|--------|---------|-------------|-----------|
| **qiankun** | 阿里巴巴 UmiJS 团队 | 运行时沙箱容器（基于 single-spa） | 16.6k | 国内主流 |
| **single-spa** | Joel Denning / 社区 | 生命周期编排器（bootstrap/mount/unmount） | 13.9k | 全球主流 |
| **Module Federation** | Webpack 作者 Tobias Koppers | 构建时 + 运行时模块共享 | 2.5k（Webpack 内置） | 高（Webpack 生态） |
| **Piral** | smapiot（德国） | 插件式 Portal 架构（Shell / Pilet） | 1.9k | 欧洲企业级 |
| **Micro App** | 京东 | WebComponent 容器（`<micro-app>`） | 6.2k | 国内活跃 |
| **wujie** | 腾讯 | iframe + WebComponent 混合 | 4.9k | 腾讯内部 |
| **Garfish** | 字节跳动 | 运行时加载器 + Proxy 沙箱 | 2.9k | 字节内部 |
| **Luigi** | SAP | iframe 隔离 + 编排层 | 915 | SAP 生态 |

---

### 1.2 四大方案详细对比

#### qiankun（阿里）

| 维度 | 说明 |
|------|------|
| 隔离方式 | Proxy 沙箱（伪造 `window`）+ Shadow DOM / scoped CSS |
| 框架兼容 | 完全无关（React / Vue / Angular 均可） |
| 加载机制 | 运行时 fetch 子应用 HTML → 解析 → 沙箱内执行 |
| 通信方式 | `initGlobalState`（Observable）+ CustomEvent |
| 优势 | 开箱即用隔离；国内文档丰富；阿里大规模验证 |
| 劣势 | 运行时开销（fetch + 解析 HTML）；CSS 隔离边界问题；社区以中文为主；维护节奏放缓 |

#### single-spa

| 维度 | 说明 |
|------|------|
| 隔离方式 | 无内置隔离，需自行实现 |
| 框架兼容 | 完全无关 |
| 加载机制 | 子应用 JS Bundle 自注册（`registerApplication`） |
| 通信方式 | 无内置，需自行设计（CustomEvent / 共享状态库） |
| 优势 | 最大灵活性；生态成熟；插件丰富；全球社区 |
| 劣势 | 无沙箱隔离；配置复杂；学习曲线陡；通信需自建 |

#### Module Federation

| 维度 | 说明 |
|------|------|
| 隔离方式 | 无沙箱，标准 JS 模块作用域 |
| 框架兼容 | 完全无关 |
| 加载机制 | 构建时定义 expose/consume → 运行时加载远程 Chunk |
| 通信方式 | 直接模块引用（共享模块） |
| 优势 | 性能最优（原生 Chunk 共享）；共享依赖自动去重；Webpack 5 内置 |
| 劣势 | 必须用 Webpack 5 或 Rspack；无隔离沙箱；版本冲突需手动处理；调试跨模块困难 |

#### Piral（本项目选用）

| 维度 | 说明 |
|------|------|
| 隔离方式 | 架构级隔离（Pilet API 边界）+ 可选 Shadow DOM |
| 框架兼容 | React 一等公民，其他框架通过 Converter 支持 |
| 加载机制 | Feed Service 动态分发 Pilet 模块 |
| 通信方式 | 内置全局状态 + 事件总线 + Extension Slot |
| 优势 | 插件化架构；类型安全；Emulator 独立开发；内置跨切面能力 |
| 劣势 | 社区较小（1.9k）；React 为主；需部署 Feed Service |

---

### 1.3 架构范式对比图

```
qiankun:        Shell ──fetch HTML──→ 子应用A ──Proxy沙箱──→ 独立 window
                Shell ──fetch HTML──→ 子应用B ──Proxy沙箱──→ 独立 window

single-spa:     Shell ──register──→ App A (自行 bootstrap/mount/unmount)
                Shell ──register──→ App B (自行 bootstrap/mount/unmount)

Module Fed:     Host ──import远程Chunk──→ Remote A (共享 React)
                Host ──import远程Chunk──→ Remote B (共享 React)

Piral (本项目):  Shell ──Feed Service──→ Pilet A (通过 PiletApi 访问 Shell 能力)
                Shell ──Feed Service──→ Pilet B (通过 PiletApi 访问 Shell 能力)
```

---

### 1.4 性能与适用场景对比

| 场景 | 最优选择 | 次优选择 |
|------|---------|---------|
| 高性能、构建时共享 | Module Federation | single-spa |
| 遗留系统整合 | qiankun | wujie |
| 插件 / 市场化平台 | **Piral** | — |
| 最大架构自由度 | single-spa | — |
| 多团队企业级 Portal | **Piral** | single-spa |
| 最强 JS 沙箱隔离 | wujie | qiankun |
| 简单快速上手 | qiankun | Micro App |
| 渐进式单体拆分 | **Piral** | single-spa |

---

## 二、Piral 架构优势（本项目选型理由）

### 2.1 插件化 Pilet 架构

与 qiankun "加载整个子应用" 或 single-spa "注册一个应用" 不同，Piral 的 Pilet 是**自描述的插件模块**——它声明自己提供哪些扩展槽（Extension Slot）、注册哪些路由、需要哪些 API。

```
传统方案:  子应用 = 完整独立应用（自带路由/状态/UI），被硬塞进容器
Piral:     Pilet = 插件（声明式注册路由/组件/扩展），融入宿主平台
```

### 2.2 Extension Slot 扩展槽机制

Piral 提供 `<ExtensionSlot>` 声明式扩展机制。Shell 或任何 Pilet 可以定义"插槽"，其他 Pilet 填充内容。例如 Shell 定义"首页"插槽，主站 Pilet 填充首页内容：

```typescript
// Shell 侧定义插槽（AppLayout.tsx:140）
{location.pathname === '/' && <ExtensionSlot name="Home" />}

// Pilet 侧填充插槽（netx-pliet-site/src/index.tsx:63）
app.registerExtension('Home', () => (<Home />));
```

qiankun 和 single-spa **没有**这个能力，跨应用 UI 扩展需要自建事件总线或共享状态。

### 2.3 Pilet Feed Service 模块注册中心

Piral 内置 Feed Service（模块注册中心），提供 pilet 的**发布、版本管理、动态发现和加载**。本项目的 `node-server` 就是自建的 Feed Service：

```
Pilet 开发完成 → npm run build → 发布到 Feed Service
                                      ↓
Shell 启动 → fetch(feedUrl) → 获取最新 Pilet 列表 → 动态加载执行
```

qiankun/single-spa 需要自行搭建这套基础设施（管理 import map 或应用配置）。

### 2.4 Emulator 独立开发模式

Piral 为每个 Pilet 生成 **Emulator**（Shell 的模拟包），Pilet 开发者可以在完全隔离的环境下开发和测试，无需运行真实 Shell 或其他 Pilet。这对多团队并行开发至关重要。

### 2.5 TypeScript 类型安全

Piral 是 TypeScript-First 设计，会为 Pilet 生成 `.d.ts` 类型定义。Pilet 开发者能获得完整的 IntelliSense 和编译时类型检查：

```typescript
// PiralCustomState 的类型声明（website/src/index.tsx:40-50）
declare module 'piral-core/lib/types/custom' {
  interface PiralCustomState {
    account: string;      // 钱包账户 - Pilet 开发者能看到类型提示
    signation: string;    // 签名数据 - Pilet 开发者能看到类型提示
  }
}
```

其他方案的通信接口都是松散的 JavaScript，无类型约束。

### 2.6 内置跨切面能力

Piral 内置了微前端场景下常见的基础能力，Pilet 开箱即用：

| 能力 | Piral 插件 | 本项目是否使用 |
|------|-----------|-------------|
| 全局状态管理 | `piral-redux` | 是 |
| 路由管理 | `piral-core` | 是 |
| 事件总线 | `piral-core` | 是 |
| 菜单系统 | `piral-menu` | 是 |
| 通知系统 | `piral-notifications` | 是 |
| 表单处理 | `piral-forms` | 是 |
| 数据 Feed | `piral-feeds` | 是 |
| 仪表盘 | `piral-dashboard` | 是 |
| 搜索 | `piral-search` | 是 |
| HTTP 请求 | `piral-fetch` | 是 |
| 页面布局 | `piral-page-layouts` | 是 |
| 容器组件 | `piral-containers` | 是 |

在 qiankun 中这些都需要自建，single-spa 则完全留给开发者自行选择。

---

## 三、Pilet 间数据传输与隔离机制（源码级解析）

### 3.1 整体架构

本项目采用 **三层通信 + 三层隔离** 的设计：

```
┌─────────────────────────────────────────────────────┐
│                    Shell (website)                    │
│                                                       │
│  ┌─ 全局状态层（PiralCustomState）─────────────────┐ │
│  │  account      ← WalletListenerComponent 写入     │ │
│  │  signation    ← 签名回调写入                     │ │
│  │  components   ← Shell 注册的全局组件              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ 事件总线层（emit / on）────────────────────────┐ │
│  │  WalletPilet.*     ← Pilet 发起钱包操作请求      │ │
│  │  WalletPilet.*Emit ← Shell 返回操作结果          │ │
│  │  Shell.*           ← Pilet 通知 Shell 显示 UI    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─ 组件注入层（ExtensionSlot）────────────────────┐ │
│  │  WalletListenerComponent  ← 全局钱包监听         │ │
│  │  walletConfig             ← 钱包配置             │ │
│  │  LoadingIndicator         ← 全局加载指示器       │ │
│  └──────────────────────────────────────────────────┘ │
└───────────────────────┬───────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌──────────────────┐          ┌──────────────────────┐
│ netx-pliet-site  │          │ netx-pliet-site-agent │
│                  │          │                        │
│ 独立 Redux:      │          │ 独立 Redux:            │
│ { count: 0 }    │          │ { authorization: null, │
│                  │          │   agentStatus: 0 }    │
│ 页面:            │          │                        │
│ /technology      │          │ 页面:                  │
│ /agentinfo       │          │ /explore              │
│ /economy         │          │ /create_agent         │
│ /exchange        │          │ /agent                │
│ /AIengineer      │          │ /quest                │
│ + Extension:Home │          │ /exclusive            │
│                  │          │ + Layout: LayoutSideNav│
└──────────────────┘          └──────────────────────┘
     两个 Pilet 之间不直接通信，所有交互通过 Shell 中转
```

---

### 3.2 第一层：全局状态共享（Shell → Pilets）

#### 定义

Shell 通过 `createInstance` 定义全局状态和 Actions（`website/src/index.tsx:40-50`）：

```typescript
declare module 'piral-core/lib/types/custom' {
  interface PiralCustomState {
    account: string;      // 钱包地址、连接状态、链 ID 等
    signation: string;    // 消息签名结果
  }

  interface PiralCustomActions extends PiralActions {
    setAccount: (account: string) => void;
    setSignation: (signation: string) => void;
  }
}
```

Shell 注册 Actions 实现（`website/src/components/actions/actions.ts`）：

```typescript
export function setAccount(ctx: GlobalStateContext, account) {
  ctx.dispatch((state: GlobalState) => ({
    ...state,
    account: account,    // 只由 Shell 通过 dispatch 修改
  }));
}
```

#### 暴露给 Pilet

通过 Custom Plugin 封装为 Pilet 可用的 Hooks（`creatCustomGlobalApi.tsx`）：

```typescript
export function createCustomApi(): PiralPlugin<object> {
  return context => {
    // Pilet 读取全局状态
    const _useGlobalState = (name: string) => {
      return useGlobalState((m) => m[name]);
    };

    // Pilet 读取全局组件
    const _useGlobalComponents = (name: string) => {
      return useGlobalState((m) => m.components[name]);
    };

    // Pilet 获取 Actions
    const _useActions = () => {
      return useActions();
    };

    return (api, meta) => ({
      _useGlobalComponents,
      _useGlobalState,
      _useActions,
      // ... toast 相关方法
    });
  };
}
```

#### Pilet 消费

两个 Pilet 使用方式完全一致（以 agent 的 `connectWallet.tsx` 为例）：

```typescript
const { _useGlobalState, _useActions } = PiletApp;
const { setSignation } = _useActions();                          // 获取 action
const { WalletListenerComponent, walletConfig } =
  _useGlobalState('components');                                  // 获取注入组件
const accountInfo = _useGlobalState('account');                  // 获取钱包状态
const signation = _useGlobalState('signation');                  // 获取签名数据
```

#### 数据写入：Shell 独占

全局状态只由 Shell 的 `WalletListenerComponent` 写入（`eventHandlers.tsx:43-49`）：

```typescript
// 监听 wagmi 钱包状态变化 → 写入全局 state
useEffect(() => {
  if (account && !account.isConnected) {
    setAccount(null);
    setSignation(null);
  } else {
    setAccount(account);     // Shell 独占写入权
    setSignation(null);
  }
}, [account.address, account.chainId]);
```

**设计原则**：全局状态**单一写入点**，Pilet 只读。保证数据一致性，避免多 Pilet 竞争写入导致状态混乱。

---

### 3.3 第二层：事件总线（Pilet ↔ Shell 双向通信）

这是最核心的通信方式，采用**发布-订阅模式**，定义了两组事件通道。

#### 通道 A：WalletPilet.* — 钱包操作请求/回调

```
Pilet                         Shell WalletListenerComponent
  │                                    │
  │ emit('WalletPilet.WriteContract')  │
  │ ─────────────────────────────────→ │ 执行 wagmi writeContract
  │                                    │
  │ on('WalletPilet.WritedEmit')       │
  │ ←───────────────────────────────── │ emit('WalletPilet.WritedEmit')
  │                                    │   { state: 'success', hash }
```

完整事件列表：

| Pilet 发出请求 | Shell 处理 | Shell 回调 |
|---|---|---|
| `WalletPilet.Connect` | 打开 RainbowKit 连接弹窗 | `WalletPilet.ConnectedEmit` |
| `WalletPilet.Disconnect` | 断开钱包连接 | `WalletPilet.DisconnectedEmit` |
| `WalletPilet.SwitchChain` | 打开链切换弹窗 | `WalletPilet.ChangeChainEmit` |
| `WalletPilet.SignMsg` | wagmi `signMessage` | `WalletPilet.SignedMsg` |
| `WalletPilet.VerifyMessage` | wagmi `verifyMessage` | `WalletPilet.VerifyMessageEmit` |
| `WalletPilet.GetBalance` | wagmi `getBalance` | `WalletPilet.GetBalanceEmit` |
| `WalletPilet.ReadContract` | wagmi `readContract` | `WalletPilet.ReadedEmit` |
| `WalletPilet.WriteContract` | wagmi `writeContract` | `WalletPilet.WritedEmit` |
| `WalletPilet.Send` | wagmi `sendTransaction` | `WalletPilet.SendedEmit` |
| `WalletPilet.MultiCall` | wagmi `multicall` | `WalletPilet.MultiCallEmit` |
| `WalletPilet.AddToken` | wagmi `watchAsset` | `WalletPilet.AddTokenEmit` |

**Pilet 调用示例**（`StakeModel.tsx` — 质押合约交互）：

```typescript
// 1️⃣ Pilet 发起写合约请求
app.emit('WalletPilet.WriteContract', {
  abi: stakeABI,
  address: STAKE_CONTRACT_ADDRESS,
  fn: 'stake',
  args: [amount],
  eventKey: 'stake'    // 自定义标识，用于区分多个并发请求
});

// 2️⃣ Pilet 监听 Shell 返回的结果
app.on('WalletPilet.WritedEmit', ({ state, hash, error, eventKey }) => {
  if (eventKey !== 'stake') return;  // 只处理自己发起的请求

  if (state === 'pending') {
    app.emit('Shell.OpenInfoModelEmit', { status: 0 }); // 通知 Shell 显示"交易中"
  }
  if (state === 'success') {
    app.emit('Shell.ChangeInfoModelEmit', { status: 1, hash }); // 通知 Shell 显示"成功"
  }
  if (state === 'error') {
    app.emit('Shell.ChangeInfoModelEmit', { status: 2, message: error }); // "失败"
  }
});
```

#### 通道 B：Shell.* — UI 交互通知

| 事件 | 发送方 | 接收方 | 用途 |
|------|--------|--------|------|
| `Shell.OpenInfoModelEmit` | Pilet | Shell AppLayout | 请求打开交易状态弹窗 |
| `Shell.ChangeInfoModelEmit` | Pilet | Shell AppLayout | 更新交易弹窗内容（hash / 错误） |
| `Shell.CloseInfoModelEmit` | Shell | Pilet | 通知弹窗已关闭 |

**Shell 监听**（`AppLayout.tsx:19-94`）：

```typescript
instance.on('Shell.OpenInfoModelEmit', (params) => {
  const { status } = params;
  switch (status) {
    case 0:  // 交易中
      setwalletStatusParams({ transactionModalOpen: true, attemptingTxn: true });
      break;
    case 1:  // 交易成功
      setwalletStatusParams({ transactionModalOpen: true, hash: '88888888888' });
      break;
    default: // 交易失败
      setwalletStatusParams({ transactionModalOpen: true, error: true });
      break;
  }
});
```

#### 事件总线的注册与销毁

Shell 的 `WalletListenerComponent` 通过 `useEffect` 注册和清理事件监听（`eventHandlers.tsx:298-322`）：

```typescript
useEffect(() => {
  // 注册监听
  app.on('WalletPilet.Connect', handleConnect);
  app.on('WalletPilet.SignMsg', handleSignMsg);
  app.on('WalletPilet.WriteContract', handleWriteContract);
  // ... 共 11 个事件

  return () => {
    // 组件卸载时清理，防止内存泄漏
    app.off('WalletPilet.Connect', handleConnect);
    app.off('WalletPilet.SignMsg', handleSignMsg);
    app.off('WalletPilet.WriteContract', handleWriteContract);
    // ...
  };
}, [app, account, openConnectModal, openAccountModal, openChainModal]);
```

---

### 3.4 第三层：局部状态隔离（Pilet 内部独立 Redux）

每个 Pilet 通过 `createReduxStore` 创建**完全隔离**的本地状态。

#### netx-pliet-site（主站 Pilet）

```typescript
// netx-pliet-site/src/index.tsx:17-43
const initialState = { count: 0 };

function myReducer(state = initialState, action) {
  switch (action.type) {
    case "increment": return { count: state.count + 1 };
    case "decrement": return { count: state.count - 1 };
    default: return state;
  }
}

export function setup(app: any) {
  const parialReduxConnect = app.createReduxStore(myReducer);
  // parialReduxConnect 包装组件，注入 state 和 dispatch
}
```

#### netx-pliet-site-agent（Agent Pilet）

```typescript
// netx-pliet-site-agent/src/index.tsx:17-55
const initialState = { authorization: null, agentStatus: 0 };

function myReducer(state = initialState, action) {
  switch (action.type) {
    case "authorization":
      return { ...state, authorization: action.payload.authorization };
    case "agentStatus":
      return { ...state, agentStatus: action.payload.agentStatus };
    default: return state;
  }
}

export function setup(app) {
  const parialReduxConnect = app.createReduxStore(myReducer);

  // 用 parialReduxConnect 包装页面组件，注入 state 和 dispatch
  app.registerPage('/explore',
    parialReduxConnect(({ state, dispatch }) =>
      <Explore state={state} app={app} />
    ),
    { layout: 'LayoutSideNav' }  // 使用侧边栏布局
  );

  app.registerPage('/create_agent',
    parialReduxConnect(({ state, dispatch }) =>
      <CreateAgent agentStatus={state.agentStatus} dispatch={dispatch} app={app} />
    ),
    { layout: 'LayoutSideNav' }
  );
}
```

#### Agent Pilet 的布局也消费本地状态

```typescript
// netx-pliet-site-agent/src/index.tsx:44-55
app.registerPageLayout('LayoutSideNav', ({ children }) => {
  const ConnectedLayoutSide = React.useMemo(() =>
    parialReduxConnect(({ state, dispatch }) => (
      <LayoutSide state={state} dispatch={dispatch} app={app}>
        {children}
      </LayoutSide>
    )),
  []);
  return <ConnectedLayoutSide />;
});
```

**两个 Pilet 的 local state 完全隔离**，互不可见、互不影响。

---

### 3.5 数据注入方式

Shell 还通过两种方式向 Pilet 注入数据/能力：

#### 方式 A：组件注入（全局 components）

```typescript
// Shell 注册（website/src/index.tsx:53-58）
state: {
  components: {
    "WalletListenerComponent": WalletListenerComponent,
    "walletConfig": walletConfig,
    LoadingIndicator: Loading,
  }
}

// Pilet 获取
const { WalletListenerComponent, walletConfig } = _useGlobalState('components');
```

#### 方式 B：app 对象 Props 传递

```typescript
// Pilet setup 中将 app（PiletApi）作为 props 传给页面
app.registerPage('/agentinfo', () => <Agent app={app} />);
app.registerPage('/exchange',  () => <Exchange app={app} />);

// 子组件通过 props 获得完整的 PiletApi 能力
const StakeModel = ({ app }) => {
  const accountInfo = app._useGlobalState('account');
  app.emit('WalletPilet.WriteContract', params);
  app.FetchApis.getBalance();  // 通过 app 获取 API 实例
};
```

#### 方式 C：API 类挂载

```typescript
// Pilet setup 中创建 API 实例并挂载到 app 上（两个 Pilet 均如此）
app.FetchApis = new FetchApis(app);

// 页面组件中使用
const { FetchApis } = app;
FetchApis.getProposalList().then(res => { ... });
```

---

### 3.6 完整数据流图

```
                        ┌──────────────────────────────────────┐
                        │          Shell (website)              │
                        │                                      │
                        │  ┌─ PiralGlobalState ─────────────┐  │
                        │  │  account    ← wagmi 监听写入    │  │
                        │  │  signation  ← 签名回调写入      │  │
                        │  │  components ← Shell 注册        │  │
                        │  └─────────────────────────────────┘  │
                        │       ▲ 写入          │ 读取           │
                        │  dispatch          _useGlobalState    │
                        │       │                ▼              │
                        │  ┌─ WalletListenerComponent ───────┐ │
                        │  │  on('WalletPilet.*')             │ │
                        │  │  → wagmi/ethers 操作              │ │
                        │  │  → emit('WalletPilet.*Emit')     │ │
                        │  └──────────────────────────────────┘ │
                        │  ┌─ AppLayout ─────────────────────┐ │
                        │  │  on('Shell.OpenInfoModel')       │ │
                        │  │  on('Shell.ChangeInfoModel')     │ │
                        │  │  → 交易状态弹窗显示/更新          │ │
                        │  │  ExtensionSlot name="Home"       │ │
                        │  └──────────────────────────────────┘ │
                        └──────────┬──────────────┬─────────────┘
                                   │              │
              ┌────────────────────┘              └────────────────────┐
              ▼                                                        ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────────┐
│   netx-pliet-site（主站 Pilet）    │  │   netx-pliet-site-agent（Agent Pilet）  │
│                                    │  │                                        │
│  ┌─ 局部 Redux ────────────────┐  │  │  ┌─ 局部 Redux ──────────────────┐    │
│  │  { count: 0 }               │  │  │  │  { authorization: null,       │    │
│  │  ★ 与 Agent Pilet 完全隔离   │  │  │  │    agentStatus: 0 }           │    │
│  └──────────────────────────────┘  │  │  │  ★ 与主站 Pilet 完全隔离      │    │
│                                    │  │  └────────────────────────────────┘    │
│  读取全局状态:                      │  │                                        │
│   _useGlobalState('account')      │  │  读取全局状态:                          │
│   _useGlobalState('signation')    │  │   _useGlobalState('account')           │
│   _useGlobalState('components')   │  │   _useGlobalState('signation')         │
│                                    │  │   _useGlobalState('components')        │
│  发送钱包事件:                      │  │                                        │
│   emit WalletPilet.WriteContract  │  │  发送钱包事件:                          │
│   emit WalletPilet.ReadContract   │  │   emit WalletPilet.SignMsg             │
│   emit WalletPilet.GetBalance     │  │   emit WalletPilet.GetBalance          │
│                                    │  │   emit WalletPilet.WriteContract       │
│  发送 UI 事件:                      │  │   emit WalletPilet.Connect             │
│   emit Shell.OpenInfoModel        │  │                                        │
│   emit Shell.ChangeInfoModel      │  │  监听回调:                              │
│                                    │  │   on WalletPilet.SignedMsg             │
│  监听回调:                          │  │   on WalletPilet.GetBalanceEmit        │
│   on WalletPilet.WritedEmit      │  │   on WalletPilet.ReadedEmit            │
│   on WalletPilet.ReadedEmit      │  │                                        │
│   on Shell.CloseInfoModelEmit    │  │  注册布局:                              │
│                                    │  │   LayoutSideNav（侧边栏布局）           │
│  注册路由:                          │  │                                        │
│   /technology, /agentinfo         │  │  注册路由:                              │
│   /economy, /exchange             │  │   /explore, /create_agent              │
│   /AIengineer                     │  │   /agent, /quest, /exclusive           │
│                                    │  │                                        │
│  注册扩展:                          │  │  API 实例:                              │
│   Extension "Home" → 首页内容      │  │   app.FetchApis (独立 API 封装)        │
│                                    │  │                                        │
│  API 实例:                          │  └────────────────────────────────────────┘
│   app.FetchApis (独立 API 封装)    │
│                                    │
└────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════
  ★ 关键约束: 两个 Pilet 之间不直接通信，所有交互通过 Shell 中转
  ★ 钱包操作由 Shell WalletListenerComponent 统一管理
  ★ Pilet 只发请求（emit）、收结果（on），保证 Web3 操作一致性
══════════════════════════════════════════════════════════════════════════
```

---

### 3.7 隔离机制总结

| 隔离维度 | 隔离方式 | 实现细节 |
|---------|---------|---------|
| **状态隔离** | `createReduxStore` 独立 Reducer | 每个 Pilet 的 local state 互不可见。主站管理 `count`，Agent 管理 `authorization` + `agentStatus` |
| **组件隔离** | 独立组件树 + React.lazy | 各 Pilet 按路由懒加载，组件注册互不冲突 |
| **样式隔离** | Styled Components | 自动生成唯一 className，无全局 CSS 污染 |
| **构建隔离** | 独立 Webpack 打包 | 每个 Pilet 独立编译发布到 Feed Service |
| **路由隔离** | Piral 路由注册 | 每个 Pilet 注册独立路由前缀，互不覆盖 |
| **布局隔离** | `piral-page-layouts` | 主站用 LayoutTop（顶栏），Agent 用 LayoutSideNav（侧栏） |

| 共享维度 | 共享方式 | 实现细节 |
|---------|---------|---------|
| **全局状态** | PiralCustomState | Shell 定义 `account` / `signation`，Pilet 只读访问 |
| **全局组件** | components 注入 | `WalletListenerComponent` / `walletConfig` / `LoadingIndicator` |
| **钱包操作** | Event Bus | Pilet emit 请求 → Shell 处理 → Shell emit 回调 |
| **UI 交互** | Event Bus | `Shell.OpenInfoModelEmit` / `Shell.ChangeInfoModelEmit` |
| **API 能力** | Custom Plugin | `_useGlobalState` / `_useActions` / `_toastView` |

---

## 四、各微前端框架数据传输机制详解

### 4.1 qiankun — `initGlobalState` + Proxy 沙箱

#### 状态共享：`initGlobalState`（源码级解析）

qiankun 通过一个**模块级全局变量** `globalState` 和一个订阅者映射 `deps` 实现跨应用状态共享：

```typescript
// qiankun 源码 src/globalState.ts 核心逻辑
let globalState: Record<string, any> = {};
const deps: Record<string, OnGlobalStateChangeCallback> = {};

function emitGlobal(state, prevState) {
  Object.keys(deps).forEach((id) => {
    deps[id](cloneDeep(state), cloneDeep(prevState));  // 深拷贝通知所有订阅者
  });
}
```

**主应用初始化：**
```typescript
import { initGlobalState } from 'qiankun';

const actions = initGlobalState({
  user: { name: 'alice' },
  token: 'abc123',
});

actions.onGlobalStateChange((state, prev) => {
  console.log('主应用:', state);
});

actions.setGlobalState({ token: 'new-token' }); // 修改 → 通知所有子应用
```

**子应用接收：**
```typescript
// 子应用 mount 生命周期中
export function mount(props) {
  props.onGlobalStateChange((state, prev) => {
    console.log('子应用收到:', state);  // { user: {name:'alice'}, token: 'new-token' }
  });

  props.setGlobalState({ token: 'updated' }); // 子应用只能修改已存在的 key
}
```

**关键约束：**
- 子应用调用 `setGlobalState` 时只能修改 `initGlobalState` 时已声明的 key，不能新增
- 每个应用只有**一个**监听器槽位，再次注册会覆盖之前的回调
- 每次读写都使用 `cloneDeep`，无共享引用，性能开销较大
- `initGlobalState` 已标记 deprecated（将在 3.0 移除）

#### JS 沙箱：ProxySandbox

```typescript
// qiankun 源码 src/sandbox/proxySandbox.ts 核心逻辑
const proxy = new Proxy(fakeWindow, {
  set: (target, p, value) => {
    if (this.sandboxRunning) {
      target[p] = value;          // 写入 fakeWindow，不影响真实 window
      updatedValueSet.add(p);
    }
    return true;
  },
  get: (target, p) => {
    if (p === 'window' || p === 'self') return proxy;  // 防止逃逸
    if (p in target) return target[p];
    return globalContext[p];       // 回退读真实 window
  },
});

// 子应用代码被 with(proxy) 包裹执行
(function(window) {
  with(window) {
    // 子应用代码 — 所有全局变量访问都经过 Proxy 拦截
  }
})(proxy);
```

**对比 Piral：** qiankun 的沙箱是"运行时拦截"，Piral 是"架构级隔离"。qiankun 通过 Proxy 欺骗 `window`，Piral 通过 Pilet API 边界限制 Pilet 只能访问 Shell 暴露的能力。

---

### 4.2 single-spa — 无内置通信，需自建

single-spa 是最灵活的方案，但也是唯一**完全不提供**通信和隔离机制的框架。

#### 通信方案 1：CustomEvent

```typescript
// App A 发送
window.dispatchEvent(new CustomEvent('user-login', {
  detail: { userId: 42, name: 'alice' }
}));

// App B 接收
window.addEventListener('user-login', (e) => {
  console.log(e.detail); // { userId: 42, name: 'alice' }
});
```

#### 通信方案 2：RxJS EventBus + Import Maps

```typescript
// import-map.json
{ "imports": { "event-bus": "https://cdn.example.com/event-bus.js" } }

// event-bus.js
import { Subject } from 'rxjs';
export const bus = new Subject();

// App A 发布
import { bus } from 'event-bus';
bus.next({ type: 'USER_LOGIN', payload: { id: 42 } });

// App B 订阅
import { bus } from 'event-bus';
bus.pipe(filter(e => e.type === 'USER_LOGIN')).subscribe(e => { ... });
```

#### 通信方案 3：Parcel 跨应用组件共享

```typescript
// App A 提供 Parcel（可嵌入的组件）
export const parcelConfig = {
  bootstrap: [() => Promise.resolve()],
  mount: [{ domElement, props }) => {
    ReactDOM.render(<SharedWidget data={props.data} />, domElement);
  }],
  unmount: [{ domElement }) => {
    ReactDOM.unmountComponentAtNode(domElement);
  }],
  update: [{ domElement, props }) => {
    // props 变化时重新渲染
    ReactDOM.render(<SharedWidget data={props.data} />, domElement);
  }],
};

// App B 消费 Parcel
import { mountRootParcel } from 'single-spa';
const parcel = mountRootParcel(parcelConfig, {
  domElement: document.getElementById('widget-container'),
  data: { userId: 42 },
});
await parcel.mount();
await parcel.update({ data: { userId: 99 } }); // 传递新数据
await parcel.unmount();
```

#### 路由分发：Activity Function

```typescript
singleSpa.registerApplication({
  name: 'app1',
  app: () => import('./app1/main.js'),
  activeWhen: ['/app1'],  // URL 前缀匹配
  customProps: { authToken: 'abc123' },  // 传递给生命周期函数
});

// 也可以是函数
activeWhen: (location) => location.pathname.startsWith('/dashboard')
```

**对比 Piral：** single-spa 的 Parcel 机制类似 Piral 的 Extension Slot，但 Parcel 需要手动管理 mount/unmount/update 生命周期，而 Piral 的 Extension Slot 是声明式的，自动管理生命周期。

---

### 4.3 Module Federation — 运行时模块共享

Module Federation 的"通信"本质上就是**模块导入**，是最直接的方式。

#### 配置：Expose / Remote

```typescript
// Remote（提供方）webpack.config.js
new ModuleFederationPlugin({
  name: 'remoteApp',
  filename: 'remoteEntry.js',
  exposes: {
    './Dashboard': './src/components/Dashboard',    // 暴露组件
    './utils': './src/utils/shared',                // 暴露工具函数
    './store': './src/store/sharedStore',           // 暴露共享状态
  },
  shared: {
    react:           { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom':     { singleton: true, requiredVersion: '^18.0.0' },
    'zustand':       { singleton: true },            // 共享状态库
  },
});
```

```typescript
// Host（消费方）webpack.config.js
new ModuleFederationPlugin({
  name: 'hostApp',
  remotes: {
    remoteApp: 'remoteApp@http://cdn.example.com/remoteEntry.js',
  },
  shared: {
    react:       { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    'zustand':   { singleton: true },
  },
});
```

#### 共享状态：通过共享模块传递

```typescript
// remoteApp/src/store/sharedStore.ts
import { create } from 'zustand';
export const useSharedStore = create((set) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
}));

// Remote 使用
import { useSharedStore } from './store/sharedStore';
const { user, setUser } = useSharedStore();

// Host 使用（因为是 singleton，拿到的是同一个 store 实例）
const { useSharedStore } = await import('remoteApp/store');
const { user, setUser } = useSharedStore();
```

#### 消费远程组件

```typescript
// Host 中动态加载 Remote 暴露的组件
const RemoteDashboard = React.lazy(() => import('remoteApp/Dashboard'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RemoteDashboard title="Main Dashboard" />
    </Suspense>
  );
}
```

#### Shared 配置详解

| 选项 | 类型 | 说明 |
|------|------|------|
| `singleton` | `boolean` | 为 `true` 时整个页面只加载一个版本（React 必须为 `true`） |
| `requiredVersion` | `string` | Semver 范围，版本不匹配时抛出警告或错误 |
| `strictVersion` | `boolean` | `true` 时版本不匹配抛错误而非警告 |
| `eager` | `boolean` | `true` 时将共享模块打包进初始 chunk（增大包体积） |

**版本协商流程：**
```
Host 加载 → 注册 React 18.2.0 到 share scope
         → 加载 remoteEntry.js
         → Remote 注册 React 18.0.0 到 share scope
         → import('remoteApp/Dashboard')
         → Federation 运行时检查 share scope
         → singleton + 版本兼容 → 使用 18.2.0（更高版本）
         → singleton + 版本不兼容 + strictVersion → 抛出错误
         → singleton + 版本不兼容 + !strictVersion → 控制台警告，使用已加载版本
```

**对比 Piral：** Module Federation 是"构建时定义，运行时加载模块"，Piral 是"运行时从 Feed Service 加载完整 Pilet"。MF 更适合共享细粒度模块（组件/函数），Piral 更适合共享完整业务模块（带路由/页面/状态）。

---

### 4.4 wujie（腾讯）— iframe + WebComponent 桥接

wujie 使用最彻底的隔离方式：**JS 在 iframe 中运行，DOM 在 WebComponent Shadow DOM 中渲染**。

#### 架构原理

```
主文档
  │
  ├── <wujie-app id="sub-app">           ← WebComponent（主文档 DOM 中）
  │     └── #shadow-root (open)          ← CSS 隔离
  │           ├── <html>                  ← 子应用 DOM 渲染在这里
  │           ├── <head>
  │           └── <body>
  │
  └── <iframe style="display:none">      ← 隐藏 iframe
        └── iframe.contentWindow          ← 子应用 JS 在这里运行
```

#### 窗口代理：Proxy 桥接 iframe 与 Shadow DOM

```typescript
// wujie 源码 src/proxy.ts
const proxyDocument = new Proxy({}, {
  get: function (_fakeDocument, propKey) {
    // createElement → 在 iframe 创建，但 patch 到 shadowRoot
    if (propKey === 'createElement') {
      return new Proxy(document.createElement, {
        apply(_fn, _ctx, args) {
          const element = rawCreateMethod.apply(iframe.contentDocument, args);
          patchElementEffect(element, iframe.contentWindow);
          return element;
        },
      });
    }
    // querySelector → 查 shadowRoot
    if (propKey === 'querySelector') {
      return new Proxy(shadowRoot.querySelector, {
        apply(target, ctx, args) {
          return target.apply(shadowRoot, args); // 在 shadowRoot 中查找
        },
      });
    }
    // documentElement / head / body → 返回 shadowRoot 中的元素
    if (propKey === 'head') return shadowRoot.head;
    if (propKey === 'body') return shadowRoot.body;
  },
});
```

#### 事件总线 EventBus

```typescript
// wujie 源码 src/event.ts
export class EventBus {
  private eventObj: EventObj;  // 每个应用独立的监听器映射

  // $emit 会遍历所有应用的事件映射 → 实现跨应用通信
  public $emit(event: string, ...args: Array<any>): EventBus {
    let cbs = [];
    appEventObjMap.forEach((eventObj) => {          // 遍历所有应用
      if (eventObj[event]) cbs = cbs.concat(eventObj[event]);
    });
    for (let i = 0, l = cbs.length; i < l; i++) cbs[i](...args);
    return this;
  }
}
```

**使用方式：**
```typescript
// 主应用
import { startApp, bus } from 'wujie';
startApp({ name: 'sub-app', url: 'http://localhost:3000/' });
bus.$emit('theme-change', { mode: 'dark' });        // 广播给所有子应用

// 子应用
window.$wujie.bus.$on('theme-change', (data) => {   // 接收主应用消息
  console.log(data); // { mode: 'dark' }
});
window.$wujie.bus.$emit('sub-app-event', { ... });  // 子应用向主应用/其他子应用发送
```

#### Props 注入

```typescript
// 主应用注入 props
startApp({
  name: 'sub-app',
  url: 'http://localhost:3000/',
  props: { user: { name: 'alice' }, token: 'abc123' },
});

// 子应用获取
const { bus, props, shadowRoot } = window.$wujie;
console.log(props.user); // { name: 'alice' }
```

**对比 Piral：** wujie 的 EventBus 与 Piral 的 emit/on 类似，但 wujie 的 `$emit` 是全局广播（遍历所有应用），Piral 的事件只在注册了监听器的 Shell 中处理。wujie 隔离最强（iframe），但通信成本更高（跨 iframe 边界）。

---

### 4.5 Micro App（京东）— CustomElement 数据通信

Micro App 使用 `<micro-app>` CustomElement 作为容器，数据通信通过 `setData` / `getData` / `dispatch` API。

#### 数据流向

```
主应用                                    子应用
  │                                         │
  │  microApp.setData(name, data)           │
  │ ─────────────────────────────────────→ │  window.microApp.addDataListener(cb)
  │                                         │  cb 收到 data
  │                                         │
  │  microApp.addDataListener(name, cb)     │
  │ ←────────────────────────────────────── │  window.microApp.dispatch(data)
  │  cb 收到 data                            │
```

#### 主应用 → 子应用

```typescript
import microApp from '@micro-zoe/micro-app';

// 发送数据
microApp.setData('my-sub-app', {
  type: 'user-update',
  data: { name: 'alice', role: 'admin' }
});

// 监听子应用数据
microApp.addDataListener('my-sub-app', (data) => {
  console.log('子应用发来:', data);
});
```

#### 子应用 → 主应用

```typescript
// 子应用中
window.microApp?.addDataListener((data) => {
  console.log('主应用发来:', data);
});

window.microApp?.dispatch({
  type: 'response',
  message: 'done'
});

window.microApp?.getData();  // 获取主应用发送的最新数据快照
```

**关键限制：** 子应用之间**不能直接通信**，只能通过主应用中转。这和本项目 Piral 的设计思路一致。

**对比 Piral：** Micro App 的 `setData` / `dispatch` 是单向数据流，Piral 的 `emit` / `on` 是双向事件。Piral 的 Custom Plugin 可以暴露任意 Hooks（`_useGlobalState` / `_useActions`），Micro App 只支持 JSON-serializable 数据。

---

### 4.6 Garfish（字节跳动）— Provider/Consumer + Channel

#### Provider/Consumer 模式

```typescript
// 子应用导出 Provider
export function provider({ basename, dom, ...props }) {
  return {
    render({ appName, dom, basename, props }) {
      ReactDOM.render(<App basename={basename} {...props} />, dom);
    },
    destroy({ dom }) {
      ReactDOM.unmountComponentAtNode(dom);
    },
  };
}

// 主应用加载
const app = await garfish.loadApp('sub-app', {
  props: { user: { name: 'alice' }, token: 'abc' },
});
await app.mount();
```

#### Channel 事件通信

```typescript
// 主应用
garfish.channel.emit('theme-change', { mode: 'dark' });

// 子应用
garfish.channel.on('theme-change', (data) => { ... });
```

#### 插件系统生命周期

```typescript
// Garfish 源码 — 基于 SyncHook / AsyncHook 的插件系统
garfish.plugins.usePlugin({
  name: 'my-plugin',
  beforeLoad: (appInfo) => { /* 应用加载前 */ },
  afterLoad: (appInfo, app) => { /* 应用加载后 */ },
  beforeMount: (appInfo, app) => { /* 挂载前 */ },
  afterMount: (appInfo, app) => { /* 挂载后 */ },
  beforeUnmount: (appInfo, app) => { /* 卸载前 */ },
  afterUnmount: (appInfo, app) => { /* 卸载后 */ },
});
```

**对比 Piral：** Garfish 的 Provider 模式比 Piral 的 `setup(app)` 更重（需要 `render` / `destroy` 两个方法），Piral 的声明式路由注册（`app.registerPage`）更简洁。

---

### 4.7 数据传输方式横向对比

| 维度 | **Piral（本项目）** | **qiankun** | **single-spa** | **Module Fed** | **wujie** | **Micro App** | **Garfish** |
|------|-------|---------|-----------|------------|-------|-----------|---------|
| **状态共享** | PiralCustomState + Custom Plugin Hooks | `initGlobalState`（cloneDeep + 观察者） | 无内置 | 共享模块（singleton store） | `$wujie.props` 注入 | `setData` / `getData` | Props 注入 |
| **事件通信** | `emit` / `on`（Piral 内置） | `onGlobalStateChange` 回调 | CustomEvent / RxJS | 无（直接 import） | `bus.$emit` / `bus.$on` | `dispatch` / `addDataListener` | `channel.emit` / `channel.on` |
| **跨应用组件** | `<ExtensionSlot>` 声明式 | `loadMicroApp` 手动挂载 | Parcel（mountParcel） | 远程模块 `import()` | Keep-alive + bus | 不支持 | Provider render |
| **JS 隔离** | 架构级（Pilet API 边界） | Proxy + fakeWindow | 无 | 无（标准模块作用域） | iframe（最强隔离） | with + Proxy 或 iframe | Proxy + fakeWindow |
| **CSS 隔离** | Styled Components / 可选 Shadow DOM | Shadow DOM / scoped CSS | 无 | 无 | Shadow DOM | scoped CSS | scoped CSS / Shadow DOM |
| **通信模式** | Pilet ↔ Shell 双向 | 主 ↔ 子 双向 | 自建 | 直接引用 | 全局广播 | 主 ↔ 子 单向 | 主 ↔ 子 双向 |
| **类型安全** | TypeScript `.d.ts` 生成 | 无 | 无 | 手动声明 | 无 | 无 | 无 |
| **子→子通信** | 不支持（通过 Shell 中转） | 不支持（通过主应用中转） | 自建 | 共享模块 | 支持（全局广播） | 不支持 | 不支持（通过主应用中转） |

---

## 五、项目开发难点（源码级分析）

### 5.1 难点一：Feed Service 三层缓存与 Pilet 版本管理

**问题：** Pilet 模块需要动态发布、版本管理、缓存加速，node-server 设计了**内存 → Redis → PostgreSQL** 三层存储架构。

**PostgreSQL 版本查询**使用窗口函数实现"每个 Pilet 取最新版本"：

```sql
-- node-server 数据库查询：按 name 分组取最新版本
SELECT * FROM (
  SELECT name, version, pilet,
  ROW_NUMBER() OVER (PARTITION BY name ORDER BY "order" asc, version DESC) AS rn
) t WHERE rn = 1;
```

**难点：**
- 内存缓存与 Redis 缓存的一致性保障——Pilet 发布后需同步刷新两层缓存
- 并发上传同版本 Pilet 的竞态条件——需要依赖 `order` 字段做排序仲裁
- Pilet 包的完整性校验——Tar 解压 + 依赖 URL 重写 + 哈希校验

---

### 5.2 难点二：Web3 事件通道的并发请求隔离

**问题：** 多个 Pilet 页面可能同时发起链上操作（如质押 + 查余额 + 读合约），它们都监听同一个 `WalletPilet.WritedEmit` 事件。

**解决方案：`eventKey` 标识机制**

```typescript
// StakeModel.tsx — 质押操作，标记 eventKey = 'stake'
app.emit('WalletPilet.WriteContract', {
  abi: stakeABI, address: STAKE_ADDRESS, fn: 'stake', args: [amount],
  eventKey: 'stake'     // ← 唯一标识
});

// Claim.tsx — 领取操作，标记 eventKey = 'claim'
app.emit('WalletPilet.WriteContract', {
  abi: claimABI, address: CLAIM_ADDRESS, fn: 'claim', args: [],
  eventKey: 'claim'     // ← 不同的标识
});

// 监听时通过 eventKey 过滤
app.on('WalletPilet.WritedEmit', ({ state, hash, error, eventKey }) => {
  if (eventKey !== 'stake') return;  // 只处理自己发起的请求
  // ...
});
```

**难点：**
- Shell 的 `WalletListenerComponent` 收到所有 Pilet 的所有请求，必须正确路由回调
- 链上交易是异步的（`waitForTransactionReceipt`），一个交易可能持续数秒到数分钟
- 钱包断连、链切换时需要清理所有 pending 交易的回调
- `eventKey` 是约定的字符串，无编译时校验，写错会导致回调丢失

---

### 5.3 难点三：多版本 API 并存的请求管理

**问题：** 项目对接多个后端服务，API 版本碎片化严重。

```
/aiengineer/*        → V1 AI 工程师接口
/aiengineer-v2/*     → V2 AI 工程师接口
/vote/*              → 投票系统接口
/triasConvert/*      → 代币兑换接口
/agent/chat          → Agent 对话接口（Socket.io）
```

**FetchApis 封装（两个 Pilet 各自独立实现）：**

```typescript
// netx-pliet-site/src/uilts/api.ts
export class FetchApis {
  constructor(private app: any) {}

  // 带认证的请求
  async request(url: string, method: string, body?: any) {
    const headers: any = { "Content-Type": "application/json" };
    headers['Authorization'] = `Bearer ${localStorage.getItem("token")}`;
    // ...
  }

  // V1 / V2 API 共存
  getStakeInfoUrl()     { return `${BASE_URL}/aiengineer/stakeInfo`; }
  getStakeInfoV2Url()   { return `${BASE_URL}/aiengineer-v2/stakeInfo`; }
  getUserInfoUrl()      { return `${BASE_URL}/aiengineer/userInfo`; }
  getUserInfoV2Url()    { return `${BASE_URL}/aiengineer-v2/userInfo`; }
}
```

**难点：**
- 不同 API 版本的错误码不统一（V1 用 `40001`，V2 用 `40002`）
- Token 过期处理分散在不同 Pilet 中，无统一刷新机制
- 手动实现 3 次重试逻辑，无指数退避
- API URL 在两个 Pilet 中分别定义，可能不一致

---

### 5.4 难点四：Agent 实时对话的流式渲染

**问题：** AI Agent 对话使用 Socket.io 实现流式输出，需要实时渲染 Markdown + 代码高亮 + 数学公式。

**Socket.io 连接管理：**

```typescript
// Agent 对话页面
const socket = io(AGENT_CHAT_URL, {
  transports: ['websocket'],
  query: { token: localStorage.getItem('token') },
});

// 发送消息
socket.emit('sendMessage', { agentId, message });

// 接收流式回复
socket.on('receivetrainingCampCodeRecords', (data) => {
  // 逐步拼接 Markdown 内容
  setMessages(prev => [...prev, { role: 'assistant', content: data.chunk }]);
});

// 组件卸载时必须清理
socket.off('receivetrainingCampCodeRecords');
socket.disconnect();
```

**Markdown + KaTeX 实时渲染：**

```typescript
import MarkdownIt from 'markdown-it';
import katex from 'markdown-it-katex';

const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return '';
  }
}).use(katex);

// 流式内容渲染
<div dangerouslySetInnerHTML={{
  __html: md.render(streamingContent)
}} />
```

**难点：**
- 流式输出时 Markdown 可能不完整（如 ````code block 未闭合），导致渲染异常
- KaTeX 公式实时解析性能——每次新 chunk 到达都需要重新渲染整个消息
- Socket.io 断连重连后，需要恢复对话上下文
- `dangerouslySetInnerHTML` 存在 XSS 风险，需要对输入做 sanitization

---

### 5.5 难点五：多服务 Nginx 路由编排

**问题：** 项目对接 6+ 个后端服务，Nginx 需要精确路由到不同的 IP:Port。

**Nginx 配置（website/default.conf）：**

```nginx
# WebSocket 代理 — Agent 对话服务
location /socket.io {
    proxy_pass http://192.168.30.13:18546;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Agent Chat REST API
location /agent/chat {
    proxy_pass http://192.168.30.13:18545;
}

# 主 API 服务
location /api {
    proxy_pass http://192.168.30.13:50024;
}

# 投票 API 服务
location /vote/api {
    proxy_pass http://vote-api:20021;
}

# Feed Service — Pilet 模块分发
location /netx/api {
    proxy_pass http://node-server:50023;
}
```

**难点：**
- WebSocket 代理需要额外的 `Upgrade` / `Connection` 头配置
- 硬编码 IP 地址，服务迁移时需要逐个修改
- 静态资源路由需要复杂的正则排除规则（排除 `/files` 路径）
- CORS 配置 `Access-Control-Allow-Origin *` 在生产环境存在安全风险

---

### 5.6 难点六：钱包状态跨 Pilet 实时同步

**问题：** wagmi 的钱包状态变化（连接/断开/链切换/账户变更）需要在 Shell 和所有 Pilet 之间实时同步。

**Shell 统一监听 → 全局状态分发：**

```typescript
// eventHandlers.tsx — Shell 的 WalletListenerComponent
const account = useAccount();  // wagmi Hook 监听钱包变化

useEffect(() => {
  if (account && !account.isConnected) {
    setAccount(null);       // 写入全局状态 → 所有 Pilet 感知
    setSignation(null);
  } else {
    setAccount(account);    // 写入全局状态 → 所有 Pilet 感知
    setSignation(null);
  }
}, [account.address, account.chainId]);  // 监听地址和链 ID 变化
```

**Pilet 消费——任何 Pilet 中的任何组件：**

```typescript
// agent/connectWallet.tsx
const accountInfo = PiletApp._useGlobalState('account');

// 页面根据钱包状态自动切换 UI
{accountInfo?.isConnected ? <WalletPanel /> : <ConnectButton />}
```

**难点：**
- Piral 的全局状态更新会触发所有订阅了该状态的 Pilet 组件重渲染
- 链切换（Chain ID 变化）时需要重新获取所有合约数据和余额
- 钱包断连时需要清理所有 Pilet 的本地状态（authorization / agentStatus）
- RainbowKit 弹窗的 z-index 需要高于 Pilet 内的 Ant Design Modal

---

### 5.7 难点七：两个 Pilet 的差异化布局系统

**问题：** 主站 Pilet 使用顶栏布局（LayoutTop），Agent Pilet 使用侧边栏布局（LayoutSideNav），需要在同一个 Shell 中共存。

**Shell 定义布局：**

```typescript
// website/src/index.tsx — Shell 注册布局
createPageLayoutsApi({
  "layouts": {
    "LayoutTop": AppLayout      // 默认布局：Header + Content + Footer
  },
  "fallback": 'LayoutTop',      // 所有页面默认使用 LayoutTop
})
```

**Agent Pilet 注册独立布局和页面：**

```typescript
// netx-pliet-site-agent/src/index.tsx
// Agent 注册自己的侧边栏布局
app.registerPageLayout('LayoutSideNav', ({ children }) => {
  const ConnectedLayoutSide = React.useMemo(() =>
    parialReduxConnect(({ state, dispatch }) => (
      <LayoutSide state={state} dispatch={dispatch} app={app}>
        {children}
      </LayoutSide>
    )),
  []);
  return <ConnectedLayoutSide />;
});

// Agent 页面指定使用侧边栏布局
app.registerPage('/explore', ExploreComponent, { layout: 'LayoutSideNav' });
app.registerPage('/agent', AgentComponent, { layout: 'LayoutSideNav' });
```

**难点：**
- 切换路由时布局需要无缝切换（顶栏 → 侧边栏），不能出现闪烁
- Agent 的 LayoutSide 也消费了本地 Redux 状态，布局与页面状态联动
- 两种布局的 CSS 不能冲突（Styled Components 隔离）
- 侧边栏布局内的子路由导航由 Agent Pilet 自行管理

---

## 六、简历参考

### 项目名称

netx.world — Web3 + AI 微前端平台

### 项目描述

基于 Piral 微前端架构的 Web3 + AI 综合平台。采用 Shell / Pilet 插件化模式将主站与 AI Agent 模块解耦，通过自建 Feed Service（Node.js + PostgreSQL + Redis 三层缓存）实现模块动态发现与加载。设计全局状态 + 事件总线 + Extension Slot 三层通信机制，实现 Pilet 间数据共享与状态隔离。集成以太坊钱包全链路交互，提供 AI Agent 创建、实时对话、任务系统等功能。

### 技术栈

React 18 / TypeScript / Piral 微前端 / Webpack 5 / Ant Design / Styled Components / Redux / React Query / ethers.js / wagmi / viem / RainbowKit / Node.js / Express / GraphQL / Apollo Server / PostgreSQL / Redis / Socket.io / Docker / Nginx / Azure Pipelines

### 核心职责

- 设计并实现 Piral 微前端架构，采用 Shell / Pilet 插件化模式，通过自建 Feed Service（Node.js + Express + PostgreSQL + Redis 三层缓存）实现模块版本管理与动态加载，支持多团队独立开发部署
- 设计全局状态（PiralCustomState）+ 事件总线（emit/on）+ Extension Slot 三层数据通信机制，实现 Pilet 间数据共享与状态隔离，两个业务模块通过 Shell 中转通信，钱包操作统一由 Shell 管理
- 每个 Pilet 通过 `createReduxStore` 实现独立局部状态（主站管理页面计数，Agent 管理授权与 Agent 状态），与全局状态严格隔离，避免跨模块状态污染
- 实现 Web3 全链路集成，设计 `WalletPilet.*` / `WalletPilet.*Emit` 双向事件通道，覆盖钱包连接、签名认证、合约读写、交易发送等 11 类链上操作，通过 `eventKey` 标识支持并发请求隔离
- 开发 AI Agent 平台，基于 Socket.io 实现流式对话、Markdown + KaTeX + 代码高亮实时渲染、CodeMirror 代码编辑器
- 自建 Feed Service 支持多版本 Pilet 管理（PostgreSQL 窗口函数查询最新版本 + Redis 缓存加速 + 内存缓存热数据）
- 搭建全栈 Docker 容器化部署方案，Nginx 多服务反向代理（6+ 后端服务路由编排）+ Docker Compose 多服务编排 + Azure Pipelines CI/CD 自动化
- 实现双布局系统（主站 LayoutTop 顶栏布局 + Agent LayoutSideNav 侧边栏布局），基于 `piral-page-layouts` 按路由动态切换

### 面试亮点

**架构选型类：**

- **为什么选 Piral 而不是 qiankun**：Piral 的插件化 Pilet 架构比 qiankun 的"子应用容器"模式更适合平台型产品。Piral 内置 Extension Slot（声明式跨应用 UI 扩展）、Feed Service（模块注册中心）、TypeScript 类型安全、Emulator 独立开发，而 qiankun 需要自建这些能力。qiankun 的 `initGlobalState` 已标记 deprecated，Piral 的全局状态 + 事件总线更可持续

- **为什么不用 Module Federation**：MF 适合共享细粒度模块（组件/函数），但本项目需要的是完整的业务模块（带路由/页面/状态/布局），Piral 的 Pilet 粒度更合适。另外 MF 无沙箱隔离、无事件总线、无模块注册中心，这些都需要自建

**数据通信类：**

- **数据隔离策略**：三层隔离——局部 Redux（Pilet 内部状态隔离）、PiralCustomState（全局共享只读）、Event Bus（跨模块通信中转），确保模块间松耦合。对比 qiankun 的 `initGlobalState`（cloneDeep 性能差、子应用只能修改已存在的 key），Piral 的架构级隔离更轻量

- **Web3 操作一致性**：所有链上操作由 Shell 的 WalletListenerComponent 统一处理，Pilet 只发 emit 请求收 on 回调，避免多 Pilet 竞争操作钱包。对比 wujie 的全局广播（`$emit` 遍历所有应用），本项目的 Shell 中转模式更安全可控

- **eventKey 并发隔离**：多个并发链上请求通过 `eventKey` 参数区分回调归属，解决多组件同时监听同一事件类型的冲突问题

**难点攻克类：**

- **Feed Service 三层缓存**：内存 → Redis → PostgreSQL 三层架构，使用 PostgreSQL 窗口函数（`ROW_NUMBER() OVER PARTITION BY name ORDER BY version DESC`）查询最新版本，解决 Pilet 动态发布的版本一致性问题

- **Agent 流式对话**：基于 Socket.io + MarkdownIt + KaTeX 实现流式输出实时渲染，处理 Markdown 不完整解析、代码块未闭合等边界情况

- **钱包跨模块同步**：wagmi 钱包状态变化（连接/断开/链切换）通过 PiralCustomState 单一写入点实时分发至所有 Pilet，链切换时自动刷新所有合约数据和余额
