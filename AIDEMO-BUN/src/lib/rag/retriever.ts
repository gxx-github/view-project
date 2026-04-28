import { embed } from "ai";
import { zhipu } from "../zhipu";
import { getVectorStore } from "./vector-store";

/**
 * RAG 检索器 — 将用户查询向量化，与存储的剧集向量做相似度匹配
 */

export interface RetrieveResult {
  id: string;
  score: number;
  title: string;
  year: number;
  genre: string[];
  sweetness: number;
  rating: number;
  episodes: number;
  platform: string;
  description: string;
  noAbuse: boolean;
}

export async function retrieve(query: string, topK: number = 5): Promise<RetrieveResult[]> {
  const store = getVectorStore();

  if (store.size === 0) {
    console.log("[RAG Retriever] 向量存储为空，跳过检索");
    return [];
  }

  // 将查询向量化
  const { embedding } = await embed({
    model: zhipu.embedding("embedding-3"),
    value: query,
  });

  // 相似度搜索
  const results = store.search(embedding, topK);

  return results.map((r) => ({
    id: r.id,
    score: Math.round(r.score * 1000) / 1000,
    ...(r.metadata as Omit<RetrieveResult, "id" | "score">),
  }));
}
