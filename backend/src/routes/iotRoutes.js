const express = require('express');
const router = express.Router();
const { receiveTelemetry, getMeterTelemetry } = require('../controllers/iotController');
const { protect } = require('../middleware/authMiddleware');

// The simulator POSTs here without JWT (Machine-to-Machine)
router.post('/telemetry', receiveTelemetry);

// The frontend GETs data from here (Requires user login)
router.get('/telemetry/:serviceNumber', protect, getMeterTelemetry);

module.exports = router;