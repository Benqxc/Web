const { kv } = require('@vercel/kv');
const { requireAuth } = require('../lib/auth');
const { applyCors, handlePreflight, unauthorized } = require('../lib/cors');

module.exports = async (req, res) => {
  applyCors(req, res, 'GET, OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireAuth(req.headers.authorization);
  } catch (error) {
    return unauthorized(res, error.message);
  }

  try {
    const visitorIds = await kv.lrange('visitors', 0, -1);
    const visitors = [];

    for (const id of visitorIds) {
      const visitor = await kv.get(`visitor:${id}`);
      if (visitor) {
        visitors.push(visitor);
      }
    }

    visitors.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (req.query.format === 'csv') {
      const headers = ['ID', 'IP', 'Страна', 'Город', 'Браузер', 'ОС', 'Разрешение', 'Время на сайте (сек)', 'Дата'];
      const csvRows = [headers.join(',')];

      visitors.forEach(v => {
        csvRows.push([
          v.id,
          v.ip,
          v.country,
          v.city,
          v.browser,
          v.os,
          v.screen_resolution,
          v.session_duration,
          v.created_at
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=visitors.csv');
      return res.status(200).send(csvRows.join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=visitors.json');
    return res.status(200).json(visitors);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Ошибка экспорта' });
  }
};
