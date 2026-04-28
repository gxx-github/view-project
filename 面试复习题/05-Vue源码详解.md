# Vue 源码详解

---

## 一、Vue 3 整体架构

```
┌─────────────────────────────────────────┐
│  @vue/compiler-sfc                       │  SFC 编译器（.vue 文件编译）
├─────────────────────────────────────────┤
│  @vue/compiler-dom ← @vue/compiler-core │  模板编译器
├─────────────────────────────────────────┤
│  @vue/runtime-dom ← @vue/runtime-core   │  运行时（渲染器、组件系统）
├─────────────────────────────────────────┤
│  @vue/reactivity                         │  响应式系统（独立模块）
└─────────────────────────────────────────┘
```

**关键设计：** 响应式系统（reactivity）是独立的，不依赖渲染器，可以单独使用。

---

## 二、响应式系统源码

### 1. 依赖收集与触发（effect.ts）
```javascript
// 全局变量：当前正在执行的 effect
let activeEffect = null;
const effectStack = [];

// effect 栈：处理嵌套 effect
function effectStackPush(effect) {
  effectStack.push(activeEffect);
  activeEffect = effect;
}
function effectStackPop() {
  activeEffect = effectStack.pop();
}
```

### 2. effect 函数
```javascript
class ReactiveEffect {
  constructor(fn, scheduler) {
    this.fn = fn;              // 用户传入的回调
    this.deps = [];            // 收集了该 effect 的 dep 集合
    this.scheduler = scheduler; // 调度器（computed 用）
    this.active = true;
  }

  run() {
    // 执行 fn，期间访问响应式数据触发 track
    effectStackPush(this);
    try {
      return this.fn();
    } finally {
      effectStackPop();
    }
  }

  stop() {
    if (this.active) {
      cleanupEffect(this); // 从所有 dep 中移除自己
      this.active = false;
    }
  }
}

// cleanup: 避免无效触发
function cleanupEffect(effect) {
  effect.deps.forEach(dep => dep.delete(effect));
  effect.deps.length = 0;
}
```

### 3. track（依赖收集）
```javascript
// targetMap: WeakMap<target, Map<key, Set<effect>>>
const targetMap = new WeakMap();

function track(target, key) {
  if (!activeEffect) return; // 没有正在运行的 effect，不收集

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }

  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);            // dep 收集 effect
    activeEffect.deps.push(dep);      // effect 记录 dep（双向引用）
  }
}
```

### 4. trigger（触发更新）
```javascript
function trigger(target, key, type, newValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effects = new Set(); // 收集要执行的 effect

  // 收集该 key 对应的所有 effect
  const add = (dep) => {
    if (dep) dep.forEach(effect => effects.add(effect));
  };

  add(depsMap.get(key));

  // 数组特殊处理
  if (type === TriggerOpTypes.ADD && Array.isArray(target)) {
    add(depsMap.get('length')); // 新增元素触发 length 相关 effect
  }

  // 执行所有 effect
  effects.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect); // computed: 标记脏值
    } else {
      effect.run(); // watchEffect: 立即执行
    }
  });
}
```

### 5. reactive 实现（reactive.ts）
```javascript
const reactiveMap = new WeakMap();

function reactive(target) {
  if (typeof target !== 'object' || target === null) return target;

  // 已经代理过，直接返回
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) return existingProxy;

  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}

const mutableHandlers = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true;
    if (key === ReactiveFlags.RAW) return target;

    const res = Reflect.get(target, key, receiver);

    track(target, key); // 依赖收集

    if (typeof res === 'object' && res !== null) {
      return reactive(res); // 深层代理（懒代理，访问时才代理）
    }
    return res;
  },

  set(target, key, value, receiver) {
    const oldValue = target[key];
    const hadKey = Array.isArray(target)
      ? Number(key) < target.length
      : Object.prototype.hasOwnProperty.call(target, key);

    const result = Reflect.set(target, key, value, receiver);

    if (!hadKey) {
      trigger(target, key, TriggerOpTypes.ADD); // 新增
    } else if (oldValue !== value && (oldValue === oldValue || value === value)) {
      trigger(target, key, TriggerOpTypes.SET); // 修改（NaN 处理）
    }

    return result;
  },

  deleteProperty(target, key) {
    const hadKey = Object.prototype.hasOwnProperty.call(target, key);
    const result = Reflect.deleteProperty(target, key);
    if (hadKey && result) {
      trigger(target, key, TriggerOpTypes.DELETE);
    }
    return result;
  },
};
```

### 6. ref 实现
```javascript
function ref(value) {
  return new RefImpl(value);
}

class RefImpl {
  constructor(value) {
    this._isRef = true;
    this._value = toReactive(value); // 对象则用 reactive 包装
    this._rawValue = value;
  }

  get value() {
    trackRefValue(this); // 收集依赖
    return this._value;
  }

  set value(newVal) {
    if (newVal !== this._rawValue) {
      this._rawValue = newVal;
      this._value = toReactive(newVal);
      triggerRefValue(this); // 触发更新
    }
  }
}
```

