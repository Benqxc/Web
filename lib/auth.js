const crypto = require('crypto');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getJwtSecret() {
    const secret = process.env.JWT_SECRET || process.env.ADMIN_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set in production');
    }
    return 'dev-only-insecure-secret-change-me';
}

function resolveAdminPassword() {
    if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('ADMIN_PASSWORD must be set in production');
    }
    console.warn('WARNING: Using dev-only default password. Set ADMIN_PASSWORD!');
    return 'admin123';
}

function signAuthToken() {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        role: 'admin',
        iat: Date.now(),
        exp: Date.now() + TOKEN_TTL_MS
    })).toString('base64url');
    const signature = crypto
        .createHmac('sha256', getJwtSecret())
        .update(`${header}.${payload}`)
        .digest('base64url');
    return `${header}.${payload}.${signature}`;
}

function verifyAuthToken(authorization) {
    if (!authorization) {
        throw new Error('Требуется авторизация');
    }
    const raw = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
    const parts = raw.split('.');
    if (parts.length !== 3) {
        throw new Error('Недействительный токен');
    }
    const [header, payload, signature] = parts;
    const expected = crypto
        .createHmac('sha256', getJwtSecret())
        .update(`${header}.${payload}`)
        .digest('base64url');
    if (signature !== expected) {
        throw new Error('Недействительный токен');
    }
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) {
        throw new Error('Срок действия токена истёк');
    }
    if (data.role !== 'admin') {
        throw new Error('Недостаточно прав');
    }
    return data;
}

function requireAuth(authorization) {
    return verifyAuthToken(authorization);
}

function expressRequireAuth(req, res, next) {
    try {
        requireAuth(req.headers.authorization);
        next();
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

module.exports = {
    getJwtSecret,
    resolveAdminPassword,
    signAuthToken,
    verifyAuthToken,
    requireAuth,
    expressRequireAuth
};
