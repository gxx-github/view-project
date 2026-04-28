/**
 * RAG 种子脚本 — 生成向量索引
 * 运行：bun run src/lib/rag/seed.ts
 */

import { indexDramas } from "./indexer";

async function main() {
  console.log("=== RAG 种子脚本 ===");
  console.log("正在将 DRAMA_DB 数据向量化...\n");

  try {
    await indexDramas();
    console.log("\n✅ 向量索引生成完成！");
    console.log("数据保存在 .data/vectors.json");
  } catch (err) {
    console.error("\n❌ 索引生成失败:", err);
    process.exit(1);
  }
}

main();
