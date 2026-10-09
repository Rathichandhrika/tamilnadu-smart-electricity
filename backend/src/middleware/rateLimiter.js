const rateLimit = require('express-rate-limit');

// General API Rate Limiter: 500 requests per 15 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, 
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth Limiter: 100 requests in development, 20 in production
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 200, 
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };