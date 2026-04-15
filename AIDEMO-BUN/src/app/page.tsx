"use client";

import { useState } from "react";
import { SessionProvider, useSession } from "@/components/providers/SessionProvider";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";

function AppContent() {
  const { activeSessionId, createSession } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Ensure there's always an active session
  const sessionId = activeSessionId || createSession();

  return (
    <div className="flex h-screen max-w-6xl mx-auto px-2 py-4 gap-3">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <ChatAreaWrapper key={sessionId} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
    </div>
  );
}

function ChatAreaWrapper({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return <ChatArea onToggleSidebar={onToggleSidebar} />;
}

export default function Home() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
