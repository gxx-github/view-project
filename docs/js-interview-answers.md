# JavaScript 前端面试题参考答案

> 对应 `js-interview-questions.md` 的同编号答案

---

## 一、基础与语法

1. `var` 函数作用域且可重复声明、会变量提升；`let/const` 块级作用域，不可重复声明，存在 TDZ；`const` 声明后绑定不可重新赋值（对象内部属性可变）。
2. TDZ 是变量在声明前不可访问的区域，访问会抛 `ReferenceError`，用于避免提升带来的歧义。
3. 作用域链是查找变量时从当前词法作用域逐级向外层作用域查找的机制，直到全局作用域。
4. 闭包是函数与其词法环境的组合；常用于封装私有变量、防抖节流、柯里化、缓存。
5. `==` 会做隐式类型转换再比较，`===` 不做类型转换且类型和值都相等才为真；推荐优先用 `===`。
6. `undefined` 表示“未定义/缺省值”，`null` 表示“显式空值”；`typeof null === 'object'` 是历史遗留。
7. `Object.is()` 对 `NaN` 和 `-0/+0` 处理不同：`Object.is(NaN, NaN)` 为真，`Object.is(-0, +0)` 为假。
8. 箭头函数没有自己的 `this/arguments/prototype`，不能作构造函数；`this` 词法绑定到外层。
9. `for...in` 遍历可枚举键（含原型链，常用于对象）；`for...of` 遍历可迭代对象的值（数组、Map、Set、字符串）。
10. `forEach` 仅遍历无返回；`map` 映射新数组；`filter` 过滤；`reduce` 聚合/累积。

## 二、this、原型与对象

11. `this` 规则：默认绑定、隐式绑定、显式绑定（call/apply/bind）、new 绑定；箭头函数不走这套规则。
12. `call` 立即调用 + 参数逐个传；`apply` 立即调用 + 参数数组传；`bind` 返回新函数延迟调用。
13. `new` 过程：创建新对象 -> 连接原型 -> 绑定 this 执行构造函数 -> 返回对象（若构造函数显式返回对象则替换）。
14. 原型链是对象通过 `[[Prototype]]` 链接到其原型对象的查找链路，用于属性与方法共享。
15. `prototype` 是函数的属性（作为实例原型来源）；`__proto__` 是对象实例指向其原型的访问器。
16. `instanceof` 沿左操作数的原型链查找是否出现右操作数的 `prototype`。
17. `Object.create(null)` 创建“纯字典对象”，无原型、无 `toString` 等继承属性，适合做哈希表。
18. 浅拷贝只复制第一层引用；深拷贝递归复制嵌套对象。浅拷贝：展开、`Object.assign`；深拷贝：递归 + `WeakMap` 或 `structuredClone`。
19. 若对象互相引用/自引用，递归深拷贝会无限循环；需用 `WeakMap` 记录已拷贝对象防止死递归。
20. JSON 深拷贝会丢失 `Date/RegExp/Map/Set/undefined/function/Symbol`，且无法处理循环引用。

## 三、异步与事件循环

21. Event Loop：JS 单线程通过任务队列调度执行；每轮执行同步代码，再清空微任务，再取下一个宏任务。
22. 宏任务：`setTimeout/setInterval/I-O` 等；微任务：`Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`。
23. 因为当前宏任务结束后会先清空微任务队列，`Promise.then` 属于微任务，优先于 `setTimeout`（宏任务）。
24. `executor` 是同步执行；只有 `then/catch` 回调是异步（微任务）调度。
25. `async/await` 是 Promise 语法糖，`await` 会暂停函数后续逻辑并把后续逻辑放入微任务。
26. `await` 后续代码会在当前同步栈结束后执行，本质相当于 `Promise.resolve(x).then(...)`。
27. `all` 全成功才成功；`race` 谁先完成就采用谁；`allSettled` 全部完成后返回每项状态。
28. 用“任务队列 + running 计数器”实现：`running < limit` 时启动任务，完成后拉起下一项。
29. `fetch` 可用 `AbortController`；axios 可用取消机制；同时在状态层做“过期响应丢弃”。
30. 统一处理：`try/catch + 全局拦截器 + 统一错误类型/提示 + 日志上报`。

## 四、浏览器与前端工程常考

31. 防抖：高频触发只在“最后一次”执行（搜索输入）；节流：固定周期最多执行一次（滚动/拖拽）。
32. 事件委托：把子元素事件绑定到父元素，利用冒泡统一处理；优点省监听器、适合动态列表；缺点需判断 target。
33. 强缓存：`Cache-Control/Expires`；协商缓存：`ETag/If-None-Match`、`Last-Modified/If-Modified-Since`。
34. 跨域由同源策略触发；方案有 CORS、反向代理、JSONP（仅 GET，历史方案）。
35. URL 输入后：DNS 解析 -> TCP/TLS 建连 -> HTTP 请求响应 -> HTML 解析 -> 构建 DOM/CSSOM -> 渲染树 -> 布局与绘制 -> JS 执行可能触发重排重绘。
36. 重排是布局几何变化（开销大）；重绘是外观变化不影响布局（相对小）。
37. 优化：代码分割、懒加载、资源压缩、HTTP 缓存、图片优化、预加载、减少重排、虚拟列表、按需渲染。
38. XSS 是注入恶意脚本；防御：输出转义、白名单、CSP、避免不安全 HTML 注入。
39. CSRF 是借用户身份发起伪造请求；防御：CSRF Token、SameSite Cookie、校验 Referer/Origin。
40. 前端代码可被查看与逆向，密钥会泄露；敏感密钥应放服务端，由后端代理调用。

## 五、React 场景下的 JS 延伸（加分）

41. 不可变数据利于浅比较与变更检测，便于性能优化、状态可预测与调试。
42. 索引 key 在插入/删除/排序时会导致组件复用错位、状态串位；应使用稳定唯一 ID。
43. `useMemo` 缓存“值”，`useCallback` 缓存“函数引用”。
44. 常见闭包陷阱：`setInterval/useEffect` 读取旧 state、异步回调拿到旧 props；可用函数式更新或 `useRef`。
45. 依赖数组应包含 effect 中用到的外部可变值；不完整会造成陈旧数据，过多会导致频繁执行。
46. 手段：`React.memo`、拆分状态粒度、稳定 props 引用、避免父组件无关更新、列表虚拟化。
47. 自定义 Hook 设计：输入输出清晰、内部副作用可清理、错误与 loading 状态统一、尽量可组合。
48. 大列表优化：虚拟列表、分页/分段渲染、懒加载图片、减少每行计算和重渲染。
49. Web3 金额常是大整数最小单位（如 wei），浮点会精度丢失；应用 `BigInt` 或 BigNumber 库处理。
50. AI 流式：基于 SSE/流读取逐段更新 UI；支持取消（AbortController）、节流渲染、保持会话状态与错误回退。

---

## 面试答题模板（可直接套用）

1. 先给定义（1 句话）
2. 再讲机制（2-3 句）
3. 给一个业务例子（React/Web3/AI）
4. 最后补 1 个边界或坑点

这样回答会更结构化，也更像高级前端工程师的表达。
