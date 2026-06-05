// ============================================================
// API 层：HTTP 请求 + localStorage 数据管理
// ============================================================

// API 基础路径（同域部署，Vercel/Netlify 自动路由到 serverless functions）
const API_BASE = '/api';

// ---- HTTP 请求 ----

async function callChatAPI(messages) {
  const res = await fetch(API_BASE + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function callGenerateAPI(messages) {
  const res = await fetch(API_BASE + '/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
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

function listDialogues(page = 1, limit = 20) {
  const map = getDialoguesMap();
  const list = Object.values(map)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
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

function listScripts(page = 1, limit = 20) {
  const map = getScriptsMap();
  const list = Object.values(map)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
