const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: [
            'METER_OFFLINE', 
            'HIGH_CONSUMPTION', 
            'SYSTEM_ERROR', 
            'ANOMALY',
            'BILL_OVERDUE',
            'DUE_DATE_NEAR',
            'FINE_IMPOSED',
            'PAYMENT_SUCCESS',
            'INVOICE_GENERATED',
            'KYC_STATUS'
        ], 
        required: true 
    },
    title: { type: String, default: '' },
    titleTa: { type: String, default: '' },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    message: { type: String, required: true },
    messageTa: { type: String, default: '' },
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    fineAmount: { type: Number, default: 0 },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);