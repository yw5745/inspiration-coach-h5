// ============================================================
// CloudBase JS SDK 初始化 — 网页直接调云函数
// 无需 HTTP 触发器，无需自建服务器
// ============================================================

const app = cloudbase.init({
  env: 'cloudbase-d1gdu6ytq7d7d768b'
});

// 匿名登录（只执行一次）
let authReady = false;
async function ensureAuth() {
  if (authReady) return;
  try {
    await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
    authReady = true;
  } catch (e) {
    console.error('CloudBase auth failed:', e.message);
    throw e;
  }
}

// ---- 封装：替代 fetch('/api/...') ----

async function callChatAPI(messages) {
  await ensureAuth();
  const res = await app.callFunction({
    name: 'api',
    data: {
      action: 'chat',
      messages: messages
    }
  });
  if (res.result && res.result.error) throw new Error(res.result.error);
  return res.result;
}

async function callGenerateAPI(messages) {
  await ensureAuth();
  const res = await app.callFunction({
    name: 'api',
    data: {
      action: 'generate',
      messages: messages
    }
  });
  if (res.result && res.result.error) throw new Error(res.result.error);
  return res.result;
}
