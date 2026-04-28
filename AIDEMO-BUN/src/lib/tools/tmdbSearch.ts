import { tool, zodSchema } from "ai";
import { z } from "zod";
import { searchShows, getImageURL, stripHtml, GENRE_SEARCH_TERMS } from "@/lib/tvmaze";

/**
 * 搜索电视剧工具（基于 TVmaze API，免费无需 Key）
 */
export const tmdbSearch = tool({
  description: "搜索电视剧。可以按剧名关键词搜索，也可以按类型（爱情/喜剧/悬疑/古装等）和年份筛选。当用户问某部剧的信息、某类剧、某个年份的剧时使用。",
  inputSchema: zodSchema(
    z.object({
      query: z.string().optional().describe("搜索关键词，如剧名"),
      genre: z.string().optional().describe("类型：爱情、喜剧、悬疑、古装、科幻、家庭、动画、犯罪、剧情、历史"),
      year: z.number().optional().describe("年份，如 2025"),
      region: z.string().optional().describe("地区：CN(中国)、KR(韩国)、JP(日本)、US(美国)"),
    })
  ),
  execute: async ({ query, genre, year }) => {
    // 构建搜索词：关键词优先，否则用类型英文名
    const searchTerm = query
      || (genre && GENRE_SEARCH_TERMS[genre] ? GENRE_SEARCH_TERMS[genre] : genre)
      || "popular";

    const results = await searchShows(searchTerm);

    return results
      .slice(0, 8)
      .map(({ show }) => formatShow(show))
      .filter((item) => {
        // 如果指定了年份，过滤不匹配的结果
        if (year && item.year && item.year !== String(year)) return false;
        return true;
      });
  },
});

function formatShow(show: Awaited<ReturnType<typeof searchShows>>[0]["show"]) {
  return {
    id: show.id,
    title: show.name,
    originalTitle: show.name,
    year: show.premiered?.slice(0, 4) ?? "",
    rating: show.rating.average ? Math.round(show.rating.average * 10) / 10 : 0,
    overview: stripHtml(show.summary)?.slice(0, 200) ?? "",
    posterUrl: getImageURL(show.image),
    country: show.network?.country?.code ?? "",
  };
}
