const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');

// Создаём pool для каждого запроса (serverless-совместимо)
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    const {
      sessionId,
      screenResolution,
      timezone,
      language,
      sessionDuration
    } = req.body;

    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.socket?.remoteAddress ||
               'unknown';

    const agent = useragent.parse(req.headers['user-agent'] || '');
    const visitorId = sessionId || uuidv4();

    // Получение информации о стране через IP
    let country = 'Unknown';
    let city = 'Unknown';
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        country = geoData.country || 'Unknown';
        city = geoData.city || 'Unknown';
      }
    } catch (e) {
      console.error('Geo lookup failed:', e.message);
    }

    // Проверка существующего посетителя
    const visitor = await client.query('SELECT * FROM visitors WHERE id = $1', [visitorId]);

    if (visitor.rows.length > 0) {
      // Обновление сессии
      if (sessionDuration !== undefined) {
        await client.query(`
          UPDATE visitors
          SET session_duration = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [sessionDuration, visitorId]);
      }
    } else {
      // Новый посетитель
      await client.query(`
        INSERT INTO visitors (
          id, ip, country, city, user_agent, browser, os, device,
          screen_resolution, timezone, language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        visitorId,
        ip,
        country,
        city,
        req.headers['user-agent'] || '',
        agent.toAgentString(),
        agent.os.toString(),
        agent.device.toString(),
        screenResolution || 'unknown',
        timezone || 'unknown',
        language || 'unknown'
      ]);
    }

    res.status(200).json({
      success: true,
      visitorId,
      message: 'Tracked successfully'
    });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  } finally {
    client.release();
    await pool.end();
  }
};
