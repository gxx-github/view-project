"use client";

import { useState, useCallback, useMemo } from "react";
import type { SessionMeta, SessionStore } from "@/lib/types";
import { getSessions, saveSessions, deleteSessionData } from "@/lib/storage";

export function useSessionManager() {
  const [store, setStore] = useState<SessionStore>(() => getSessions());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const sorted = [...store.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter((s) => s.title.toLowerCase().includes(q));
  }, [store.sessions, searchQuery]);

  const persist = useCallback((next: SessionStore) => {
    setStore(next);
    saveSessions(next);
  }, []);

  const createSession = useCallback((): string => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const meta: SessionMeta = { id, title: "新对话", createdAt: now, updatedAt: now };
    const next: SessionStore = {
      sessions: [meta, ...store.sessions],
      activeSessionId: id,
    };
    persist(next);
    return id;
  }, [store, persist]);

  const switchSession = useCallback((id: string) => {
    persist({ ...store, activeSessionId: id });
  }, [store, persist]);

  const deleteSession = useCallback((id: string) => {
    deleteSessionData(id);
    const remaining = store.sessions.filter((s) => s.id !== id);
    const activeId = store.activeSessionId === id
      ? (remaining[0]?.id ?? "")
      : store.activeSessionId;
    persist({ sessions: remaining, activeSessionId: activeId });
  }, [store, persist]);

  const renameSession = useCallback((id: string, title: string) => {
    const sessions = store.sessions.map((s) =>
      s.id === id ? { ...s, title, updatedAt: Date.now() } : s
    );
    persist({ ...store, sessions });
  }, [store, persist]);

  const touchSession = useCallback((id: string) => {
    const sessions = store.sessions.map((s) =>
      s.id === id ? { ...s, updatedAt: Date.now() } : s
    );
    persist({ ...store, sessions });
  }, [store, persist]);

  // Initialize with a session if none exist
  const activeSessionId = store.activeSessionId || (store.sessions[0]?.id ?? "");

  return {
    sessions: store.sessions,
    filteredSessions,
    activeSessionId,
    searchQuery,
    setSearchQuery,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    touchSession,
  };
}
