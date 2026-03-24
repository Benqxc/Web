const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting для защиты от перебора паролей
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // 5 попыток
    message: { error: 'Слишком много попыток входа. Попробуйте позже.' }
});

// Инициализация базы данных
const db = new Database('visitors.db');

// Создание таблиц
db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
        id TEXT PRIMARY KEY,
        ip TEXT NOT NULL,
        country TEXT,
        city TEXT,
        user_agent TEXT,
        browser TEXT,
        os TEXT,
        device TEXT,
        screen_resolution TEXT,
        timezone TEXT,
        language TEXT,
        session_duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    
    CREATE TABLE IF NOT EXISTS admin_password (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL
    )
    
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        visitor_id TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visitor_id) REFERENCES visitors(id)
    )
`);

// Установка пароля по умолчанию если нет
const adminPasswordCheck = db.prepare('SELECT * FROM admin_password WHERE id = 1').get();
if (!adminPasswordCheck) {
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_password (id, password_hash) VALUES (1, ?)').run(defaultPassword);
}

// API: Трекинг посетителя
app.post('/api/track', async (req, res) => {
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
                   req.connection.remoteAddress ||
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
        
        // Проверка существующего посетителя
        let visitor = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
        
        if (visitor) {
            // Обновление сессии
            if (sessionDuration !== undefined) {
                db.prepare(`
                    UPDATE visitors 
                    SET session_duration = ?, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `).run(sessionDuration, visitorId);
            }
        } else {
            // Новый посетитель
            db.prepare(`
                INSERT INTO visitors (
                    id, ip, country, city, user_agent, browser, os, device,
                    screen_resolution, timezone, language
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                visitorId,
                ip,
                country,
                city,
                req.headers['user-agent'] || '',
                agent.toAgentString(),
                agent.os.toString(),
                agent.device.toString(),
                screenResolution || 'unknown',
                timezone || 'unknown',
                language || 'unknown'
            );
        }
        
        res.json({ 
            success: true, 
            visitorId,
            message: 'Tracked successfully'
        });
    } catch (error) {
        console.error('Track error:', error);
        res.status(500).json({ error: 'Tracking failed' });
    }
});

// API: Вход администратора
app.post('/api/login', loginLimiter, (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ error: 'Пароль обязателен' });
        }
        
        const adminRecord = db.prepare('SELECT * FROM admin_password WHERE id = 1').get();
        
        if (bcrypt.compareSync(password, adminRecord.password_hash)) {
            const token = uuidv4();
            res.json({ 
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
});

// API: Получение статистики
app.get('/api/stats', (req, res) => {
    try {
        const stats = {};
        
        // Общее количество посетителей
        stats.totalVisitors = db.prepare('SELECT COUNT(*) as count FROM visitors').get().count;
        
        // Уникальные IP
        stats.uniqueIPs = db.prepare('SELECT COUNT(DISTINCT ip) as count FROM visitors').get().count;
        
        // Посетители за сегодня
        stats.todayVisitors = db.prepare(`
            SELECT COUNT(*) as count FROM visitors 
            WHERE DATE(created_at) = DATE('now')
        `).get().count;
        
        // Посетители за неделю
        stats.weekVisitors = db.prepare(`
            SELECT COUNT(*) as count FROM visitors 
            WHERE created_at >= DATE('now', '-7 days')
        `).get().count;
        
        // Среднее время на сайте
        const avgDuration = db.prepare(`
            SELECT AVG(session_duration) as avg FROM visitors 
            WHERE session_duration > 0
        `).get().avg || 0;
        stats.avgSessionDuration = Math.round(avgDuration);
        
        // Последний посетитель
        const lastVisitor = db.prepare(`
            SELECT * FROM visitors ORDER BY created_at DESC LIMIT 1
        `).get();
        stats.lastVisit = lastVisitor ? lastVisitor.created_at : null;
        
        // Топ стран
        stats.topCountries = db.prepare(`
            SELECT country, COUNT(*) as count 
            FROM visitors 
            GROUP BY country 
            ORDER BY count DESC 
            LIMIT 5
        `).all();
        
        // Топ браузеров
        stats.topBrowsers = db.prepare(`
            SELECT browser, COUNT(*) as count 
            FROM visitors 
            GROUP BY browser 
            ORDER BY count DESC 
            LIMIT 5
        `).all();
        
        // Топ ОС
        stats.topOS = db.prepare(`
            SELECT os, COUNT(*) as count 
            FROM visitors 
            GROUP BY os 
            ORDER BY count DESC 
            LIMIT 5
        `).all();
        
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// API: Получение всех посетителей
app.get('/api/visitors', (req, res) => {
    try {
        const visitors = db.prepare(`
            SELECT * FROM visitors 
            ORDER BY created_at DESC
        `).all();
        
        res.json(visitors);
    } catch (error) {
        console.error('Visitors error:', error);
        res.status(500).json({ error: 'Ошибка получения посетителей' });
    }
});

// API: Экспорт в CSV
app.get('/api/export/csv', (req, res) => {
    try {
        const visitors = db.prepare('SELECT * FROM visitors ORDER BY created_at DESC').all();
        
        const headers = ['ID', 'IP', 'Страна', 'Город', 'Браузер', 'ОС', 'Разрешение', 'Время на сайте (сек)', 'Дата'];
        const csvRows = [headers.join(',')];
        
        visitors.forEach(v => {
            csvRows.push([
                v.id,
                v.ip,
                v.country,
                v.city,
                v.browser,
                v.os,
                v.screen_resolution,
                v.session_duration,
                v.created_at
            ].join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=visitors.csv');
        res.send(csvRows.join('\n'));
    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ error: 'Ошибка экспорта' });
    }
});

// API: Экспорт в JSON
app.get('/api/export/json', (req, res) => {
    try {
        const visitors = db.prepare('SELECT * FROM visitors ORDER BY created_at DESC').all();
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=visitors.json');
        res.json(visitors);
    } catch (error) {
        console.error('JSON export error:', error);
        res.status(500).json({ error: 'Ошибка экспорта' });
    }
});

// API: Очистка данных
app.delete('/api/visitors', (req, res) => {
    try {
        db.prepare('DELETE FROM visitors').run();
        res.json({ success: true, message: 'Данные очищены' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Ошибка очистки' });
    }
});

// API: Смена пароля
app.post('/api/change-password', (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const adminRecord = db.prepare('SELECT * FROM admin_password WHERE id = 1').get();
        
        if (!bcrypt.compareSync(currentPassword, adminRecord.password_hash)) {
            return res.status(401).json({ error: 'Текущий пароль неверен' });
        }
        
        const newHash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE admin_password SET password_hash = ? WHERE id = 1').run(newHash);
        
        res.json({ success: true, message: 'Пароль изменён' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: visitors.db`);
});
