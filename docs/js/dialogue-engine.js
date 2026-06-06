// ============================================================
// 对话引擎 — 从云函数 dialogue/index.js 移植到前端
// 管理阶段切换、系统提示词构建、轮数计数
// ============================================================

const CORE_PERSONA = `你是短视频内容教练"灵感教练"。苏格拉底式提问帮创作者挖掘独特视角、产出短视频口播文案。

原则：每次只问1个问题，先肯定后提问，用"我们"营造协作感，回复100-200字。`;

const PHASE_INSTRUCTIONS = {
  explore: `当前：探索阶段(1/3)。了解受众、核心观点、平台偏好。每轮1个问题。3轮后必须加 __PHASE_TRANSITION__:challenge`,
  challenge: `当前：挑战阶段(2/3)。推动独特视角，挑战常见套路，挖掘个人经历。每轮1个问题。3轮后加 __PHASE_TRANSITION__:structure`,
  structure: `当前：结构阶段(3/3)。引导确定：开头钩子、故事起伏、结尾收束。差不多时说"可以点击生成文案按钮了"`,
  generate: `基于对话历史生成短视频口播文案。格式：🎣开头钩子\n📖正文\n🎯结尾\n🏷️#标签\n📝笔记（语调/节奏/建议）`
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

// 构建发送消息时的 messages 数组
function buildChatMessages(phase, messageHistory) {
  // 超时已修复为60s，可以发更多上下文
  var recent = messageHistory.length > 10 ? messageHistory.slice(-10) : messageHistory;
  return [
    { role: 'system', content: buildSystemPrompt(phase) },
    ...recent
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