### 7. computed 实现
```javascript
function computed(getterOrOptions) {
  let getter, setter;
  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions;
    setter = () => { console.warn('Write operation failed: computed value is readonly'); };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter);
}

class ComputedRefImpl {
  constructor(getter, setter) {
    this._setter = setter;
    this._value = undefined;
    this._dirty = true; // 脏标记：是否需要重新计算

    this.effect = new ReactiveEffect(getter, () => {
      // scheduler：依赖变化时不立即执行 getter，而是标记为脏
      if (!this._dirty) {
        this._dirty = true;
        triggerRefValue(this); // 通知使用 computed 的 effect
      }
    });
  }

  get value() {
    trackRefValue(this);
    if (this._dirty) {
      this._value = this.effect.run(); // 执行 getter 计算值
      this._dirty = false;             // 标记为干净
    }
    return this._value;
  }

  set value(newVal) {
    this._setter(newVal);
  }
}
```

**computed 惰性求值：** 只在首次访问 `.value` 或依赖变化后再访问时才重新计算。

---

## 三、渲染器源码

### 1. 渲染流程
```
createApp(App).mount('#app')
  ↓
app.mount(container)
  ↓
创建 VNode（组件 → VNode 树）
  ↓
render(vnode, container)
  ↓
patch(oldVNode, newVNode, container)
  ↓
processComponent / processElement
  ↓
mountComponent / patchElement
```

### 2. patch 函数
```javascript
function patch(n1, n2, container, anchor, parentComponent) {
  // 类型不同，直接卸载旧的
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1);
    n1 = null;
  }

  const { type, shapeFlag } = n2;

  switch (type) {
    case Text:
      processText(n1, n2, container);
      break;
    case Comment:
      processComment(n1, n2, container);
      break;
    case Fragment:
      processFragment(n1, n2, container);
      break;
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor, parentComponent);
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container, parentComponent);
      }
  }
}
```

### 3. 组件挂载过程
```javascript
function mountComponent(vnode, container, parentComponent) {
  // 1. 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent);

  // 2. 设置组件（安装 props、slots、setup 等）
  setupComponent(instance);

  // 3. 设置渲染副作用
  setupRenderEffect(instance, vnode, container);
}

function setupRenderEffect(instance, vnode, container) {
  // 组件级的 effect
  instance.update = effect(() => {
    if (!instance.isMounted) {
      // 首次挂载
      const subTree = instance.render.call(instance.proxy);
      patch(null, subTree, container, null, instance);
      instance.subTree = subTree;
      instance.isMounted = true;
    } else {
      // 更新
      const prevTree = instance.subTree;
      const nextTree = instance.render.call(instance.proxy);
      patch(prevTree, nextTree, container, null, instance);
      instance.subTree = nextTree;
    }
  });
}
```

### 4. Diff 算法核心（patchKeyedChildren）
```javascript
function patchKeyedChildren(c1, c2, container) {
  let i = 0;
  const l2 = c2.length;
  let e1 = c1.length - 1;
  let e2 = l2 - 1;

  // 1. 从头同步
  while (i <= e1 && i <= e2) {
    const n1 = c1[i], n2 = c2[i];
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container);
    } else break;
    i++;
  }

  // 2. 从尾同步
  while (i <= e1 && i <= e2) {
    const n1 = c1[e1], n2 = c2[e2];
    if (isSameVNodeType(n1, n2)) {
      patch(n1, n2, container);
    } else break;
    e1--;
    e2--;
  }

  // 3. 新节点多于旧节点 → 挂载
  if (i > e1) {
    if (i <= e2) {
      while (i <= e2) {
        patch(null, c2[i], container);
        i++;
      }
    }
  }
  // 4. 旧节点多于新节点 → 卸载
  else if (i > e2) {
    while (i <= e1) {
      unmount(c1[i]);
      i++;
    }
  }
  // 5. 乱序
  else {
    // 5.1 为新节点建立 key → index 映射
    const keyToNewIndexMap = new Map();
    for (i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i);
    }

    // 5.2 遍历旧节点，尝试复用
    for (i = s1; i <= e1; i++) {
      const newIndex = keyToNewIndexMap.get(c1[i].key);
      if (newIndex === undefined) {
        unmount(c1[i]); // 旧节点不存在于新列表 → 卸载
      } else {
        patch(c1[i], c2[newIndex], container); // 可复用 → patch
      }
    }

    // 5.3 移动和挂载（基于最长递增子序列）
    const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap);
    let j = increasingNewIndexSequence.length - 1;
    for (i = e2; i >= s2; i--) {
      if (newIndexToOldIndexMap[i - s2] === 0) {
        // 新节点 → 挂载
        patch(null, c2[i], container);
      } else if (j >= 0 && i === increasingNewIndexSequence[j]) {
        // 在递增序列中 → 不需要移动
        j--;
      } else {
        // 需要移动
        move(c2[i], container);
      }
    }
  }
}
```

