import { tool, zodSchema } from "ai";
import { z } from "zod";
import { retrieve } from "../rag/retriever";

/**
 * RAG 语义搜索工具
 * 当用户用模糊的情绪/偏好描述找剧时使用（如"想看甜甜的治愈系"）
 */
export const ragSearch = tool({
  description: "基于语义的影视搜索。当用户用心情、感受、偏好等模糊描述找剧时使用（如'想看甜甜的治愈系'、'轻松解压的剧'、'先虐后甜'）。对于精确的剧名搜索，用 tmdbSearch。",
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe("用户的情绪/偏好描述"),
      topK: z.number().optional().describe("返回数量，默认 5"),
    })
  ),
  execute: async ({ query, topK = 5 }) => {
    const results = await retrieve(query, topK);

    return results.map((r, i) => ({
      id: r.id,
      title: r.title,
      year: r.year,
      genre: r.genre,
      sweetness: r.sweetness,
      rating: r.rating,
      episodes: r.episodes,
      platform: r.platform,
      description: r.description,
      score: r.score,
      source: {
        type: "rag" as const,
        ref: `[${i + 1}]`,
        label: `本地知识库（相似度: ${r.score}）`,
      },
    }));
  },
});
