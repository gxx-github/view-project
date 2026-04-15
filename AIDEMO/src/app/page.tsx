"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Send, Heart, Sparkles, Star, Film, TrendingUp, Search } from "lucide-react";

const WELCOME = {
  id: "welcome",
  role: "assistant" as "assistant" | "user",
  parts: [
    {
      type: "text" as const,
      text: "嗨～我是甜甜，你的小甜剧推荐官 🌸\n告诉我你现在的心情，我来帮你找到最治愈的那部剧吧！",
    },
  ],
};

/* ==================== 类型定义 ==================== */

interface Drama {
  title: string;
  year: string | number;
  sweetness: number;
  tags: string[];
  reason?: string;
  rating?: number;
  platform?: string;
  episodes?: number;
  genre?: string[];
  description?: string;
}

const TAG_COLORS: Record<string, string> = {
  高甜: "bg-pink-500/20 text-pink-700",
  治愈: "bg-green-500/20 text-green-700",
  先虐后甜: "bg-purple-500/20 text-purple-700",
  搞笑: "bg-yellow-500/20 text-yellow-700",
  校园: "bg-blue-500/20 text-blue-700",
  职场: "bg-orange-500/20 text-orange-700",
  古装: "bg-amber-500/20 text-amber-700",
  现代甜宠: "bg-rose-500/20 text-rose-700",
  纯爱: "bg-pink-400/20 text-pink-600",
  仙侠: "bg-violet-500/20 text-violet-700",
  运动: "bg-emerald-500/20 text-emerald-700",
  悬疑: "bg-slate-500/20 text-slate-700",
  竞技: "bg-cyan-500/20 text-cyan-700",
};

/* ==================== 子组件 ==================== */

function DramaCard({ drama }: { drama: Drama }) {
  const tags = drama.tags ?? drama.genre ?? [];
  const year = typeof drama.year === "number" ? drama.year.toString() : drama.year;

  return (
    <div className="glass rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-pink-500 shrink-0" />
          <h3 className="font-bold text-pink-900">{drama.title}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {drama.rating && (
            <span className="text-xs text-amber-600 bg-amber-100/60 px-1.5 py-0.5 rounded">
              ★ {drama.rating}
            </span>
          )}
          <span className="text-xs text-pink-400">{year}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Star className="w-3.5 h-3.5 text-pink-400" fill="currentColor" />
        <span className="text-xs text-pink-600">甜度</span>
        <span className="text-sm tracking-wider">{"🍬".repeat(drama.sweetness)}</span>
      </div>
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
      {drama.reason && (
        <p className="text-sm text-pink-800/70 leading-relaxed border-t border-pink-200/40 pt-2">
          {drama.reason}
        </p>
      )}
      {(drama.platform || drama.episodes) && (
        <div className="flex gap-3 text-xs text-pink-400">
          {drama.platform && <span>📺 {drama.platform}</span>}
          {drama.episodes && <span>🎬 {drama.episodes}集</span>}
        </div>
      )}
    </div>
  );
}

