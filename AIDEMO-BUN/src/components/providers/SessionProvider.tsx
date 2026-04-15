"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSessionManager } from "@/hooks/useSessionManager";

type SessionContextValue = ReturnType<typeof useSessionManager>;

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionManager();
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
