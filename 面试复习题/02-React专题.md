# React 专题面试题

---

## 一、React 基础

### 1. JSX 本质
JSX 是 `React.createElement()` 的语法糖：
```javascript
// JSX
const el = <h1 className="title">Hello</h1>;

// 编译后
const el = React.createElement('h1', { className: 'title' }, 'Hello');

// 最终生成虚拟 DOM 对象
{ type: 'h1', props: { className: 'title', children: 'Hello' } }
```

### 2. 组件通信方式
| 方式 | 场景 |
|------|------|
| Props | 父 → 子 |
| 回调函数 | 子 → 父 |
| Context | 跨层级传递 |
| EventEmitter | 兄弟组件 |
| 状态管理库 | 全局状态（Redux/Zustand/Jotai） |
| Ref | 命令式调用子组件方法 |

### 3. 受控组件 vs 非受控组件
```javascript
// 受控组件：value 由 React state 控制
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />

// 非受控组件：通过 ref 获取 DOM 值
const inputRef = useRef();
<input ref={inputRef} />
// 获取值: inputRef.current.value
```

### 4. key 的作用
- 帮助 React 识别哪些元素发生了变化
- **必须稳定且唯一**（不用 index，因为列表变动时 index 不稳定）
- key 相同 → 复用组件（保留状态）；key 不同 → 销毁重建

### 5. React 事件机制
- React 17+ 事件委托到 root 节点（之前是 document）
- 合成事件（SyntheticEvent）是原生事件的跨浏览器包装
- 事件池（React 17 已移除）
- 事件执行顺序：原生事件 → React 合成事件

---

## 二、Hooks

### 1. 常用 Hooks
```javascript
useState           // 状态管理
useEffect          // 副作用（类似 componentDidMount + componentDidUpdate + componentWillUnmount）
useContext          // 获取 Context 值
useReducer          // 复杂状态逻辑
useRef              // DOM 引用 / 存储可变值（不触发渲染）
useMemo             // 缓存计算结果
useCallback         // 缓存函数引用
useLayoutEffect     // DOM 变更后同步触发（阻塞渲染）
useImperativeHandle // 暴露 ref 方法
```

### 2. useEffect 执行时机和清理
```javascript
// 挂载后 + 每次更新后执行
useEffect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe(); // 清理函数
}, [dependency]); // 依赖数组

// 仅挂载执行一次
useEffect(() => { ... }, []);

// 每次渲染都执行
useEffect(() => { ... });
```

### 3. useEffect vs useLayoutEffect
| 特性 | useEffect | useLayoutEffect |
|------|-----------|-----------------|
| 执行时机 | DOM 更新后异步执行 | DOM 更新后同步执行 |
| 阻塞渲染 | 不阻塞 | 阻塞 |
| 适用场景 | 数据请求、事件绑定 | 读取/修改 DOM 布局 |
| SSR 支持 | 支持 | 不支持（用 useIsomorphicLayoutEffect） |

### 4. useMemo vs useCallback
```javascript
// useMemo: 缓存计算值
const expensiveValue = useMemo(() => computeExpensive(a, b), [a, b]);

// useCallback: 缓存函数引用
const handleClick = useCallback(() => doSomething(id), [id]);

// useCallback(fn, deps) 等价于 useMemo(() => fn, deps)
```

### 5. 自定义 Hook 规范
```javascript
// 必须以 use 开头
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
```

### 6. Hooks 常见问题
- **条件性调用 Hook**：❌ 不能在条件/循环/嵌套函数中调用
- **闭包陷阱**：useEffect/useCallback 中捕获的是创建时的 state（用 ref 解决）
- **依赖数组遗漏**：使用 ESLint `react-hooks/exhaustive-deps` 检查

---

## 三、状态管理

### 1. React 状态更新机制
```javascript
// setState 是异步的（批处理）
const [count, setCount] = useState(0);

// 批量更新
setCount(1);
setCount(2);
setCount(3); // 最终 count = 3（不是 6）

// 函数式更新：基于前一个状态
setCount(prev => prev + 1); // 确保 +1
setCount(prev => prev + 1); // 再 +1，最终 +2
```

### 2. Redux 核心概念
```
Action → Dispatcher → Reducer（纯函数）→ Store → View
```

**三大原则：**
- 单一数据源（Single Source of Truth）
- State 只读（只能通过 dispatch action 修改）
- 纯函数 Reducer（输入相同，输出相同）

### 3. Redux Toolkit（RTK）实践
```javascript
// store/slices/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUser = createAsyncThunk('user/fetch', async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false, error: null },
  reducers: {
    clearUser(state) { state.data = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.loading = true; })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});
```

