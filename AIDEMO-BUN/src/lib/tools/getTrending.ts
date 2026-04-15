import { tool, zodSchema } from "ai";
import { z } from "zod";
import { DRAMA_DB } from "../data/dramas";

export const getTrending = tool({
  description: "获取当前热播甜剧 TOP 榜单，按评分排序",
  inputSchema: zodSchema(
    z.object({
      limit: z.number().min(1).max(10).default(5).describe("返回数量，默认 5"),
      genre: z.string().optional().describe("按类型筛选，如 '高甜'"),
    })
  ),
  execute: async ({ limit = 5, genre }) => {
    let list = [...DRAMA_DB];
    if (genre) list = list.filter((d) => d.genre.includes(genre));

    return list
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit)
      .map((d) => ({
        rank: 0,
        title: d.title,
        rating: d.rating,
        year: d.year,
        genre: d.genre,
        sweetness: d.sweetness,
        platform: d.platform,
      }))
      .map((d, i) => ({ ...d, rank: i + 1 }));
  },
});
