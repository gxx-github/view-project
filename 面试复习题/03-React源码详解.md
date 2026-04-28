# React 源码详解

---

## 一、React 架构总览

### 1. 三层架构
```
┌─────────────────────────────────┐
│  Scheduler（调度器）             │  优先级调度、时间切片
├─────────────────────────────────┤
│  Reconciler（协调器）            │  Diff 算法、Fiber 树构建
├─────────────────────────────────┤
│  Renderer（渲染器）              │  DOM 操作 / Native 渲染
└─────────────────────────────────┘
```

- **Scheduler**：决定何时执行任务，基于优先级和浏览器空闲时间
- **Reconciler**：计算 Fiber 树的差异（Diff），标记需要变更的节点
- **Renderer**：将变更应用到真实 DOM（ReactDOM）或 Native 组件

---

## 二、Fiber 架构

### 1. 为什么需要 Fiber？
React 15 的 Stack Reconciler 是递归同步的，一旦开始不可中断，长任务会阻塞主线程导致卡顿。Fiber 将渲染工作拆分为小单元，支持**可中断、可恢复、可优先级调度**。

### 2. Fiber 节点结构
```javascript
const fiber = {
  // 静态结构
  tag: FunctionComponent | ClassComponent | HostComponent, // 组件类型
  type: App,            // 组件函数/类/DOM 标签名
  key: null,            // React key

  // 实例
  stateNode: document.createElement('div'), // 真实 DOM 节点或组件实例

  // Fiber 树结构（链表）
  return: parentFiber,  // 父节点
  child: firstChild,    // 第一个子节点
  sibling: nextSibling, // 右边兄弟节点

  // 工作单元
  pendingProps: {},     // 待处理的 props
  memoizedProps: {},    // 上一次的 props
  memoizedState: {},    // 上一次的 state（Hook 链表头）
  updateQueue: null,    // 更新队列

  // 副作用
  flags: Placement | Update | Deletion, // 需要执行的操作
  alternate: currentFiber, // 双缓冲：指向另一棵树的对应节点

  // 优先级
  lanes: NoLanes | SyncLane | DefaultLane,
};
```

### 3. 双缓冲机制（Double Buffering）
```
current 树（当前屏幕显示的）  ←→  workInProgress 树（正在构建的）

每次渲染：
1. 基于 current 树创建/复用 workInProgress 树
2. 在 workInProgress 树上执行 Diff 和标记
3. 渲染完成后，workInProgress 变为新的 current 树
```

- 避免闪烁：用户始终看到完整的 current 树
- 可中断：workInProgress 随时可以丢弃重来

### 4. Fiber 树遍历顺序（深度优先）
```
beginWork(node)     → 处理当前节点
  ↓
beginWork(child)    → 处理第一个子节点
  ↓
...（递归到叶子）
  ↓
completeWork(node)  → 叶子节点完成，向上归并
  ↓
sibling? → beginWork(sibling) : completeWork(return)
```

---

## 三、Diff 算法

### 1. Diff 三大策略（O(n) 复杂度）
1. **跨层级移动极少** → 只比较同一层级的节点
2. **不同类型的节点产生不同的树** → type 不同直接替换
3. **Key 标识节点身份** → 通过 key 判断节点是否可复用

### 2. 单节点 Diff
```
旧: <div key="a">
新: <p key="a">

key 相同但 type 不同 → 删除旧节点，创建新节点
```

### 3. 多节点 Diff（列表）
React 分两轮遍历：

**第一轮：逐一对比**
```
旧: A B C D
新: A B E F

A === A ✓（可复用）
B === B ✓（可复用）
C !== E → 第一轮结束
```

**第二轮：处理剩余节点**
```
旧剩余: C D
新剩余: E F

情况1: 新节点是旧节点的子集 → 删除旧多余节点
情况2: 新节点有新增 → 创建新节点
情况3: 有移动 → 用 key 建立 map，按新顺序标记移动
```

### 4. 标记副作用（flags）
```javascript
// Reconciler 阶段只做标记，不做 DOM 操作
Placement   // 插入
Update      // 属性更新
Deletion    // 删除
ChildDeletion // 子节点删除
Ref         // ref 变更
```

---

## 四、调度机制（Scheduler）

### 1. 优先级体系（Lanes 模型）
```javascript
// React 18 Lane 优先级（从高到低）
SyncLane           // 同步（用户输入、离散事件如 click）
InputContinuousLane // 连续输入（拖拽、滚动）
DefaultLane        // 默认（数据请求、setState）
TransitionLane     // 过渡（startTransition）
IdleLane           // 空闲（低优先级任务）
```

