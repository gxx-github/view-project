# 大模型（LLM）专题面试题

---

## 一、大模型基础

### 1. 什么是大语言模型（LLM）？
- 基于 Transformer 架构的语言模型
- 通过海量文本数据训练，学习语言的模式和知识
- 通过"下一个 token 预测"生成文本
- 代表模型: GPT-4、Claude、Llama、Qwen、DeepSeek

### 2. LLM 训练流程
```
阶段1: 预训练（Pre-training）
  ├── 数据: 互联网文本（TB-PB 级）
  ├── 目标: 下一 token 预测（自回归）
  ├── 方法: 因果语言建模（Causal LM）
  ├── 成本: 数百万美元算力
  └── 结果: 基座模型（Base Model）— 能续写文本但不会对话

阶段2: 监督微调（SFT - Supervised Fine-Tuning）
  ├── 数据: 高质量对话/指令数据（数万条）
  ├── 目标: 学会遵循指令、对话格式
  └── 结果: SFT 模型 — 能对话但可能输出不当内容

阶段3: RLHF / DPO（对齐训练）
  ├── RLHF: 人类反馈强化学习
  │   ├── 训练奖励模型（Reward Model）
  │   └── PPO 强化学习优化
  ├── DPO: 直接偏好优化（更简单高效）
  │   └── 用偏好数据直接训练，无需奖励模型
  └── 结果: 对齐模型 — 安全、有用、遵循价值观
```

### 3. 关键概念
```yaml
Token: 模型处理的最小单位（≈0.75个英文单词，≈0.5个汉字）
Context Window: 模型一次能处理的最大 token 数（4K→128K→1M+）
Temperature: 生成随机性（0=确定性, 1=创造性）
Top-P (nucleus sampling): 从概率累积前 P 的 token 中采样
Top-K: 从概率最高的 K 个 token 中采样
Max Tokens: 单次生成的最大 token 数
```

---

## 二、Transformer 架构

### 1. 核心组件
```
输入 Embedding + 位置编码
  ↓
┌──────────────────────────────────────┐
│  Transformer Block (×N)              │
│  ┌────────────────────────────────┐  │
│  │ Multi-Head Self-Attention      │  │
│  │   Q = X·Wq, K = X·Wk, V = X·Wv │ │
│  │   Attention(Q,K,V) = softmax(QKᵀ/√d)·V │
│  └────────────────────────────────┘  │
│            + 残差连接 & LayerNorm     │
│  ┌────────────────────────────────┐  │
│  │ Feed-Forward Network (FFN)     │  │
│  │   FFN(x) = W2·ReLU(W1·x)      │  │
│  └────────────────────────────────┘  │
│            + 残差连接 & LayerNorm     │
└──────────────────────────────────────┘
  ↓
输出层 (Linear + Softmax → 概率分布)
```

### 2. 自注意力机制（Self-Attention）
```python
# 核心公式
Attention(Q, K, V) = softmax(Q @ K.T / sqrt(d_k)) @ V

# Q (Query): 当前 token 想查询什么
# K (Key):   每个 token 能匹配什么
# V (Value): 每个 token 的内容

# Multi-Head Attention: 将 Q/K/V 分成多个头并行计算
# 每个"头"关注不同的语义关系

# 为什么除以 sqrt(d_k)？
# 防止点积过大导致 softmax 梯度消失
```

### 3. 位置编码（Positional Encoding）
```
为什么需要: Transformer 没有循环结构，本身不知道 token 顺序

方案演进:
├── 正弦位置编码 (原始 Transformer)
├── 可学习位置编码 (GPT-2)
├── RoPE 旋转位置编码 (Llama, Qwen) — 支持长度外推
└── ALiBi (BLOOM) — 线性偏置注意力
```

### 4. Transformer 变体
```
Encoder-Only:  BERT — 理解任务（分类、NER）
Decoder-Only:  GPT, Claude, Llama — 生成任务（对话、写作）
Encoder-Decoder: T5, BART — 翻译、摘要

主流 LLM 都是 Decoder-Only:
  - 架构更简单
  - 自回归生成更自然
  - 扩展性更好
```

### 5. KV Cache（推理优化）
```
自回归生成时，已生成的 token 的 K/V 可以缓存复用

无 KV Cache:
  生成第 N 个 token → 重新计算所有 N-1 个 token 的 K/V
  复杂度: O(N²)

有 KV Cache:
  生成第 N 个 token → 只计算第 N 个 token 的 Q/K/V
  复杂度: O(N)

内存占用 = batch_size × num_layers × 2 × seq_len × d_model × dtype_size
```

---

## 三、主流模型对比

### 1. 模型家族
```
OpenAI:
  GPT-4o / GPT-4o-mini — 多模态、高性能
  o1 / o3 — 推理模型（Chain-of-Thought 强化）

Anthropic:
  Claude Opus 4 / Sonnet 4 — 长文本、安全对齐
  Claude Haiku — 快速轻量

开源:
  Llama 3 (Meta) — 开源标杆
  Qwen 2.5 (阿里) — 中英双语强
  DeepSeek-V3/R1 — MoE 架构、推理能力强
  Mistral — 欧洲开源
  GLM-4 (智谱) — 中文场景
```

### 2. 模型选择维度
```
能力维度:
  - 指令遵循能力
  - 代码生成能力
  - 推理能力（数学、逻辑）
  - 多语言能力
  - 多模态能力（图片、音频、视频）

工程维度:
  - Context Window 长度
  - 推理速度（TTFT、TPS）
  - 价格（输入/输出 token 单价）
  - API 可用性
  - 是否可本地部署
```

