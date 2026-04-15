// Bun 入口脚本 — 独立于 Next.js 的纯 Bun HTTP 服务（演示 Bun 原生 API）
// 运行: bun run src/server/index.ts
// 这展示了 Bun 相对于 Node.js 的原生 API 优势

import { DRAMA_DB } from "../lib/data/dramas";

const PORT = 3001;

// ─── Bun.serve — 零依赖 HTTP 服务器 ───
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 路由
    if (url.pathname === "/api/health") return Response.json({ status: "ok", runtime: "bun" });

    if (url.pathname === "/api/dramas") {
      const genre = url.searchParams.get("genre");
      const minSweet = Number(url.searchParams.get("minSweetness") ?? 0);
      let results = [...DRAMA_DB];
      if (genre) results = results.filter((d) => d.genre.includes(genre));
      if (minSweet) results = results.filter((d) => d.sweetness >= minSweet);
      return Response.json({ total: results.length, dramas: results });
    }

    if (url.pathname === "/api/trending") {
      const limit = Number(url.searchParams.get("limit") ?? 5);
      const trending = [...DRAMA_DB]
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit)
        .map((d, i) => ({ rank: i + 1, ...d }));
      return Response.json(trending);
    }

    if (url.pathname === "/api/chat" && req.method === "POST") {
      // Bun 原生 JSON 解析
      const body = await req.json();
      return Response.json({
        echo: body,
        message: "Bun 原生 JSON 解析，无需 express 或 body-parser",
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Bun server running at http://localhost:${server.port}`);
