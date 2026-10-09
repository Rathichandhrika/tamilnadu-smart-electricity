const IoTReading = require('../models/IoTReading');
const Consumer = require('../models/Consumer');
const Bill = require('../models/Bill');
const axios = require('axios');

// @desc    Get AI Energy Inbox plain-language contextual anomaly cards & health score
// @route   POST /api/insights/energy-inbox
// @access  Private
const getEnergyInbox = async (req, res, next) => {
    try {
        let consumerId = null;
        if (req.user) {
            const consumer = await Consumer.findOne({ user: req.user._id });
            if (consumer) consumerId = consumer._id;
        }

        // 1. Fetch real historical bills for this consumer
        let historicalBills = [];
        let previousCycleUnits = 410;
        if (consumerId) {
            historicalBills = await Bill.find({ consumer: consumerId })
                .sort({ createdAt: -1 })
                .limit(6);
            if (historicalBills.length > 0 && historicalBills[0].unitsConsumed) {
                previousCycleUnits = historicalBills[0].unitsConsumed;
            }
        }

        const {
            estimated_units = 340,
            current_units = 225,
            days_passed = 24
        } = req.body || {};

        const currentMonth = new Date().getMonth() + 1; // 1-12

        // 2. Try Python Flask Microservice first
        try {
            const mlUrl = (process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001') + '/energy-inbox';
            const mlRes = await axios.post(mlUrl, {
                estimated_units: Number(estimated_units),
                current_units: Number(current_units),
                days_passed: Number(days_passed),
                previous_cycle_units: Number(previousCycleUnits),
                historical_bills: historicalBills,
                current_month: currentMonth
            }, { timeout: 3000 });

            if (mlRes.data && mlRes.data.success) {
                return res.status(200).json(mlRes.data);
            }
        } catch (mlErr) {
            console.warn('ML Microservice /energy-inbox unavailable, running Node.js engine fallback:', mlErr.message);
        }

        // 3. High-Fidelity Node.js Engine Fallback
        const days = Math.max(1, Number(days_passed));
        const units = Number(current_units);
        const estUnits = Number(estimated_units);
        const prevUnits = Number(previousCycleUnits);

        // Feature 3: Usage Velocity Gauge (Pace Anomaly)
        // Formula: (current_units / days_passed) * 60
        const dailyVelocity = Number((units / days).toFixed(2));
        const projectedUnits = Math.round(dailyVelocity * 60);

        // Feature 4: Traffic Light Health Score
        // 🟢 Normal: Matches historical average (< 10% change)
        // 🟡 Elevated: 10% - 25% higher than last cycle
        // 🔴 Abnormal: > 25% spike compared to normal habits
        const diffPct = prevUnits > 0 
            ? Math.round(((projectedUnits - prevUnits) / prevUnits) * 100) 
            : 0;

        let healthScore = {
            grade: 'NORMAL',
            color: 'GREEN',
            label: 'Normal',
            percent_diff: diffPct,
            summary: `Matches your historical average baseline (${prevUnits} units).`
        };

        if (diffPct > 25) {
            healthScore = {
                grade: 'ABNORMAL',
                color: 'RED',
                label: 'Abnormal',
                percent_diff: diffPct,
                summary: `${diffPct}% spike compared to normal billing habits. Immediate action advised.`
            };
        } else if (diffPct >= 10) {
            healthScore = {
                grade: 'ELEVATED',
                color: 'YELLOW',
                label: 'Elevated',
                percent_diff: diffPct,
                summary: `${diffPct}% higher than last cycle. Keep heavy loads in check.`
            };
        }

        const cards = [];

        // Feature 1: The "Phantom Load" Detective (Mismatch Anomaly)
        // If actual usage is >20% higher than estimate:
        // UI Card: RED left-border card: ⚠️ Unexplained Usage Detected.
        if (estUnits > 0 && projectedUnits > (estUnits * 1.20)) {
            const leakUnits = Math.round(projectedUnits - estUnits);
            cards.push({
                id: 'phantom-leak',
                type: 'PHANTOM_LOAD',
                severity: 'HIGH',
                border_color: 'RED',
                title: '⚠️ Unexplained Usage Detected',
                title_ta: '⚠️ விளக்கப்படாத மின் பயன்பாடு கண்டறியப்பட்டது',
                message: `Your appliances should only use ~${Math.round(estUnits)} units, but your meter shows ${projectedUnits} units. You have a ${leakUnits}-unit leak. Check for older, inefficient appliances or wiring faults.`,
                message_ta: `உங்கள் உபகரணங்கள் ~${Math.round(estUnits)} யூனிட்கள் மட்டுமே பயன்படுத்த வேண்டும், ஆனால் உங்கள் மீட்டரில் ${projectedUnits} யூனிட்கள் பதிவாகியுள்ளது. உங்களிடம் ${leakUnits} யூனிட் கசிவு உள்ளது. பழைய, திறனற்ற உபகரணங்கள் அல்லது வயரிங் குறைபாடுகளை சரிபார்க்கவும்.`,
                leak_units: leakUnits
            });
        }

        // Feature 3: The "Usage Velocity" Gauge (Pace Anomaly)
        // If projected total crosses 500 units subsidy cliff:
        // UI Card: RED left-border card: 📈 Fast Burn Rate Detected.
        if (projectedUnits > 500) {
            cards.push({
                id: 'usage-velocity',
                type: 'VELOCITY_SPIKE',
                severity: 'HIGH',
                border_color: 'RED',
                title: '📈 Fast Burn Rate Detected',
                title_ta: '📈 அதிவேக மின் நுகர்வு கண்டறியப்பட்டது',
                message: `You have used ${units} units in just ${days} days. At this pace, you will finish the cycle at ${projectedUnits} units and lose your tier-1 subsidy.`,
                message_ta: `நீங்கள் வெறும் ${days} நாட்களில் ${units} யூனிட்களைப் பயன்படுத்தியுள்ளீர்கள். இதே வேகத்தில் தொடர்ந்தால், சுழற்சி முடிவில் ${projectedUnits} யூனிட்களை எட்டி உங்கள் முதல் அடுக்கு மானியத்தை இழப்பீர்கள்.`,
                projected_units: projectedUnits,
                daily_velocity: dailyVelocity
            });
        } else if (projectedUnits >= 420) {
            const cushion = 500 - projectedUnits;
            cards.push({
                id: 'usage-velocity-cushion',
                type: 'VELOCITY_CUSHION',
                severity: 'MEDIUM',
                border_color: 'GOLD',
                title: '⚡ Nearing 500-Unit Subsidy Cliff',
                title_ta: '⚡ 500 யூனிட் மானிய வரம்பை நெருங்குகிறது',
                message: `You are burning ${dailyVelocity} units/day (${units} kWh in ${days} days). You only have an ${cushion}-unit cushion remaining before crossing the 500-unit tariff cliff.`,
                message_ta: `நீங்கள் ஒரு நாளைக்கு ${dailyVelocity} யூனிட்கள் நுகர்கிறீர்கள் (${days} நாட்களில் ${units} kWh). 500 யூனிட் கட்டண வரம்பைக் கடக்க இன்னும் வெறும் ${cushion} யூனிட்கள் மட்டுமே எஞ்சியுள்ளன.`,
                projected_units: projectedUnits,
                cushion: cushion
            });
        }

        // Feature 2: Seasonal "Bill Shock" Predictor
        // If current month approaching April/May and history shows 30%+ jump:
        // UI Card: GOLD left-border card: ☀️ Summer Spike Warning.
        const isApproachingSummer = (currentMonth >= 2 && currentMonth <= 5);
        let summerSpikePct = 40;
        if (historicalBills.length > 0) {
            const summerVals = historicalBills
                .filter(b => ['apr', 'may', 'jun', 'mar'].some(m => (b.billingMonth || '').toLowerCase().includes(m)))
                .map(b => b.unitsConsumed || 0);
            const winterVals = historicalBills
                .filter(b => ['nov', 'dec', 'jan', 'feb'].some(m => (b.billingMonth || '').toLowerCase().includes(m)))
                .map(b => b.unitsConsumed || 0);

            if (summerVals.length && winterVals.length) {
                const avgS = summerVals.reduce((a, b) => a + b, 0) / summerVals.length;
                const avgW = winterVals.reduce((a, b) => a + b, 0) / winterVals.length;
                if (avgW > 0) {
                    const jmp = Math.round(((avgS - avgW) / avgW) * 100);
                    if (jmp >= 25) summerSpikePct = jmp;
                }
            }
        }

        if (isApproachingSummer && summerSpikePct >= 30) {
            cards.push({
                id: 'seasonal-bill-shock',
                type: 'SEASONAL_SPIKE',
                severity: 'MEDIUM',
                border_color: 'GOLD',
                title: '☀️ Summer Spike Warning',
                title_ta: '☀️ கோடைகால பயன்பாட்டு எச்சரிக்கை',
                message: `Based on your history, your usage typically jumps by ${summerSpikePct}% in April & May. Set your AC to 24°C instead of 18°C to avoid crossing the 500-unit penalty slab.`,
                message_ta: `உங்கள் கடந்தகால வரலாற்றின் அடிப்படையில், ஏப்ரல் மற்றும் மே மாதங்களில் பயன்பாடு ${summerSpikePct}% அதிகரிக்கிறது. 500 யூனிட் அபராத கட்டண அடுக்கைத் தவிர்க்க உங்கள் ஏசியை 18°C-க்கு பதிலாக 24°C-ல் அமைக்கவும்.`,
                jump_percent: summerSpikePct
            });
        }

        return res.status(200).json({
            success: true,
            health_score: healthScore,
            projected_units: projectedUnits,
            daily_velocity: dailyVelocity,
            days_passed: days,
            current_units: units,
            inbox_cards: cards
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Detect anomalies in recent power consumption (Backwards-compatible legacy route)
// @route   GET /api/insights/anomalies
// @access  Private
const getAnomalies = async (req, res, next) => {
    try {
        req.body = { days_passed: 24, current_units: 225, estimated_units: 340 };
        return getEnergyInbox(req, res, next);
    } catch (error) {
        next(error);
    }
};

// @desc    Generate energy saving recommendations
// @route   GET /api/insights/recommendations
// @access  Private
const getRecommendations = async (req, res, next) => {
    try {
        const recommendations = [
            {
                id: 'REC_AC_01',
                category: 'Appliance',
                categoryTa: 'மின்சாதனம்',
                title: 'Optimize AC Thermostat to 24°C',
                titleTa: 'ஏசி வெப்பநிலையை 24°C-ல் அமைக்கவும்',
                description: 'Setting your air conditioner temperature to 24°C instead of 18°C reduces compressor power draw by 18-24%.',
                descriptionTa: 'ஏசி வெப்பநிலையை 18°C-க்கு பதிலாக 24°C-ல் வைப்பது கம்ப்ரஸர் மின் பயன்பாட்டை 24% வரை குறைக்கும்.',
                potentialSavings: '₹450 - ₹850',
                unitText: '/ bi-monthly',
                unitTextTa: '/ இருமாதம்',
                actionable: true
            },
            {
                id: 'REC_TIER_02',
                category: 'Subsidy Risk',
                categoryTa: 'மானிய இடர்',
                title: 'Maintain 500-Unit Safe Zone',
                titleTa: '500 யூனிட் பாதுகாப்பு வரம்பைப் பராமரிக்கவும்',
                description: 'Crossing 500 units revokes your 200 free units subsidy and escalates rates up to ₹9.00/unit. Reducing 1.2 hrs of daily AC keeps you safely in Tier 1.',
                descriptionTa: '500 யூனிட்களைக் கடந்தால் 200 இலவச யூனிட் மானியம் ரத்தாகி கட்டணம் யூனிட்டுக்கு ₹9 வரை உயரும்.',
                potentialSavings: 'Up to ₹1,480',
                unitText: '/ bi-monthly',
                unitTextTa: '/ இருமாதம்',
                actionable: true
            },
            {
                id: 'REC_SOLAR_03',
                category: 'PM Surya Ghar',
                categoryTa: 'பிஎம் சூர்ய கர்',
                title: 'Install Rooftop Solar with ₹78,000 Subsidy',
                titleTa: '₹78,000 மானியத்துடன் கூரை சோலார் அமைக்கவும்',
                description: 'Under the PM Surya Ghar: Muft Bijli Yojana, install a 3kW rooftop solar setup with central capital subsidy to eliminate your domestic bill entirely.',
                descriptionTa: 'பிஎம் சூர்ய கர் திட்டத்தின் கீழ் ₹78,000 மத்திய மானியத்துடன் 3kW சோலார் அமைத்து மின்கட்டணத்தை பூஜ்ஜியமாக்கலாம்.',
                potentialSavings: '₹2,400+',
                unitText: '/ bi-monthly',
                unitTextTa: '/ இருமாதம்',
                actionable: false
            }
        ];

        res.status(200).json({ success: true, data: recommendations });
    } catch (error) {
        next(error);
    }
};

module.exports = { getEnergyInbox, getAnomalies, getRecommendations };