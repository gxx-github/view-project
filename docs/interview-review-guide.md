# 前端面试复习要点（React + Web3 + AI 方向）

> 面向 React Web3 AI 行业的前端开发面试梳理

---

## 一、JavaScript 基础（必考）

### 1. 执行上下文与作用域

- **执行上下文**：全局、函数、eval；包含变量环境、词法环境、this。
- **作用域链**：词法作用域（静态），由定义位置决定。
- **闭包**：函数引用外部变量，形成闭包；用途：数据私有、柯里化、防抖节流。
- **var / let / const**：var 提升且可重复声明；let/const 暂时性死区、块级作用域。

### 2. this 与原型

- **this**：默认绑定、隐式绑定、显式绑定（call/apply/bind）、new 绑定；箭头函数无 this，取外层。
- **原型链**：`__proto__`、`prototype`；`Object.create`、`instanceof` 原理。
- **继承**：组合继承、寄生组合继承（推荐）；ES6 class extends。

### 3. 异步与事件循环

- **宏任务 / 微任务**：setTimeout/setInterval、I/O 为宏任务；Promise.then、queueMicrotask、MutationObserver 为微任务；微任务先于同轮宏任务执行。
- **async/await**：语法糖，基于 Promise；错误用 try/catch 或 .catch 处理。

### 4. ES6+ 常用

- 解构、展开、模板字符串、箭头函数、可选链 `?.`、空值合并 `??`。
- Symbol、Map/Set、WeakMap/WeakSet 使用场景。
- Proxy/Reflect（Vue3 响应式、元编程）。

---

## 二、React 核心（重点）

### 1. 组件与数据流

- **函数组件 + Hooks**：useState、useEffect、useContext、useRef、useMemo、useCallback。
- **受控 / 非受控组件**：表单值由 state 控制 vs 由 DOM/ref 控制。
- **状态提升**：共享状态提到共同父组件。
- **单向数据流**：父 → 子 props；子 → 父 回调或状态提升。

### 2. 生命周期与 useEffect

- 挂载、更新、卸载在函数组件中对应 useEffect 的依赖与 return 清理。
- **依赖数组**：`[]` 仅挂载执行；不传每次渲染执行；正确列出依赖避免闭包陷阱。

### 3. 性能优化

- **React.memo**：避免无意义子组件重渲染（浅比较 props）。
- **useMemo**：缓存计算结果，依赖不变不重算。
- **useCallback**：缓存函数引用，避免子组件因函数引用变化重渲染。
- **key**：列表用稳定、唯一 key，避免用 index 导致 diff 错误和状态错位。
- **懒加载**：`React.lazy` + `Suspense` 做路由/组件懒加载。
- **虚拟列表**：长列表用 react-window、react-virtualized 等。

### 4. Hooks 规则与原理（常问）

- 只在顶层和 React 函数中调用 Hooks；自定义 Hook 内部可再调 Hooks。
- **原理**：Fiber 上通过「调用顺序」存 Hook 链表，所以顺序不能变。

### 5. 状态管理

- **Context**：跨层传值，避免 prop drilling；注意滥用导致大范围重渲染，可拆 Context 或配合 useMemo。
- **Redux / Zustand / Jotai**：何时用、单向数据流、中间件（如 Redux Thunk、RTK Query）。

### 6. 与手写题的结合

- 防抖/节流用在搜索、resize、scroll。
- Promise/async 用在请求、Web3 异步流程。
- 深拷贝用在不可变更新（若不用 Immer 等库时）。

---

## 三、Web3 相关（行业向）

### 1. 基础概念

- **钱包**：MetaMask、WalletConnect；连接、断开、切换链、签名。
- **链与网络**：mainnet、testnet；chainId、RPC。
- **交易与 Gas**：gas、gasPrice、nonce；估算与提速方式。

### 2. 前端常用库

- **ethers.js / viem**：Provider、Signer、合约调用、ABI、事件监听。
- **wagmi + viem**：React Hooks 风格连接钱包、读合约、发交易。
- **Web3Modal / RainbowKit**：连接 UI、多钱包支持。

### 3. 安全与体验

- **金额与精度**：用最小单位（wei 等）+ BigInt 或专用库，避免浮点；展示时再格式化。
- **签名与授权**：区分「签名消息」与「签名交易」；谨防钓鱼与恶意合约。
- **错误处理**：用户拒绝、网络错误、合约 revert；友好提示与重试。

### 4. 可说的项目点

- 连接钱包流程、多链切换、NFT 展示/交易、Token 转账、合约只读/写入封装。

---

## 四、AI 相关（行业向）

### 1. 前端与 AI 结合

- **调用 API**：OpenAI、Claude、自建模型 API；流式响应（SSE）处理。
- **Prompt 与展示**：输入框、历史记录、Markdown 渲染（如 react-markdown）、代码高亮。
- **流式 UI**：逐字/逐段渲染，优化等待体验。

### 2. 可能涉及的技术

- **LangChain / 类似 SDK**：链式调用、Agent、RAG 概念（能说清业务用途即可）。
- **向量与检索**：前端多为展示结果；理解「检索增强」对回答质量的作用。
- **Token 与长度**：上下文长度限制、截断与摘要策略。

### 3. 可说的项目点

- 聊天界面、流式输出、多轮对话、与 Web3 结合（如 AI 生成内容再上链、AI 辅助填写表单）。

---

## 五、网络、工程与通用

### 1. HTTP 与请求

- **HTTP 方法、状态码**：GET/POST、200/301/304/400/401/403/404/500。
- **缓存**：强缓存（Expires、Cache-Control）、协商缓存（Last-Modified、ETag）。
- **跨域**：同源策略；CORS、JSONP、代理（开发环境）。
- **fetch / axios**：拦截器、取消请求（AbortController）、错误统一处理。

### 2. 前端工程

- **打包**：Vite、Webpack；tree-shaking、code split、懒加载。
- **TypeScript**：类型约束、接口定义、泛型在组件/API 中的使用。
- **测试**：单元测试（Vitest/Jest）、组件测试（React Testing Library）、E2E（Playwright/Cypress）了解即可。

### 3. 安全常识

- XSS：转义、CSP、避免 dangerouslySetInnerHTML 滥用。
- CSRF：Token、SameSite Cookie。
- 敏感信息不放前端、HTTPS。

---

## 六、面试话术与节奏

1. **先听清题意**：手写题先问「输入输出、边界、是否考虑错误」，再动笔。
2. **先说思路**：例如「用闭包存 timer」「用 WeakMap 解决循环引用」，再写代码。
3. **写完后**：自测 1～2 个用例，提一下时间/空间复杂度或可优化点。
4. **项目**：准备 1～2 个与 React/Web3/AI 相关的项目，能讲清楚技术选型、难点、你的贡献。
5. **反向提问**：技术栈、团队规模、业务方向、Web3/AI 在业务中的占比。

---

## 七、复习优先级建议

| 优先级 | 内容 |
|--------|------|
| P0     | JS 闭包/this/原型、Promise/事件循环、React Hooks、防抖节流/深拷贝/Promise 手写 |
| P1     | React 性能优化、状态管理、Web3 钱包与合约调用、HTTP/跨域 |
| P2     | AI 接口与流式、工程化与 TS、安全与项目复盘 |

把 **JS 手写题库** 和本文档一起用：手写题练到能默写 + 能讲清原理，再按 P0 → P1 → P2 过一遍知识点，面试时会从容很多。
