"use client";

import { useRef } from "react";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: ReturnType<typeof import("@ai-sdk/react").useChat>["messages"];
  status: string;
  error: Error | null | undefined;
  onRegenerate: () => void;
}

export function MessageList({ messages, status, error, onRegenerate }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useAutoScroll(scrollRef, [messages, isLoading]);

  const lastAssistantIdx = [...messages]
    .map((m, i) => ({ role: m.role, i }))
    .filter((m) => m.role === "assistant")
    .pop()?.i;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto messages-scroll space-y-4 px-2 pb-4">
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          isLastAssistant={idx === lastAssistantIdx}
          isLoading={isLoading}
          onRegenerate={onRegenerate}
        />
      ))}

      {error && (
        <div className="glass px-4 py-3 rounded-2xl text-sm text-red-600 shadow-md border border-red-200/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400">⚠</span>
            <span className="font-medium">出了点小问题</span>
          </div>
          <p className="text-red-500/80 text-xs">{error.message || "网络请求失败，请稍后再试"}</p>
        </div>
      )}

      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="glass px-4 py-3 rounded-2xl rounded-bl-sm shadow-md">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-400/60 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-pink-400/60 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-pink-400/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
