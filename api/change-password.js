const { kv } = require('@vercel/kv');
const bcrypt = require('bcryptjs');
const { requireAuth, resolveAdminPassword } = require('../lib/auth');
const { applyCors, handlePreflight, unauthorized } = require('../lib/cors');

module.exports = async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS');
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    requireAuth(req.headers.authorization);
  } catch (error) {
    return unauthorized(res, error.message);
  }

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Новый пароль должен быть не короче 8 символов' });
    }

    const storedHash = await kv.get('admin_password');

    if (!storedHash) {
      const adminPassword = resolveAdminPassword();
      if (currentPassword !== adminPassword) {
        return res.status(401).json({ error: 'Текущий пароль неверен' });
      }
    } else if (!bcrypt.compareSync(currentPassword, storedHash)) {
      return res.status(401).json({ error: 'Текущий пароль неверен' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await kv.set('admin_password', newHash);

    return res.status(200).json({ success: true, message: 'Пароль изменён' });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ error: 'Ошибка смены пароля' });
  }
};
