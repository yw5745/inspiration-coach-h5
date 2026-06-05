// ============================================================
// API 层：CloudBase SDK 直连云函数 + localStorage 数据管理
// 需要页面先加载：<script src="https://imgcache.qq.com/qcloud/cloudbase-js-sdk/1.7.0/cloudbase.full.js"></script>
// ============================================================

var cbApp = cloudbase.init({ env: 'cloudbase-d1gdu6ytq7d7d768b' });
var cbAuthed = false;

async function ensureAuth() {
  if (cbAuthed) return;
  await cbApp.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
  cbAuthed = true;
}

// ---- CloudBase SDK 调用 ----

async function callChatAPI(messages) {
  await ensureAuth();
  var res = await cbApp.callFunction({ name: 'api', data: { action: 'chat', messages: messages } });
  if (res.result && res.result.error) throw new Error(res.result.error);
  return res.result;
}

async function callGenerateAPI(messages) {
  await ensureAuth();
  var res = await cbApp.callFunction({ name: 'api', data: { action: 'generate', messages: messages } });
  if (res.result && res.result.error) throw new Error(res.result.error);
  return res.result;
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
