# React 高级面试指南 — 源码级解析与图解

---

## 目录

- [一、React 渲染流程（Reconciler → Renderer）](#一react-渲染流程)
- [二、Fiber 架构详解](#二fiber-架构详解)
- [三、Diff 算法源码级解析](#三diff-算法源码级解析)
- [四、Hooks 实现原理](#四hooks-实现原理)
- [五、React 18 并发特性](#五react-18-并发特性)
- [六、状态更新机制（setState 批处理）](#六状态更新机制)
- [七、合成事件系统](#七合成事件系统)
- [八、Context 与依赖追踪](#八context-与依赖追踪)
- [九、性能优化高频题](#九性能优化高频题)
- [十、React 源码中的设计模式](#十react-源码中的设计模式)

---

## 一、React 渲染流程

### 面试题：描述 React 从 JSX 到页面渲染的完整流程？

```
JSX
  ↓ babel/tsx 编译
React.createElement() / jsx()
  ↓ 产生
React Element (普通 JS 对象)
  ↓ render 阶段 (Reconciler)
Fiber 树构建
  ↓ commit 阶段 (Renderer)
真实 DOM 更新
```

### 两大阶段

```
┌─────────────────────────────────────────────────┐
│                  render 阶段                     │
│  (可中断 / 可恢复 / 优先级调度)                    │
│                                                  │
│  beginWork() → 自顶向下，创建/复用子 Fiber        │
│  completeWork() → 自底向上，收集副作用             │
│                                                  │
│  产出: Fiber 树 + EffectList                     │
└──────────────────────┬──────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│                commit 阶段                       │
│  (不可中断，同步执行)                              │
│                                                  │
│  ① beforeMutation: 读取 DOM 快照                 │
│  ② mutation:       操作真实 DOM                  │
│ ③ layout:          执行 useEffect/LayoutEffect   │
│                                                  │
│  产出: 页面更新                                   │
└─────────────────────────────────────────────────┘
```

### 源码关键调用链

```js
// packages/react-reconciler/src/ReactFiberWorkLoop.js

function performUnitOfWork(unitOfWork) {
  // 1. 处理当前 Fiber，返回下一个子 Fiber
  const next = beginWork(current, unitOfWork, renderLanes);

  if (next === null) {
    // 2. 没有子节点，自底向上完成
    completeUnitOfWork(unitOfWork);
  }
  return next;
}

function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    // 时间切片：每处理一个 Fiber 检查是否要让出主线程
    performUnitOfWork(workInProgress);
  }
}
```

---

## 二、Fiber 架构详解

### 面试题：为什么 React 16 要重写为 Fiber？Fiber 是什么？

**核心原因**：旧版 Stack Reconciler 是递归同步的，一旦开始无法中断，长任务会阻塞 UI。

### Fiber 节点结构（源码精简）

```js
// packages/react-reconciler/src/ReactFiber.js

const fiber = {
  // ── 静态结构 ──
  tag: FunctionComponent,   // 组件类型
  type: App,                // 具体的函数/类
  key: null,

  // ── 树结构（链表） ──
  return: parentFiber,      // 父节点
  child: firstChildFiber,   // 第一个子节点
  sibling: nextFiber,       // 右侧兄弟节点

  // ── 双缓冲 ──
  alternate: currentFiber,  // 指向另一棵树的对应节点

  // ── 副作用 ──
  flags: Placement,         // 需要 DOM 操作的标记
  deletions: [],            // 需要删除的子节点

  // ── 状态 ──
  memoizedState: hook链表头, // Hooks 链表 / 实例状态
  memoizedProps: {},        // 上一次的 props
  pendingProps: {},         // 新的 props

  // ── 优先级 ──
  lanes: SyncLane,          // 调度优先级
};
```

### 双缓冲图解

```
        current 树 (屏幕上)          workInProgress 树 (内存中构建)
            ┌─A─┐                         ┌─A'─┐
           /     \                       /      \
          B       C       ──切换──→     B'       C'
         /                             /
        D                             D'

  每个 Fiber 通过 alternate 指向对方：
  A.alternate === A'
  A'.alternate === A
```

### 为什么用链表而不用树？

```
递归树遍历（旧版）：
  调用栈深，无法暂停恢复

链表遍历（Fiber）：
  用 while 循环 + child/return/sibling 指针
  随时可以 yield，下次从 workInProgress 继续
```

---

## 三、Diff 算法源码级解析

### 面试题：React 的 Diff 算法策略是什么？时间复杂度为什么是 O(n)？

### 三大策略

```
策略1：Tree 级别 — 只跨层比较，不跨层移动
策略2：Component 级别 — 同类型才 Diff，不同直接替换
策略3：Element 级别 — 通过 key 识别节点身份
```

### 单节点 Diff 源码

```js
// packages/react-reconciler/src/ReactChildFiber.js

function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  const key = element.key;
  let child = currentFirstChild;

  while (child !== null) {
    if (child.key === key) {
      if (child.elementType === element.type) {
        // ✅ key 和 type 都匹配 → 复用
        const existing = useFiber(child, element.props);
        existing.return = returnFiber;
        return existing;
      }
      // ❌ key 匹配但 type 不匹配 → 删除旧的，跳出循环创建新的
      deleteChild(returnFiber, child);
      break;
    } else {
      // ❌ key 不匹配 → 删除
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }

  // 创建新 Fiber
  const created = createFiberFromElement(element);
  created.return = returnFiber;
  return created;
}
```

### 多节点 Diff 图解（两轮遍历）

```
旧: [A, B, C, D]    新: [B, A, E, C]

─── 第一轮：逐个比较 ───

  旧A vs 新B → key 不同，停止第一轮
  (记录 lastIndex = 0, 当前匹配 index = 0)

  第一轮结果: 无匹配

─── 第二轮：处理剩余 ───

  旧节点建 Map: { A: fiberA, B: fiberB, C: fiberC, D: fiberD }

  遍历新节点剩余 [B, A, E, C]:
    B → Map 中找到，复用（index 0 < lastIndex? 不移动）
    A → Map 中找到，复用（需要移动，因为 index < lastIndex）
    E → Map 中没有，新建
    C → Map 中找到，复用（需要移动）

  旧 Map 中剩余 D → 删除

最终: B 复用, A 移动, E 新建, C 移动, D 删除
```

### key 的本质作用

```
没有 key 时 (index 作为 key):

  旧: [div, div, div]     → key: 0, 1, 2
  新: [div, div, div, div] → key: 0, 1, 2, 3

  React 认为 0=0, 1=1, 2=2 → 前三个全部"复用"
  实际如果头部插入了一个新元素，前三个都应该移动

有 key 时:

  旧: [A, B, C]       → key: a, b, c
  新: [D, A, B, C]    → key: d, a, b, c

  A、B、C 通过 key 精准匹配 → 正确复用，D 新建
```

---

## 四、Hooks 实现原理

### 面试题：Hooks 为什么不能写在条件语句里？

### Hooks 链表结构

```
FunctionComponent Fiber
  │
  memoizedState → Hook1 → Hook2 → Hook3 → null
                   │        │        │
                state     effect   memo

每个 Hook 是一个链表节点:
{
  memoizedState: 存储的状态值,
  queue: {          // useState 专用
    pending: 更新队列环形链表,
    dispatch: setState 函数,
  },
  next: 下一个 Hook,  // ← 靠这个串联
}
```

### 条件语句导致错位图解

```
// 第一次渲染 (condition = true)
useState('A')  → Hook1 (state='A')
useEffect(...)  → Hook2 (effect)
useState('B')  → Hook3 (state='B')

memoizedState: Hook1 → Hook2 → Hook3

// 第二次渲染 (condition = false)
useState('A')  → Hook1 ✅ 匹配
// useEffect 被跳过！
useState('B')  → 本来要匹配 Hook3，实际拿到了 Hook2 ❌

结果：状态错乱，B 的值变成了 effect 的数据
```

### useState 源码核心

```js
// packages/react-reconciler/src/ReactFiberHooks.js

function useState(initialState) {
  // 获取当前 Hook 节点
  const hook = updateWorkInProgressHook();

  if (workInProgressHook === currentHook) {
    // 首次渲染
    hook.memoizedState = hook.queue.pending
      ? processUpdateQueue(hook, initialState)
      : initialState;
  } else {
    // 更新阶段：遍历环形更新链表，计算最新值
    hook.memoizedState = processUpdateQueue(hook, hook.memoizedState);
  }

  // dispatch 就是 setState
  const dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    hook.queue
  );

  return [hook.memoizedState, dispatch];
}

// Eager State 优化：如果新值和旧值相同，跳过调度
function dispatchSetState(fiber, queue, action) {
  const update = { action, lane: requestUpdateLane() };

  if (is(basename.currentState, eagerState)) {
    // 值没变 → 跳过 re-render
    return;
  }

  // 加入环形更新队列
  enqueueUpdate(queue, update);
  // 调度更新
  scheduleUpdateOnFiber(fiber, lane);
}
```

### useEffect vs useLayoutEffect 源码区别

```
                    useLayoutEffect          useEffect
                    ───────────────          ──────────
执行时机            commit 的 mutation       commit 的 layout 阶段
                    阶段之后，同步执行        之后，异步调度
                    (阻塞绘制)               (不阻塞绘制)

清理函数            在下次 effect 执行前      同左，但通过
                    同步执行                  MessageChannel 调度

源码标记            Update|LayoutStatic      Update|PassiveStatic
```

```
commit 阶段执行顺序:

  beforeMutation
       ↓
  mutation (操作 DOM)
       ↓
  useLayoutEffect 清理函数 ← 同步
       ↓
  useLayoutEffect 执行     ← 同步
       ↓
  浏览器绘制 (Paint)
       ↓
  useEffect 清理函数       ← 异步 (MessageChannel)
       ↓
  useEffect 执行           ← 异步
```

---

## 五、React 18 并发特性

### 面试题：React 18 的并发模式是什么？和 Concurrent Mode 有什么区别？

### 时间切片（Time Slicing）

```
一个长的渲染任务（不使用并发）：
├─────────── 50ms 渲染（阻塞）──────────→├── 用户交互被延迟 ──→

使用并发 + 时间切片：
├── 5ms 渲染 ──→ 让出 ├── 5ms 渲染 ──→ 让出 ├── 5ms 渲染 ──→
                  ↓ 用户交互              ↓ 用户交互
              立即响应                  立即响应
```

```js
// Scheduler 使用 MessageChannel 实现时间切片
const channel = new MessageChannel();
const port = channel.port2;

channel.port1.onmessage = performWorkUntilDeadline;

function scheduleCallback(priorityLevel, callback) {
  // 根据优先级安排回调
  const newTask = { callback, priorityLevel, expirationTime };
  push(taskQueue, newTask);
  schedulePerformWorkUntilDeadline();
}

function performWorkUntilDeadline() {
  const currentTime = getCurrentTime();
  deadline = currentTime + yieldInterval; // 通常 5ms

  while (taskQueue.length > 0) {
    if (currentTime >= deadline) {
      // 时间到了，让出主线程
      break;
    }
    const task = taskQueue.pop();
    task.callback();
  }

  if (taskQueue.length > 0) {
    // 还有任务，下一轮继续
    port.postMessage(null);
  }
}
```

### 优先级 Lane 模型

```
React 17 及之前：ExpirationTime 模型（单一数值）
React 18：Lane 模型（31 位二进制位掩码）

  二进制位:  0000 0000 0000 0000 0000 0000 0001 1000
                                    ↑              ↑
                              SyncLane        DefaultLane

常见 Lane:
  SyncLane           = 0b0000000000000000000000000000001  // 同步（最高）
  InputContinuousLane = 0b0000000000000000000000000000100  // 连续输入
  DefaultLane         = 0b0000000000000000000000000010000  // 默认
  IdleLane            = 0b0000000000000000000000100000000  // 空闲

优势：可以同时处理多个不同优先级的更新，互不干扰
```

### useTransition 源码级理解

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    // 高优先级：输入框立即响应
    setQuery(e.target.value);

    // 低优先级：搜索结果可以延迟更新
    startTransition(() => {
      setResults(heavySearch(e.target.value));
    });
  }

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultList results={results} />
    </div>
  );
}
```

```
执行流程:

  用户输入 "R"
    ↓
  setQuery("R")          ← SyncLane，高优先级
  startTransition(() => {
    setResults([...])    ← TransitionLane，低优先级
  })
    ↓
  高优先级先渲染：input 立即显示 "R"
    ↓
  浏览器有空闲时间后，渲染低优先级：更新 results
    ↓
  如果中间用户又输入 "Re"：
    ↓
  新的 SyncLane 渲染 input="Re"
    ↓
  旧的 Transition 被打断（因为内容过时了）
    ↓
  新的 Transition 渲染 results for "Re"
```

### useDeferredValue

```jsx
function SearchPage({ query }) {
  const deferredQuery = useDeferredValue(query);

  return (
    <div>
      <input value={query} />                    {/* 立即更新 */}
      <SlowList query={deferredQuery} />          {/* 延迟更新 */}
    </div>
  );
}

// 源码简化：本质上是带延时的 useState + useEffect
function useDeferredValue(value) {
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    // 使用 Transition 优先级更新
    const transition = startTransition;
    transition(() => {
      setDeferredValue(value);
    });
  }, [value]);

  return deferredValue;
}
```

---

## 六、状态更新机制

### 面试题：setState 是同步还是异步的？

### 核心结论

```
                    React 18 之前              React 18+
  ──────────────    ──────────────             ──────────
  React 事件内       异步（批处理）              异步（自动批处理）
  setTimeout 中      同步                       异步（自动批处理）
  Promise 中         同步                       异步（自动批处理）
  原生 DOM 事件      同步                       异步（自动批处理）
  flushSync 内       同步                       同步
```

### 自动批处理源码原理

```js
// React 18: 所有更新默认进入批处理

// packages/react-reconciler/src/ReactFiberWorkLoop.js

let executionContext = NoContext;

function scheduleUpdateOnFiber(fiber, lane) {
  // 检查是否在批处理上下文中
  if (executionContext !== NoContext) {
    // 在 React 上下文内 → 不立即渲染，先收集
    enqueueUpdate(fiber, update);
    return;
  }
  // 不在 React 上下文 → 进入调度
  ensureRootIsScheduled(root);
}

// flushSync 强制同步执行
function flushSync(fn) {
  const previousExecutionContext = executionContext;
  executionContext |= SyncContext; // 标记同步
  try {
    fn();
    flushSyncWork();  // 立即同步执行所有更新
  } finally {
    executionContext = previousExecutionContext;
  }
}
```

### 批处理图解

```
handleClick() {
  setCount(c => c + 1);   // 更新1: 入队
  setFlag(f => !f);        // 更新2: 入队
  setName('hello');        // 更新3: 入队
} // ← 函数结束，统一触发一次 re-render

  更新队列:
  ┌──────────────────────────────────┐
  │ count+1 → flag toggle → name    │
  │         全部合并为一次渲染         │
  └──────────────────────────────────┘

  最终：只触发 1 次 render，不是 3 次
```

---

## 七、合成事件系统

### 面试题：React 的事件机制和原生事件有什么区别？

### 事件委托图解

```
                    ┌──────────────────────────┐
                    │    document (React 16)    │
                    │   root (React 17+)        │ ← 事件监听挂在这里
                    └──────────┬───────────────┘
                               │ 冒泡捕获
          ┌────────────────────┼────────────────────┐
          │                    │                     │
    ┌─────┴─────┐       ┌─────┴─────┐        ┌─────┴─────┐
    │  <div>     │       │  <button> │        │  <input>  │
    │  onClick   │       │  onClick  │        │  onChange │
    └───────────┘       └───────────┘        └───────────┘

React 不会在每个元素上绑定事件！
而是在根节点统一监听，通过 Fiber 树找到处理函数
```

### 事件触发流程

```
用户点击 button
  ↓
原生 click 事件冒泡到 root
  ↓
React 收集从 target 到 root 路径上所有 onClick 处理函数
  ↓
构建 SyntheticEvent（合成事件对象）
  ↓
从 target 到 root 模拟"冒泡"执行
  ↓
  执行路径: button.onClick → div.onClick → ...
```

```js
// 源码：事件收集与派发 (简化)

function dispatchEvent(nativeEvent) {
  // 1. 从原生事件 target 沿 Fiber 树向上收集
  const targetFiber = getClosestInstanceFromNode(nativeEvent.target);
  const path = [];
  let fiber = targetFiber;
  while (fiber !== null) {
    if (fiber.memoizedProps.onClick) {
      path.push(fiber.memoizedProps.onClick);
    }
    fiber = fiber.return;
  }

  // 2. 构造合成事件
  const syntheticEvent = new SyntheticEvent(nativeEvent);

  // 3. 按冒泡顺序执行
  for (const handler of path) {
    handler(syntheticEvent);
    if (syntheticEvent.isPropagationStopped()) break;
  }
}
```

### e.stopPropagation() 的坑

```
          原生事件 (捕获阶段)     React 合成事件     原生事件 (冒泡阶段)
                ↓                      ↓                   ↓
          document 捕获              button.onClick     document 冒泡
                ↓                      ↓
          div 原生捕获               div.onClick
                ↓
          button 原生捕获

  如果在 button.onClick 中调用 e.stopPropagation():
    ✅ 阻止了 React 合成事件的继续冒泡（div.onClick 不执行）
    ❌ 不能阻止原生冒泡阶段（document 原生冒泡仍会触发）

  执行顺序：
  ① 原生捕获 (document → div → button)
  ② React 合成事件 (button → div)    ← React 特殊处理
  ③ 原生冒泡 (button → div → document)
```

---

## 八、Context 与依赖追踪

### 面试题：Context 的值变了，所有消费者都会 re-render 吗？

### Context 源码机制

```
Provider value 变化时:
  ↓
  找到所有订阅了这个 Context 的消费者 Fiber
  ↓
  给它们打上 "需要更新" 的标记
  ↓
  从消费者 Fiber 开始 re-render（不是从根组件）
```

```
  ┌── App ──────────────────────┐
  │                              │
  │  <ThemeContext.Provider       │
  │    value={theme}             │
  │  >                           │
  │    ┌── Header ──────────┐   │
  │    │ useTheme() ← 订阅  │   │  ✅ theme 变了，re-render
  │    └────────────────────┘   │
  │                              │
  │    ┌── Content ─────────┐   │
  │    │  ┌── Sidebar ───┐  │   │
  │    │  │ useTheme()   │  │   │  ✅ theme 变了，re-render
  │    │  └──────────────┘  │   │
  │    │  ┌── Main ──────┐  │   │
  │    │  │ 不使用 theme  │  │   │  ❌ 不会 re-render
  │    │  └──────────────┘  │   │
  │    └────────────────────┘   │
  │  </ThemeContext.Provider>   │
  └─────────────────────────────┘
```

### Context 的性能陷阱

```jsx
// ❌ 每次 App re-render，value 都是新的对象引用 → 所有消费者 re-render
function App() {
  const [count, setCount] = useState(0);
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ExpensiveTree />  {/* count 变了，这里也会 re-render */}
    </ThemeContext.Provider>
  );
}

// ✅ 用 useMemo 保持引用稳定
function App() {
  const [count, setCount] = useState(0);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);
  return (
    <ThemeContext.Provider value={value}>
      <ExpensiveTree />
    </ThemeContext.Provider>
  );
}
```

---

## 九、性能优化高频题

### 面试题：React.memo、useMemo、useCallback 的区别和正确使用场景？

### 三者对比

```
React.memo:    包裹组件 → 浅比较 props
useMemo:       缓存计算值 → 避免重计算
useCallback:   缓存函数引用 → 避免函数重建
```

### React.memo 源码级理解

```js
// packages/react-reconciler/src/ReactFiberBeginWork.js

function updateSimpleFunctionalComponent(current, workInProgress) {
  const prevProps = current.memoizedProps;
  const nextProps = workInProgress.pendingProps;

  // 如果组件被 memo 包裹
  if (workInProgress.type.prototype.isMemo) {
    // 浅比较 props
    if (shallowEqual(prevProps, nextProps)) {
      // props 没变 → 跳过整个子树的渲染
      return bailoutOnAlreadyFinishedWork(current, workInProgress);
    }
  }

  // props 变了 → 重新渲染
  return renderFunctionComponent(current, workInProgress);
}
```

### 常见反模式

```jsx
// ❌ 反模式1：每次渲染创建新对象
function Parent() {
  return <Child style={{ color: 'red' }} />;  // 每次都是新对象
}
// 即使 Child 用了 React.memo 也没用

// ✅ 修复
const style = { color: 'red' };
function Parent() {
  return <Child style={style} />;
}

// ❌ 反模式2：无意义的 useCallback
function Parent() {
  // 如果不传给子组件，这个 useCallback 没有任何意义
  const handleClick = useCallback(() => { /* ... */ }, []);
  return <div onClick={handleClick}>text</div>;
}

// ❌ 反模式3：useMemo 包裹简单值
const name = useMemo(() => user.name, [user.name]);
// useMemo 本身就有开销，简单赋值不需要缓存
```

### 虚拟列表原理（补充高频题）

```
  可视区域高度: 500px
  每项高度: 50px
  总数据: 1000 条

  不用虚拟列表: 渲染 1000 个 DOM 节点
  使用虚拟列表: 只渲染 ~10 个 DOM 节点

  ┌──────────────────────┐  ← scrollTop = 0
  │  Item 0  (渲染)      │
  │  Item 1  (渲染)      │
  │  ...                 │
  │  Item 9  (渲染)      │
  │                      │  ← 可视区域底部
  │  Item 10 (不渲染)    │
  │  ...                 │
  │  Item 999 (不渲染)   │
  └──────────────────────┘

  核心公式:
  startIndex = Math.floor(scrollTop / itemHeight)
  endIndex   = startIndex + Math.ceil(viewHeight / itemHeight)
  offsetY    = scrollTop  → 通过 transform/padding 撑开
```

---

## 十、React 源码中的设计模式

### 1. 策略模式 — 不同组件类型的处理

```js
// beginWork 根据 Fiber.tag 分发到不同处理函数
function beginWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, renderLanes);
    case ClassComponent:
      return updateClassComponent(current, workInProgress, renderLanes);
    case HostComponent:       // 原生 DOM
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:            // 文本节点
      return updateHostText(current, workInProgress);
    // ... 20+ 种类型
  }
}
```

### 2. 双缓冲模式 — current / workInProgress

```
切换时机：commit 阶段完成后
  root.current = finishedWork;

