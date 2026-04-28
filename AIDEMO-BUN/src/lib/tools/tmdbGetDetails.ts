import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getShowDetails, getImageURL, stripHtml } from "@/lib/tvmaze";

/**
 * 获取电视剧详情工具（基于 TVmaze API）
 * 包含演员表、集数、评分等完整信息
 */
export const tmdbGetDetails = tool({
  description: "获取某部电视剧的详细信息，包括评分、集数、演员、海报等。当用户问某部剧的具体信息时使用。",
  inputSchema: zodSchema(
    z.object({
      tvId: z.number().describe("电视剧 ID"),
    })
  ),
  execute: async ({ tvId }) => {
    const detail = await getShowDetails(tvId);
    const cast = detail._embedded?.cast ?? [];

    const topCast = cast.slice(0, 8).map((c) => ({
      name: c.person.name,
      character: c.character.name,
      avatarUrl: getImageURL(c.person.image),
    }));

    const networks = [
      detail.network?.name,
      detail.webChannel?.name,
    ].filter(Boolean) as string[];

    return {
      id: detail.id,
      title: detail.name,
      originalTitle: detail.name,
      year: detail.premiered?.slice(0, 4) ?? "",
      rating: detail.rating.average ? Math.round(detail.rating.average * 10) / 10 : 0,
      voteCount: 0,
      episodes: detail._totalEpisodes ?? 0,
      seasons: detail._totalSeasons ?? 0,
      status: detail.status ?? "",
      genres: detail.genres ?? [],
      networks,
      overview: stripHtml(detail.summary) ?? "",
      posterUrl: getImageURL(detail.image, "medium"),
      backdropUrl: getImageURL(detail.image, "original"),
      cast: topCast,
    };
  },
});
