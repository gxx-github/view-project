import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, tool, zodSchema } from "ai";
import { z } from "zod";
import { DRAMA_DB } from "@/lib/data/dramas";

const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.ZHIPU_API_KEY,
});

/* ==================== 服务端工具函数 ==================== */

const ALL_GENRES = ["高甜", "治愈", "搞笑", "校园", "职场", "古装", "纯爱", "仙侠", "运动", "悬疑", "竞技", "现代甜宠", "先虐后甜"];

function extractGenres(msg: string): string[] {
  return ALL_GENRES.filter((g) => msg.includes(g));
}

function analyzeMood(msg: string) {
  const isSad = /难过|伤心|失恋|分手|心情不好|抑郁|崩溃|哭/.test(msg);
  const isTired = /累|辛苦|加班|疲惫|压力|烦|不想动/.test(msg);
  const isBored = /无聊|没事|打发时间|不知道看什么/.test(msg);
  const isAngry = /气死|愤怒|生气|讨厌|烦死/.test(msg);
  const isHappy = /开心|高兴|甜蜜|幸福|恋爱/.test(msg);

  if (isSad) return { mood: "低落", strategy: "高甜治愈无虐", minSweetness: 4, noAbuse: true, genre: ["高甜", "治愈"] };
  if (isTired) return { mood: "疲惫", strategy: "轻松甜宠不用动脑", minSweetness: 4, noAbuse: true, genre: ["高甜"] };
  if (isAngry) return { mood: "烦躁", strategy: "搞笑甜宠缓解情绪", minSweetness: 4, noAbuse: true, genre: ["高甜", "搞笑"] };
  if (isBored) return { mood: "无聊", strategy: "有点剧情深度", minSweetness: 3, noAbuse: false, genre: [] };
  if (isHappy) return { mood: "开心", strategy: "经典高甜", minSweetness: 4, noAbuse: false, genre: ["高甜", "纯爱"] };
  return { mood: "平静", strategy: "常规推荐", minSweetness: 3, noAbuse: false, genre: [] };
}

function filterDramas(opts: { genre?: string[]; minSweetness?: number; noAbuse?: boolean; limit?: number }) {
  let results = [...DRAMA_DB];
  if (opts.genre?.length) results = results.filter((d) => opts.genre!.some((g) => d.genre.includes(g)));
  if (opts.minSweetness) results = results.filter((d) => d.sweetness >= opts.minSweetness!);
  if (opts.noAbuse) results = results.filter((d) => d.noAbuse);
  return results
    .sort((a, b) => b.sweetness + b.rating / 2 - (a.sweetness + a.rating / 2))
    .slice(0, opts.limit ?? 3);
}

function searchDramasByKeyword(keyword: string, genres?: string[]) {
  let results = [...DRAMA_DB];
  if (keyword) {
    const kw = keyword.toLowerCase();
    results = results.filter(
      (d) => d.title.toLowerCase().includes(kw) || d.description.toLowerCase().includes(kw)
    );
  }
  if (genres?.length) results = results.filter((d) => genres.some((g) => d.genre.includes(g)));
  return results.slice(0, 10);
}

function getTrending(limit: number = 5) {
  return [...DRAMA_DB]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
    .map((d, i) => ({
      rank: i + 1,
      title: d.title,
      rating: d.rating,
      year: d.year,
      genre: d.genre,
      sweetness: d.sweetness,
      platform: d.platform,
    }));
}

/* ==================== 意图检测 ==================== */

type Intent = "chat" | "recommend" | "trending" | "search" | "rating";

