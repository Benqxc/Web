const { kv } = require('@vercel/kv');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');

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

    const visitorData = {
      id: visitorId,
      ip,
      country,
      city,
      user_agent: req.headers['user-agent'] || '',
      browser: agent.toAgentString(),
      os: agent.os.toString(),
      device: agent.device.toString(),
      screen_resolution: screenResolution || 'unknown',
      timezone: timezone || 'unknown',
      language: language || 'unknown',
      session_duration: sessionDuration || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Проверка существующего посетителя
    const existingVisitor = await kv.get(`visitor:${visitorId}`);

    if (existingVisitor) {
      // Обновление сессии
      if (sessionDuration !== undefined) {
        visitorData.created_at = existingVisitor.created_at;
        visitorData.session_duration = sessionDuration;
      }
      await kv.set(`visitor:${visitorId}`, visitorData);
    } else {
      // Новый посетитель
      await kv.set(`visitor:${visitorId}`, visitorData);
      // Добавляем в список всех посетителей
      await kv.lpush('visitors', visitorId);
    }

    res.status(200).json({
      success: true,
      visitorId,
      message: 'Tracked successfully'
    });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
};
