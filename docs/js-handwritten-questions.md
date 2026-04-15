# JavaScript 手写代码题库（前端面试）

> 面向 React / Web3 / AI 前端开发的面试手写题整理

---

## 一、函数与 this 相关

### 1. 手写 call

```javascript
Function.prototype.myCall = function (context, ...args) {
  context = context ?? window;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};
```

### 2. 手写 apply

```javascript
Function.prototype.myApply = function (context, args = []) {
  context = context ?? window;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};
```

### 3. 手写 bind

```javascript
Function.prototype.myBind = function (context, ...args1) {
  const fn = this;
  return function F(...args2) {
    return fn.apply(this instanceof F ? this : context, [...args1, ...args2]);
  };
};
```

---

## 二、防抖与节流

### 4. 防抖 debounce（常用于搜索、resize）

```javascript
function debounce(fn, delay, immediate = false) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    if (immediate && !timer) {
      fn.apply(this, args);
    }
    timer = setTimeout(() => {
      if (!immediate) fn.apply(this, args);
      timer = null;
    }, delay);
  };
}
```

### 5. 节流 throttle（常用于 scroll、mousemove）

```javascript
function throttle(fn, delay) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}
```

---

## 三、深拷贝与对象/数组

### 6. 深拷贝（考虑循环引用、Date、RegExp、Map、Set）

```javascript
function deepClone(obj, map = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (map.has(obj)) return map.get(obj);

  const clone = Array.isArray(obj) ? [] : {};
  map.set(obj, clone);

  if (obj instanceof Map) {
    obj.forEach((v, k) => clone.set(deepClone(k, map), deepClone(v, map)));
    return clone;
  }
  if (obj instanceof Set) {
    obj.forEach((v) => clone.add(deepClone(v, map)));
    return clone;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key], map);
    }
  }
  return clone;
}
```

### 7. 手写 instanceof

```javascript
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;
  while (proto) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}
```

### 8. 手写 new

```javascript
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result !== null && typeof result === 'object' ? result : obj;
}
```

---

## 四、Promise 相关

### 9. Promise 简易实现（含 then、catch、resolve、reject）

```javascript
class MyPromise {
  static PENDING = 'pending';
  static FULFILLED = 'fulfilled';
  static REJECTED = 'rejected';

  constructor(executor) {
    this.state = MyPromise.PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.state === MyPromise.PENDING) {
        this.state = MyPromise.FULFILLED;
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };
    const reject = (reason) => {
      if (this.state === MyPromise.PENDING) {
        this.state = MyPromise.REJECTED;
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (v) => v;
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (e) => {
            throw e;
          };
    const p2 = new MyPromise((resolve, reject) => {
      if (this.state === MyPromise.FULFILLED) {
        queueMicrotask(() => {
          try {
            const x = onFulfilled(this.value);
            resolve(x);
          } catch (e) {
            reject(e);
          }
        });
      } else if (this.state === MyPromise.REJECTED) {
        queueMicrotask(() => {
          try {
            const x = onRejected(this.reason);
            resolve(x);
          } catch (e) {
            reject(e);
          }
        });
      } else {
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = onFulfilled(this.value);
              resolve(x);
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              const x = onRejected(this.reason);
              resolve(x);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    });
    return p2;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  static resolve(value) {
    return new MyPromise((resolve) => resolve(value));
  }
  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }
}
```

### 10. Promise.all

```javascript
Promise.myAll = function (promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) return reject(new TypeError(''));
    const result = [];
    let count = 0;
    const len = promises.length;
    if (len === 0) return resolve(result);
    for (let i = 0; i < len; i++) {
      Promise.resolve(promises[i]).then(
        (val) => {
          result[i] = val;
          if (++count === len) resolve(result);
        },
        (err) => reject(err)
      );
    }
  });
};
```

### 11. Promise.race

```javascript
Promise.myRace = function (promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) return reject(new TypeError(''));
    for (const p of promises) {
      Promise.resolve(p).then(resolve, reject);
    }
  });
};
```

### 12. 并发限制（如 limit 为 2，最多同时执行 2 个异步任务）

```javascript
function limitConcurrency(tasks, limit) {
  return new Promise((resolve, reject) => {
    const result = [];
    let index = 0;
    let running = 0;

    function run() {
      while (running < limit && index < tasks.length) {
        const i = index++;
        running++;
        const task = tasks[i];
        Promise.resolve(task())
          .then((val) => {
            result[i] = { status: 'fulfilled', value: val };
          })
          .catch((err) => {
            result[i] = { status: 'rejected', reason: err };
          })
          .finally(() => {
            running--;
            if (index < tasks.length) run();
            else if (running === 0) resolve(result);
          });
      }
    }
    run();
  });
}
```

