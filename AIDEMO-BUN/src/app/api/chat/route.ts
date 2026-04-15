import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, zodSchema } from "ai";
import { z } from "zod";
import { searchWithTavily } from "@/lib/tavily-search";
import { searchWithZhipu } from "@/lib/zhipu-search";

const zhipu = createOpenAI({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: process.env.ZHIPU_API_KEY,
});

/* ==================== 意图检测 ==================== */

type Intent = "chat" | "search";

function detectIntent(userText: string): Intent {
  if (/^(你好|嗨|hi|hello|嘿|在吗|你是谁|你叫什么|能做什么|谢谢|好的|嗯|哦|哈哈|今天天气)/i.test(userText)) {
    return "chat";
  }
  return "search";
}

/* ==================== JSON 提取 ==================== */

function extractJson(raw: string): { dramas?: DramaItem[] } {
  if (!raw) return {};

  // 1) 去掉 markdown code block
  const text = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  // 2) 尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  // 3) 从文本中提取第一个 {...} JSON 对象
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // continue
    }
  }

  return {};
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

  if (!userText.trim()) {
    return handleChat("你好");
  }

  const intent = detectIntent(userText);
  console.log(`[Intent] ${intent}`);

  if (intent === "chat") {
    return handleChat(userText);
  }

  return handleSearch(userText);
}

/* ==================== Handlers ==================== */

/** 纯聊天 — 快速回复 */
function handleChat(userText: string) {
  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: `你是"甜甜"，一位懂生活的影视推荐助手🌸
性格：活泼开朗、善解人意、偶尔撒娇、会用emoji
回答简洁温暖，1-3句话。如果聊到剧相关话题，可以引导用户搜索。`,
    prompt: userText,
  });
  return result.toUIMessageStreamResponse();
}

/** 影视搜索/推荐 — Tavily 联网搜索 + LLM 结构化 + 卡片渲染 */
async function handleSearch(userText: string) {
  console.log("[Search] 联网搜索:", userText);

  // Step 1: 用 Tavily 搜索最新网页数据
  const tavilyResult = await searchWithTavily(userText);
  const searchContext = tavilyResult.results
    .slice(0, 6)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n");

  // Step 2: 把搜索结果喂给 LLM，让它结构化为 JSON
  let dramas: DramaItem[] = [];
  if (searchContext) {
    console.log("[Search] Tavily 搜到内容，LLM 结构化中...");
    try {
      const raw = await searchWithZhipu(
        `以下是联网搜索到的最新影视信息，请从中提取出影视作品数据：\n\n${searchContext}\n\n` +
        `用户原始问题：${userText}`
      );
      const parsed = extractJson(raw);
      dramas = parsed.dramas?.filter((d) => d.title) ?? [];
      console.log(`[Search] LLM 结构化出 ${dramas.length} 部剧`);
    } catch (err) {
      console.error("[Search] LLM 结构化失败:", err);
    }
  }

  // Step 3: Fallback — 如果 Tavily 没结果，直接用智谱 web_search
  if (dramas.length === 0) {
    console.log("[Search] Tavily 无结果，fallback 智谱 web_search");
    try {
      const raw = await searchWithZhipu(userText);
      const parsed = extractJson(raw);
      dramas = parsed.dramas?.filter((d) => d.title) ?? [];
      console.log(`[Search] 智谱 fallback 搜到 ${dramas.length} 部剧`);
    } catch (err) {
      console.error("[Search] 智谱 fallback 失败:", err);
    }
  }

  // Step 4: 渲染卡片
  if (dramas.length > 0) {
    console.log(`[Search] 渲染 ${dramas.length} 张卡片`);

    const cardOutput = {
      mood: "为你找到了这些好剧～🌸",
      analysis: `共搜到 ${dramas.length} 部相关影视作品`,
      dramas: dramas.map((d) => ({
        title: d.title!,
        year: String(d.year ?? ""),
        sweetness: 0,
        tags: d.genre ?? [],
        reason: d.reason ?? "",
        rating: d.rating ?? 0,
        platform: d.platform ?? "",
        episodes: d.episodes ?? 0,
        leadActor: d.leadActor ?? "",
      })),
    };

    const result = streamText({
      model: zhipu.chat("glm-4-flash"),
      system: "你已完成搜索。请调用 renderDramaCard 工具输出结果。",
      prompt: "请调用工具输出搜索结果。",
      tools: {
        renderDramaCard: tool({
          description: "渲染影视推荐卡片",
          inputSchema: zodSchema(z.object({}).passthrough()),
          execute: async () => cardOutput,
        }),
      },
      toolChoice: "required" as const,
      maxRetries: 1,
    });

    return result.toUIMessageStreamResponse();
  }

  // Step 5: 全部失败 → 流式纯文本回复
  console.log("[Search] 所有搜索方式均无结果，纯文本回复");
  const answerHint = tavilyResult.answer
    ? `Tavily 摘要：${tavilyResult.answer}\n\n`
    : "";

  const result = streamText({
    model: zhipu.chat("glm-4-flash"),
    system: `你是"甜甜"，一位懂生活的影视推荐助手🌸
用户搜索了电视剧但没有找到结构化结果。请根据你掌握的信息给出有用的回复。
语气活泼，适当用 emoji。`,
    prompt: `${answerHint}用户问："${userText}"，请根据你的知识和上述搜索摘要回复。如果确实不知道，建议用户换个关键词再试试。`,
  });

  return result.toUIMessageStreamResponse();
}

/* ==================== 类型 ==================== */

interface DramaItem {
  title?: string;
  year?: number | string;
  genre?: string[];
  rating?: number;
  platform?: string;
  episodes?: number;
  reason?: string;
  leadActor?: string;
}
