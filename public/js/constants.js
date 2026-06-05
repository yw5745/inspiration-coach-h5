// 阶段配置
const PHASES = {
  explore: { label: '探索', icon: '🔍', color: '#6c5ce7', desc: '了解你的受众和核心信息' },
  challenge: { label: '挑战', icon: '⚡', color: '#fd79a8', desc: '挖掘独特视角' },
  structure: { label: '结构', icon: '🏗️', color: '#00b894', desc: '搭建叙事框架' },
  generate: { label: '生成', icon: '✨', color: '#fdcb6e', desc: '生成完整文案' }
};

// 平台选项
const PLATFORMS = [
  { value: 'douyin', label: '抖音' },
  { value: 'kuaishou', label: '快手' },
  { value: 'wechat_channel', label: '视频号' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'generic', label: '通用' }
];

// 灵感模板
const IDEA_TEMPLATES = [
  { emoji: '💼', title: '职场感悟', hint: '比如：35岁职场危机、跳槽心得、同事相处...' },
  { emoji: '❤️', title: '情感故事', hint: '比如：恋爱中的成长、分手后的反思、亲情...' },
  { emoji: '📚', title: '知识分享', hint: '比如：学到了一个颠覆认知的概念、行业干货...' },
  { emoji: '🌱', title: '个人成长', hint: '比如：坚持早起100天的变化、学新技能的感悟...' },
  { emoji: '🔥', title: '社会热点', hint: '比如：最近的热搜话题、身边的社会现象...' },
  { emoji: '😂', title: '生活趣事', hint: '比如：租房踩坑、旅行奇遇、搞笑日常...' }
];
