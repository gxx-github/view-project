# Vue 专题面试题

---

## 一、Vue 基础

### 1. Vue 2 vs Vue 3 核心区别
| 特性 | Vue 2 | Vue 3 |
|------|-------|-------|
| 响应式 | `Object.defineProperty` | `Proxy` |
| API 风格 | Options API | Composition API + Options API |
| 模板根节点 | 单根节点 | 支持多根节点（Fragment） |
| 生命周期 | `beforeCreate/created` 等 | `setup()` + `onMounted` 等 |
| TypeScript | 支持较弱 | 原生支持 |
| 性能 | - | 静态提升、PatchFlag、Tree-shaking |
| 内置组件 | - | Teleport、Suspense |
| 状态管理 | Vuex | Pinia |
| 编译器 | - | 更激进的优化 |

### 2. Vue 生命周期
```javascript
// Vue 3 Composition API
setup()                    // 组件创建前（替代 beforeCreate + created）
onBeforeMount(() => {})    // 挂载前
onMounted(() => {})        // 挂载后 ✓ 可访问 DOM
onBeforeUpdate(() => {})   // 更新前
onUpdated(() => {})        // 更新后
onBeforeUnmount(() => {})  // 卸载前
onUnmounted(() => {})      // 卸载后 ✓ 清理定时器/事件
onErrorCaptured(() => {})  // 捕获子组件错误
```

### 3. 组件通信
| 方式 | 方向 | 说明 |
|------|------|------|
| Props | 父 → 子 | 基础方式 |
| $emit | 子 → 父 | 事件触发 |
| v-model | 双向 | 语法糖：props + emit |
| provide/inject | 祖 → 后 | 跨层级 |
| ref + expose | 父 → 子 | 调用子组件方法 |
| EventBus | 任意 | Vue 3 推荐用 mitt |
| Pinia | 全局 | 状态管理 |

### 4. computed vs watch
```javascript
// computed: 有缓存的计算属性
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
// 只在依赖变化时重新计算，否则返回缓存值

// watch: 监听变化执行副作用
watch(source, (newVal, oldVal) => {
  // 执行异步操作或副作用
}, { immediate: true, deep: true });

// watchEffect: 自动收集依赖
watchEffect(() => {
  // 自动追踪回调中使用的响应式数据
  console.log(user.name);
});
```

---

## 二、Vue 响应式原理

### 1. Vue 2 响应式（Object.defineProperty）
```javascript
function defineReactive(obj, key, val) {
  const dep = new Dep(); // 每个属性一个依赖收集器

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      if (Dep.target) {
        dep.depend(); // 收集依赖（Watcher）
      }
      return val;
    },
    set(newVal) {
      if (newVal === val) return;
      val = newVal;
      dep.notify(); // 通知所有 Watcher 更新
    },
  });
}
```

**Vue 2 响应式缺陷：**
- 无法检测属性添加/删除（需用 `Vue.set` / `Vue.delete`）
- 无法检测数组索引直接赋值（`arr[0] = newVal`）
- 无法检测数组长度修改（`arr.length = 0`）
- 深度监听需要一次性递归到底（性能开销）

### 2. Vue 3 响应式（Proxy）
```javascript
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      track(target, key); // 收集依赖
      if (typeof res === 'object' && res !== null) {
        return reactive(res); // 懒递归（用到才代理）
      }
      return res;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        trigger(target, key); // 触发更新
      }
      return result;
    },
    deleteProperty(target, key) {
      const hadKey = key in target;
      const result = Reflect.deleteProperty(target, key);
      if (hadKey && result) {
        trigger(target, key); // 删除也能触发
      }
      return result;
    },
  });
}
```

**Vue 3 响应式优势：**
- 可以检测属性添加/删除
- 可以检测数组索引和长度变化
- 懒代理（访问嵌套对象时才代理，性能更好）
- 支持 Map/Set/WeakMap/WeakSet

