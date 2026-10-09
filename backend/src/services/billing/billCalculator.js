const Tariff = require('../../models/Tariff');
const { calculateSlabs } = require('./slabCalculator');

/**
 * Orchestrates the full billing process.
 */
const generateBill = async (consumerCategory, unitsConsumed, sanctionedLoadKw) => {
    if (unitsConsumed < 0) {
        throw new Error("Units consumed cannot be negative.");
    }

    // 1. Fetch the active tariff rules for the given category (e.g., 'LT-1A')
    const activeTariff = await Tariff.findOne({ 
        category: consumerCategory, 
        isActive: true 
    });

    if (!activeTariff) {
        throw new Error(`Active tariff configuration not found for category: ${consumerCategory}`);
    }

    // 2. Calculate Energy Charges using the Slab Engine
    const slabData = calculateSlabs(unitsConsumed, activeTariff);

    // 3. Calculate Fixed Charges
    // For TANGEDCO 2026 Domestic (LT-1A), fixed charge is usually Rs 0/kW. 
    // Commercial (LT-5) relies on sanctioned load.
    const fixedCharge = Number((activeTariff.fixedChargePerKw * sanctionedLoadKw).toFixed(2));

    // 4. Compile final bill total
    const totalAmount = Number((slabData.totalEnergyCharge + fixedCharge).toFixed(2));

    return {
        unitsConsumed,
        sanctionedLoadKw,
        tariffCategory: activeTariff.category,
        tariffDescription: activeTariff.description,
        effectiveDate: activeTariff.effectiveDate,
        energyCharge: slabData.totalEnergyCharge,
        fixedCharge: fixedCharge,
        totalAmount: totalAmount,
        slabBreakdown: slabData.breakdown
    };
};

module.exports = { generateBill };