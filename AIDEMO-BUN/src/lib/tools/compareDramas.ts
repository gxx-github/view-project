import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getShowDetails, getImageURL, stripHtml } from "@/lib/tvmaze";

/**
 * 对比两部电视剧工具（基于 TVmaze API）
 */
export const compareDramas = tool({
  description: "对比两部电视剧的详细信息。当用户问'这两部剧哪个好'、'对比一下'时使用。",
  inputSchema: zodSchema(
    z.object({
      tvId1: z.number().describe("第一部剧的 ID"),
      tvId2: z.number().describe("第二部剧的 ID"),
    })
  ),
  execute: async ({ tvId1, tvId2 }) => {
    const [d1, d2] = await Promise.all([
      getShowDetails(tvId1),
      getShowDetails(tvId2),
    ]);

    const format = (d: Awaited<ReturnType<typeof getShowDetails>>) => {
      const networks = [d.network?.name, d.webChannel?.name].filter(Boolean) as string[];
      return {
        id: d.id,
        title: d.name,
        year: d.premiered?.slice(0, 4) ?? "",
        rating: d.rating.average ? Math.round(d.rating.average * 10) / 10 : 0,
        episodes: d._totalEpisodes ?? 0,
        seasons: d._totalSeasons ?? 0,
        genres: d.genres ?? [],
        networks,
        overview: stripHtml(d.summary) ?? "",
        posterUrl: getImageURL(d.image),
      };
    };

    return {
      dramas: [format(d1), format(d2)],
    };
  },
});