始终保证：
  current  = 屏幕上显示的树
  workInProgress = 正在构建的树

好处：
  - 如果渲染中断或出错，current 树不受影响
  - 用户始终看到完整的 UI
```

### 3. 观察者模式 — 状态订阅

```js
// useEffect 的订阅-清理模式
useEffect(() => {
  const subscription = subscribe(source, callback);
  return () => subscription.unsubscribe(); // 清理
}, [source]);

// 源码中通过 Effect 链表管理:
// mount: 创建 Effect，加入 Fiber.updateQueue
// update: 对比 deps，决定是否重新执行
// unmount: 执行所有清理函数
```

### 4. 链表模式 — Hooks 和 Effects

```
Hooks 链表:
  Fiber.memoizedState → Hook1 → Hook2 → Hook3 → null

Effects 环形链表 (useEffect):
  Hook.queue.pending → Update3 → Update1 → Update2 ─┐
                      ↑________________________________↓

Update 链表:
  Fiber.updateQueue → Update1 → Update2 → Update3 → null
```

---

## 附录：高频追问速查

| 题目 | 一句话答案 |
|------|-----------|
| React 为什么引入 Fiber？ | 实现可中断渲染，解决长任务阻塞 UI |
| Fiber 和虚拟 DOM 的关系？ | Fiber 是 Reconciler 的工作单元，虚拟 DOM 描述 UI 结构，Fiber 描述工作过程 |
| Diff 时间复杂度？ | O(n)，通过同层比较 + key 识别实现 |
| 为什么 Hooks 不能条件调用？ | Hooks 靠链表顺序对应，条件调用会打乱链表 |
| useState 惰性初始化？ | `useState(() => expensiveCompute())` 传入函数避免重复计算 |
| useEffect 和 useLayoutEffect？ | 前者在绘制后异步，后者在绘制前同步 |
| React 18 新特性？ | 自动批处理、useTransition、useDeferredValue、Suspense 支持服务端 |
| React 事件和原生事件顺序？ | 原生捕获 → React 合成 → 原生冒泡 |
| key 的作用？ | 帮助 Diff 算法识别节点身份，避免不必要的复用和移动 |
| 什么是 bailout？ | React 检测到 props/state 没变时跳过子树渲染的优化 |
| Scheduler 的作用？ | 调度任务优先级，实现时间切片和让出主线程 |
| React 19 新特性？ | React Compiler（自动 memoization）、use() hook、Server Components |

---

## 参考源码目录

```
packages/
├── react/                          # React 公共 API
│   └── src/React.js
├── react-dom/                      # DOM 渲染器
│   └── src/
│       ├── events/                 # 合成事件系统
│       └── ReactDOMHostConfig.js   # Host 配置
├── react-reconciler/               # 协调器（核心）
│   └── src/
│       ├── ReactFiber.js           # Fiber 节点定义
│       ├── ReactFiberWorkLoop.js   # 工作循环（时间切片）
│       ├── ReactFiberBeginWork.js  # render 阶段 - 向下
│       ├── ReactFiberCompleteWork.js # render 阶段 - 向上
│       ├── ReactFiberCommitWork.js # commit 阶段
│       ├── ReactFiberHooks.js      # Hooks 实现
│       ├── ReactFiberChildFiber.js # Diff 算法
│       └── ReactFiberLane.js       # 优先级模型
└── scheduler/                      # 调度器
    └── src/Scheduler.js
```
