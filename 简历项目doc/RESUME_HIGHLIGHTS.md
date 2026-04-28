# 前端项目简历亮点

## 项目一：Zen7 Social Platform（Web3 社交平台）

**技术栈：** Vue 3 + TypeScript + Vite 6 + Vuetify 3 + Pinia + Vue Router 4

**简历亮点：**

- 基于 Vue 3 Composition API + TypeScript 搭建 Web3 社交平台，集成 MetaMask/Coinbase 钱包登录，实现 nonce 签名验证 + JWT 双重认证体系
- 使用 Pinia 模块化状态管理（auth/apps/public 三大模块），配合 Axios 封装全局请求拦截、错误边界处理、CSRF 防护
- 集成 ethers.js 实现智能合约交互（NFT Agent 市场），包含 ABI 自动生成、合约调用、交易签名等完整链上交互链路
- 实现实时聊天系统、社交体系（好友/关注/动态/Gallery）、富文本编辑器（TipTap）、拖拽排序、数据可视化（ApexCharts）等复杂业务模块
- 基于 Vite 多环境构建策略（dev/preview/stage/prod），配合代码分割、Tree-shaking、路由懒加载等性能优化手段

---

## 项目二：Zen7 Chat Mini（AI 智能对话应用）

**技术栈：** React 18 + TypeScript + Tailwind CSS + Recoil + SWR + Radix UI

**简历亮点：**

- 基于 React 18 + Recoil + SWR 构建 AI 对话应用，集成 Chainlit 框架实现 WebSocket 实时通信与流式消息渲染
- 实现多钱包连接（MetaMask/WalletConnect），支持 eth_getEncryptionPublicKey 等链上操作
- 集成 PayPal 支付、Markdown 渲染（含数学公式）、Plotly 数据图表、国际化（i18next）等多功能模块
- 使用 Radix UI 无障碍组件 + Tailwind CSS 自定义设计系统，实现主题切换（Dark/Light）、可调整面板等高级 UI 交互
- 基于 Vite + SWC 构建优化，React Query 服务端状态管理，TypeScript Strict Mode 全量覆盖

---

## 项目三：Zentorg（文档站点）

**技术栈：** Next.js 15 + React 19 + Styled Components + Tailwind CSS

**简历亮点：**

- 基于 Next.js 15（Turbopack）+ React 19 搭建内容站点，利用 SSG 静态生成优化首屏加载性能
- 实现 Markdown 驱动的内容系统，支持语法高亮、自定义 remark 插件、动态内容渲染
- 采用 Styled Components + Tailwind CSS 双样式方案，组件级样式隔离与原子化 CSS 结合

---

## 项目四：Zen Platform（响应式应用）

**技术栈：** Vue 3 + Element Plus + Vite 6 + PostCSS

**简历亮点：**

- 基于 1440px 设计稿实现自定义屏幕适配方案（PostCSS px2rem + 自适应工具函数），覆盖多分辨率设备
- 实现多布局切换系统（Home/Dialogue 布局）、动态 Tab 管理、自定义日历组件等复杂交互

---

## 通用技术能力标签

| 类别 | 关键词 |
|------|--------|
| 框架 | Vue 3、React 18/19、Next.js 15 |
| 语言 | TypeScript（Strict Mode） |
| 状态管理 | Pinia、Recoil、SWR、React Query |
| UI 库 | Vuetify 3、Element Plus、Radix UI、Tailwind CSS |
| 构建工具 | Vite 6、Turbopack、Webpack |
| Web3 | ethers.js、MetaMask、WalletConnect、EIP-712 签名、智能合约交互 |
| 实时通信 | WebSocket、流式渲染 |
| 工程化 | 代码分割、Tree-shaking、多环境构建、自动导入 |
| 国际化 | vue-i18n、react-i18next |
| 其他 | SSG、响应式适配、PayPal 支付集成、数据可视化 |