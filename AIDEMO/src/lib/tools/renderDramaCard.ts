import { tool, zodSchema } from "ai";
import { z } from "zod";

export const renderDramaCard = tool({
  description:
    "渲染精美的甜剧推荐卡片。在所有信息收集完成后，必须调用此工具展示最终推荐结果。",
  inputSchema: zodSchema(
    z.object({
      dramas: z
        .array(
          z.object({
            title: z.string().describe("剧名"),
            year: z.string().describe("年份"),
            sweetness: z.number().min(1).max(5).describe("甜度 1-5"),
            tags: z.array(z.string()).describe("标签"),
            reason: z.string().describe("一句话推荐理由"),
            rating: z.number().optional().describe("评分"),
            platform: z.string().optional().describe("播放平台"),
            episodes: z.number().optional().describe("集数"),
          })
        )
        .describe("推荐剧集列表，2-3 部"),
      mood: z.string().describe("对用户情绪的共情回应"),
      analysis: z.string().optional().describe("推荐分析说明"),
    })
  ),
  execute: async (input) => input,
});