### 2. 时间切片（Time Slicing）
```javascript
// Scheduler 使用 MessageChannel 实现宏任务调度
const channel = new MessageChannel();
channel.port1.onmessage = workLoop;

function workLoop(deadline) {
  let shouldYield = false;
  while (nextWork && !shouldYield) {
    // 执行一个 Fiber 工作单元
    nextWork = performUnitOfWork(nextWork);
    // 检查是否需要让出主线程
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (nextWork) {
    // 还有工作未完成，调度下一个时间片
    scheduleCallback(workLoop);
  } else {
    // 全部完成，进入 Commit 阶段
    commitRoot();
  }
}
```

### 3. 高优先级插队
```
正在执行低优先级任务（如数据加载渲染）
↓
用户点击按钮（SyncLane 高优先级）
↓
中断当前任务，执行高优先级任务
↓
高优先级完成后，恢复/重做低优先级任务
```

---

## 五、Render 阶段（Reconciler）

### 1. beginWork — 处理单个 Fiber
```javascript
function beginWork(current, workInProgress, renderLanes) {
  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, renderLanes);
    case HostComponent: // <div> 等
      return updateHostComponent(current, workInProgress);
    // ...
  }
}

function updateFunctionComponent(current, workInProgress, renderLanes) {
  const nextProps = workInProgress.pendingProps;
  // 执行组件函数，得到 children（JSX）
  const nextChildren = renderWithHooks(current, workInProgress, Component, nextProps);
  // 为 children 创建 Fiber
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child; // 返回第一个子节点
}
```

### 2. completeWork — 完成 Fiber 处理
```javascript
function completeWork(current, workInProgress) {
  switch (workInProgress.tag) {
    case HostComponent:
      // 创建/复用 DOM 节点
      if (!current) {
        // 首次渲染：创建 DOM，设置属性
        const instance = createInstance(workInProgress.type, workInProgress.pendingProps);
        appendAllChildren(instance, workInProgress);
        workInProgress.stateNode = instance;
      } else {
        // 更新：Diff 属性，标记 Update
        updateDOMProperties(current, workInProgress);
      }
      break;
  }
  // 归并副作用到父节点
  bubbleProperties(workInProgress);
}
```

---

## 六、Commit 阶段（Renderer）

**Commit 阶段不可中断**，同步执行 DOM 操作。

### 1. 三个子阶段
```javascript
function commitRoot(root) {
  // 子阶段1: Before Mutation（读取 DOM 快照）
  commitBeforeMutationEffects(root, finishedWork);
  // — 处理 getSnapshotBeforeUpdate
  // — 调度 useEffect

  // 子阶段2: Mutation（操作 DOM）
  commitMutationEffects(root, finishedWork);
  // — 插入/更新/删除 DOM 节点
  // — current 树切换到新树

  // 子阶段3: Layout（DOM 更新完成）
  commitLayoutEffects(root, finishedWork);
  // — 执行 componentDidMount / componentDidUpdate
  // — 执行 useLayoutEffect 回调
  // — 执行 ref 更新
}
```

### 2. Mutation 阶段的 DOM 操作
```javascript
function commitMutationEffectsOnFiber(finishedWork) {
  const flags = finishedWork.flags;

  if (flags & Placement) {
    // 插入节点
    insertNode(finishedWork);
  }
  if (flags & Update) {
    // 更新 DOM 属性
    updateNodeProperties(finishedWork);
  }
  if (flags & ChildDeletion) {
    // 删除子节点
    deletions.forEach(child => {
      detachNode(child);
      unmountHostComponent(child);
    });
  }
}
```

---

## 七、Hooks 实现

### 1. Hook 链表结构
```javascript
// 每个 Fiber 的 memoizedState 指向 Hook 链表头
fiber.memoizedState → hook1 → hook2 → hook3 → null

const hook = {
  memoizedState: initialState,   // 当前状态值
  queue: {                       // 更新队列
    pending: updateCircularList, // 环形链表
    dispatch: setState,
  },
  next: nextHook,                // 下一个 Hook
};
```

### 2. useState 实现
```javascript
function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  hook.memoizedState = initialState;

  const queue = {
    pending: null,   // 待处理的更新（环形链表）
    lanes: NoLanes,
    dispatch: null,
  };
  hook.queue = queue;

  // dispatch 就是 setState
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
  queue.dispatch = dispatch;

  return [hook.memoizedState, dispatch];
}

function dispatchSetState(fiber, queue, action) {
  // 创建更新对象
  const update = {
    lane: requestUpdateLane(),  // 优先级
    action,                      // 新值或函数
    next: null,
  };

  // 加入环形链表
  const pending = queue.pending;
  if (pending === null) {
    update.next = update; // 指向自己
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;

  // 调度更新
  scheduleUpdateOnFiber(fiber, lane);
}
```

