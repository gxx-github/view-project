import { embedMany } from "ai";
import { zhipu } from "../zhipu";
import { DRAMA_DB } from "../data/dramas";
import { getVectorStore } from "./vector-store";

/**
 * 将 DRAMA_DB 数据向量化并存入 VectorStore
 *
 * 核心流程：
 * 1. 为每部剧生成富文本描述
 * 2. 批量调用 embedding 模型向量化
 * 3. 存入 VectorStore
 */

function createDramaText(drama: typeof DRAMA_DB[0]): string {
  const parts = [
    `${drama.title}（${drama.year}年）`,
    `类型：${drama.genre.join("、")}`,
    `评分：${drama.rating}/10`,
    `甜度：${"🍬".repeat(drama.sweetness)}（${drama.sweetness}/5）`,
    `集数：${drama.episodes}集`,
    `平台：${drama.platform}`,
    drama.noAbuse ? "全程无虐，轻松甜蜜" : "有虐心情节，但结局甜蜜",
    drama.description,
  ];
  return parts.join("。");
}

export async function indexDramas(): Promise<void> {
  const store = getVectorStore();
  store.clear();

  console.log(`[RAG Indexer] 开始索引 ${DRAMA_DB.length} 部剧...`);

  // 生成文本描述
  const texts = DRAMA_DB.map(createDramaText);
  const ids = DRAMA_DB.map((d) => String(d.id));

  // 批量向量化（使用智谱 embedding-3）
  const { embeddings } = await embedMany({
    model: zhipu.embedding("embedding-3"),
    values: texts,
  });

  // 存入向量存储
  for (let i = 0; i < DRAMA_DB.length; i++) {
    const drama = DRAMA_DB[i];
    store.add(ids[i], embeddings[i], {
      title: drama.title,
      year: drama.year,
      genre: drama.genre,
      sweetness: drama.sweetness,
      rating: drama.rating,
      episodes: drama.episodes,
      platform: drama.platform,
      description: drama.description,
      noAbuse: drama.noAbuse,
    });
  }

  // 持久化
  store.save();

  console.log(`[RAG Indexer] 索引完成，共 ${store.size} 条向量`);
}
