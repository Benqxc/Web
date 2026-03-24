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
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    if (req.method === 'GET') {
      const visitors = await client.query(`
        SELECT * FROM visitors
        ORDER BY created_at DESC
      `);
      res.status(200).json(visitors.rows);
    } else if (req.method === 'DELETE') {
      await client.query('DELETE FROM visitors');
      res.status(200).json({ success: true, message: 'Данные очищены' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Visitors error:', error);
    res.status(500).json({ error: 'Ошибка получения посетителей' });
  } finally {
    client.release();
    await pool.end();
  }
};
