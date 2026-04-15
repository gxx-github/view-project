/**
 * JS 手写题练习文件 - 可直接在 Node 或浏览器控制台运行
 * 对应 js-handwritten-questions.md 中的题目
 */

// ========== 1. myCall ==========
Function.prototype.myCall = function (context, ...args) {
  context = context ?? globalThis;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};

// ========== 2. myApply ==========
Function.prototype.myApply = function (context, args = []) {
  context = context ?? globalThis;
  const fn = Symbol('fn');
  context[fn] = this;
  const result = context[fn](...args);
  delete context[fn];
  return result;
};

// ========== 3. myBind ==========
Function.prototype.myBind = function (context, ...args1) {
  const fn = this;
  return function F(...args2) {
    return fn.apply(this instanceof F ? this : context, [...args1, ...args2]);
  };
};

// ========== 4. debounce ==========
function debounce(fn, delay, immediate = false) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    if (immediate && !timer) fn.apply(this, args);
    timer = setTimeout(() => {
      if (!immediate) fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

// ========== 5. throttle ==========
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

// ========== 6. deepClone ==========
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

// ========== 7. myInstanceof ==========
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;
  while (proto) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

// ========== 8. myNew ==========
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result !== null && typeof result === 'object' ? result : obj;
}

// ========== 9. Promise.all ==========
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

// ========== 10. Promise.race ==========
Promise.myRace = function (promises) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(promises)) return reject(new TypeError(''));
    for (const p of promises) Promise.resolve(p).then(resolve, reject);
  });
};

// ========== 11. LRU Cache ==========
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

// ========== 12. shortAddress (Web3) ==========
function shortAddress(address, start = 6, end = 4) {
  if (!address || address.length < start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// ---------- 简单测试 ----------
function runTests() {
  console.log('=== myCall ===');
  function sayHi(greeting) {
    return greeting + ', ' + this.name;
  }
  console.log(sayHi.myCall({ name: 'Alice' }, 'Hi')); // "Hi, Alice"

  console.log('\n=== deepClone (cycle) ===');
  const a = { x: 1 };
  a.self = a;
  const b = deepClone(a);
  console.log(b.x === 1 && b.self === b);

  console.log('\n=== myInstanceof ===');
  console.log(myInstanceof([], Array));   // true
  console.log(myInstanceof({}, Array));   // false

  console.log('\n=== Promise.myAll ===');
  Promise.myAll([
    Promise.resolve(1),
    Promise.resolve(2),
    Promise.resolve(3),
  ]).then((arr) => console.log(arr)); // [1, 2, 3]

  console.log('\n=== LRU ===');
  const lru = new LRUCache(2);
  lru.put(1, 1);
  lru.put(2, 2);
  console.log(lru.get(1)); // 1
  lru.put(3, 3);
  console.log(lru.get(2)); // -1

  console.log('\n=== shortAddress ===');
  console.log(shortAddress('0x1234567890abcdef1234567890abcdef12345678'));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debounce,
    throttle,
    deepClone,
    myInstanceof,
    myNew,
    LRUCache,
    shortAddress,
  };
}

// 在 Node 下直接运行此文件时执行测试
if (typeof require !== 'undefined' && require.main === module) {
  runTests();
}
