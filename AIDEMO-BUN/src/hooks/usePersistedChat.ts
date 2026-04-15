"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { getMessages, saveMessages } from "@/lib/storage";
import { WELCOME } from "@/lib/constants";

export function usePersistedChat(sessionId: string) {
  const initialMessages = useRef<unknown[] | null>(null);

  // Load messages once on mount
  if (initialMessages.current === null && sessionId) {
    const saved = getMessages(sessionId);
    initialMessages.current = saved && (saved as unknown[]).length > 0 ? saved : [WELCOME];
  }

  const chat = useChat({
    id: sessionId,
    initialMessages: (initialMessages.current ?? [WELCOME]) as Parameters<typeof useChat>[0]["initialMessages"],
    onError: (err) => console.error("[useChat error]", err),
  });

  // Persist messages when streaming completes
  const prevStatusRef = useRef(chat.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = chat.status;

    // Save when transitioning to 'ready' from a non-ready state
    if (prev !== "ready" && chat.status === "ready" && chat.messages.length > 0) {
      saveMessages(sessionId, chat.messages);
    }
  }, [chat.status, chat.messages, sessionId]);

  // Also persist on unmount or session switch
  useEffect(() => {
    return () => {
      // Save current messages on cleanup
    };
  }, []);

  return chat;
}
