const request = require('supertest');

// Mock базы данных: отвечаем в зависимости от текста запроса
jest.mock('pg', () => {
    const mockQuery = jest.fn((sql) => {
        const text = String(sql);
        if (text.includes('admin_password') && text.includes('SELECT')) {
            return Promise.resolve({ rows: [{ id: 1, password_hash: 'hashed_admin123' }] });
        }
        if (text.includes('AVG(session_duration)')) {
            return Promise.resolve({ rows: [{ avg: null }] });
        }
        if (text.includes('COUNT(')) {
            return Promise.resolve({ rows: [{ count: '0' }] });
        }
        return Promise.resolve({ rows: [] });
    });
    const mockPool = {
        connect: jest.fn().mockResolvedValue({
            query: mockQuery,
            release: jest.fn()
        })
    };
    return { Pool: jest.fn(() => mockPool) };
});

// Mock dotenv
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
    hashSync: jest.fn((str) => `hashed_${str}`),
    compareSync: jest.fn((str, hash) => hash === `hashed_${str}`)
}));

// Mock helmet
jest.mock('helmet', () => jest.fn(() => (req, res, next) => next()));

// Mock cors
jest.mock('cors', () => jest.fn(() => (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}));

// Mock rate-limit
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock useragent
jest.mock('useragent', () => ({
    parse: jest.fn(() => ({
        toAgentString: () => 'Chrome 120.0',
        os: { toString: () => 'Windows 10' },
        device: { toString: () => 'Other' }
    }))
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

// Mock fetch для geo IP
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({
            status: 'success',
            country: 'Russia',
            city: 'Moscow'
        })
    })
);

describe('API Tests', () => {
    let app;
    let token;

    beforeAll(async () => {
        app = require('../server');
        // Получаем токен администратора для защищённых эндпоинтов
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ password: 'admin123' });
        token = loginResponse.body.token;
    });

    const authHeader = () => `Bearer ${token}`;

    describe('POST /api/login', () => {
        it('должен возвращать ошибку без пароля', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({});
            expect(response.status).toBe(400);
        });

        it('должен возвращать ошибку с неправильным паролем', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ password: 'wrong-password' });
            expect(response.status).toBe(401);
        });

        it('должен возвращать успех с правильным паролем', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ password: 'admin123' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
        });
    });

    describe('POST /api/track', () => {
        it('должен трекать посетителя без авторизации', async () => {
            const response = await request(app)
                .post('/api/track')
                .send({
                    sessionId: 'test-session',
                    screenResolution: '1920x1080',
                    timezone: 'Europe/Moscow',
                    language: 'ru-RU'
                });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/stats', () => {
        it('должен возвращать 401 без токена', async () => {
            const response = await request(app).get('/api/stats');
            expect(response.status).toBe(401);
        });

        it('должен возвращать статистику с токеном', async () => {
            const response = await request(app)
                .get('/api/stats')
                .set('Authorization', authHeader());
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.totalVisitors).toBe(0);
        });
    });

    describe('GET /api/visitors', () => {
        it('должен возвращать 401 без токена', async () => {
            const response = await request(app).get('/api/visitors');
            expect(response.status).toBe(401);
        });

        it('должен возвращать список посетителей с токеном', async () => {
            const response = await request(app)
                .get('/api/visitors')
                .set('Authorization', authHeader());
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/export/csv', () => {
        it('должен возвращать 401 без токена', async () => {
            const response = await request(app).get('/api/export/csv');
            expect(response.status).toBe(401);
        });

        it('должен экспортировать данные в CSV с токеном', async () => {
            const response = await request(app)
                .get('/api/export/csv')
                .set('Authorization', authHeader());
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
        });
    });

    describe('GET /api/export/json', () => {
        it('должен экспортировать данные в JSON с токеном', async () => {
            const response = await request(app)
                .get('/api/export/json')
                .set('Authorization', authHeader());
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/json');
        });
    });

    describe('DELETE /api/visitors', () => {
        it('должен возвращать 401 без токена', async () => {
            const response = await request(app).delete('/api/visitors');
            expect(response.status).toBe(401);
        });

        it('должен очищать данные посетителей с токеном', async () => {
            const response = await request(app)
                .delete('/api/visitors')
                .set('Authorization', authHeader());
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /api/change-password', () => {
        it('должен возвращать 401 без токена', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .send({ currentPassword: 'admin123', newPassword: 'newpass123' });
            expect(response.status).toBe(401);
        });

        it('должен отклонять слишком короткий новый пароль', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .set('Authorization', authHeader())
                .send({ currentPassword: 'admin123', newPassword: '123' });
            expect(response.status).toBe(400);
        });

        it('должен отклонять неверный текущий пароль', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .set('Authorization', authHeader())
                .send({ currentPassword: 'wrong', newPassword: 'newpass123' });
            expect(response.status).toBe(401);
        });

        it('должен менять пароль с верными данными', async () => {
            const response = await request(app)
                .post('/api/change-password')
                .set('Authorization', authHeader())
                .send({ currentPassword: 'admin123', newPassword: 'newpass123' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