### 5. 最长递增子序列（LIS）
```javascript
// Vue 3 使用贪心 + 二分查找实现 LIS
// 目的：找出不需要移动的节点序列，最小化 DOM 操作
function getSequence(arr) {
  const result = [0];
  const p = arr.slice(); // 前驱索引数组

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === 0) continue; // 0 表示新节点，跳过
    const lastIdx = result[result.length - 1];
    if (arr[i] > arr[lastIdx]) {
      p[i] = lastIdx;
      result.push(i);
      continue;
    }
    // 二分查找
    let lo = 0, hi = result.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[result[mid]] < arr[i]) lo = mid + 1;
      else hi = mid;
    }
    if (arr[i] < arr[result[lo]]) {
      p[i] = result[lo - 1] || 0;
      result[lo] = i;
    }
  }

  // 回溯得到完整序列
  let len = result.length;
  let idx = result[len - 1];
  while (len-- > 0) {
    result[len] = idx;
    idx = p[idx];
  }
  return result;
}
```

---

## 四、编译器源码

### 1. 模板编译三阶段
```javascript
// compiler-core/src/index.ts
export function baseCompile(template, options) {
  // 阶段1: Parse — 模板 → AST
  const ast = parse(template);

  // 阶段2: Transform — AST 转换（优化标记）
  transform(ast, {
    ...options,
    nodeTransforms: [
      transformElement,     // 元素转换
      transformText,        // 文本合并
      transformIf,          // v-if
      transformFor,         // v-for
      trackVForSlotScopes,  // slot 作用域
    ],
    directiveTransforms: {
      model: transformModel,  // v-model
      on: transformOn,        // v-on
      bind: transformBind,    // v-bind
    },
  });

  // 阶段3: Generate — AST → 渲染函数代码
  return generate(ast, options);
}
```

### 2. Parse 阶段
```javascript
// 状态机解析模板
function parse(template) {
  const context = createParserContext(template);
  const root = { type: NodeTypes.ROOT, children: [] };

  while (!isEnd(context)) {
    if (startsWith(context.source, '{{')) {
      // 插值: {{ msg }}
      root.children.push(parseInterpolation(context));
    } else if (startsWith(context.source, '<')) {
      if (startsWith(context.source, '</')) {
        // 结束标签
        parseTag(context, 'end');
      } else {
        // 开始标签 → 元素节点
        root.children.push(parseElement(context));
      }
    } else {
      // 纯文本
      root.children.push(parseText(context));
    }
  }

  return root;
}
```

### 3. Transform 阶段
```javascript
function transform(ast, options) {
  const context = createTransformContext(ast, options);

  // 深度优先遍历 AST
  traverseNode(ast, context);
}

function traverseNode(node, context) {
  // 进入节点时执行 transform
  const exitFns = [];
  const nodeTransforms = context.nodeTransforms;
  for (const transform of nodeTransforms) {
    const onExit = transform(node, context);
    if (onExit) exitFns.push(onExit);
  }

  // 递归处理子节点
  switch (node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context);
      break;
  }

  // 退出节点时执行（反向，确保子节点先处理完）
  exitFns.reverse().forEach(fn => fn());
}
```

### 4. Generate 阶段
```javascript
function generate(ast, options) {
  const context = createCodegenContext(ast, options);
  const { push, indent, deindent } = context;

  // 生成函数前导代码
  genFunctionPreamble(ast, context);

  // 生成渲染函数签名
  push(`function render(_ctx) {`);
  indent();

  // 生成返回值
  push(`return `);
  genNode(ast, context); // 递归生成每个节点的代码

  deindent();
  push(`}`);

  return context.code;
}

// 例如: <div class="app"><span>{{ msg }}</span></div>
// 生成:
// function render(_ctx) {
//   return _createVNode("div", { class: "app" }, [
//     _createVNode("span", null, _toDisplayString(_ctx.msg), PatchFlags.TEXT)
//   ])
// }
```

---

## 五、Vue 源码面试高频题

### Q1: Vue 3 为什么用 Proxy 替代 defineProperty？
1. Proxy 可以拦截属性添加/删除，不需要 `Vue.set`
2. Proxy 可以拦截数组操作
3. Proxy 是懒代理（用到才代理深层），defineProperty 需要一次性递归
4. Proxy 是标准 API，性能更好

### Q2: effect 嵌套怎么处理？
使用 effect 栈（effectStack）。进入新 effect 时 push，执行完 pop。确保 `activeEffect` 始终指向当前正在执行的最内层 effect。

### Q3: computed 缓存原理？
- 使用 `_dirty` 脏标记
- 依赖变化时只标记 `_dirty = true`，不重新计算
- 下次访问 `.value` 时如果 `_dirty` 才执行 getter
- 本质是惰性求值 + 脏标记模式

### Q4: Vue 更新粒度？
- **组件级更新**：响应式数据变化 → 触发组件 effect → 重新执行 render → Diff 子树
- **精确更新**：编译器标记 PatchFlag → Diff 时只比较动态部分
- 不像 React 需要手动 memo，Vue 响应式自动追踪依赖

### Q5: Vue 3 Tree-shaking 原理？
Vue 3 源码全部使用 ES Module，编译器只引入用到的功能。例如没有用 `v-model` 就不会打包 `vModelText` 等指令代码。运行时模块都是具名导出，打包工具可以移除未使用的代码。
