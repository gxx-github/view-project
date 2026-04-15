"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { TOOL_LABELS, TAG_COLORS } from "@/lib/constants";
import type { Drama } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";

/* ==================== Drama Card ==================== */

function DramaCard({ drama }: { drama: Drama }) {
  const tags = (drama.tags ?? drama.genre ?? []).filter(Boolean);
  const year = typeof drama.year === "number" ? drama.year.toString() : (drama.year || "");
  const leadActor = (drama as unknown as Record<string, unknown>).leadActor as string | undefined;
  const rating = typeof drama.rating === "number" && drama.rating > 0 ? drama.rating : null;
  const platform = drama.platform || "";
  const episodes = typeof drama.episodes === "number" && drama.episodes > 0 ? drama.episodes : null;
  const reason = drama.reason || "";

  return (
    <div className="glass rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-pink-900">{drama.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {rating !== null && (
            <span className="text-xs text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded">
              ★ {rating}
            </span>
          )}
          {year && <span className="text-xs text-pink-400">{year}</span>}
        </div>
      </div>
      {(drama.sweetness ?? 0) > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-pink-600">甜度</span>
          <span className="text-sm tracking-wider">{"🍬".repeat(drama.sweetness!)}</span>
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${TAG_COLORS[tag] ?? "bg-pink-100/60 text-pink-600"}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {leadActor && (
        <div className="text-xs text-pink-600">
          主演：{leadActor}
        </div>
      )}
      {reason && (
        <p className="text-sm text-pink-800/70 leading-relaxed border-t border-pink-200/40 pt-2">
          {reason}
        </p>
      )}
      {(platform || episodes) && (
        <div className="flex gap-3 text-xs text-pink-400">
          {platform && <span>📺 {platform}</span>}
          {episodes && <span>🎬 {episodes}集</span>}
        </div>
      )}
    </div>
  );
}

function TrendingCard({ items }: { items: { rank: number; title: string; rating: number }[] }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
      <h3 className="font-bold text-pink-900 text-sm">热播甜剧榜</h3>
      {items.map((item) => (
        <div key={item.rank} className="flex items-center gap-2 text-sm">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            item.rank <= 3 ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-600"
          }`}>
            {item.rank}
          </span>
          <span className="text-pink-900 flex-1">{item.title}</span>
          <span className="text-amber-600 text-xs">★ {item.rating}</span>
        </div>
      ))}
    </div>
  );
}

function SearchResultsCard({ results }: { results: { total: number; dramas: Drama[] } }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
      <h3 className="font-bold text-pink-900 text-sm">
        搜索结果（{results.total} 部）
      </h3>
      <div className="space-y-2">
        {results.dramas.slice(0, 5).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-pink-900 flex-1">{d.title}</span>
            <span className="text-xs text-pink-400">{d.year}</span>
            {"🍬".repeat(d.sweetness)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== Tool Call Display ==================== */

function ToolCallDisplay({ partType, state, output }: {
  partType: string;
  state: string;
  output: Record<string, unknown> | null;
}) {
  const label = TOOL_LABELS[partType] ?? "思考中...";

  // In-progress
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="glass px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-md">
        <div className="flex items-center gap-2 text-sm text-pink-500">
          <Sparkles className="w-4 h-4 animate-pulse" />
          {label}...
        </div>
      </div>
    );
  }

  // Completed
  if (state === "output-available" && output) {
    if (partType === "tool-renderDramaCard") {
      const dramas = output.dramas as Drama[] | undefined;
      const mood = output.mood as string | undefined;
      const analysis = output.analysis as string | undefined;
      return (
        <div className="space-y-3">
          {mood && (
            <div className="glass px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-pink-900 shadow-md">
              {mood}
            </div>
          )}
          {analysis && (
            <div className="glass px-3 py-2 rounded-xl text-xs text-pink-500/70 border-l-2 border-pink-300">
              {analysis}
            </div>
          )}
          {dramas?.map((drama, j) => (
            <DramaCard key={j} drama={drama} />
          ))}
        </div>
      );
    }

    if (partType === "tool-getTrending" && Array.isArray(output)) {
      return <TrendingCard items={output as { rank: number; title: string; rating: number }[]} />;
    }

    if (partType === "tool-searchDramas" && output.dramas) {
      return <SearchResultsCard results={output as { total: number; dramas: Drama[] }} />;
    }

    return (
      <div className="glass px-3 py-2 rounded-xl text-xs text-pink-400/60">
        ✓ {label}完成
      </div>
    );
  }

  return null;
}

/* ==================== MessageBubble ==================== */

interface MessageBubbleProps {
  msg: {
    id: string;
    role: "user" | "assistant" | "system";
    parts?: Array<Record<string, unknown>>;
  };
  isLastAssistant: boolean;
  isLoading: boolean;
  onRegenerate: () => void;
}

export function MessageBubble({ msg, isLastAssistant, isLoading, onRegenerate }: MessageBubbleProps) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] space-y-3">
        {msg.parts?.map((part, i) => {
          const partType = String(part.type);

          // Text
          if (part.type === "text" && "text" in part && part.text) {
            return (
              <div
                key={i}
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-md ${
                  isUser ? "glass-dark text-white rounded-br-sm" : "glass text-pink-900 rounded-bl-sm"
                }`}
              >
                {isUser ? (
                  String(part.text)
                ) : (
                  <MarkdownRenderer content={String(part.text)} />
                )}
              </div>
            );
          }

          // File (image preview in user messages)
          if (part.type === "file" && isUser) {
            const url = part.url as string;
            const mediaType = part.mediaType as string;
            if (mediaType?.startsWith("image/") && url) {
              return (
                <div key={i} className="glass-dark p-1.5 rounded-2xl rounded-br-sm shadow-md inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="上传的图片"
                    className="max-w-[200px] max-h-[200px] rounded-xl object-cover"
                  />
                </div>
              );
            }
          }

          // Tool call
          if (partType.startsWith("tool-")) {
            const state = String(part.state ?? "");
            const output = (part.output as Record<string, unknown> | null) ?? null;
            return <ToolCallDisplay key={i} partType={partType} state={state} output={output} />;
          }

          return null;
        })}

        {/* Regenerate button */}
        {isLastAssistant && !isLoading && msg.role === "assistant" && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 text-xs text-pink-400/60 hover:text-pink-500 transition-colors px-1"
          >
            <RefreshCw className="w-3 h-3" />
            重新生成
          </button>
        )}
      </div>
    </div>
  );
}
