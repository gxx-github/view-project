const TAVILY_API_URL = "https://api.tavily.com/search";

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

/**
 * 调用 Tavily Search API 获取实时搜索结果
 */
export async function searchWithTavily(query: string): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("[TavilySearch] TAVILY_API_KEY 未配置");
    return { results: [] };
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: true,
        max_results: 8,
        include_domains: [],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("[TavilySearch] API error:", response.status, errBody.slice(0, 200));
      return { results: [] };
    }

    const data = (await response.json()) as TavilyResponse;
    console.log(`[TavilySearch] 搜到 ${data.results.length} 条结果`);
    return data;
  } catch (err) {
    console.error("[TavilySearch] 请求异常:", err);
    return { results: [] };
  }
}
