const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Check HttpOnly cookie first
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } 
    // 2. Fallback to Authorization Bearer header (for APIs/Postman)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user to request object (excluding password)
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists' });
        }

        const adminEmails = [
            'admin@smarttn.gov',
            'chandhrikarathi09@gmail.com',
            process.env.ADMIN_NOTIFICATION_EMAIL,
            process.env.SMTP_USER,
            process.env.EMAIL_USER
        ].filter(Boolean).map(e => e.toLowerCase().trim());

        if (req.user.email && adminEmails.includes(req.user.email.toLowerCase().trim())) {
            req.user.role = 'ADMIN';
        }

        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized, token validation failed' });
    }
};

const admin = (req, res, next) => {
    const adminEmails = [
        'admin@smarttn.gov',
        'chandhrikarathi09@gmail.com',
        process.env.ADMIN_NOTIFICATION_EMAIL,
        process.env.SMTP_USER,
        process.env.EMAIL_USER
    ].filter(Boolean).map(e => e.toLowerCase().trim());

    const isExplicitAdmin = req.user && req.user.role === 'ADMIN';
    const isOwnerEmail = req.user && req.user.email && adminEmails.includes(req.user.email.toLowerCase().trim());

    if (isExplicitAdmin || isOwnerEmail) {
        if (req.user && req.user.role !== 'ADMIN') {
            req.user.role = 'ADMIN';
        }
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };