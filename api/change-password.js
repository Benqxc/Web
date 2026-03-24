const { kv } = require('@vercel/kv');
const bcrypt = require('bcryptjs');

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
    const { currentPassword, newPassword } = req.body;

    // Получаем текущий хэш
    const storedHash = await kv.get('admin_password');

    // Если пароль не установлен, используем пароль по умолчанию
    if (!storedHash) {
      if (currentPassword !== 'admin123') {
        return res.status(401).json({ error: 'Текущий пароль неверен' });
      }
    } else if (!bcrypt.compareSync(currentPassword, storedHash)) {
      return res.status(401).json({ error: 'Текущий пароль неверен' });
    }

    // Устанавливаем новый пароль
    const newHash = bcrypt.hashSync(newPassword, 10);
    await kv.set('admin_password', newHash);

    res.status(200).json({ success: true, message: 'Пароль изменён' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Ошибка смены пароля' });
  }
};
