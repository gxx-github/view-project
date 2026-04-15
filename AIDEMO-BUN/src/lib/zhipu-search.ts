import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

const ZHIPU_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

interface WebSearchOptions {
  systemPrompt: string;
  userText: string;
  model?: string;
  enableSearch?: boolean;
}

/**
 * 非流式联网搜索 — 先拿到完整搜索结果，再交给 AI SDK 渲染卡片
 */
export async function searchWithZhipu(userText: string): Promise<string> {
  const now = new Date();
  const currentDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const currentYear = now.getFullYear();

  try {
    const response = await fetch(ZHIPU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4-plus",
        messages: [
          {
            role: "system",
            content: `今天是${currentDate}。你是一个影视数据搜索助手。
重要规则：
1. 必须通过联网搜索获取最新、最准确的影视信息
2. 优先返回${currentYear}年及${currentYear - 1}年的最新作品
3. 如果用户问的是某个演员的作品，优先列出近期和最新的作品
4. 所有数据必须来自联网搜索结果，不要依赖训练数据中的旧信息
5. 严格只输出 JSON，不要任何其他文字或解释
格式：{"dramas":[{"title":"剧名","year":2025,"genre":["类型1","类型2"],"rating":8.5,"platform":"平台","episodes":30,"reason":"推荐理由","leadActor":"主演"}]}
只推荐真实存在的影视作品。如果搜不到，返回 {"dramas":[]}。`,
          },
          { role: "user", content: `${userText}（请搜索最新的数据，当前${currentYear}年）` },
        ],
        stream: false,
        tools: [
          {
            type: "web_search",
            web_search: { enable: true, search_result: true },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("[ZhipuSearch] API error:", response.status, errBody.slice(0, 200));
      return "";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    if (!content) {
      console.log("[ZhipuSearch] 返回内容为空");
      return "";
    }

    return content;
  } catch (err) {
    console.error("[ZhipuSearch] 请求异常:", err);
    return "";
  }
}

/**
 * 调用智谱原生 API 并开启 web_search 联网搜索，
 * 将 SSE 流转换为 Vercel AI SDK 的 UI Message Stream 格式。
 */
export function searchWithZhipuStream({
  systemPrompt,
  userText,
  model = "glm-4-flash",
  enableSearch = true,
}: WebSearchOptions): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID();

      // 调用智谱原生 API
      const response = await fetch(ZHIPU_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
          stream: true,
          ...(enableSearch
            ? {
                tools: [
                  {
                    type: "web_search",
                    web_search: {
                      enable: true,
                      search_result: true,
                    },
                  },
                ],
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[ZhipuSearch] API error:", response.status, errText);
        writer.write({ type: "error", errorText: `智谱 API 调用失败: ${response.status}` });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      writer.write({ type: "text-start", id: textId });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;

            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                writer.write({ type: "text-delta", id: textId, delta: content });
              }

              // 处理 web_search 引用（智谱返回的搜索元数据）
              const webSearchResults = parsed.web_search?.search_result;
              if (webSearchResults && Array.isArray(webSearchResults)) {
                // web_search 引用作为 source-url 输出
                for (const result of webSearchResults) {
                  if (result.link) {
                    writer.write({
                      type: "source-url" as const,
                      sourceId: `src-${Math.random().toString(36).slice(2, 8)}`,
                      url: result.link,
                      title: result.title ?? result.ref ?? undefined,
                    });
                  }
                }
              }
            } catch {
              // 解析失败的行忽略
            }
          }
        }
      } finally {
        writer.write({ type: "text-end", id: textId });
        reader.releaseLock();
      }
    },
    onError: (error) => `联网搜索出错: ${String(error)}`,
  });

  return createUIMessageStreamResponse({ stream });
}
