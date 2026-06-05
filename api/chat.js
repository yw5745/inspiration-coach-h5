// Vercel Serverless Function — /api/chat
const https = require('https');
const DEEPSEEK_API_KEY = 'sk-2a1387cba2a9470ab67bfc5a8b5271e0';

function callDeepSeek(messages, maxTokens, temperature) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'deepseek-chat', messages, temperature, max_tokens: maxTokens, stream: false
    });
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + DEEPSEEK_API_KEY },
      timeout: 55000
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0]) resolve(json.choices[0].message.content);
          else reject(new Error('Bad response'));
        } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', (e) => { reject(e); });
    req.write(postData); req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: '需要 messages 数组' });
    const content = await callDeepSeek(messages, 2000, 0.8);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: 'AI 暂时无法响应' });
  }
};
