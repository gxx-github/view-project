"use client";

import { useState } from "react";
import { RefreshCw, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
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

/* ==================== TMDB Cards ==================== */

interface TMDBShowItem {
  id?: number;
  title?: string;
  year?: string;
  rating?: number;
  overview?: string;
  posterUrl?: string;
  country?: string;
}

function TMDBSearchResultsCard({ results }: { results: TMDBShowItem[] }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
      <h3 className="font-bold text-pink-900 text-sm">搜索结果（{results.length} 部）</h3>
      <div className="space-y-2">
        {results.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            {item.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.posterUrl} alt={item.title} className="w-8 h-12 rounded object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-pink-900 font-medium truncate">{item.title}</span>
                {item.year && <span className="text-xs text-pink-400 shrink-0">{item.year}</span>}
              </div>
              {item.rating !== undefined && item.rating > 0 && (
                <span className="text-xs text-amber-600">★ {item.rating}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TMDBTrendingItem {
  rank: number;
  id?: number;
  title?: string;
  year?: string;
  rating?: number;
  overview?: string;
  posterUrl?: string;
  country?: string;
}

function TMDBTrendingCard({ items }: { items: TMDBTrendingItem[] }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
      <h3 className="font-bold text-pink-900 text-sm">热播影视榜</h3>
      {items.map((item) => (
        <div key={item.rank} className="flex items-center gap-3 text-sm">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            item.rank <= 3 ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-600"
          }`}>
            {item.rank}
          </span>
          {item.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.posterUrl} alt={item.title} className="w-7 h-10 rounded object-cover shrink-0" />
          )}
          <span className="text-pink-900 flex-1 truncate">{item.title}</span>
          <span className="text-amber-600 text-xs shrink-0">★ {item.rating}</span>
        </div>
      ))}
    </div>
  );
}

function TMDBActorCard({ data }: { data: { actor: string; department?: string; works: TMDBShowItem[] } }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-3">
      <div>
        <h3 className="font-bold text-pink-900 text-sm">{data.actor}</h3>
        {data.department && <span className="text-xs text-pink-400">{data.department}</span>}
      </div>
      {data.works.length > 0 ? (
        <div className="space-y-2">
          {data.works.map((w, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              {w.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.posterUrl} alt={w.title} className="w-8 h-12 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-pink-900 font-medium truncate">{w.title}</span>
                  {w.year && <span className="text-xs text-pink-400 shrink-0">{w.year}</span>}
                </div>
                {w.rating !== undefined && w.rating > 0 && (
                  <span className="text-xs text-amber-600">★ {w.rating}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-pink-400">未找到相关作品</p>
      )}
    </div>
  );
}

interface TMDBDetailData {
  title?: string;
  year?: string;
  rating?: number;
  episodes?: number;
  seasons?: number;
  status?: string;
  genres?: string[];
  networks?: string[];
  overview?: string;
  posterUrl?: string;
  backdropUrl?: string;
  cast?: { name: string; character: string; avatarUrl?: string }[];
}

function TMDBDetailCard({ data }: { data: TMDBDetailData }) {
  return (
    <div className="glass rounded-2xl shadow-lg overflow-hidden">
      {data.backdropUrl && (
        <div className="relative h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.backdropUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {data.posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.posterUrl} alt={data.title} className="w-16 h-24 rounded-lg object-cover shadow-md shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-pink-900">{data.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {data.rating !== undefined && data.rating > 0 && (
                <span className="text-xs text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded">★ {data.rating}</span>
              )}
              {data.year && <span className="text-xs text-pink-400">{data.year}</span>}
              {data.status && <span className="text-xs text-pink-400">{data.status}</span>}
            </div>
            <div className="flex gap-2 mt-1 text-xs text-pink-400">
              {data.episodes && <span>🎬 {data.episodes}集</span>}
              {data.seasons && <span>📹 {data.seasons}季</span>}
            </div>
          </div>
        </div>
        {data.genres && data.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.genres.map((g) => (
              <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-pink-100/60 text-pink-600">{g}</span>
            ))}
          </div>
        )}
        {data.networks && data.networks.length > 0 && (
          <div className="text-xs text-pink-400">📺 {data.networks.join(" / ")}</div>
        )}
        {data.overview && (
          <p className="text-sm text-pink-800/70 leading-relaxed">{data.overview.slice(0, 200)}</p>
        )}
        {data.cast && data.cast.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.cast.slice(0, 5).map((c) => (
              <div key={c.name} className="flex flex-col items-center shrink-0 w-14">
                <div className="w-10 h-10 rounded-full bg-pink-100 overflow-hidden">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-pink-400">
                      {c.name[0]}
                    </div>
                  )}
                </div>
                <span className="text-[0.625rem] text-pink-600 mt-0.5 text-center truncate w-full">{c.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== Comparison Card ==================== */

interface CompareDrama {
  id?: number;
  title?: string;
  year?: string;
  rating?: number;
  episodes?: number;
  seasons?: number;
  genres?: string[];
  networks?: string[];
  posterUrl?: string;
}

function ComparisonCard({ data }: { data: { dramas: CompareDrama[] } }) {
  const [a, b] = data.dramas;
  if (!a || !b) return null;

  const winner = (field: "rating" | "episodes") => {
    const va = a[field] ?? 0;
    const vb = b[field] ?? 0;
    if (va > vb) return "left";
    if (vb > va) return "right";
    return "tie";
  };

  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-3">
      <h3 className="font-bold text-pink-900 text-sm text-center">剧集对比</h3>
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((d, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-2">
            {d.posterUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.posterUrl} alt={d.title} className="w-20 h-28 rounded-lg object-cover shadow-md" />
            )}
            <div>
              <p className="font-bold text-pink-900 text-sm">{d.title}</p>
              <p className="text-xs text-pink-400">{d.year}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="grid grid-cols-3 items-center">
          <span className={`text-right pr-2 ${winner("rating") === "left" ? "text-green-600 font-bold" : "text-pink-900"}`}>
            ★ {a.rating ?? "-"}
          </span>
          <span className="text-center text-pink-400 text-xs">评分</span>
          <span className={`text-left pl-2 ${winner("rating") === "right" ? "text-green-600 font-bold" : "text-pink-900"}`}>
            ★ {b.rating ?? "-"}
          </span>
        </div>
        <div className="grid grid-cols-3 items-center">
          <span className={`text-right pr-2 ${winner("episodes") === "left" ? "text-green-600 font-bold" : "text-pink-900"}`}>
            {a.episodes ?? "-"}集
          </span>
          <span className="text-center text-pink-400 text-xs">集数</span>
          <span className={`text-left pl-2 ${winner("episodes") === "right" ? "text-green-600 font-bold" : "text-pink-900"}`}>
            {b.episodes ?? "-"}集
          </span>
        </div>
        <div className="grid grid-cols-3 items-center">
          <span className="text-right pr-2 text-pink-900 text-xs">{a.genres?.slice(0, 3).join("、")}</span>
          <span className="text-center text-pink-400 text-xs">类型</span>
          <span className="text-left pl-2 text-pink-900 text-xs">{b.genres?.slice(0, 3).join("、")}</span>
        </div>
        <div className="grid grid-cols-3 items-center">
          <span className="text-right pr-2 text-pink-900 text-xs">{a.networks?.[0] ?? "-"}</span>
          <span className="text-center text-pink-400 text-xs">平台</span>
          <span className="text-left pl-2 text-pink-900 text-xs">{b.networks?.[0] ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

/* ==================== Legacy Cards ==================== */

function TrendingCard({ items }: { items: { rank: number; title: string; rating: number }[] }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
      <h3 className="font-bold text-pink-900 text-sm">热播影视榜</h3>
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
    // renderDramaCard — 主要的最终渲染
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

    // TMDB 搜索结果
    if (partType === "tool-tmdbSearch" && Array.isArray(output)) {
      return <TMDBSearchResultsCard results={output as TMDBShowItem[]} />;
    }

    // TMDB 详情
    if (partType === "tool-tmdbGetDetails") {
      return <TMDBDetailCard data={output as unknown as TMDBDetailData} />;
    }

    // TMDB 热播榜
    if (partType === "tool-tmdbGetTrending" && Array.isArray(output)) {
      return <TMDBTrendingCard items={output as TMDBTrendingItem[]} />;
    }

    // TMDB 演员作品
    if (partType === "tool-tmdbGetByActor") {
      return <TMDBActorCard data={output as unknown as { actor: string; department?: string; works: TMDBShowItem[] }} />;
    }

    // RAG 语义搜索结果（带引用）
    if (partType === "tool-ragSearch" && Array.isArray(output)) {
      const results = output as Array<Record<string, unknown> & { source?: { type: string; ref: string; label: string } }>;
      return (
        <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
          <h3 className="font-bold text-pink-900 text-sm">语义搜索结果（{results.length} 部）</h3>
          <div className="space-y-2">
            {results.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-xs text-pink-500 bg-pink-100/60 px-1 py-0.5 rounded shrink-0">
                  {item.source?.ref ?? `[${i + 1}]`}
                </span>
                <span className="text-pink-900 font-medium">{item.title as string}</span>
                {typeof item.year === "string" && item.year && <span className="text-xs text-pink-400">{item.year}</span>}
                {typeof item.rating === "number" && item.rating > 0 && (
                  <span className="text-xs text-amber-600">★ {item.rating}</span>
                )}
              </div>
            ))}
          </div>
          <div className="text-[0.625rem] text-pink-400/60 pt-1 border-t border-pink-100/40">
            来源：本地影视知识库（语义匹配）
          </div>
        </div>
      );
    }

    // 对比功能
    if (partType === "tool-compareDramas" && output.dramas) {
      return <ComparisonCard data={output as unknown as { dramas: CompareDrama[] }} />;
    }

    // Legacy tools
    if (partType === "tool-getTrending" && Array.isArray(output)) {
      return <TrendingCard items={output as { rank: number; title: string; rating: number }[]} />;
    }

    // Default: tool completed
    return (
      <div className="glass px-3 py-2 rounded-xl text-xs text-pink-400/60">
        ✓ {label}完成
      </div>
    );
  }

  return null;
}

/* ==================== Agent Step Tracker ==================== */

function AgentStepTracker({ steps }: { steps: Array<{ index: number; partType: string; state: string; output: Record<string, unknown> | null }> }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // 最后一步（renderDramaCard 等）不折叠，前面的步骤折叠
  const isFinalStep = (partType: string) =>
    partType === "tool-renderDramaCard" || partType === "tool-compareDramas";

  return (
    <div className="space-y-1 mb-2">
      {/* 步骤进度条 */}
      <div className="flex items-center gap-1 px-1">
        {steps.map((s, i) => {
          const isDone = s.state === "output-available";
          const isActive = !isDone;
          return (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <div className={`w-4 h-0.5 ${isDone ? "bg-pink-300" : "bg-pink-100"}`} />}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.625rem] font-bold ${
                isActive ? "bg-pink-500 text-white animate-pulse" :
                isDone ? "bg-pink-300 text-white" : "bg-pink-100 text-pink-400"
              }`}>
                {i + 1}
              </div>
            </div>
          );
        })}
        <span className="text-[0.625rem] text-pink-400 ml-1">
          {steps.filter((s) => s.state === "output-available").length}/{steps.length} 步完成
        </span>
      </div>

      {/* 可折叠的步骤详情 */}
      {steps.map((s) => {
        if (isFinalStep(s.partType)) return null; // 最终步骤由外部渲染

        const label = TOOL_LABELS[s.partType] ?? "处理中";
        const isDone = s.state === "output-available";
        const isExp = expanded[s.index] ?? false;

        return (
          <div key={s.index} className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded((p) => ({ ...p, [s.index]: !isExp }))}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-pink-50/40 transition-colors"
            >
              {isExp ? <ChevronDown className="w-3 h-3 text-pink-400" /> : <ChevronRight className="w-3 h-3 text-pink-400" />}
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[0.5rem] font-bold ${
                isDone ? "bg-green-100 text-green-600" : "bg-pink-100 text-pink-500 animate-pulse"
              }`}>
                {isDone ? "✓" : "..."}
              </span>
              <span className="text-pink-700 flex-1 text-left">{label}</span>
              {s.state === "input-streaming" && (
                <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
              )}
            </button>
            {isExp && isDone && s.output && (
              <div className="px-3 pb-2 text-xs text-pink-500/70 border-t border-pink-100/40 pt-1">
                {renderStepSummary(s.partType, s.output)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderStepSummary(partType: string, output: Record<string, unknown>): string {
  if (Array.isArray(output)) return `找到 ${output.length} 条结果`;
  if (output.dramas) return `${(output.dramas as unknown[]).length} 部影视作品`;
  if (output.actor) return `演员: ${output.actor}，${(output.works as unknown[])?.length ?? 0} 部作品`;
  if (output.mood) return `情绪: ${output.mood}`;
  return "已完成";
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

  // 将 parts 分为：前置工具步骤 → 最终渲染卡片 → 文本
  const parts = msg.parts ?? [];
  const toolParts = parts.filter((p) => String(p.type).startsWith("tool-"));
  const hasAgentSteps = toolParts.length > 1; // 多步才显示 step tracker

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] space-y-3">
        {parts.map((part, i) => {
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

            // 多步 Agent：在第一个 tool 前插入 step tracker
            if (hasAgentSteps && toolParts.indexOf(part) === 0) {
              const steps = toolParts.map((tp, si) => ({
                index: si,
                partType: String(tp.type),
                state: String(tp.state ?? ""),
                output: (tp.output as Record<string, unknown> | null) ?? null,
              }));
              return (
                <div key={i} className="space-y-2">
                  <AgentStepTracker steps={steps} />
                  <ToolCallDisplay partType={partType} state={state} output={output} />
                </div>
              );
            }

            // 多步 Agent：中间步骤不重复渲染（step tracker 已包含）
            if (hasAgentSteps && toolParts.indexOf(part) > 0) {
              // 只渲染最终步骤的卡片
              const isFinal = partType === "tool-renderDramaCard" || partType === "tool-compareDramas";
              if (!isFinal) return null;
            }

            return <ToolCallDisplay key={i} partType={partType} state={state} output={output} />;
          }

          return null;
        })}

        {/* Regenerate button */}
        {isLastAssistant && !isLoading && msg.role === "assistant" && (
          <div className="flex items-center gap-3">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-xs text-pink-400/60 hover:text-pink-500 transition-colors px-1"
            >
              <RefreshCw className="w-3 h-3" />
              重新生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