---

## 五、数组与迭代

### 13. 手写 map

```javascript
Array.prototype.myMap = function (callback, thisArg) {
  const res = [];
  for (let i = 0; i < this.length; i++) {
    res.push(callback.call(thisArg, this[i], i, this));
  }
  return res;
};
```

### 14. 手写 reduce

```javascript
Array.prototype.myReduce = function (callback, initialValue) {
  let acc = initialValue !== undefined ? initialValue : this[0];
  let start = initialValue !== undefined ? 0 : 1;
  for (let i = start; i < this.length; i++) {
    acc = callback(acc, this[i], i, this);
  }
  return acc;
};
```

### 15. 手写 flat（拍平数组）

```javascript
function flat(arr, depth = 1) {
  if (depth <= 0) return arr;
  return arr.reduce(
    (acc, cur) =>
      acc.concat(Array.isArray(cur) ? flat(cur, depth - 1) : cur),
    []
  );
}
```

### 16. 数组去重

```javascript
// 基础
function unique(arr) {
  return [...new Set(arr)];
}
// 对象/数组等引用类型按某个 key 去重
function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    const k = key ? item[key] : JSON.stringify(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
```

---

## 六、柯里化与组合

### 17. 柯里化 curry

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...args2) => curried.apply(this, [...args, ...args2]);
  };
}
```

### 18. 组合函数 compose

```javascript
function compose(...fns) {
  return function (x) {
    return fns.reduceRight((acc, fn) => fn(acc), x);
  };
}
```

---

## 七、事件与异步

### 19. 发布订阅 EventEmitter

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }
  on(type, listener) {
    if (!this.events[type]) this.events[type] = [];
    this.events[type].push(listener);
  }
  off(type, listener) {
    if (!this.events[type]) return;
    this.events[type] = this.events[type].filter((l) => l !== listener);
  }
  emit(type, ...args) {
    (this.events[type] || []).forEach((listener) => listener(...args));
  }
  once(type, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(type, onceWrapper);
    };
    this.on(type, onceWrapper);
  }
}
```

### 20. 手写 AJAX（XMLHttpRequest）

```javascript
function ajax(url, options = {}) {
  const { method = 'GET', data = null, headers = {} } = options;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.response)
        : reject(new Error(xhr.statusText));
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(data);
  });
}
```

---

## 八、字符串与工具

### 21. 手写 trim

```javascript
String.prototype.myTrim = function () {
  return this.replace(/^\s+|\s+$/g, '');
};
```

### 22. 驼峰转短横线 / 短横线转驼峰

```javascript
// kebab-case -> camelCase
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
// camelCase -> kebab-case
function camelToKebab(str) {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}
```

### 23. 千分位格式化

```javascript
function formatThousands(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
```

---

## 九、与 React / 前端强相关

### 24. 虚拟 DOM diff 简化（同层比较、key 优化）

面试常问思路，可手写简化版：

- 只做同层比较，不跨层
- 有 key 时用 key 建立映射，减少移动
- 列表尽量保持稳定 key，避免用 index 当 key

### 25. 简单 LRU 缓存（可用于 React 缓存、接口缓存）

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return -1;
    const val = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.capacity) {
      this.cache.delete(this.cache.keys().next().value);
    }
  }
}
```

---

## 十、与 Web3 相关的小题

### 26. 大数/精度（前端与合约交互时常见）

- 知道 `BigInt`、`bignumber.js` 或 `ethers.BigNumber` 的用途
- 能口述：金额用最小单位（wei/satoshi）再格式化展示，避免浮点误差

### 27. 十六进制/地址简写

```javascript
function shortAddress(address, start = 6, end = 4) {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
```

---

## 刷题建议

1. **先理解再默写**：每道题先搞懂执行过程再闭卷写。
2. **边界**：考虑 `null/undefined`、空数组、循环引用等。
3. **口述**：能说出「为什么用 WeakMap」「为什么用 Symbol」等，加分。
4. **结合业务**：防抖/节流用在搜索/滚动；Promise 用在请求与 Web3 异步流程；LRU 用在缓存场景。

按「函数/this → 防抖节流 → 深拷贝 → Promise → 数组 → 事件/异步 → 工具」顺序过一遍，面试手写 JS 部分会稳很多。
