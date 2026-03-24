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
    const stats = {};

    // Общее количество посетителей
    const totalResult = await client.query('SELECT COUNT(*) as count FROM visitors');
    stats.totalVisitors = parseInt(totalResult.rows[0].count);

    // Уникальные IP
    const uniqueIPResult = await client.query('SELECT COUNT(DISTINCT ip) as count FROM visitors');
    stats.uniqueIPs = parseInt(uniqueIPResult.rows[0].count);

    // Посетители за сегодня
    const todayResult = await client.query(`
      SELECT COUNT(*) as count FROM visitors
      WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP)
    `);
    stats.todayVisitors = parseInt(todayResult.rows[0].count);

    // Посетители за неделю
    const weekResult = await client.query(`
      SELECT COUNT(*) as count FROM visitors
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    `);
    stats.weekVisitors = parseInt(weekResult.rows[0].count);

    // Среднее время на сайте
    const avgResult = await client.query(`
      SELECT AVG(session_duration) as avg FROM visitors
      WHERE session_duration > 0
    `);
    stats.avgSessionDuration = Math.round(parseFloat(avgResult.rows[0].avg) || 0);

    // Последний посетитель
    const lastVisitorResult = await client.query(`
      SELECT * FROM visitors ORDER BY created_at DESC LIMIT 1
    `);
    stats.lastVisit = lastVisitorResult.rows.length > 0 ? lastVisitorResult.rows[0].created_at : null;

    // Топ стран
    const countriesResult = await client.query(`
      SELECT country, COUNT(*) as count
      FROM visitors
      GROUP BY country
      ORDER BY count DESC
      LIMIT 5
    `);
    stats.topCountries = countriesResult.rows;

    // Топ браузеров
    const browsersResult = await client.query(`
      SELECT browser, COUNT(*) as count
      FROM visitors
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 5
    `);
    stats.topBrowsers = browsersResult.rows;

    // Топ ОС
    const osResult = await client.query(`
      SELECT os, COUNT(*) as count
      FROM visitors
      GROUP BY os
      ORDER BY count DESC
      LIMIT 5
    `);
    stats.topOS = osResult.rows;

    res.status(200).json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  } finally {
    client.release();
    await pool.end();
  }
};
