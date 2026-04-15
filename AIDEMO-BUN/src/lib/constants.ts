import type { Drama } from "./types";

export const WELCOME = {
  id: "welcome",
  role: "assistant" as const,
  parts: [
    {
      type: "text" as const,
      text: "嗨～我是甜甜，你的小甜剧推荐官 🌸\n告诉我你现在的心情，我来帮你找到最治愈的那部剧吧！",
    },
  ],
};

export const TAG_COLORS: Record<string, string> = {
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

export const TOOL_LABELS: Record<string, string> = {
  "tool-analyzeMood": "分析情绪中",
  "tool-searchDramas": "搜索剧集中",
  "tool-getRating": "查询评分中",
  "tool-getTrending": "获取榜单中",
  "tool-renderDramaCard": "生成推荐卡片中",
};
