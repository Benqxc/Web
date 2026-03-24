const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Получаем всех посетителей
      const visitorIds = await kv.lrange('visitors', 0, -1);
      const visitors = [];

      for (const id of visitorIds) {
        const visitor = await kv.get(`visitor:${id}`);
        if (visitor) {
          visitors.push(visitor);
        }
      }

      // Сортируем по дате
      visitors.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.status(200).json(visitors);
    } else if (req.method === 'DELETE') {
      // Удаляем всех посетителей
      const visitorIds = await kv.lrange('visitors', 0, -1);

      for (const id of visitorIds) {
        await kv.del(`visitor:${id}`);
      }

      await kv.del('visitors');

      res.status(200).json({ success: true, message: 'Данные очищены' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitors error:', error);
    res.status(500).json({ error: 'Ошибка получения посетителей' });
  }
};
