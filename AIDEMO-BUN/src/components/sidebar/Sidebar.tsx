"use client";

import { Search, Plus, Heart, X } from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { SessionItem } from "./SessionItem";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const {
    filteredSessions,
    activeSessionId,
    searchQuery,
    setSearchQuery,
    createSession,
    switchSession,
    deleteSession,
  } = useSession();

  const handleNew = () => {
    createSession();
    onClose();
  };

  const handleSwitch = (id: string) => {
    switchSession(id);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:static top-0 left-0 h-full z-50
          w-72 flex flex-col glass rounded-none md:rounded-2xl
          border-r border-pink-200/40 md:border md:shadow-lg
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-pink-200/30">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100/80">
            <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
          </div>
          <span className="font-bold text-pink-800 text-sm">影视助手</span>
          <button
            onClick={onClose}
            className="ml-auto md:hidden p-1 rounded-lg hover:bg-pink-100/60 text-pink-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 bg-white/40 rounded-xl px-3 py-2">
            <Search className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索对话..."
              className="flex-1 bg-transparent text-xs text-pink-800 outline-none placeholder:text-pink-400/50"
            />
          </div>
        </div>

        {/* New chat */}
        <div className="px-3 pb-2">
          <button
            onClick={handleNew}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-pink-600 bg-pink-100/40 hover:bg-pink-200/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新建对话
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 messages-scroll">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-pink-400/50">
              {searchQuery ? "没有找到匹配的对话" : "暂无对话"}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onSwitch={handleSwitch}
                onDelete={deleteSession}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