### 4. 状态管理方案对比
| 方案 | 特点 | 适用场景 |
|------|------|---------|
| useState/useReducer | 内置、轻量 | 组件内状态 |
| Context | 跨层级传递 | 主题、语言、用户信息 |
| Redux Toolkit | 可预测、中间件 | 大型应用、复杂状态流 |
| Zustand | 轻量、hook 友好 | 中小型项目 |
| Jotai/Recoil | 原子化状态 | 细粒度更新 |
| MobX | 响应式 | OOP 风格项目 |

---

## 四、性能优化

### 1. React.memo
```javascript
// 浅比较 props，props 不变则跳过渲染
const MyComponent = React.memo(function MyComponent({ name }) {
  return <div>{name}</div>;
});

// 自定义比较
const MyComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id; // true = 跳过渲染
});
```

### 2. React.lazy + Suspense 代码分割
```javascript
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 3. 常见优化手段
- **虚拟列表**：`react-window` / `react-virtuoso`（大数据量渲染）
- **useMemo/useCallback**：避免不必要的计算和函数重建
- **React.memo**：避免不必要的子组件渲染
- **代码分割**：`React.lazy` + `Suspense` / 动态 `import()`
- **图片优化**：懒加载、WebP、响应式图片
- **并发渲染**：`useTransition` / `useDeferredValue`（React 18+）

### 4. React 18 并发特性
```javascript
// useTransition: 标记低优先级更新
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchResults(filtered)); // 不阻塞输入

// useDeferredValue: 延迟更新值的副本
const deferredQuery = useDeferredValue(query);

// Suspense 支持 SSR
<Suspense fallback={<Loading />}>
  <Await resolve={dataPromise}>
    {(data) => <List data={data} />}
  </Await>
</Suspense>
```

---

## 五、React Router

### 1. 路由模式
```javascript
// Hash 模式: URL 带 #，不需要服务端配置
<HashRouter>

// History 模式: 干净 URL，需要服务端配置 fallback
<BrowserRouter>
```

### 2. React Router v6 核心 API
```javascript
import { Routes, Route, Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/user/:id" element={<User />} />
  <Route path="/dashboard/*" element={<Dashboard />}>
    <Route index element={<Overview />} />
    <Route path="settings" element={<Settings />} />
  </Route>
  <Route path="*" element={<NotFound />} />
</Routes>

// 编程式导航
const navigate = useNavigate();
navigate('/home');
navigate(-1); // 返回
```

### 3. 路由守卫（鉴权）
```javascript
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

<Route path="/admin" element={
  <ProtectedRoute><Admin /></ProtectedRoute>
} />
```

---

## 六、Next.js（SSR/SSG 框架）

### 1. 渲染模式对比
| 模式 | 时机 | 适用场景 |
|------|------|---------|
| CSR（客户端渲染） | 浏览器端 | SPA、交互密集型 |
| SSR（服务端渲染） | 每次请求 | 动态内容、SEO 敏感 |
| SSG（静态生成） | 构建时 | 博客、文档、内容固定 |
| ISR（增量静态再生） | 构建时 + 定期更新 | 内容定期变化 |
| RSC（React Server Components） | 服务端流式 | Next.js App Router |

### 2. App Router（Next.js 13+）
```typescript
// app/layout.tsx — 根布局（必须）
export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}

// app/page.tsx — 默认 Server Component
export default async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data}</div>;
}

// 'use client' — 声明客户端组件
'use client';
import { useState } from 'react';

// Server Actions
async function submit(formData: FormData) {
  'use server';
  await saveToDB(formData);
}
```

### 3. Next.js 数据获取
```typescript
// 缓存策略
fetch(url, { cache: 'force-cache' });     // SSG（默认）
fetch(url, { cache: 'no-store' });        // SSR
fetch(url, { next: { revalidate: 60 } }); // ISR — 60秒后重新验证
```

---

## 七、React 常见面试手写题

### 1. 实现 useState
```javascript
let state = [];
let index = 0;

function myUseState(initialValue) {
  const currentIndex = index;
  state[currentIndex] = state[currentIndex] ?? initialValue;

  const setState = (newValue) => {
    state[currentIndex] = typeof newValue === 'function'
      ? newValue(state[currentIndex])
      : newValue;
    index = 0; // 重置索引
    render();  // 触发重新渲染
  };

  index++;
  return [state[currentIndex], setState];
}
```

### 2. 实现一个简易 React
```javascript
// 虚拟 DOM → 真实 DOM
function createElement(type, props, ...children) {
  return { type, props: { ...props, children } };
}

function render(vdom, container) {
  if (typeof vdom === 'string' || typeof vdom === 'number') {
    container.appendChild(document.createTextNode(vdom));
    return;
  }
  const dom = document.createElement(vdom.type);
  Object.entries(vdom.props || {}).forEach(([key, value]) => {
    if (key === 'children') {
      value.forEach(child => render(child, dom));
    } else if (key.startsWith('on')) {
      dom.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      dom.setAttribute(key, value);
    }
  });
  container.appendChild(dom);
}
```
