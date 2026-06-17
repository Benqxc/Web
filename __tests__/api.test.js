const request = require('supertest');

jest.mock('pg', () => {
    const mockClient = {
        query: jest.fn().mockImplementation((sql) => {
            if (typeof sql === 'string' && sql.includes('admin_password')) {
                return Promise.resolve({ rows: [{ id: 1, password_hash: 'hashed_admin123' }] });
            }
            if (typeof sql === 'string' && sql.includes('COUNT')) {
                return Promise.resolve({ rows: [{ count: '0' }] });
            }
            if (typeof sql === 'string' && sql.includes('AVG')) {
                return Promise.resolve({ rows: [{ avg: '0' }] });
            }
            return Promise.resolve({ rows: [] });
        }),
        release: jest.fn()
    };
    const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient)
    };
    return { Pool: jest.fn(() => mockPool) };
});

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('bcryptjs', () => ({
    hashSync: jest.fn((str) => `hashed_${str}`),
    compareSync: jest.fn((str, hash) => str === 'admin123' || str === 'hashed_admin123')
}));

jest.mock('helmet', () => jest.fn(() => (req, res, next) => next()));

jest.mock('cors', () => jest.fn(() => (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}));

jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

jest.mock('useragent', () => ({
    parse: jest.fn(() => ({
        toAgentString: () => 'Chrome 120.0',
        os: { toString: () => 'Windows 10' },
        device: { toString: () => 'Other' }
    }))
}));

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
    let authToken;

    beforeAll(async () => {
        process.env.JWT_SECRET = 'test-secret';
        app = require('../server');
        const login = await request(app)
            .post('/api/login')
            .send({ password: 'admin123' });
        authToken = login.body.token;
    });

    describe('GET /api/stats', () => {
        it('должен требовать авторизацию', async () => {
            const response = await request(app).get('/api/stats');
            expect(response.status).toBe(401);
        });

        it('должен возвращать статистику с токеном', async () => {
            const response = await request(app)
                .get('/api/stats')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();
        });
    });

    describe('POST /api/track', () => {
        it('должен трекинг посетителя', async () => {
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

    describe('POST /api/login', () => {
        it('должен возвращать ошибку без пароля', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({});
            expect(response.status).toBe(400);
        });

        it('должен возвращать JWT с правильным паролем', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ password: 'admin123' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
        });
    });

    describe('GET /api/visitors', () => {
        it('должен требовать авторизацию', async () => {
            const response = await request(app).get('/api/visitors');
            expect(response.status).toBe(401);
        });

        it('должен возвращать список посетителей с токеном', async () => {
            const response = await request(app)
                .get('/api/visitors')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('DELETE /api/visitors', () => {
        it('должен очищать данные посетителей с токеном', async () => {
            const response = await request(app)
                .delete('/api/visitors')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
