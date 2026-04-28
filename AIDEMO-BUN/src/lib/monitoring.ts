/**
 * Agent 性能监控 — 追踪工具调用耗时和 Agent 步数
 */

interface ToolTiming {
  tool: string;
  durationMs: number;
  timestamp: number;
}

const timings: ToolTiming[] = [];
const MAX_TIMINGS = 100;

export function recordToolTiming(tool: string, durationMs: number) {
  timings.push({ tool, durationMs, timestamp: Date.now() });
  if (timings.length > MAX_TIMINGS) timings.shift();
}

export function getToolTimings(): ToolTiming[] {
  return [...timings];
}

export function getToolStats(): Record<string, { count: number; avgMs: number; maxMs: number }> {
  const stats: Record<string, { total: number; count: number; max: number }> = {};

  for (const t of timings) {
    if (!stats[t.tool]) stats[t.tool] = { total: 0, count: 0, max: 0 };
    stats[t.tool].total += t.durationMs;
    stats[t.tool].count++;
    stats[t.tool].max = Math.max(stats[t.tool].max, t.durationMs);
  }

  const result: Record<string, { count: number; avgMs: number; maxMs: number }> = {};
  for (const [tool, s] of Object.entries(stats)) {
    result[tool] = {
      count: s.count,
      avgMs: Math.round(s.total / s.count),
      maxMs: s.max,
    };
  }
  return result;
}
