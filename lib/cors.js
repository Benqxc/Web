function applyCors(req, res, methods = 'GET, POST, OPTIONS') {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
}

function handlePreflight(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}

function unauthorized(res, message = 'Требуется авторизация') {
    return res.status(401).json({ error: message });
}

module.exports = { applyCors, handlePreflight, unauthorized };
