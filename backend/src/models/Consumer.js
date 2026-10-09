const mongoose = require('mongoose');

const consumerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceNumber: { type: String, required: true, unique: true }, // e.g., 04-123-001234
    tariffCategory: { type: String, enum: ['LT-1A', 'LT-2B', 'LT-3A', 'LT-3B', 'LT-5'], default: 'LT-1A' }, // LT-1A is Domestic, LT-3B Industrial, LT-5 Commercial
    sanctionedLoadKw: { type: Number, required: true, default: 2.0 },
    phase: { type: Number, enum: [1, 3], default: 1 },
    connectionType: { 
        type: String, 
        enum: ['LT-1A_DOMESTIC', 'LT-V_COMMERCIAL', 'LT-IIIB_INDUSTRIAL'], 
        default: 'LT-1A_DOMESTIC' 
    },
    verificationStatus: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED'], 
        default: 'PENDING' 
    },
    kycDocuments: [{ 
        type: String 
    }],
    district: {
        type: String,
        default: 'Chennai',
        trim: true
    },
    address: {
        street: String,
        city: { type: String, default: 'Chennai' },
        district: { type: String, default: 'Chennai' },
        pincode: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Consumer', consumerSchema);