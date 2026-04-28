import { convertToModelMessages } from "ai";
import { dramaAgent } from "@/lib/agent";
import { getVectorStore } from "@/lib/rag/vector-store";
import { rateLimit } from "@/lib/rate-limit";

// 服务启动时加载向量索引
let vectorsLoaded = false;
function ensureVectorsLoaded() {
  if (!vectorsLoaded) {
    const store = getVectorStore();
    store.load();
    vectorsLoaded = true;
  }
}

/**
 * 基础 Prompt Injection 防护
 * 检测常见的注入模式，但不误伤正常输入
 */
function detectInjection(text: string): string | null {
  // 跳过短消息（不太可能是注入）
  if (text.length < 20) return null;

  const lower = text.toLowerCase();

  // 已知的注入模式
  const patterns = [
    /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
    /you\s+are\s+now\s+a/i,
    /system\s*:\s*/i,
    /<\|im_start\|>/i,
    /```system/i,
  ];

  for (const p of patterns) {
    if (p.test(lower)) {
      return "检测到潜在的安全风险，请调整你的输入";
    }
  }

  return null;
}

/**
 * 清理用户输入
 */
function sanitizeInput(text: string): string {
  // 移除空字符
  return text.replace(/\0/g, "").trim();
}

export async function POST(req: Request) {
  // 限流
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const { allowed } = rateLimit(ip);
  if (!allowed) {
    return new Response("请求过于频繁，请稍后再试", { status: 429 });
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  // 获取最后一条用户消息做安全检查
  const lastMsg = messages[messages.length - 1];
  const userText = lastMsg?.parts
    ?.filter((p: Record<string, unknown>) => p.type === "text")
    .map((p: Record<string, unknown>) => p.text)
    .join("") ?? lastMsg?.content ?? "";

  const injectionWarning = detectInjection(sanitizeInput(userText));
  if (injectionWarning) {
    return new Response(
      JSON.stringify({
        error: injectionWarning,
        type: "injection_detected",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 确保向量数据已加载
  ensureVectorsLoaded();

  // 转换前端 UIMessages 为模型消息格式
  const modelMessages = await convertToModelMessages(messages);

  // Agent 自主决策调用哪个工具
  const result = await dramaAgent.stream({
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
