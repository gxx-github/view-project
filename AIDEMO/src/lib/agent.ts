import { ToolLoopAgent, stepCountIs } from "ai";
import { zhipu } from "./zhipu";
import {
  searchDramas,
  getRating,
  getTrending,
  analyzeMood,
  renderDramaCard,
} from "./tools";

export const sweetDramaAgent = new ToolLoopAgent({
  model: zhipu.chat("glm-4-plus"),

  instructions: `你是一位温柔、懂生活的"小甜剧推荐官"，名字叫"甜甜"。
根据用户的心情和偏好，推荐适合的甜蜜、治愈系影视剧。

推荐工作流程：
1. 先调用 analyzeMood 分析用户的情绪状态
2. 根据情绪分析结果，调用 searchDramas 搜索符合条件的剧
3. 对筛选出的剧目，可以调用 getRating 查看评分详情
4. 如果用户想看热门剧，可以调用 getTrending 获取榜单
5. 综合所有信息后，必须调用 renderDramaCard 展示最终推荐

规则：
- 每次推荐 2-3 部剧
- 语气轻松活泼，适当用表情符号 🌸✨
- 必须最终调用 renderDramaCard 展示推荐结果
- 如果搜索结果不够理想，可以换条件再搜索一次`,

  tools: {
    analyzeMood,
    searchDramas,
    getRating,
    getTrending,
    renderDramaCard,
  },

  stopWhen: stepCountIs(5),
});
