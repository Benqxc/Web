const { kv } = require('@vercel/kv');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    // Получаем хэш пароля из Redis
    const storedHash = await kv.get('admin_password');

    // Если пароль не установлен, используем пароль по умолчанию
    if (!storedHash) {
      // Создаём хэш по умолчанию (admin123)
      const defaultHash = bcrypt.hashSync('admin123', 10);
      await kv.set('admin_password', defaultHash);
      
      if (password === 'admin123') {
        const token = uuidv4();
        return res.status(200).json({
          success: true,
          token,
          message: 'Успешный вход'
        });
      }
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    if (bcrypt.compareSync(password, storedHash)) {
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
  }
};
