const rateLimit = require('express-rate-limit');

// General API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === 'production' ? 5000 : 20000, 
    skip: (req) => {
        // Never rate limit administrative actions, due reminder dispatches, or local development
        if (process.env.NODE_ENV === 'development') return true;
        if (req.originalUrl && (req.originalUrl.includes('/admin') || req.originalUrl.includes('/health') || req.originalUrl.includes('/tts'))) return true;
        const ip = req.ip || req.connection?.remoteAddress || '';
        if (ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost')) return true;
        return false;
    },
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth Limiter: 500 requests in development, 100 in production
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, 
    skip: (req) => {
        if (process.env.NODE_ENV === 'development') return true;
        const ip = req.ip || req.connection?.remoteAddress || '';
        if (ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost')) return true;
        return false;
    },
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };