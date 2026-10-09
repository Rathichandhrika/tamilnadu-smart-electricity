const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    consumer: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
    predictionMonth: { type: Date, required: true },
    predictedUnits: { type: Number, required: true },
    predictedBillAmount: { type: Number, required: true },
    modelUsed: { type: String, default: 'RandomForest_v1' },
    confidenceScore: { type: Number },
    featuresUsed: { type: Object } // Store weather, past consumption, etc.
}, { timestamps: true });

module.exports = mongoose.model('Prediction', predictionSchema);