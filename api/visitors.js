const { kv } = require('@vercel/kv');
const { requireAuth } = require('../lib/auth');
const { applyCors, handlePreflight, unauthorized } = require('../lib/cors');

module.exports = async (req, res) => {
  applyCors(req, res, 'GET, DELETE, OPTIONS');
  if (handlePreflight(req, res)) return;

  try {
    requireAuth(req.headers.authorization);
  } catch (error) {
    return unauthorized(res, error.message);
  }

  try {
    if (req.method === 'GET') {
      const visitorIds = await kv.lrange('visitors', 0, -1);
      const visitors = [];

      for (const id of visitorIds) {
        const visitor = await kv.get(`visitor:${id}`);
        if (visitor) {
          visitors.push(visitor);
        }
      }

      visitors.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.status(200).json(visitors);
    }

    if (req.method === 'DELETE') {
      const visitorIds = await kv.lrange('visitors', 0, -1);

      for (const id of visitorIds) {
        await kv.del(`visitor:${id}`);
      }

      await kv.del('visitors');
      return res.status(200).json({ success: true, message: 'Данные очищены' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Visitors error:', error);
    return res.status(500).json({ error: 'Ошибка получения посетителей' });
  }
};