### 3. ref vs reactive
```javascript
// ref: 包装基本类型为响应式（也可包装对象）
const count = ref(0);
count.value++; // 通过 .value 访问
// 模板中自动解包：{{ count }}

// reactive: 只能用于对象类型
const state = reactive({ count: 0, list: [] });
state.count++; // 直接访问

// shallowRef / shallowReactive: 浅层响应式
// triggerRef: 手动触发 shallowRef 更新
```

---

## 三、虚拟 DOM 与 Diff

### 1. Vue 3 虚拟 DOM
```javascript
// VNode 结构
const vnode = {
  type: 'div',             // 标签名或组件
  props: { class: 'app' }, // 属性
  children: [],             // 子节点
  key: null,                // Diff 用 key
  patchFlag: PatchFlags.TEXT, // 编译时优化标记
  shapeFlag: ShapeFlags.ELEMENT_CHILDREN,
  dynamicProps: ['class'],  // 动态属性
};
```

### 2. Vue 3 Diff 优化（PatchFlags）
编译时为动态节点打标记，Diff 时只比较动态部分：
```javascript
// 编译器生成的渲染函数
_createVNode("div", { class: _ctx.dynamicClass }, [
  _createVNode("span", null, _ctx.msg, PatchFlags.TEXT /* 标记 text 是动态的 */)
], PatchFlags.CLASS /* 标记 class 是动态的 */)

// PatchFlags 枚举
TEXT = 1           // 动态文本
CLASS = 2          // 动态 class
STYLE = 4          // 动态 style
PROPS = 8          // 动态属性（非 class/style）
FULL_PROPS = 16    // 有动态 key
EVENT_HANDLERS = 32 // 动态事件
```

### 3. Vue 3 Diff 算法（快速 Diff）
```
1. 从头同步：比较相同前缀节点
   旧: [A, B, C, D, E]
   新: [A, B, F, C, D, E]
   A===A ✓ B===B ✓ C!==F → 头部同步结束

2. 从尾同步：比较相同后缀节点
   C===C ✓ D===D ✓ E===E ✓

3. 新节点多余 → 挂载
   旧: [A, B]     新: [A, B, C]
   头尾同步后，新节点剩余 C → mount

4. 旧节点多余 → 卸载
   旧: [A, B, C]  新: [A, B]
   头尾同步后，旧节点剩余 C → unmount

5. 乱序情况 → 最长递增子序列（LIS）
   旧: [A, B, C, D, E]    新: [A, C, D, B, E]
   位置映射: C→1, D→2, B→3
   LIS: [1, 2]（C, D 不需要移动）
   只需移动 B
```

### 4. 静态提升（Static Hoisting）
```html
<!-- 编译前 -->
<div>
  <span>静态文本</span>
  <p>{{ dynamic }}</p>
</div>

<!-- 编译后：静态节点只创建一次 -->
const _hoisted_1 = _createVNode("span", null, "静态文本"); // 提升到渲染函数外

function render() {
  return _createVNode("div", null, [
    _hoisted_1,         // 复用静态节点
    _createVNode("p", null, _ctx.dynamic, PatchFlags.TEXT),
  ]);
}
```

### 5. Block Tree
```javascript
// Vue 3 将组件根节点作为 Block
// Block 会收集所有动态后代节点到一个数组（dynamicChildren）
// Diff 时不需要递归整棵树，只遍历 dynamicChildren 数组

// v-if / v-for 会创建新的 Block（Block 分支）
```

---

## 四、Composition API

### 1. setup 语法
```vue
<script setup>
import { ref, computed, onMounted } from 'vue';

// 响应式数据
const count = ref(0);
const user = reactive({ name: 'Tom' });

// 计算属性
const double = computed(() => count.value * 2);

// 方法
function increment() { count.value++; }

// 生命周期
onMounted(() => { console.log('mounted'); });

// Props & Emits
const props = defineProps<{ title: string }>();
const emit = defineEmits<{ (e: 'change', value: number): void }>();
</script>
```

