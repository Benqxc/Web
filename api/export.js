const { Pool } = require('pg');

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  });
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    const visitors = await client.query('SELECT * FROM visitors ORDER BY created_at DESC');

    // CSV экспорт
    if (req.query.format === 'csv') {
      const headers = ['ID', 'IP', 'Страна', 'Город', 'Браузер', 'ОС', 'Разрешение', 'Время на сайте (сек)', 'Дата'];
      const csvRows = [headers.join(',')];

      visitors.rows.forEach(v => {
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
      res.status(200).send(csvRows.join('\n'));
    }
    // JSON экспорт
    else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=visitors.json');
      res.status(200).json(visitors.rows);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Ошибка экспорта' });
  } finally {
    client.release();
    await pool.end();
  }
};
