const { kv } = require('@vercel/kv');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

// Rate limiting store для Redis
const store = new RedisStore({
  sendCommand: (...args) => kv.call(...args),
});

// Rate limiter для защиты от перебора паролей
const loginLimiter = rateLimit({
  store,
  windowMs: parseInt(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000, // 15 минут
  max: parseInt(process.env.LOGIN_RATE_LIMIT) || 5, // 5 попыток
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.socket?.remoteAddress || 'unknown';
  }
});

module.exports = async (req, res) => {
  // CORS headers - ограничиваем доменом
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Применяем rate limiting
  await new Promise((resolve, reject) => {
    loginLimiter(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    // Получаем хэш пароля из Redis
    const storedHash = await kv.get('admin_password');

    // Если пароль не установлен, используем пароль из переменной окружения или по умолчанию
    if (!storedHash) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (process.env.ADMIN_PASSWORD) {
        console.log('Using ADMIN_PASSWORD from environment');
      }
      const defaultHash = bcrypt.hashSync(adminPassword, 10);
      await kv.set('admin_password', defaultHash);
      
      if (password === adminPassword) {
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
