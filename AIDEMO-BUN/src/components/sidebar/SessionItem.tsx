"use client";

import { Trash2, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { SessionMeta } from "@/lib/types";

interface SessionItemProps {
  session: SessionMeta;
  active: boolean;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}

function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function SessionItem({ session, active, onSwitch, onDelete }: SessionItemProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      onClick={() => onSwitch(session.id)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`
        group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
        ${active
          ? "bg-pink-500/15 text-pink-900"
          : "text-pink-700 hover:bg-pink-100/40"
        }
      `}
    >
      <MessageCircle className="w-3.5 h-3.5 shrink-0 text-pink-400" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{session.title}</div>
        <div className="text-[0.625rem] text-pink-400/60">{relativeTime(session.updatedAt)}</div>
      </div>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="p-1 rounded-lg hover:bg-pink-200/60 text-pink-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
