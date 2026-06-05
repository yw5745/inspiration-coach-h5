// ============================================================
// 灵感教练 H5 — Express 服务器
// 功能：静态文件服务 + DeepSeek API 代理
// ============================================================

const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

const DEEPSEEK_API_KEY = 'sk-2a1387cba2a9470ab67bfc5a8b5271e0';

// ---- 中间件 ----
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'docs')));

// ---- 路由 ----

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// DeepSeek 对话代理
app.post('/api/chat', (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '请提供消息数组' });
  }

  callDeepSeek(messages, 2000, 0.8)
    .then(content => res.json({ content }))
    .catch(err => {
      console.error('Chat API error:', err.message);
      res.status(500).json({ error: 'AI 暂时无法响应，请稍后再试' });
    });
});

// DeepSeek 文案生成代理
app.post('/api/generate', (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '请提供消息数组' });
  }

  callDeepSeek(messages, 4000, 0.9)
    .then(content => res.json({ content }))
    .catch(err => {
      console.error('Generate API error:', err.message);
      res.status(500).json({ error: '文案生成失败，请稍后再试' });
    });
});

// 404
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: '接口不存在' });
  } else {
    res.status(404).send('Page not found');
  }
});

// ---- 启动 ----
app.listen(PORT, () => {
  console.log('灵感教练 H5 已启动: http://localhost:' + PORT);
});

// ---- DeepSeek API 调用 ----
function callDeepSeek(messages, maxTokens, temperature) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: false
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
      },
      timeout: 55000
    }, (apiRes) => {
      let body = '';
      apiRes.on('data', chunk => { body += chunk; });
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('Bad response: ' + body.substring(0, 200)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + body.substring(0, 200)));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', e => { reject(new Error('Request error: ' + e.message)); });
    req.write(postData);
    req.end();
  });
}