### 3. useEffect 实现
```javascript
function mountEffect(create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags, // 标记有副作用
    create,                    // 回调函数
    undefined,                 // 销毁函数（首次没有）
    nextDeps                   // 依赖数组
  );
}

// Commit 阶段异步调用
function flushPassiveEffects() {
  // 遍历所有标记了 HookHasEffect 的 effect
  // 先执行上次 effect 的清理函数
  // 再执行本次 effect 的回调
}
```

### 4. Hooks 规则的本质
Hooks 用**链表**存储，通过 Fiber 上的顺序索引来匹配。如果在条件语句中调用，链表顺序会错乱，导致状态混乱。这也是为什么 Hooks 不能在条件/循环中使用。

---

## 八、事件系统

### 1. 合成事件（SyntheticEvent）
```javascript
// React 17+ 事件委托到 root 容器
rootElement.addEventListener('click', dispatchEvent);

function dispatchEvent(nativeEvent) {
  // 1. 从事件目标向上收集 Fiber 路径
  const path = collectPathFromTargetToFiber(nativeEvent.target);
  // 2. 构建合成事件
  const syntheticEvent = createSyntheticEvent(nativeEvent);
  // 3. 捕获阶段：从 root 到 target 触发
  traverseTwoPhase(path, syntheticEvent, 'capture');
  // 4. 冒泡阶段：从 target 到 root 触发
  traverseTwoPhase(path, syntheticEvent, 'bubble');
}
```

### 2. 事件优先级
```javascript
// 离散事件（click, keydown）→ DiscreteEvent（SyncLane）
// 连续事件（mousemove, wheel）→ UserBlockingEvent
// 其他（load, transition）→ IdleEvent
```

---

## 九、React 18 新特性源码

### 1. Automatic Batching（自动批处理）
```javascript
// React 18 之前：只在 React 事件中批处理
// React 18：所有更新自动批处理（setTimeout、Promise、原生事件中）

// 源码关键：scheduleUpdateOnFiber 中判断 lane
// 如果当前没有正在进行的渲染，会合并多次 setState
```

### 2. Suspense 源码实现
```javascript
// 当子组件 throw promise 时：
// 1. 被 ErrorBoundary 捕获（捕获 thenable）
// 2. 注册 thenable 回调
// 3. 隐藏 Suspense 子树，显示 fallback
// 4. promise resolve 后，重新触发渲染
// 5. 显示 Suspense 子树内容

// 关键代码位置：ReactFiberThrow.js
function throwException(fiber, value) {
  if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
    // 这是一个 thenable（Promise）
    const thenable = value;
    attachRetryThenable(thenable, fiber); // 注册回调
  }
}
```

### 3. Concurrent Mode
```
传统模式：        setState → 同步渲染整个树 → 屏幕更新
并发模式：        setState → 可中断地渲染 → 时间切片 → 全部完成后屏幕更新
                 ↑ 高优先级可插队
```

---

## 十、React 源码面试高频题

### Q1: React 渲染流程？
```
setState → 入队更新 → 调度（Scheduler） → Render 阶段（可中断）
  → beginWork（自顶向下构建 workInProgress 树）
  → completeWork（自底向上完成节点）
  → 收集副作用 → Commit 阶段（不可中断）
  → BeforeMutation → Mutation → Layout → 屏幕更新
```

### Q2: Fiber 为什么用链表而不用树？
链表可以在任意节点暂停、恢复、丢弃。递归树做不到中断后恢复执行。

### Q3: 为什么 setState 是异步的？
React 会将多个 setState 合并（批处理），减少不必要的渲染。在 React 18 中所有场景都自动批处理。

### Q4: useEffect 为什么在渲染后异步执行？
useEffect 在 Commit 的 Layout 阶段之后异步调度，不阻塞浏览器绘制。useLayoutEffect 在 Mutation 后同步执行，会阻塞绘制。

### Q5: React 如何实现可中断渲染？
1. Fiber 链表结构支持逐节点遍历
2. Scheduler 基于 MessageChannel 实现时间切片
3. 每个 workLoop 检查剩余时间，不够就 yield
4. 高优先级任务到来时中断当前低优先级任务