---

## 四、Prompt Engineering（提示词工程）

### 1. 核心技巧
```markdown
# 1. 系统提示（System Prompt）
你是一个专业的前端开发工程师。请用 TypeScript 回答问题。

# 2. Few-Shot（少样本示例）
将以下文本分类为正面/负面:
例子: "这部电影很棒" → 正面
例子: "服务很差" → 负面
输入: "体验还不错"

# 3. Chain-of-Thought（思维链）
请一步步思考: 如果一个商店有 23 个苹果，卖出 17 个，又进货 8 个，现在有多少？

# 4. 结构化输出
请以 JSON 格式输出:
{ "name": "名称", "summary": "摘要", "tags": ["标签"] }
```

### 2. 高级技术
```markdown
# ReAct (Reasoning + Acting)
思考: 我需要查一下当前天气
行动: 调用天气 API
观察: 北京 25°C 晴天
思考: 可以回答了
回答: 北京今天 25°C，晴天

# Self-Consistency
对同一问题生成多个推理路径，取多数结果

# Tree-of-Thought
生成多个推理分支，搜索最优路径

# Self-Reflection
让模型检查自己的输出是否正确
```

---

## 五、微调与训练

### 1. 微调方法
```
全量微调 (Full Fine-tuning)
  - 更新所有参数
  - 效果最好，但成本最高

LoRA (Low-Rank Adaptation)
  - 冻结原始权重，只训练低秩分解矩阵
  - W = W₀ + BA (B: d×r, A: r×d, r << d)
  - 可训练参数减少 10000 倍
  - LoRA 权重可以合并回原模型

QLoRA
  - 4-bit 量化 + LoRA
  - 单卡可微调 65B 模型

其他方法:
  - Adapter: 插入小型适配器层
  - Prefix Tuning: 只训练前缀向量
  - P-Tuning v2: 深层提示向量
```

### 2. 量化
```
量化: 降低参数精度以减少内存和加速推理

FP16 (半精度)  — 常规推理精度
INT8           — 内存减半，精度损失小
INT4           — 再减半，适合消费级 GPU
GGUF           — llama.cpp 使用的量化格式
AWQ/GPTQ       — 激活感知量化，精度保持更好
```

### 3. 训练数据准备
```
数据质量 > 数据数量

数据清洗:
  - 去重（MinHash、SimHash）
  - 过滤低质量内容
  - 去除有害/偏见内容
  - 格式标准化

数据格式:
  - 对话格式 (messages: [{role, content}])
  - 指令格式 (instruction + input + output)
  - 偏好格式 (chosen + rejected for DPO)
```

---

## 六、LLM 应用开发

### 1. API 调用
```typescript
// OpenAI API
import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user', content: '解释什么是 Transformer' },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

// Anthropic API
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '你好' }],
});
```

### 2. 流式输出
```typescript
// OpenAI Stream
const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '写一首诗' }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
```

### 3. Function Calling（工具调用）
```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: '北京今天天气怎么样？' }],
  tools: [{
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的天气',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称' },
        },
        required: ['city'],
      },
    },
  }],
});

// 模型决定调用工具
if (response.choices[0].message.tool_calls) {
  const { city } = JSON.parse(response.choices[0].message.tool_calls[0].function.arguments);
  const weather = await getWeather(city); // 执行真实函数
  // 将结果返回给模型继续对话
}
```

### 4. Token 计算
```typescript
import { encoding_for_model } from 'tiktoken';

const enc = encoding_for_model('gpt-4o');
const tokens = enc.encode('你好世界');
console.log(tokens.length); // token 数量
enc.free(); // 释放资源
```

---

## 七、LLM 面试高频题

### Q1: LLM 为什么会产生幻觉（Hallucination）？
- 模型本质是在预测最可能的下一个 token，不是在检索事实
- 训练数据中可能有错误信息
- 模型不知道自己不知道什么
- 缓解: RAG、事实核查、多模型交叉验证

### Q2: 什么是涌现能力（Emergent Abilities）？
模型规模达到一定程度后突然出现的能力（如少样本学习、链式推理），小模型不具备。但近年研究表明部分涌现可能是评估指标的假象。

### Q3: Context Window 的限制及解决方案？
```
限制: 所有输入+输出不能超过 context window
方案:
  - RAG: 只检索相关文档片段
  - 摘要压缩: 先摘要再输入
  - 长文本模型: Gemini(1M)、Claude(200K)
  - 滑动窗口: 分段处理
  - 注意力优化: Flash Attention、MHA → MQA → GQA
```

### Q4: 如何评估 LLM 效果？
```
自动评估:
  - BLEU/ROUGE — 文本相似度
  - Perplexity — 困惑度（语言模型质量）
  - 基准测试 — MMLU、HumanEval、GSM8K
  - LLM-as-Judge — 用强模型评估弱模型

人工评估:
  - 相关性、准确性、流畅性、安全性
  - A/B 测试（用户偏好）
```

### Q5: LoRA 的原理？
在预训练权重矩阵旁增加低秩分解矩阵 B×A，只训练 B 和 A。原始权重 W₀ 保持冻结。推理时可以将 BA 合并到 W₀ 中，不增加推理开销。本质是将参数更新限制在低秩空间。

### Q6: 如何处理 LLM 输出的不确定性？
- 降低 Temperature（0-0.3 用于事实性任务）
- 使用结构化输出（JSON Schema / Function Calling）
- 多次采样取多数（Self-Consistency）
- 后处理验证（正则、schema 校验）
- 使用 JSON mode / Structured Output API
