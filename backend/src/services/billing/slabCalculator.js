/**
 * Core Slab Calculator for TANGEDCO 2026 Rules
 * Dynamically processes tiers and slabs from the Tariff database model.
 */

const calculateSlabs = (unitsConsumed, tariffConfig) => {
    // 1. Identify the correct tier based on total consumption (e.g., <= 500 or > 500)
    // We sort tiers ascending by conditionMaxUnits to evaluate safely.
    const sortedTiers = tariffConfig.tiers.sort((a, b) => a.conditionMaxUnits - b.conditionMaxUnits);
    
    let activeTier = sortedTiers.find(tier => unitsConsumed <= tier.conditionMaxUnits);
    
    // Fallback for extremely high usage if not caught by 99999
    if (!activeTier) activeTier = sortedTiers[sortedTiers.length - 1]; 

    let slabBreakdown = [];
    let totalEnergyCharge = 0;

    // 2. Process Free Units (TANGEDCO gives 200 or 100 free based on tier)
    const applicableFreeUnits = Math.min(unitsConsumed, activeTier.freeUnits);
    if (applicableFreeUnits > 0) {
        slabBreakdown.push({
            minUnits: 1,
            maxUnits: activeTier.freeUnits,
            unitsBilled: applicableFreeUnits,
            ratePerUnit: 0,
            charge: 0,
            isFreeSlab: true
        });
    }

    // 3. Process Chargeable Slabs dynamically
    activeTier.slabs.forEach(slab => {
        // Calculate overlap between consumption and the current slab boundaries
        // E.g., Consumed 300. Slab is 201-400. Math.min(300, 400) - 201 + 1 = 100 units.
        const upperLimit = Math.min(unitsConsumed, slab.maxUnits);
        
        if (upperLimit >= slab.minUnits) {
            const unitsInSlab = upperLimit - slab.minUnits + 1;
            const chargeForSlab = Number((unitsInSlab * slab.ratePerUnit).toFixed(2));
            
            slabBreakdown.push({
                minUnits: slab.minUnits,
                maxUnits: slab.maxUnits,
                unitsBilled: unitsInSlab,
                ratePerUnit: slab.ratePerUnit,
                charge: chargeForSlab,
                isFreeSlab: false
            });

            totalEnergyCharge += chargeForSlab;
        }
    });

    return {
        activeTierMax: activeTier.conditionMaxUnits,
        freeUnitsApplied: applicableFreeUnits,
        totalEnergyCharge: Number(totalEnergyCharge.toFixed(2)),
        breakdown: slabBreakdown
    };
};

module.exports = { calculateSlabs };