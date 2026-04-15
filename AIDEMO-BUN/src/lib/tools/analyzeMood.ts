import { tool, zodSchema } from "ai";
import { z } from "zod";

export const analyzeMood = tool({
  description: "分析用户消息中的情绪状态，返回情绪标签和推荐策略",
  inputSchema: zodSchema(
    z.object({
      userMessage: z.string().describe("用户输入的消息内容"),
    })
  ),
  execute: async ({ userMessage }) => {
    const msg = userMessage.toLowerCase();

    const isSad = /难过|伤心|失恋|分手|心情不好|抑郁|崩溃|哭/.test(msg);
    const isTired = /累|辛苦|加班|疲惫|压力|烦|不想动/.test(msg);
    const isBored = /无聊|没事|打发时间|不知道看什么/.test(msg);
    const isHappy = /开心|高兴|甜蜜|幸福|恋爱|甜甜的/.test(msg);
    const isAngry = /气死|愤怒|生气|讨厌|烦死/.test(msg);

    if (isSad) {
      return {
        mood: "低落难过",
        emoji: "😢",
        strategy: "用户情绪低落，优先推荐高甜治愈、全程无虐、轻松搞笑的甜宠剧",
        minSweetness: 4,
        noAbuse: true,
        genre: ["高甜", "治愈"],
      };
    }
    if (isTired) {
      return {
        mood: "疲惫劳累",
        emoji: "😴",
        strategy: "用户很累，推荐节奏轻快、不用动脑、甜度爆表的甜宠剧",
        minSweetness: 4,
        noAbuse: true,
        genre: ["高甜"],
      };
    }
    if (isBored) {
      return {
        mood: "无聊消遣",
        emoji: "😐",
        strategy: "用户无聊打发时间，可以推荐有剧情深度的先虐后甜剧或悬疑甜剧",
        minSweetness: 3,
        noAbuse: false,
        genre: [],
      };
    }
    if (isHappy) {
      return {
        mood: "开心甜蜜",
        emoji: "😄",
        strategy: "用户心情好，适合看各种类型甜剧，可以推荐经典高甜作品",
        minSweetness: 4,
        noAbuse: false,
        genre: ["高甜", "纯爱"],
      };
    }
    if (isAngry) {
      return {
        mood: "烦躁生气",
        emoji: "😤",
        strategy: "用户在气头上，推荐搞笑甜宠剧来缓解情绪，全程轻松无虐",
        minSweetness: 4,
        noAbuse: true,
        genre: ["高甜", "搞笑"],
      };
    }

    return {
      mood: "平静",
      emoji: "😊",
      strategy: "用户情绪平稳，常规推荐各类甜剧即可",
      minSweetness: 3,
      noAbuse: false,
      genre: [],
    };
  },
});
