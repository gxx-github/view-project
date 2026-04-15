import { tool, zodSchema } from "ai";
import { z } from "zod";
import { DRAMA_DB } from "../data/dramas";

export const searchDramas = tool({
  description: "根据关键词、类型、甜度、年份等条件搜索甜剧数据库",
  inputSchema: zodSchema(
    z.object({
      keyword: z.string().optional().describe("搜索关键词，匹配剧名或简介"),
      genre: z.array(z.string()).optional().describe("类型过滤，如 ['高甜','治愈']"),
      minSweetness: z.number().min(1).max(5).optional().describe("最低甜度等级"),
      noAbuse: z.boolean().optional().describe("是否只看无虐的甜剧"),
      yearFrom: z.number().optional().describe("起始年份"),
      yearTo: z.number().optional().describe("结束年份"),
    })
  ),
  execute: async ({ keyword, genre, minSweetness, noAbuse, yearFrom, yearTo }) => {
    let results = [...DRAMA_DB];

    if (keyword) {
      const kw = keyword.toLowerCase();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(kw) ||
          d.description.toLowerCase().includes(kw)
      );
    }
    if (genre?.length) {
      results = results.filter((d) => genre.some((g) => d.genre.includes(g)));
    }
    if (minSweetness) {
      results = results.filter((d) => d.sweetness >= minSweetness);
    }
    if (noAbuse) {
      results = results.filter((d) => d.noAbuse);
    }
    if (yearFrom) {
      results = results.filter((d) => d.year >= yearFrom);
    }
    if (yearTo) {
      results = results.filter((d) => d.year <= yearTo);
    }

    return {
      total: results.length,
      dramas: results.slice(0, 10).map((d) => ({
        title: d.title,
        year: d.year,
        genre: d.genre,
        sweetness: d.sweetness,
        rating: d.rating,
        platform: d.platform,
        description: d.description,
      })),
    };
  },
});
