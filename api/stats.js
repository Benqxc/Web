const { kv } = require('@vercel/kv');

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

  try {
    const stats = {};

    // Получаем всех посетителей
    const visitorIds = await kv.lrange('visitors', 0, -1);
    const visitors = [];

    for (const id of visitorIds) {
      const visitor = await kv.get(`visitor:${id}`);
      if (visitor) {
        visitors.push(visitor);
      }
    }

    // Общее количество посетителей
    stats.totalVisitors = visitors.length;

    // Уникальные IP
    const uniqueIPs = new Set(visitors.map(v => v.ip));
    stats.uniqueIPs = uniqueIPs.size;

    // Посетители за сегодня
    const today = new Date().toISOString().split('T')[0];
    stats.todayVisitors = visitors.filter(v => v.created_at.startsWith(today)).length;

    // Посетители за неделю
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    stats.weekVisitors = visitors.filter(v => new Date(v.created_at) >= weekAgo).length;

    // Среднее время на сайте
    const sessionsWithDuration = visitors.filter(v => v.session_duration > 0);
    const totalDuration = sessionsWithDuration.reduce((sum, v) => sum + (v.session_duration || 0), 0);
    stats.avgSessionDuration = sessionsWithDuration.length > 0 
      ? Math.round(totalDuration / sessionsWithDuration.length) 
      : 0;

    // Последний посетитель
    const sortedVisitors = [...visitors].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    stats.lastVisit = sortedVisitors.length > 0 ? sortedVisitors[0].created_at : null;

    // Топ стран
    const countryCount = {};
    visitors.forEach(v => {
      countryCount[v.country] = (countryCount[v.country] || 0) + 1;
    });
    stats.topCountries = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    // Топ браузеров
    const browserCount = {};
    visitors.forEach(v => {
      browserCount[v.browser] = (browserCount[v.browser] || 0) + 1;
    });
    stats.topBrowsers = Object.entries(browserCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([browser, count]) => ({ browser, count }));

    // Топ ОС
    const osCount = {};
    visitors.forEach(v => {
      osCount[v.os] = (osCount[v.os] || 0) + 1;
    });
    stats.topOS = Object.entries(osCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([os, count]) => ({ os, count }));

    // Посещения по дням (последние 7 дней)
    const visitsByDay = {};
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toISOString().split('T')[0];
      last7Days.push(dayStr);
      visitsByDay[dayStr] = 0;
    }
    
    visitors.forEach(v => {
      const day = v.created_at.split('T')[0];
      if (visitsByDay.hasOwnProperty(day)) {
        visitsByDay[day]++;
      }
    });
    
    stats.visitsByDay = last7Days.map(day => ({
      day: new Date(day).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      count: visitsByDay[day]
    }));

    res.status(200).json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
};
