"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { getMessages, saveMessages } from "@/lib/storage";
import { WELCOME } from "@/lib/constants";

export function usePersistedChat(sessionId: string) {
  const [loaded, setLoaded] = useState(false);
  const initialMessagesRef = useRef<unknown[] | null>(null);

  // Load messages from localStorage only on client
  useEffect(() => {
    const saved = getMessages(sessionId);
    initialMessagesRef.current = saved && saved.length > 0 ? saved : [WELCOME];
    setLoaded(true);
  }, [sessionId]);

  const chat = useChat({
    id: sessionId,
    messages: loaded && initialMessagesRef.current
      ? (initialMessagesRef.current as Parameters<typeof useChat>[0] extends { messages?: infer M } ? M : never)
      : [WELCOME] as Parameters<typeof useChat>[0] extends { messages?: infer M } ? M : never,
    onError: (err) => console.error("[useChat error]", err),
  });

  // Persist messages when streaming completes
  const prevStatusRef = useRef(chat.status);
  useEffect(() => {
    if (!loaded) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = chat.status;

    if (prev !== "ready" && chat.status === "ready" && chat.messages.length > 0) {
      saveMessages(sessionId, chat.messages);
    }
  }, [chat.status, chat.messages, sessionId, loaded]);

  return chat;
}
