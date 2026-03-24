const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const useragent = require('useragent');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xFrameOptions: { action: 'sameorigin' },
    xContentTypeOptions: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting для защиты от перебора паролей
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.LOGIN_RATE_LIMIT) || 5,
    message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.connection.remoteAddress || 'unknown';
    }
});

// Общий rate limiter для API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 100, // 100 запросов в минуту
    message: { error: 'Слишком много запросов. Попробуйте позже.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', apiLimiter);

// Инициализация PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Создание таблиц
async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_password (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                password_hash TEXT NOT NULL
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                visitor_id TEXT NOT NULL,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (visitor_id) REFERENCES visitors(id)
            )
        `);

        // Установка пароля из переменной окружения или пароля по умолчанию
        const adminPasswordCheck = await client.query('SELECT * FROM admin_password WHERE id = 1');
        if (adminPasswordCheck.rows.length === 0) {
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
            if (process.env.ADMIN_PASSWORD) {
                console.log('Using ADMIN_PASSWORD from environment');
            } else {
                console.warn('WARNING: Using default password. Set ADMIN_PASSWORD environment variable!');
            }
            const defaultPassword = bcrypt.hashSync(adminPassword, 10);
            await client.query('INSERT INTO admin_password (id, password_hash) VALUES (1, $1)', [defaultPassword]);
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// API: Трекинг посетителя
app.post('/api/track', async (req, res) => {
    const client = await pool.connect();
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
        const visitor = await client.query('SELECT * FROM visitors WHERE id = $1', [visitorId]);
        
        if (visitor.rows.length > 0) {
            // Обновление сессии
            if (sessionDuration !== undefined) {
                await client.query(`
                    UPDATE visitors 
                    SET session_duration = $1, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $2
                `, [sessionDuration, visitorId]);
            }
        } else {
            // Новый посетитель
            await client.query(`
                INSERT INTO visitors (
                    id, ip, country, city, user_agent, browser, os, device,
                    screen_resolution, timezone, language
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
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
            ]);
        }
        
        res.json({ 
            success: true, 
            visitorId,
            message: 'Tracked successfully'
        });
    } catch (error) {
        console.error('Track error:', error);
        res.status(500).json({ error: 'Tracking failed' });
    } finally {
        client.release();
    }
});

// API: Вход администратора
app.post('/api/login', loginLimiter, async (req, res) => {
    const client = await pool.connect();
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ error: 'Пароль обязателен' });
        }
        
        const adminRecord = await client.query('SELECT * FROM admin_password WHERE id = 1');
        
        if (adminRecord.rows.length > 0 && bcrypt.compareSync(password, adminRecord.rows[0].password_hash)) {
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
    } finally {
        client.release();
    }
});