async function detectIntent(userText: string): Promise<{
  intent: Intent;
  keyword?: string;
  title?: string;
}> {
  // 1. 热播榜单
  if (/热播|榜单|排行|热门|TOP|top|推荐榜|必看榜|最火/.test(userText)) {
    return { intent: "trending" };
  }

  // 2. 具体剧名询问
  const mentionedDrama = DRAMA_DB.find((d) => userText.includes(d.title));
  if (
    mentionedDrama &&
    (/怎么样|评分|好看|评价|介绍|好不好|几集|什么意思/.test(userText) ||
      userText.trim() === mentionedDrama.title)
  ) {
    return { intent: "rating", title: mentionedDrama.title };
  }

  // 3. 搜索特定类型
  if (/有没有|帮我找|搜索|找一下|找点|来点.*剧|推荐.*类型/.test(userText)) {
    return { intent: "search", keyword: userText };
  }

  // 4. 心情推荐
  if (
    /累|开心|难过|无聊|生气|烦|心情|想看|看什么|甜甜|治愈|加班|辛苦|疲惫|压力|伤心|失恋|分手|甜剧|推荐|剧荒/.test(
      userText
    )
  ) {
    return { intent: "recommend" };
  }

  // 5. 纯聊天
  if (/^(你好|嗨|hi|hello|嘿|在吗|你是谁|你叫什么|能做什么|谢谢|好的|嗯|哦|哈哈)/i.test(userText)) {
    return { intent: "chat" };
  }

  // 6. 模糊意图 → AI 分类
  try {
    const result = await generateText({
      model: zhipu.chat("glm-4-flash"),
      prompt: `你是意图分类器。判断用户消息的意图类型。

用户消息："${userText}"

意图类型：
- chat: 普通聊天、问候、与甜剧无关的问题（如"今天天气怎么样"）
- recommend: 想看甜剧推荐、表达心情想找剧（如"最近有什么好看的"）
- trending: 想看热播榜单、排行榜
- search: 想搜索特定类型/关键词的剧（如"校园剧"、"有没有搞笑的"）
- rating: 想了解某部具体剧的评分信息（如提到具体剧名）

严格输出JSON，不要其他内容：
{"intent":"类型"}`,
    });
    const parsed = JSON.parse(result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    if (["chat", "recommend", "trending", "search", "rating"].includes(parsed.intent)) {
      return { intent: parsed.intent as Intent };
    }
  } catch {
    /* ignore */
  }

  // 默认 → 推荐模式
  return { intent: "recommend" };
}

/* ==================== API Route ==================== */

export async function POST(req: Request) {
  const { messages } = await req.json();

  const userMsg = messages[messages.length - 1];
  const userText =
    userMsg?.parts
      ?.filter((p: Record<string, unknown>) => p.type === "text")
      .map((p: Record<string, unknown>) => p.text)
      .join("") ?? "";

  console.log(`[Request] 用户: "${userText}"`);

  const { intent, keyword, title } = await detectIntent(userText);
  console.log(`[Intent] ${intent}`, keyword ?? title ?? "");

  switch (intent) {
    case "chat":
      return handleChat(userText);
    case "recommend":
      return handleRecommend(userText);
    case "trending":
      return handleTrending();
    case "search":
      return handleSearch(userText, keyword);
    case "rating":
      return handleRating(title ?? userText);
    default:
      return handleRecommend(userText);
  }
}

/* ==================== 各意图处理 ==================== */

/** 普通聊天 → 纯文本，不调工具 */
function handleChat(userText: string) {
  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: `你是"甜甜"，一位温柔、懂生活的小甜剧推荐官🌸
性格：活泼开朗、善解人意、偶尔撒娇、会用emoji
回答简洁温暖，1-3句话。如果聊到剧相关话题，可以引导："告诉我你现在的心情，我来帮你挑剧哦～"`,
    prompt: userText,
  });
  return result.toUIMessageStreamResponse();
}

