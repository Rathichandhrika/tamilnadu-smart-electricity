const IoTReading = require('../models/IoTReading');
const { broadcastTelemetry } = require('../services/socketService');

// @desc    Receive telemetry from Python IoT Simulator
// @route   POST /api/iot/telemetry
// @access  Public (In production, this would use API keys/MQTT certificates)
const receiveTelemetry = async (req, res, next) => {
    try {
        const { serviceNumber, timestamp, voltage, current, powerKw, energyKwh, powerFactor } = req.body;

        if (!serviceNumber || powerKw === undefined) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        const reading = await IoTReading.create({
            serviceNumber,
            timestamp: timestamp || new Date(),
            voltage,
            current,
            powerKw,
            energyKwh,
            powerFactor
        });

        // Broadcast to WebSocket subscribers in real time
        broadcastTelemetry(reading);

        res.status(201).json({ success: true, data: reading });
    } catch (error) {
        next(error);
    }
};

// @desc    Get latest readings for a specific meter (for Frontend Dashboard)
// @route   GET /api/iot/telemetry/:serviceNumber
// @access  Private
const getMeterTelemetry = async (req, res, next) => {
    try {
        const { serviceNumber } = req.params;
        const limit = parseInt(req.query.limit) || 20; // Default to last 20 readings

        const readings = await IoTReading.find({ serviceNumber })
            .sort({ timestamp: -1 })
            .limit(limit);

        res.status(200).json({ success: true, data: readings });
    } catch (error) {
        next(error);
    }
};

module.exports = { receiveTelemetry, getMeterTelemetry };