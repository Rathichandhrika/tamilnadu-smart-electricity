const mongoose = require('mongoose');

const iotReadingSchema = new mongoose.Schema({
    serviceNumber: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    voltage: { type: Number, required: true },     // e.g., 230V
    current: { type: Number, required: true },     // e.g., 5.2A
    powerKw: { type: Number, required: true },     // Instantaneous power
    energyKwh: { type: Number, required: true },   // Cumulative energy meter reading
    powerFactor: { type: Number, default: 0.95 }
}, { timeseries: { timeField: 'timestamp', metaField: 'serviceNumber', granularity: 'minutes' } }); 
// Note: We use MongoDB's native Time Series collections for massive IoT data scaling.

module.exports = mongoose.model('IoTReading', iotReadingSchema);