/** 推荐剧集 → 情绪分析 + 搜索 + AI文案 + 卡片 */
async function handleRecommend(userText: string) {
  const moodResult = analyzeMood(userText);
  // 用户可能指定了类型偏好（如"想看搞笑的"）
  const extractedGenres = extractGenres(userText);
  const genreFilter = extractedGenres.length > 0 ? extractedGenres : moodResult.genre;

  const dramaResults = filterDramas({
    genre: genreFilter,
    minSweetness: moodResult.minSweetness,
    noAbuse: moodResult.noAbuse,
  });

  console.log(`[Recommend] 情绪=${moodResult.mood} 类型=${genreFilter} 命中=${dramaResults.length}部`);

  if (dramaResults.length === 0) {
    const result = streamText({
      model: zhipu.chat("glm-4-flash"),
      system: "你是甜甜，甜剧推荐官。温柔活泼，适当用emoji。简短回复。",
      prompt: `用户说："${userText}"，情绪：${moodResult.mood}。暂时没找到完美匹配的剧，请温柔说明并建议换个说法，或者说"热播"看看榜单。`,
    });
    return result.toUIMessageStreamResponse();
  }

  const dramaInfo = dramaResults
    .map((d) => `${d.title}(${d.year}) ${d.genre.join("/")} 甜度${d.sweetness} 评分${d.rating}`)
    .join("\n");

  const aiResult = await streamText({
    model: zhipu.chat("glm-4-flash"),
    system: "你是甜甜，甜剧推荐官。严格按 JSON 格式输出，不要其他内容。",
    prompt: `用户说："${userText}"
情绪：${moodResult.mood}，策略：${moodResult.strategy}
候选剧集：
${dramaInfo}
输出 JSON：
{"mood":"一句话共情（20字内）","analysis":"选剧理由（20字内）","dramas":[${dramaResults.map((d) => `{"title":"${d.title}","reason":"推荐理由（15字内）"}`).join(",")}]}`,
  }).text;

  let aiData: { mood?: string; analysis?: string; dramas?: { title: string; reason: string }[] } = {};
  try {
    aiData = JSON.parse(aiResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    aiData = { mood: `${moodResult.mood}，来看点甜甜的吧～🌸`, analysis: moodResult.strategy };
  }

  const finalDramas = dramaResults.map((d) => {
    const aiDrama = aiData.dramas?.find((a) => a.title === d.title);
    return {
      title: d.title,
      year: String(d.year),
      sweetness: d.sweetness,
      tags: d.genre,
      reason: aiDrama?.reason ?? d.description,
      rating: d.rating,
      platform: d.platform,
      episodes: d.episodes,
    };
  });

  const cardOutput = {
    mood: aiData.mood ?? `${moodResult.mood}，来看点甜甜的吧～🌸`,
    analysis: aiData.analysis,
    dramas: finalDramas,
  };

  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: "你已完成推荐。请调用 renderDramaCard 工具输出结果。",
    prompt: "请调用工具输出推荐。",
    tools: {
      renderDramaCard: tool({
        description: "渲染推荐卡片",
        inputSchema: zodSchema(z.object({}).passthrough()),
        execute: async () => cardOutput,
      }),
    },
    toolChoice: "required" as const,
    maxRetries: 1,
  });

  return result.toUIMessageStreamResponse();
}

/** 热播榜单 → TrendingCard */
function handleTrending() {
  const trendingData = getTrending(5);

  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: "你已完成榜单获取。请调用 getTrending 工具输出结果。",
    prompt: "请调用工具输出热播榜单。",
    tools: {
      getTrending: tool({
        description: "输出热播榜单",
        inputSchema: zodSchema(z.object({}).passthrough()),
        execute: async () => trendingData,
      }),
    },
    toolChoice: "required" as const,
    maxRetries: 1,
  });

  return result.toUIMessageStreamResponse();
}

/** 搜索剧集 → SearchResultsCard */
function handleSearch(userText: string, keyword?: string) {
  const genres = extractGenres(userText);
  const results = searchDramasByKeyword(keyword ?? userText, genres.length > 0 ? genres : undefined);

  const searchOutput = {
    total: results.length,
    dramas: results.map((d) => ({
      title: d.title,
      year: d.year,
      sweetness: d.sweetness,
      genre: d.genre,
      rating: d.rating,
      platform: d.platform,
    })),
  };

  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: "你已完成搜索。请调用 searchDramas 工具输出结果。",
    prompt: "请调用工具输出搜索结果。",
    tools: {
      searchDramas: tool({
        description: "输出搜索结果",
        inputSchema: zodSchema(z.object({}).passthrough()),
        execute: async () => searchOutput,
      }),
    },
    toolChoice: "required" as const,
    maxRetries: 1,
  });

  return result.toUIMessageStreamResponse();
}

/** 评分查询 → 纯文本 */
function handleRating(title: string) {
  const drama = DRAMA_DB.find((d) => d.title === title);

  if (!drama) {
    const result = streamText({
      model: zhipu.chat("glm-4-flash"),
      system: "你是甜甜，甜剧推荐官。温柔活泼，适当用emoji。简短回复。",
      prompt: `用户想了解"${title}"，但数据库中暂无这部剧。请温柔说明，并建议说"热播"看看热门榜单。`,
    });
    return result.toUIMessageStreamResponse();
  }

  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: "你是甜甜，甜剧推荐官。温柔活泼，适当用emoji。简短回复。",
    prompt: `请用2-3句话生动介绍这部剧：
《${drama.title}》(${drama.year})
评分：★${drama.rating} | 甜度：${"🍬".repeat(drama.sweetness)}
类型：${drama.genre.join(" / ")} | ${drama.episodes}集 | ${drama.platform}
简介：${drama.description}
${drama.noAbuse ? "✅ 全程无虐，放心食用" : "⚠️ 有虐心情节"}`,
  });

  return result.toUIMessageStreamResponse();
}
