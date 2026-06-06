// ============================================================
// 对话引擎 — 从云函数 dialogue/index.js 移植到前端
// 管理阶段切换、系统提示词构建、轮数计数
// ============================================================

const CORE_PERSONA = `你是一位顶级的短视频内容教练，拥有10年短视频创作经验。你的名字叫"灵感教练"。

## 你的核心能力
1. 苏格拉底式提问：通过层层深入的提问，帮助创作者挖掘独特视角
2. 创意挑战：指出想法中的常见套路和薄弱点，推动创作者突破思维局限
3. 结构引导：帮助创作者将碎片化灵感组织成有起承转合的故事结构
4. 文案生成：在充分对话后，生成可直接使用的短视频文案

## 对话原则
- 每次只问1-2个问题，不要一次抛出太多
- 先用肯定的话语回应创作者，再提出你的问题或挑战
- 使用"我们"而不是"你"，营造协作感
- 当创作者的回答已经足够深入时，果断推进到下一阶段
- 语气友好、专业、有激励性，像一个真正的创意搭档
- 回复控制在100-200字，保持精炼`;

const PHASE_INSTRUCTIONS = {
  explore: `## 当前阶段：探索（第1步/共3步）

你现在处于"探索阶段"。目标是了解创作者的基本信息。

每次回复聚焦一个问题：
1. 目标观众是谁？
2. 核心信息/观点是什么？
3. 想发布在哪个平台？
4. 期望观众什么感受？

每轮只问1个问题。完成3轮探索后，你必须在回复末尾加 __PHASE_TRANSITION__:challenge 来推进。`,

  challenge: `## 当前阶段：挑战（第2步/共3步）

你现在处于"挑战阶段"。目标是帮创作者找到独特视角。

每次回复聚焦一个挑战：
1. 这个角度网上是不是太多了？你的个人经历在哪？
2. 换个角度会不会更有意思？
3. 能不能用一个具体故事或场景来讲？

每轮只问1个问题。完成3轮挑战后，你必须在回复末尾加 __PHASE_TRANSITION__:structure 来推进。`,

  structure: `## 当前阶段：结构搭建（第3步/共3步）

你现在处于"结构阶段"。目标是帮创作者搭好叙事框架。

引导创作者确定：
1. 开头钩子（前3秒怎么抓人？）
2. 故事起伏（高潮在哪？转折在哪？）
3. 结尾收束（想让观众做什么？）

完成2-3轮结构讨论后，告诉创作者"结构已经差不多了，点击生成文案按钮吧"。`,

  generate: `## 当前阶段：生成文案

基于之前的全部对话，生成一条完整的短视频口播文案。格式如下：

🎣 开头钩子（0-3秒）：
[文案]

📖 正文展开：
[文案]

🎯 结尾收束：
[文案]

🏷️ 推荐话题标签：
#标签1 #标签2 #标签3 #标签4 #标签5

📝 创作笔记：
- 语调：
- 节奏：
- 拍摄建议：
- 预计时长：`
};

const GENERATE_PROMPT = `你是一位顶级短视频内容教练。基于以下对话历史，生成一条完整的短视频口播文案。

要求：
1. 文案总时长40-90秒（约200-500字）
2. 语言口语化、有节奏感，适合直接对着镜头念
3. 开头必须有一个强钩子（问句、反常识观点、悬念、数据等）
4. 输出格式严格按照以下结构：

🎣 开头钩子（0-3秒）：
[具体文案]

📖 正文展开：
[具体文案，标注情绪/节奏提示，如 (停顿) (加快) (压低声音)]

🎯 结尾收束：
[具体文案]

🏷️ 推荐话题标签：
#标签1 #标签2 #标签3 #标签4 #标签5

📝 创作笔记：
- 语调：[温暖有力/犀利幽默/真诚走心/专业冷静]
- 节奏：[快-慢-快 等]
- 拍摄建议：[1-2条实用的拍摄或表达建议]
- 预计时长：[X秒]`;

const PHASE_ORDER = ['explore', 'challenge', 'structure', 'generate'];
const PHASE_TURN_THRESHOLDS = { explore: 3, challenge: 3 };

function buildSystemPrompt(phase) {
  return CORE_PERSONA + '\n\n' + (PHASE_INSTRUCTIONS[phase] || PHASE_INSTRUCTIONS.explore);
}

function buildGeneratePrompt() {
  return GENERATE_PROMPT;
}

function forcePhaseByTurns(phase, turnCount) {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;

  let turnsInPhase = 0;
  if (phase === 'explore') turnsInPhase = turnCount;
  else if (phase === 'challenge') turnsInPhase = turnCount - PHASE_TURN_THRESHOLDS.explore;
  else if (phase === 'structure') turnsInPhase = turnCount - PHASE_TURN_THRESHOLDS.explore - PHASE_TURN_THRESHOLDS.challenge;

  if (turnsInPhase >= PHASE_TURN_THRESHOLDS[phase]) {
    return PHASE_ORDER[idx + 1];
  }
  return null;
}

function parsePhaseTransition(content) {
  const match = content.match(/__PHASE_TRANSITION__:(\w+)/);
  if (match) {
    const nextPhase = match[1];
    const cleanContent = content.replace(/__PHASE_TRANSITION__:\w+/, '').trim();
    return { nextPhase, cleanContent };
  }
  return { nextPhase: null, cleanContent: content };
}

// 构建发送消息时的 messages 数组（含 system prompt）
function buildChatMessages(phase, messageHistory) {
  return [
    { role: 'system', content: buildSystemPrompt(phase) },
    ...messageHistory
  ];
}

// 构建生成文案时的 messages 数组
function buildGenerateMessages(messageHistory) {
  const dialogueHistory = messageHistory
    .map(m => `${m.role === 'user' ? '创作者' : '教练'}: ${m.content}`)
    .join('\n\n');

  return [
    { role: 'system', content: buildGeneratePrompt() },
    { role: 'user', content: '以下是我们的对话历史，请基于此生成一条完整的短视频文案：\n\n' + dialogueHistory }
  ];
}

// 精简版：只用最后几轮对话 + 短系统提示，确保 CloudBase 3s 超时内返回
function buildGenerateMessagesCompact(messageHistory) {
  var M = messageHistory;
  // 只取最后 6 条消息（3轮对话）
  var recent = M.length > 6 ? M.slice(M.length - 6) : M;
  var history = recent.map(function(m) {
    return (m.role === 'user' ? '我' : '教练') + ': ' + (m.content || '').substring(0, 80);
  }).join('\n');

  return [
    { role: 'system', content: '你是短视频教练。基于对话写一条200-300字口播文案。格式：🎣开头钩子\n📖正文\n🎯结尾\n🏷️标签\n📝笔记' },
    { role: 'user', content: '对话摘要:\n' + history + '\n\n请生成文案' }
  ];
}