// API: Получение статистики
app.get('/api/stats', async (req, res) => {
    const client = await pool.connect();
    try {
        const stats = {};
        
        // Общее количество посетителей
        const totalResult = await client.query('SELECT COUNT(*) as count FROM visitors');
        stats.totalVisitors = parseInt(totalResult.rows[0].count);
        
        // Уникальные IP
        const uniqueIPResult = await client.query('SELECT COUNT(DISTINCT ip) as count FROM visitors');
        stats.uniqueIPs = parseInt(uniqueIPResult.rows[0].count);
        
        // Посетители за сегодня
        const todayResult = await client.query(`
            SELECT COUNT(*) as count FROM visitors 
            WHERE DATE(created_at) = DATE(CURRENT_TIMESTAMP)
        `);
        stats.todayVisitors = parseInt(todayResult.rows[0].count);
        
        // Посетители за неделю
        const weekResult = await client.query(`
            SELECT COUNT(*) as count FROM visitors 
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        `);
        stats.weekVisitors = parseInt(weekResult.rows[0].count);
        
        // Среднее время на сайте
        const avgResult = await client.query(`
            SELECT AVG(session_duration) as avg FROM visitors 
            WHERE session_duration > 0
        `);
        stats.avgSessionDuration = Math.round(parseFloat(avgResult.rows[0].avg) || 0);
        
        // Последний посетитель
        const lastVisitorResult = await client.query(`
            SELECT * FROM visitors ORDER BY created_at DESC LIMIT 1
        `);
        stats.lastVisit = lastVisitorResult.rows.length > 0 ? lastVisitorResult.rows[0].created_at : null;
        
        // Топ стран
        const countriesResult = await client.query(`
            SELECT country, COUNT(*) as count 
            FROM visitors 
            GROUP BY country 
            ORDER BY count DESC 
            LIMIT 5
        `);
        stats.topCountries = countriesResult.rows;
        
        // Топ браузеров
        const browsersResult = await client.query(`
            SELECT browser, COUNT(*) as count 
            FROM visitors 
            GROUP BY browser 
            ORDER BY count DESC 
            LIMIT 5
        `);
        stats.topBrowsers = browsersResult.rows;
        
        // Топ ОС
        const osResult = await client.query(`
            SELECT os, COUNT(*) as count
            FROM visitors
            GROUP BY os
            ORDER BY count DESC
            LIMIT 5
        `);
        stats.topOS = osResult.rows;
        
        // Посещения по дням (последние 7 дней)
        const visitsByDayResult = await client.query(`
            SELECT
                TO_CHAR(DATE(CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 day' * generate_series(0, 6)), 'DD.MM') as day,
                COUNT(CASE WHEN DATE(created_at) = CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 day' * generate_series(0, 6) THEN 1 END) as count
            FROM visitors
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
            GROUP BY DATE(CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 day' * generate_series(0, 6))
            ORDER BY DATE(CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '1 day' * generate_series(0, 6))
        `);
        stats.visitsByDay = visitsByDayResult.rows.map(row => ({
            day: row.day,
            count: parseInt(row.count)
        }));
        
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    } finally {
        client.release();
    }
});

// API: Получение всех посетителей
app.get('/api/visitors', async (req, res) => {
    const client = await pool.connect();
    try {
        const visitors = await client.query(`
            SELECT * FROM visitors 
            ORDER BY created_at DESC
        `);
        
        res.json(visitors.rows);
    } catch (error) {
        console.error('Visitors error:', error);
        res.status(500).json({ error: 'Ошибка получения посетителей' });
    } finally {
        client.release();
    }
});

// API: Экспорт в CSV
app.get('/api/export/csv', async (req, res) => {
    const client = await pool.connect();
    try {
        const visitors = await client.query('SELECT * FROM visitors ORDER BY created_at DESC');
        
        const headers = ['ID', 'IP', 'Страна', 'Город', 'Браузер', 'ОС', 'Разрешение', 'Время на сайте (сек)', 'Дата'];
        const csvRows = [headers.join(',')];
        
        visitors.rows.forEach(v => {
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
    } finally {
        client.release();
    }
});

// API: Экспорт в JSON
app.get('/api/export/json', async (req, res) => {
    const client = await pool.connect();
    try {
        const visitors = await client.query('SELECT * FROM visitors ORDER BY created_at DESC');
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=visitors.json');
        res.json(visitors.rows);
    } catch (error) {
        console.error('JSON export error:', error);
        res.status(500).json({ error: 'Ошибка экспорта' });
    } finally {
        client.release();
    }
});

// API: Очистка данных
app.delete('/api/visitors', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM visitors');
        res.json({ success: true, message: 'Данные очищены' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Ошибка очистки' });
    } finally {
        client.release();
    }
});

// API: Смена пароля
app.post('/api/change-password', async (req, res) => {
    const client = await pool.connect();
    try {
        const { currentPassword, newPassword } = req.body;
        
        const adminRecord = await client.query('SELECT * FROM admin_password WHERE id = 1');
        
        if (adminRecord.rows.length === 0 || !bcrypt.compareSync(currentPassword, adminRecord.rows[0].password_hash)) {
            return res.status(401).json({ error: 'Текущий пароль неверен' });
        }
        
        const newHash = bcrypt.hashSync(newPassword, 10);
        await client.query('UPDATE admin_password SET password_hash = $1 WHERE id = 1', [newHash]);
        
        res.json({ success: true, message: 'Пароль изменён' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    } finally {
        client.release();
    }
});

// Запуск сервера
async function startServer() {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Database: PostgreSQL (Railway)`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
