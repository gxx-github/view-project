import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { cosineSimilarity } from "ai";

/**
 * 自定义向量存储 — 无外部依赖
 * 使用 Float32Array 存储 + AI SDK 的 cosineSimilarity 做相似度计算
 */

export interface VectorEntry {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

const DATA_DIR = join(process.cwd(), ".data");
const VECTOR_FILE = join(DATA_DIR, "vectors.json");

export class VectorStore {
  private entries: VectorEntry[] = [];

  /** 添加向量 */
  add(id: string, embedding: number[], metadata: Record<string, unknown>) {
    this.entries.push({ id, embedding, metadata });
  }

  /** 相似度搜索 */
  search(queryEmbedding: number[], topK: number = 5): SearchResult[] {
    if (this.entries.length === 0) return [];

    const queryArr = queryEmbedding;

    const scored = this.entries.map((entry) => {
      const score = cosineSimilarity(queryArr, entry.embedding);
      return { id: entry.id, score, metadata: entry.metadata };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** 获取所有条目数 */
  get size() {
    return this.entries.length;
  }

  /** 持久化到磁盘 */
  save() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(VECTOR_FILE, JSON.stringify(this.entries), "utf-8");
    console.log(`[VectorStore] 已保存 ${this.entries.length} 条向量到 ${VECTOR_FILE}`);
  }

  /** 从磁盘加载 */
  load(): boolean {
    if (!existsSync(VECTOR_FILE)) return false;
    try {
      const raw = readFileSync(VECTOR_FILE, "utf-8");
      this.entries = JSON.parse(raw) as VectorEntry[];
      console.log(`[VectorStore] 已加载 ${this.entries.length} 条向量`);
      return true;
    } catch {
      console.error("[VectorStore] 加载失败");
      return false;
    }
  }

  /** 清除所有数据 */
  clear() {
    this.entries = [];
  }
}

/** 全局单例 */
let store: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!store) {
    store = new VectorStore();
  }
  return store;
}