### 2. 组合函数（Composables）
```typescript
// useCounter.ts
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0) {
  const count = ref(initialValue);
  const double = computed(() => count.value * 2);

  function increment() { count.value++; }
  function decrement() { count.value--; }
  function reset() { count.value = initialValue; }

  return { count, double, increment, decrement, reset };
}

// 使用
const { count, increment } = useCounter(10);
```

---

## 五、Vue 编译器

### 1. 编译流程
```
模板字符串 → Parse（解析为 AST）→ Transform（转换 AST）→ Generate（生成代码）
```

### 2. AST 节点类型
```javascript
// 元素节点
{ type: NodeTypes.ELEMENT, tag: 'div', props: [...], children: [...] }
// 文本节点
{ type: NodeTypes.TEXT, content: 'Hello' }
// 插值节点
{ type: NodeTypes.INTERPOLATION, content: { content: 'msg' } }
// 表达式节点
{ type: NodeTypes.EXPRESSION, content: 'count + 1' }
```

### 3. 编译优化总结
| 优化策略 | 说明 |
|---------|------|
| 静态提升 | 静态节点创建一次，复用 |
| PatchFlag | 标记动态内容类型，精确更新 |
| Block Tree | 收集动态节点，跳过静态遍历 |
| 静态块缓存 | v-once / v-memo 缓存渲染结果 |
| 内联事件 | 内联事件处理避免闭包开销 |

---

## 六、Vue Router

### 1. 路由配置
```javascript
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/user/:id', component: User, props: true },
    { path: '/admin', component: Admin, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
});
```

### 2. 导航守卫
```javascript
// 全局守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

// 路由独享守卫
{ path: '/admin', beforeEnter: (to, from) => { ... } }

// 组件内守卫
onBeforeRouteEnter((to, from) => { ... });
onBeforeRouteUpdate((to, from) => { ... });
onBeforeRouteLeave((to, from) => { ... }); // 防止未保存离开
```

---

## 七、Pinia 状态管理

```typescript
// stores/user.ts
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!user.value);

  // Actions
  async function login(credentials: LoginForm) {
    const res = await api.login(credentials);
    user.value = res.user;
  }

  function logout() {
    user.value = null;
    router.push('/login');
  }

  return { user, isLoggedIn, login, logout };
});

// 使用
const userStore = useUserStore();
userStore.login({ email, password });
```

---

## 八、Vue 常见面试题

### Q1: v-show vs v-if？
- `v-if`：条件为 false 时不渲染 DOM（真正的销毁和重建）
- `v-show`：始终渲染 DOM，通过 `display: none` 切换
- 频繁切换用 `v-show`，条件稳定用 `v-if`

### Q2: nextTick 原理？
Vue 更新 DOM 是异步的。`nextTick` 在 DOM 更新后执行回调。
```javascript
// 源码：使用 Promise.then 实现
const resolvedPromise = Promise.resolve();
function nextTick(fn) {
  return fn ? resolvedPromise.then(fn) : resolvedPromise;
}
```

### Q3: keep-alive 原理？
```vue
<KeepAlive :include="['Home', 'About']" :max="10">
  <component :is="currentComponent" />
</KeepAlive>
```
- 内部维护 `cache` 对象和 `keys` 数组
- 组件切换时不销毁，而是缓存 VNode
- 激活时触发 `onActivated`，停用时触发 `onDeactivated`
- LRU 缓存淘汰策略（超出 max 删除最久未访问的）

### Q4: Vue 和 React 对比？
| 维度 | Vue | React |
|------|-----|-------|
| 模板 | HTML 模板 | JSX |
| 响应式 | 自动追踪依赖 | 手动 setState/状态管理 |
| 更新粒度 | 组件级 + 精确更新 | 组件级 + Fiber 调度 |
| 状态管理 | 可变（mutable） | 不可变（immutable） |
| 学习曲线 | 渐进式、易上手 | 概念较多、灵活度高 |
| 编译优化 | 编译时标记（PatchFlag） | 运行时优化（Fiber） |
