/**
 * 简单的内存滑动窗口限流器
 */

const windows = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 分钟
const MAX_REQUESTS = 20; // 每分钟最多 20 次

export function rateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const requests = windows.get(key)?.filter((t) => t > cutoff) ?? [];

  if (requests.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  requests.push(now);
  windows.set(key, requests);

  return { allowed: true, remaining: MAX_REQUESTS - requests.length };
}
