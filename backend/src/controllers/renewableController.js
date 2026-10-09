// @desc    Calculate Rooftop Solar Requirements with PM Surya Ghar Subsidy
// @route   POST /api/renewables/solar
// @access  Private
const calculateSolar = (req, res, next) => {
    try {
        const { monthlyConsumption } = req.body; // in kWh (units)
        
        // In Tamil Nadu, 1 kW of solar generates approx 4 units/day = 120 units/month
        const consumption = Math.max(50, Number(monthlyConsumption) || 300);
        const requiredCapacityKw = parseFloat((consumption / 120).toFixed(1));
        const roundedCapacityKw = Math.max(1, Math.min(10, Math.ceil(requiredCapacityKw))); // Standard residential 1 - 10 kW
        
        const estimatedGeneration = roundedCapacityKw * 120; // kWh per month
        const grossCost = roundedCapacityKw * 60000; // ~₹60,000 per kW benchmark cost
        
        // PM Surya Ghar: Muft Bijli Yojana Central Government Direct Subsidy
        // - 1 kW system: ₹30,000
        // - 2 kW system: ₹60,000 (₹30,000 per kW)
        // - 3 kW to 10 kW system: ₹78,000 maximum central capital subsidy
        let subsidyAmount = 0;
        if (roundedCapacityKw === 1) {
            subsidyAmount = 30000;
        } else if (roundedCapacityKw === 2) {
            subsidyAmount = 60000;
        } else {
            subsidyAmount = 78000; // Capped at ₹78,000 for residential systems
        }

        const netCost = Math.max(0, grossCost - subsidyAmount);
        
        // Blended TN TANGEDCO residential rate (~₹6.50/unit)
        const monthlySavings = Math.round(estimatedGeneration * 6.50); 
        const annualSavings = monthlySavings * 12;
        const paybackYears = (netCost / annualSavings).toFixed(1);
        const lifetimeCo2OffsetTonnes = (roundedCapacityKw * 1.2 * 25).toFixed(1); // 25 year lifetime

        res.status(200).json({
            success: true,
            data: {
                requiredCapacityKw: roundedCapacityKw,
                estimatedGeneration,
                grossCost,
                estimatedCost: grossCost, // backwards compatibility
                subsidyAmount,
                netCost,
                monthlySavings,
                annualSavings,
                paybackYears,
                lifetimeCo2OffsetTonnes,
                scheme: 'PM Surya Ghar: Muft Bijli Yojana'
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Calculate Inverter Battery Sizing
// @route   POST /api/renewables/battery
// @access  Private
const calculateBattery = (req, res, next) => {
    try {
        const { loadWatts, backupHours } = req.body;
        
        // Total Energy Required (Watt-hours)
        const totalEnergyWh = Number(loadWatts) * Number(backupHours);
        
        // Formula: Ah = (Total Watt-hours) / (Battery Voltage * Inverter Efficiency * Depth of Discharge)
        // Standard tubular battery in India: 12V, 80% DoD, 80% Inverter Efficiency
        const batteryVoltage = 12;
        const requiredAh = totalEnergyWh / (batteryVoltage * 0.80 * 0.80);
        
        // Standardize to market sizes (100Ah, 150Ah, 200Ah, 220Ah, 300Ah, 400Ah)
        const standardSizes = [100, 150, 200, 220, 300, 400];
        const recommendedAh = standardSizes.find(size => size >= requiredAh) || Math.ceil(requiredAh);

        res.status(200).json({
            success: true,
            data: {
                totalEnergyWh,
                requiredAh: Math.ceil(requiredAh),
                recommendedAh,
                batteryVoltage
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Calculate EV Charging Cost
// @route   POST /api/renewables/ev
// @access  Private
const calculateEV = (req, res, next) => {
    try {
        const { batteryCapacityKwh, chargingRatePerUnit } = req.body; 
        
        const cap = Number(batteryCapacityKwh) || 30;
        const rate = Number(chargingRatePerUnit) || 8.00;
        const chargingCost = cap * rate;
        
        // Average Indian EV efficiency is ~7.5 km per kWh (e.g., Tata Nexon EV, Tiago EV)
        const estimatedRangeKm = cap * 7.5; 
        const costPerKm = (chargingCost / estimatedRangeKm).toFixed(2);

        res.status(200).json({
            success: true,
            data: {
                chargingCost: parseFloat(chargingCost.toFixed(2)),
                estimatedRangeKm: parseFloat(estimatedRangeKm.toFixed(0)),
                costPerKm: parseFloat(costPerKm)
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { calculateSolar, calculateBattery, calculateEV };