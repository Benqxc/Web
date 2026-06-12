const { kv } = require('@vercel/kv');

// Время жизни админского токена (сутки по умолчанию)
const TOKEN_TTL_SECONDS = parseInt(process.env.ADMIN_TOKEN_TTL_SECONDS) || 24 * 60 * 60;

// Сохраняет выданный токен в KV с TTL
async function storeToken(token) {
  await kv.set(`admin_token:${token}`, 1, { ex: TOKEN_TTL_SECONDS });
}

// Проверяет заголовок Authorization: Bearer <token> по KV
async function isAuthorized(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return false;
  try {
    const exists = await kv.get(`admin_token:${token}`);
    return Boolean(exists);
  } catch (error) {
    console.error('Token check failed:', error);
    return false;
  }
}

// Единый ответ 401 для незащищённых запросов
function unauthorized(res) {
  return res.status(401).json({ error: 'Требуется авторизация' });
}

module.exports = { storeToken, isAuthorized, unauthorized, TOKEN_TTL_SECONDS };
