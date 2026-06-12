const { kv } = require('@vercel/kv');
const { isAuthorized, unauthorized } = require('../lib/auth');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Экспорт данных доступен только администратору
  if (!(await isAuthorized(req))) {
    return unauthorized(res);
  }

  try {
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

    // CSV экспорт
    if (req.query.format === 'csv') {
      // Экранирование: кавычки, запятые и переводы строк ломали структуру CSV
      const csvEscape = (value) => {
        const str = String(value ?? '');
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };

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
        ].map(csvEscape).join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=visitors.csv');
      res.status(200).send(csvRows.join('\n'));
    }
    // JSON экспорт
    else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=visitors.json');
      res.status(200).json(visitors);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
};
