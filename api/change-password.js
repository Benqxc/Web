const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
    const { currentPassword, newPassword } = req.body;

    const adminRecord = await client.query('SELECT * FROM admin_password WHERE id = 1');

    if (adminRecord.rows.length === 0 || !bcrypt.compareSync(currentPassword, adminRecord.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Текущий пароль неверен' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await client.query('UPDATE admin_password SET password_hash = $1 WHERE id = 1', [newHash]);

    res.status(200).json({ success: true, message: 'Пароль изменён' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Ошибка смены пароля' });
  } finally {
    client.release();
    await pool.end();
  }
};
