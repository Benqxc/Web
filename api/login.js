const { kv } = require('@vercel/kv');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { signAuthToken, resolveAdminPassword } = require('../lib/auth');
const { applyCors, handlePreflight } = require('../lib/cors');

const store = new RedisStore({
  sendCommand: (...args) => kv.call(...args),
});

const loginLimiter = rateLimit({
  store,
  windowMs: parseInt(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT) || 5,
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
  applyCors(req, res, 'POST, OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    const storedHash = await kv.get('admin_password');

    if (!storedHash) {
      const adminPassword = resolveAdminPassword();
      const defaultHash = bcrypt.hashSync(adminPassword, 10);
      await kv.set('admin_password', defaultHash);

      if (password === adminPassword) {
        return res.status(200).json({
          success: true,
          token: signAuthToken(),
          message: 'Успешный вход'
        });
      }
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    if (bcrypt.compareSync(password, storedHash)) {
      return res.status(200).json({
        success: true,
        token: signAuthToken(),
        message: 'Успешный вход'
      });
    }

    return res.status(401).json({ error: 'Неверный пароль' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Ошибка входа' });
  }
};
