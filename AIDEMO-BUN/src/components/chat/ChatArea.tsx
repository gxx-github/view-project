"use client";

import { useState } from "react";
import { Sparkles, Menu, Heart } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { usePersistedChat } from "@/hooks/usePersistedChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

interface ChatAreaProps {
  onToggleSidebar: () => void;
}

export function ChatArea({ onToggleSidebar }: ChatAreaProps) {
  const { activeSessionId, renameSession, touchSession, createSession } = useSession();
  const [input, setInput] = useState("");

  // Ensure we have an active session
  const sessionId = activeSessionId || createSession();

  const chat = usePersistedChat(sessionId);

  const isLoading = chat.status === "submitted" || chat.status === "streaming";

  const handleSend = (files?: unknown[]) => {
    const text = input.trim();
    if (!text && (!files || files.length === 0)) return;

    // Auto-title on first user message
    if (text) {
      const hasUserMsg = chat.messages.some((m) => m.role === "user");
      if (!hasUserMsg) {
        renameSession(sessionId, text.slice(0, 30));
      }
    }

    touchSession(sessionId);
    setInput("");

    if (files && files.length > 0) {
      chat.sendMessage({ text: text || "看这张图片", files: files as Parameters<typeof chat.sendMessage>[0] extends { files?: infer F } ? F : never });
    } else {
      chat.sendMessage({ text: text! });
    }
  };

  const handleRegenerate = () => {
    chat.regenerate();
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <header className="glass flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg mb-4 mx-2">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-pink-100/60 text-pink-500 transition-colors md:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100/80 shadow-sm">
          <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-pink-800 truncate">影视推荐助手</h1>
          <p className="text-[0.625rem] text-pink-500/70">TV Drama AI · 联网搜索 · 智能推荐</p>
        </div>
        <Sparkles className="ml-auto w-4 h-4 text-pink-400" />
      </header>

      {/* Messages */}
      <MessageList
        messages={chat.messages}
        status={chat.status}
        error={chat.error}
        onRegenerate={handleRegenerate}
      />

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={chat.stop}
        isLoading={isLoading}
      />
    </div>
  );
}
