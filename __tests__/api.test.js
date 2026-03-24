const request = require('supertest');
const express = require('express');

// Mock базы данных
jest.mock('pg', () => {
    const mockPool = {
        connect: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [] }),
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
    compareSync: jest.fn((str, hash) => str === 'admin123' || str === 'hashed_admin123')
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

    beforeAll(() => {
        app = require('../server');
    });

    describe('GET /api/stats', () => {
        it('должен возвращать статистику', async () => {
            const response = await request(app).get('/api/stats');
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

        it('должен возвращать успех с правильным паролем', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({ password: 'admin123' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
        });
    });

    describe('GET /api/visitors', () => {
        it('должен возвращать список посетителей', async () => {
            const response = await request(app).get('/api/visitors');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/export/csv', () => {
        it('должен экспортировать данные в CSV', async () => {
            const response = await request(app).get('/api/export/csv');
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
        });
    });

    describe('GET /api/export/json', () => {
        it('должен экспортировать данные в JSON', async () => {
            const response = await request(app).get('/api/export/json');
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/json');
        });
    });

    describe('DELETE /api/visitors', () => {
        it('должен очищать данные посетителей', async () => {
            const response = await request(app).delete('/api/visitors');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
