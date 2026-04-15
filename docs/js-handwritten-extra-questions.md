# 手写 JS 代码题（进阶补充）

> 建议：先只看题目自己写，再对照你已有的题库和答案。

---

## 一、Promise 与异步控制

1. **手写 `Promise.allSettled`**
```js
Promise.myAllSettled = function (promises) {}
```
要求：无论成功失败都收集结果，返回形如 `{ status, value/reason }`。

2. **手写 `Promise.any`**
```js
Promise.myAny = function (promises) {}
```
要求：任意一个成功就 resolve，全部失败才 reject（可用 AggregateError 或数组）。

3. **手写 `promisify`**（Node 风格回调）
```js
function promisify(fn) {}
```
要求：把 `(args..., cb)` 转成返回 Promise 的函数。

4. **手写 `retry` 重试器**
```js
async function retry(task, times, delay) {}
```
要求：失败后重试，最多 `times` 次；支持间隔 `delay`。

5. **手写 `timeoutPromise`**
```js
function timeoutPromise(promise, ms) {}
```
要求：超时 reject，先完成则正常返回。

6. **手写串行执行任务队列**
```js
async function runSerial(tasks) {}
```
要求：`tasks` 是函数数组，按顺序执行并收集结果。

7. **手写并发池（固定并发）**
```js
async function runWithLimit(tasks, limit) {}
```
要求：同一时刻最多 `limit` 个任务执行。

8. **手写 sleep**
```js
function sleep(ms) {}
```
要求：返回 Promise，`await sleep(1000)` 可暂停。

---

## 二、函数式与工具函数

9. **手写 `once`**
```js
function once(fn) {}
```
要求：函数只执行一次，后续返回第一次结果。

10. **手写 `memoize`**
```js
function memoize(fn) {}
```
要求：对相同参数缓存结果。

11. **手写 `compose`（支持异步）**
```js
function composeAsync(...fns) {}
```
要求：函数可返回 Promise，按从右到左组合。

12. **手写 `pipe`**
```js
function pipe(...fns) {}
```
要求：从左到右执行。

13. **手写 `partial`**
```js
function partial(fn, ...preset) {}
```
要求：预置部分参数后返回新函数。

14. **手写可无限累加 `add`**
```js
add(1)(2)(3) == 6
add(1,2)(3,4) == 10
```
要求：支持链式调用，可通过 `toString/valueOf` 取值。

15. **手写 `currying`（占位符版）**
```js
function curry(fn) {}
```
要求：支持 `curry(fn)(1, _, 3)(2)` 这种写法。

---

## 三、对象/数组/深拷贝进阶

16. **手写 `deepEqual`**
```js
function deepEqual(a, b) {}
```
要求：支持对象、数组、Date、RegExp，处理循环引用更佳。

17. **手写 `pick`**
```js
function pick(obj, keys) {}
```
要求：按键数组挑出新对象。

18. **手写 `omit`**
```js
function omit(obj, keys) {}
```
要求：移除指定键后返回新对象。

19. **手写 `flattenObject`**
```js
function flattenObject(obj) {}
```
要求：`{a:{b:1}} -> {'a.b':1}`。

20. **手写 `unflattenObject`**
```js
function unflattenObject(obj) {}
```
要求：`{'a.b':1} -> {a:{b:1}}`。

21. **手写数组按字段分组 `groupBy`**
```js
function groupBy(arr, key) {}
```
要求：输出 `{keyValue: items[]}`。

22. **手写 `chunk`**
```js
function chunk(arr, size) {}
```
要求：按长度切片二维数组。

23. **手写 `shuffle`**
```js
function shuffle(arr) {}
```
要求：Fisher-Yates 洗牌算法。

24. **手写 `sortBy`**
```js
function sortBy(arr, getter) {}
```
要求：按函数返回值排序，不改原数组。

---

## 四、事件与发布订阅

25. **手写 EventEmitter（带 `once`）**
```js
class EventEmitter {}
```
要求：实现 `on/off/emit/once`。

26. **手写 mitt 风格事件总线**
```js
function createBus() {}
```
要求：API 精简，支持多事件。

27. **手写观察者模式**
```js
class Subject {}
class Observer {}
```
要求：`subscribe/notify/unsubscribe`。

---

## 五、浏览器常见手写

28. **手写 `jsonp`**
```js
function jsonp(url, params, cbName) {}
```
要求：动态 script 标签，处理成功与清理。

29. **手写 query 解析**
```js
function parseQuery(search) {}
```
要求：`'?a=1&b=2' -> {a:'1', b:'2'}`，考虑重复键。

30. **手写 query 序列化**
```js
function stringifyQuery(obj) {}
```
要求：对象转 query 字符串，注意编码。

31. **手写 `getType`**
```js
function getType(val) {}
```
要求：准确区分 `null`、`array`、`date`、`regexp` 等。

32. **手写 `new URLSearchParams` 简版**
```js
class MySearchParams {}
```
要求：`get/set/append/toString`。

---

## 六、面试高频综合题

33. **实现 LRU 缓存（Map 版）**
```js
class LRUCache {}
```
要求：`get/put` 平均 O(1)。

34. **实现简版模板引擎**
```js
render('Hi {{name}}', {name:'Tom'})
```
要求：变量替换，考虑缺失变量。

35. **实现简版深度监听 `watch`**
```js
function watch(obj, cb) {}
```
要求：可用 `Proxy`，属性变更时触发回调。

36. **实现链式任务调度器**
```js
scheduler.task(fn).task(fn).run()
```
要求：支持串行、可扩展并发。

37. **实现 React 请求去重工具**
```js
function createRequestDedup(fetcher) {}
```
要求：相同 key 并发请求复用同一个 Promise。

38. **实现请求缓存 + 过期时间**
```js
function createRequestCache(ttl) {}
```
要求：命中直接返回，过期后重新请求。

39. **实现地址简写（Web3）**
```js
function shortAddress(addr, start = 6, end = 4) {}
```
要求：`0x1234...abcd` 风格。

40. **实现金额最小单位转换**
```js
function formatWei(wei, decimals = 18) {}
```
要求：避免浮点误差（BigInt/大数库思路）。

---

## 练习顺序建议（高效）

- **第 1 天**：1-8（异步核心）
- **第 2 天**：9-15（函数式）+ 16-20（对象）
- **第 3 天**：21-27（数组与事件）
- **第 4 天**：28-40（浏览器 + React/Web3 业务题）

你可以在每道题后自己加：
- 时间复杂度
- 边界条件
- 业务应用场景（React/Web3/AI）
