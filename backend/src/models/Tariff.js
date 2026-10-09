const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({
    minUnits: { type: Number, required: true },
    maxUnits: { type: Number, required: true }, // Use 99999 for "Above"
    ratePerUnit: { type: Number, required: true }
});

const tierSchema = new mongoose.Schema({
    conditionMaxUnits: { type: Number, required: true }, // e.g., 500 for Tier 1
    freeUnits: { type: Number, required: true }, // e.g., 200 for Tier 1, 100 for Tier 2
    slabs: [slabSchema]
});

const tariffSchema = new mongoose.Schema({
    category: { type: String, required: true, unique: true }, // e.g., 'LT-1A'
    description: { type: String }, // e.g., 'Domestic Supply'
    effectiveDate: { type: Date, required: true },
    fixedChargePerKw: { type: Number, required: true }, // e.g., 0 for LT-1A, 110 for LT-V
    tiers: [tierSchema], 
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Tariff', tariffSchema);