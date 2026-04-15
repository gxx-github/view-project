import type { SessionMeta, SessionStore } from "./types";

const SESSIONS_KEY = "aidemo-bun-sessions";
const MSGS_KEY_PREFIX = "aidemo-bun-msgs-";

function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getSessions(): SessionStore {
  if (!isBrowser()) {
    return { sessions: [], activeSessionId: "" };
  }
  const raw = localStorage.getItem(SESSIONS_KEY);
  return safeJsonParse<SessionStore>(raw, { sessions: [], activeSessionId: "" });
}

export function saveSessions(store: SessionStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(store));
  } catch {
    // localStorage quota exceeded — ignore
  }
}

export function getMessages(sessionId: string): unknown[] | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(`${MSGS_KEY_PREFIX}${sessionId}`);
  if (!raw) return null;
  return safeJsonParse<unknown[] | null>(raw, null);
}

export function saveMessages(sessionId: string, messages: unknown[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(`${MSGS_KEY_PREFIX}${sessionId}`, JSON.stringify(messages));
  } catch {
    // localStorage quota exceeded — ignore
  }
}

export function deleteSessionData(sessionId: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(`${MSGS_KEY_PREFIX}${sessionId}`);
}

export function updateSessionMeta(meta: SessionMeta): void {
  if (!isBrowser()) return;
  const store = getSessions();
  const idx = store.sessions.findIndex((s) => s.id === meta.id);
  if (idx >= 0) {
    store.sessions[idx] = meta;
    saveSessions(store);
  }
}
