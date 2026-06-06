// ============================================================
// API 层：HTTP 直连云函数（绕过 CloudBase SDK 的 CORS 限制）
// 云函数 api 已配置 HTTP 触发器 + CORS 头
// ============================================================

// CloudBase HTTP 触发器地址
// 格式: https://<环境ID>.service.tcloudbase.com/<函数名>
var API_BASE = 'https://cloudbase-d1gdu6ytq7d7d768b-1439505511.ap-shanghai.app.tcloudbase.com/api';

async function callChatAPI(messages, maxTokens) {
  var body = { action: 'chat', messages: messages };
  if (maxTokens) body.maxTokens = maxTokens;

  // 客户端 50 秒超时，给出明确错误提示
  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 50000);

  try {
    var res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('服务器错误 ' + res.status);
    var data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('请求超时，文案生成较耗时，请重试');
    throw err;
  }
}

async function callGenerateAPI(messages) {
  // 限制 token 数，确保 15 秒内返回（CloudBase 网关超时限制）
  return callChatAPI(messages, 800);
}

// ---- localStorage 数据管理 ----

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

// 对话操作
function createDialogueLocal(seedIdea) {
  const id = generateId();
  const dialogue = {
    id,
    seedIdea: seedIdea.trim(),
    phase: 'explore',
    status: 'active',
    turnCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveDialogue(dialogue);
  return dialogue;
}

function saveDialogue(dialogue) {
  const dialogues = getDialoguesMap();
  dialogues[dialogue.id] = dialogue;
  localStorage.setItem('h5_dialogues', JSON.stringify(dialogues));
}

function getDialoguesMap() {
  try { return JSON.parse(localStorage.getItem('h5_dialogues') || '{}'); } catch (e) { return {}; }
}

function getDialogue(id) {
  return getDialoguesMap()[id] || null;
}

function listDialogues(page, limit) {
  if (!page) page = 1;
  if (!limit) limit = 20;
  const map = getDialoguesMap();
  const list = Object.values(map)
    .sort(function(a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })
    .slice((page - 1) * limit, page * limit);
  return { dialogues: list, total: Object.keys(map).length };
}

function updateDialogue(id, updates) {
  const dialogues = getDialoguesMap();
  if (dialogues[id]) {
    Object.assign(dialogues[id], updates, { updatedAt: new Date().toISOString() });
    localStorage.setItem('h5_dialogues', JSON.stringify(dialogues));
  }
}

// 消息操作
function getMessagesKey(dialogueId) {
  return 'h5_messages_' + dialogueId;
}

function saveMessage(dialogueId, message) {
  const key = getMessagesKey(dialogueId);
  const messages = getMessages(dialogueId);
  messages.push(message);
  localStorage.setItem(key, JSON.stringify(messages));
}

function getMessages(dialogueId) {
  const key = getMessagesKey(dialogueId);
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
}

// 文案操作
function saveScriptLocal(scriptData) {
  const id = generateId();
  const script = {
    id,
    title: scriptData.title || '未命名文案',
    content: scriptData.content || '',
    format: scriptData.format || 'generic',
    hashtags: scriptData.hashtags || [],
    dialogueId: scriptData.dialogueId || null,
    createdAt: new Date().toISOString()
  };
  const scripts = getScriptsMap();
  scripts[id] = script;
  localStorage.setItem('h5_scripts', JSON.stringify(scripts));
  return script;
}

function getScriptsMap() {
  try { return JSON.parse(localStorage.getItem('h5_scripts') || '{}'); } catch (e) { return {}; }
}

function getScript(id) {
  return getScriptsMap()[id] || null;
}

function listScripts(page, limit) {
  if (!page) page = 1;
  if (!limit) limit = 20;
  const map = getScriptsMap();
  const list = Object.values(map)
    .sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); })
    .slice((page - 1) * limit, page * limit);
  return { scripts: list, total: Object.keys(map).length };
}

function deleteScript(id) {
  const scripts = getScriptsMap();
  delete scripts[id];
  localStorage.setItem('h5_scripts', JSON.stringify(scripts));
}

// 用户统计
function getUserStatsLocal() {
  const dialogues = Object.keys(getDialoguesMap()).length;
  const scripts = Object.keys(getScriptsMap()).length;
  return { totalDialogues: dialogues, totalScripts: scripts };
}
