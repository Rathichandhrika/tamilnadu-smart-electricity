const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
    billingMonth: { type: String, required: true }, // e.g., "September 2026"
    connectionType: { 
        type: String, 
        enum: ['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'], 
        default: 'LT-1A_DOMESTIC' 
    },
    unitsConsumed: { type: Number, required: true },
    energyCharge: { type: Number, required: true },
    fixedCharge: { type: Number, required: true },
    electricityTax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['UNPAID', 'PAID', 'OVERDUE', 'PENDING_VERIFICATION'], default: 'UNPAID' },
    fineAmount: { type: Number, default: 0 },
    fineImposed: { type: Boolean, default: false },
    fineReason: { type: String, default: '' },
    fineImposedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    paymentMode: { type: String, default: null },
    transactionRef: { type: String, default: null },
    paymentVerificationStatus: { 
        type: String, 
        enum: ['NONE', 'PENDING', 'VERIFIED', 'REJECTED'], 
        default: 'NONE' 
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    dueAlertSent: { type: Boolean, default: false },
    fineAlertSent: { type: Boolean, default: false },
    slabBreakdown: { type: Array, required: true } // Snapshot of the breakdown
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);