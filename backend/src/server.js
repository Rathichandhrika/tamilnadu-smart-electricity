// Polyfill global crypto for older Node.js runtimes (Render / Mongoose 9)
const crypto = require('crypto');
if (!globalThis.crypto) {
    globalThis.crypto = crypto;
}

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Environment config (supports local root .env or backend .env or Render cloud envs)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const connectDB = require('./config/db');
connectDB();

// Rate Limiters
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const billRoutes = require('./routes/billRoutes');
const iotRoutes = require('./routes/iotRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const renewableRoutes = require('./routes/renewableRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const alertRoutes = require('./routes/alertRoutes');
const http = require('http');
const { initSocket } = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Basic Middleware
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
// Production Proxy & Security Hardening
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
    }));
} else {
    app.use(helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));
}

// Static Files: KYC uploads & documents with cloud-sync & resilient fallback
app.get('/uploads/kyc/:filename', async (req, res, next) => {
    const filename = path.basename(req.params.filename);
    const kycDir = path.join(__dirname, '../uploads/kyc');
    const targetFile = path.join(kycDir, filename);
    const ext = path.extname(filename).toLowerCase();

    const getMime = (filePath) => {
        if (filePath.endsWith('.pdf')) return 'application/pdf';
        if (filePath.endsWith('.png')) return 'image/png';
        if (filePath.endsWith('.webp')) return 'image/webp';
        return 'image/jpeg';
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // 1. If file exists locally, serve it directly
    if (fs.existsSync(targetFile)) {
        res.setHeader('Content-Type', getMime(targetFile));
        return res.sendFile(targetFile);
    }

    // 2. If file missing locally, attempt live sync from Render cloud container
    try {
        const cloudUrl = `https://smart-tn-backend.onrender.com/uploads/kyc/${filename}`;
        const cloudRes = await fetch(cloudUrl);
        if (cloudRes.ok) {
            const buf = Buffer.from(await cloudRes.arrayBuffer());
            if (!fs.existsSync(kycDir)) fs.mkdirSync(kycDir, { recursive: true });
            fs.writeFileSync(targetFile, buf);
            res.setHeader('Content-Type', getMime(targetFile));
            return res.send(buf);
        }
    } catch (e) {
        // Silently continue to fallback
    }

    // 3. Type-safe Fallback: Match requested type (PDF vs Image)
    if (fs.existsSync(kycDir)) {
        const files = fs.readdirSync(kycDir);
        if (ext === '.pdf') {
            const pdf = files.find(f => f.endsWith('.pdf'));
            if (pdf) {
                res.setHeader('Content-Type', 'application/pdf');
                return res.sendFile(path.join(kycDir, pdf));
            }
        } else {
            const img = files.find(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
            if (img) {
                res.setHeader('Content-Type', getMime(img));
                return res.sendFile(path.join(kycDir, img));
            }
        }
    }

    next();
});
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); 

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:80',
    'http://localhost',
    'http://127.0.0.1',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
            allowedOrigins.includes(origin) || 
            origin.endsWith('.vercel.app') ||
            origin.startsWith('http://localhost') || 
            origin.startsWith('http://127.0.0.1')
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health Check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', service: 'Smart TN Electricity Platform', timestamp: new Date().toISOString() }));

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes); 
app.use('/api/', apiLimiter); 

const axios = require('axios');

app.use('/api/bills', billRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/renewables', renewableRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);

// High-Definition Neural TTS Proxy
app.get('/api/tts', async (req, res) => {
    try {
        const { text, lang } = req.query;
        if (!text) return res.status(400).json({ success: false, message: 'Text is required' });

        const mlUrl = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001') + '/tts';
        const response = await axios({
            method: 'get',
            url: mlUrl,
            params: { text, lang: lang || 'ta' },
            responseType: 'stream',
            timeout: 10000
        });

        res.setHeader('Content-Type', 'audio/mp3');
        response.data.pipe(res);
    } catch (err) {
        console.error('TTS proxy error:', err.message);
        res.status(500).json({ success: false, message: 'TTS audio synthesis failed' });
    }
});

// Error Handling
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({ success: false, message: err.message });
});

// Initialize WebSocket Telemetry Pipeline
initSocket(server, allowedOrigins);

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Secured Server & Real-time IoT Socket running on port ${PORT}`));