function TrendingCard({ items }: { items: { rank: number; title: string; rating: number; year: number; genre: string[]; sweetness: number }[] }) {
  return (
    <div className="glass rounded-2xl p-4 shadow-lg space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-pink-500" />
        <h3 className="font-bold text-pink-900 text-sm">热播甜剧榜</h3>
      </div>
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
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-4 h-4 text-pink-500" />
        <h3 className="font-bold text-pink-900 text-sm">
          搜索结果（{results.total} 部）
        </h3>
      </div>
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

/* ==================== 工具名提取 ==================== */

const TOOL_LABELS: Record<string, string> = {
  "tool-analyzeMood": "分析情绪中",
  "tool-searchDramas": "搜索剧集中",
  "tool-getRating": "查询评分中",
  "tool-getTrending": "获取榜单中",
  "tool-renderDramaCard": "生成推荐卡片中",
};

function getToolLabel(type: string): string {
  return TOOL_LABELS[type] ?? "思考中...";
}

/* ==================== 主页面 ==================== */

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    messages: [WELCOME],
    onError: (err) => console.error("[useChat error]", err),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage({ text });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <header className="glass flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-100/80 shadow-sm">
          <Heart className="w-5 h-5 text-pink-500" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-pink-800">甜剧推荐</h1>
          <p className="text-xs text-pink-500/70">Sweet Drama AI · Agent 智能推荐</p>
        </div>
        <Sparkles className="ml-auto w-5 h-5 text-pink-400" />
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto messages-scroll space-y-4 pr-1 pb-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%] space-y-3">
                {msg.parts?.map((part, i) => {
                  const raw = part as Record<string, unknown>;
                  const partType = String(part.type);

                  /* 文本 */
                  if (part.type === "text" && "text" in part && part.text) {
                    return (
                      <div
                        key={i}
                        className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-md ${
                          isUser ? "glass-dark text-white rounded-br-sm" : "glass text-pink-900 rounded-bl-sm"
                        }`}
                      >
                        {String(part.text)}
                      </div>
                    );
                  }

                  /* 工具调用完成 */
                  if (partType.startsWith("tool-") && raw.state === "output-available") {
                    const output = raw.output as Record<string, unknown> | null;
                    if (!output) return null;

                    // renderDramaCard → 剧集卡片
                    if (partType === "tool-renderDramaCard") {
                      const dramas = output.dramas as Drama[] | undefined;
                      const mood = output.mood as string | undefined;
                      const analysis = output.analysis as string | undefined;
                      return (
                        <div key={i} className="space-y-3">
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

                    // getTrending → 榜单
                    if (partType === "tool-getTrending" && Array.isArray(output)) {
                      return <TrendingCard key={i} items={output as Parameters<typeof TrendingCard>[0]["items"]} />;
                    }

                    // searchDramas → 搜索结果
                    if (partType === "tool-searchDramas" && output.dramas) {
                      return <SearchResultsCard key={i} results={output as { total: number; dramas: Drama[] }} />;
                    }

                    // 其他工具输出 → 简洁提示
                    return (
                      <div key={i} className="glass px-3 py-2 rounded-xl text-xs text-pink-400/60">
                        ✓ {getToolLabel(partType)}完成
                      </div>
                    );
                  }

                  /* 工具调用中 */
                  if (partType.startsWith("tool-") && (raw.state === "input-streaming" || raw.state === "input-available")) {
                    return (
                      <div key={i} className="glass px-4 py-2.5 rounded-2xl rounded-bl-sm shadow-md">
                        <div className="flex items-center gap-2 text-sm text-pink-500">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                          {getToolLabel(partType)}...
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="glass px-4 py-3 rounded-2xl text-sm text-red-600 shadow-md border border-red-200">
            Error: {error.message}
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

        {messages.length > 1 && (
          <details className="glass px-3 py-2 rounded-xl text-[0.625rem] text-pink-400/50 max-h-48 overflow-auto">
            <summary className="cursor-pointer select-none">DEBUG</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all">
              {JSON.stringify(
                messages.map((m) => ({
                  id: m.id,
                  role: m.role,
                  parts: m.parts?.map((p) => {
                    const r = p as Record<string, unknown>;
                    return { type: p.type, state: r.state };
                  }),
                })),
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>

      {/* Input */}
      <div className="mt-auto pt-3">
        <div className="glass flex items-end gap-3 rounded-2xl shadow-xl px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="今天工作太累了，想看点不用带脑子的高甜剧情..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-pink-900 placeholder:text-pink-400/50 max-h-[8rem]"
            style={{ height: "auto", minHeight: "1.5rem" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `min(${el.scrollHeight}px, ${8 * parseFloat(getComputedStyle(document.documentElement).fontSize)}px)`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-pink-500 text-white shadow-lg hover:bg-pink-600 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[0.6875rem] text-pink-500/40 mt-2.5">
          powered by ToolLoopAgent · 5 Tools · Generative UI
        </p>
      </div>
    </div>
  );
}
