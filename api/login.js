const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    const adminRecord = await client.query('SELECT * FROM admin_password WHERE id = 1');

    if (adminRecord.rows.length > 0 && bcrypt.compareSync(password, adminRecord.rows[0].password_hash)) {
      const token = uuidv4();
      res.status(200).json({
        success: true,
        token,
        message: 'Успешный вход'
      });
    } else {
      res.status(401).json({ error: 'Неверный пароль' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  } finally {
    client.release();
    await pool.end();
  }
};
