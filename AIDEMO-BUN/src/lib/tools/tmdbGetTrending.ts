import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getSchedule, getImageURL, stripHtml, type TVMazeShow } from "@/lib/tvmaze";

/**
 * 获取热播榜工具（基于 TVmaze 节目单）
 * 用当前节目单去重后按评分排序，作为热播榜的代理
 */
export const tmdbGetTrending = tool({
  description: "获取当前热播电视剧榜单。当用户问'最近有什么好看的'、'热播剧'、'最新电视剧'时使用。",
  inputSchema: zodSchema(
    z.object({
      timeWindow: z.enum(["day", "week"]).optional().describe("时间范围（TVmaze 使用节目单，此参数仅作保留）"),
      limit: z.number().optional().describe("返回数量，默认 10"),
    })
  ),
  execute: async ({ limit = 10 }) => {
    const schedule = await getSchedule();

    // 按剧去重，保留评分最高的条目
    const showMap = new Map<number, TVMazeShow>();
    for (const item of schedule) {
      if (!showMap.has(item.show.id)) {
        showMap.set(item.show.id, item.show);
      }
    }

    // 按评分降序排列
    const sorted = Array.from(showMap.values())
      .filter((s) => (s.rating.average ?? 0) > 0)
      .sort((a, b) => (b.rating.average ?? 0) - (a.rating.average ?? 0))
      .slice(0, limit);

    return sorted.map((show, i) => ({
      rank: i + 1,
      id: show.id,
      title: show.name,
      year: show.premiered?.slice(0, 4) ?? "",
      rating: show.rating.average ? Math.round(show.rating.average * 10) / 10 : 0,
      overview: stripHtml(show.summary)?.slice(0, 100) ?? "",
      posterUrl: getImageURL(show.image),
      country: show.network?.country?.code ?? "",
    }));
  },
});
