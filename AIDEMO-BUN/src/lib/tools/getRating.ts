import { tool, zodSchema } from "ai";
import { z } from "zod";
import { DRAMA_DB } from "../data/dramas";

export const getRating = tool({
  description: "查询指定剧目的评分、评价数和热度指数",
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe("剧名"),
    })
  ),
  execute: async ({ title }) => {
    const drama = DRAMA_DB.find((d) => d.title === title);
    if (!drama) return { found: false, message: `未找到剧目：${title}` };

    return {
      found: true,
      title: drama.title,
      rating: drama.rating,
      ratingCount: Math.floor(Math.random() * 80000 + 20000),
      heatIndex: Math.floor(Math.random() * 100),
      platform: drama.platform,
      episodes: drama.episodes,
      sweetness: drama.sweetness,
    };
  },
});
