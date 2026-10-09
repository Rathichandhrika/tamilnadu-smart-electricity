import React, { useState, useMemo } from 'react';
import api from '../services/api';
import { 
    Zap, Sliders, Plus, Trash2, AlertTriangle, CheckCircle2, 
    TrendingDown, Info, Sparkles, Cpu, RotateCcw, ArrowRight,
    Building2, Home, Factory, Gauge
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PRESET_CATALOGS = {
    'LT-1A_DOMESTIC': [
        { name: 'Inverter AC (1.5 Ton)', wattage: 1400, defaultHours: 7, category: 'Cooling' },
        { name: 'Frost-Free Refrigerator', wattage: 180, defaultHours: 24, category: 'Kitchen' },
        { name: 'BLDC / Induction Fan', wattage: 70, defaultHours: 12, category: 'Ventilation' },
        { name: 'Water Geyser / Heater', wattage: 2000, defaultHours: 1.2, category: 'Heating' },
        { name: 'Submersible Water Pump', wattage: 750, defaultHours: 1, category: 'Utility' },
        { name: 'Smart LED TV 55"', wattage: 90, defaultHours: 4, category: 'Entertainment' },
        { name: 'Washing Machine', wattage: 500, defaultHours: 1, category: 'Cleaning' },
        { name: 'Induction Cooktop', wattage: 1800, defaultHours: 1.5, category: 'Kitchen' },
    ],
    'LT-V_COMMERCIAL': [
        { name: 'Cassette AC (3.0 Ton)', wattage: 3500, defaultHours: 9, category: 'HVAC' },
        { name: 'Display Cooler / Freezer', wattage: 500, defaultHours: 24, category: 'Refrigeration' },
        { name: 'Office Workstations (PC)', wattage: 250, defaultHours: 9, category: 'Computing' },
        { name: 'Retail Track Lights Array', wattage: 600, defaultHours: 10, category: 'Lighting' },
        { name: 'Espresso / Water Boiler', wattage: 2200, defaultHours: 4, category: 'Hospitality' },
        { name: 'Server Rack & CCTV NVR', wattage: 350, defaultHours: 24, category: 'IT/Security' },
        { name: 'Split AC (2.0 Ton)', wattage: 2200, defaultHours: 8, category: 'HVAC' },
        { name: 'Exhaust & Fresh Air Blower', wattage: 550, defaultHours: 10, category: 'Ventilation' },
    ],
    'LT-IIIB_INDUSTRIAL': [
        { name: '3-Phase Induction Motor (10 HP)', wattage: 7500, defaultHours: 8, category: 'Machinery' },
        { name: 'Rotary Screw Air Compressor (7.5 kW)', wattage: 7500, defaultHours: 7, category: 'Pneumatics' },
        { name: 'CNC Lathe / Milling Machine', wattage: 5500, defaultHours: 8, category: 'Fabrication' },
        { name: 'Industrial Exhaust Blower', wattage: 1500, defaultHours: 12, category: 'Ventilation' },
        { name: 'MIG / TIG Welding Inverter', wattage: 4000, defaultHours: 5, category: 'Welding' },
        { name: 'Hydraulic Press Machine (15 HP)', wattage: 11000, defaultHours: 6, category: 'Heavy Press' },
        { name: 'Factory High-Bay LED Bay (x10)', wattage: 1200, defaultHours: 12, category: 'Lighting' },
        { name: 'Industrial Process Chiller', wattage: 6000, defaultHours: 8, category: 'Cooling' },
    ]
};

const DEFAULT_APPLIANCES = {
    'LT-1A_DOMESTIC': [
        { id: 'd1', name: 'Inverter AC (1.5 Ton)', wattage: 1400, hoursPerDay: 7, quantity: 1 },
        { id: 'd2', name: 'Frost-Free Refrigerator', wattage: 180, hoursPerDay: 24, quantity: 1 },
        { id: 'd3', name: 'BLDC / Induction Fan', wattage: 70, hoursPerDay: 12, quantity: 3 },
        { id: 'd4', name: 'Water Geyser / Heater', wattage: 2000, hoursPerDay: 1, quantity: 1 },
        { id: 'd5', name: 'Submersible Water Pump', wattage: 750, hoursPerDay: 0.8, quantity: 1 },
    ],
    'LT-V_COMMERCIAL': [
        { id: 'c1', name: 'Cassette AC (3.0 Ton)', wattage: 3500, hoursPerDay: 8, quantity: 1 },
        { id: 'c2', name: 'Display Cooler / Freezer', wattage: 500, hoursPerDay: 24, quantity: 1 },
        { id: 'c3', name: 'Office Workstations (PC)', wattage: 250, hoursPerDay: 9, quantity: 4 },
        { id: 'c4', name: 'Retail Track Lights Array', wattage: 600, hoursPerDay: 10, quantity: 1 },
        { id: 'c5', name: 'Server Rack & CCTV NVR', wattage: 350, hoursPerDay: 24, quantity: 1 },
    ],
    'LT-IIIB_INDUSTRIAL': [
        { id: 'i1', name: '3-Phase Induction Motor (10 HP)', wattage: 7500, hoursPerDay: 7, quantity: 1 },
        { id: 'i2', name: 'Rotary Screw Air Compressor (7.5 kW)', wattage: 7500, hoursPerDay: 6, quantity: 1 },
        { id: 'i3', name: 'CNC Lathe / Milling Machine', wattage: 5500, hoursPerDay: 8, quantity: 1 },
        { id: 'i4', name: 'Factory High-Bay LED Bay (x10)', wattage: 1200, hoursPerDay: 10, quantity: 1 },
        { id: 'i5', name: 'Industrial Exhaust Blower', wattage: 1500, hoursPerDay: 10, quantity: 1 },
    ]
};

const APPLIANCE_NAMES_TA = {
    // Domestic
    'Inverter AC (1.5 Ton)': 'இன்வெர்ட்டர் ஏசி (1.5 டன்)',
    'Frost-Free Refrigerator': 'பிராஸ்ட்-ஃப்ரீ குளிர்சாதனப் பெட்டி',
    'BLDC / Induction Fan': 'BLDC / தூண்டல் மின்விசிறி',
    'Water Geyser / Heater': 'வாட்டர் கீசர் / ஹீட்டர்',
    'Submersible Water Pump': 'நீர்மூழ்கி மோட்டார் பம்ப்',
    'Smart LED TV 55"': 'ஸ்மார்ட் எல்இடி டிவி 55"',
    'Washing Machine': 'சலவை இயந்திரம்',
    'Induction Cooktop': 'இண்டக்ஷன் அடுப்பு',
    'Custom Device': 'தனிப்பயன் சாதனம்',
    // Commercial
    'Cassette AC (3.0 Ton)': 'கேசட் ஏசி (3.0 டன்)',
    'Display Cooler / Freezer': 'டிஸ்ப்ளே கூலர் / பிரீசர்',
    'Office Workstations (PC)': 'அலுவலக பணிநிலையங்கள் (PC)',
    'Retail Track Lights Array': 'சில்லறை விற்பனை விளக்குகள்',
    'Espresso / Water Boiler': 'வாட்டர் பாய்லர் / எஸ்பிரெஸ்ஸோ',
    'Server Rack & CCTV NVR': 'சர்வர் ரேக் & CCTV NVR',
    'Split AC (2.0 Ton)': 'ஸ்பிளிட் ஏசி (2.0 டன்)',
    'Exhaust & Fresh Air Blower': 'வெளியேற்றும் மின்விசிறி',
    'Custom Equipment': 'தனிப்பயன் உபகரணம்',
    // Industrial
    '3-Phase Induction Motor (10 HP)': '3-பேஸ் தூண்டல் மோட்டார் (10 HP)',
    'Rotary Screw Air Compressor (7.5 kW)': 'ஏர் கம்ப்ரசர் (7.5 kW)',
    'CNC Lathe / Milling Machine': 'சிஎன்சி லேத் / மில்லிங் இயந்திரம்',
    'Industrial Exhaust Blower': 'தொழில்துறை எக்ஸாஸ்ட் பிளோவர்',
    'MIG / TIG Welding Inverter': 'வெல்டிங் இன்வெர்ட்டர்',
    'Hydraulic Press Machine (15 HP)': 'ஹைட்ராலிக் பிரஸ் இயந்திரம் (15 HP)',
    'Factory High-Bay LED Bay (x10)': 'தொழிற்சாலை எல்இடி பே (x10)',
    'Industrial Process Chiller': 'தொழில்துறை சில்லர்',
    'Custom Machinery': 'தனிப்பயன் இயந்திரம்'
};

const getApplianceLabel = (name, lang) => {
    if (lang === 'ta' && APPLIANCE_NAMES_TA[name]) {
        return APPLIANCE_NAMES_TA[name];
    }
    return name;
};

const translateHeadline = (headline, lang) => {
    if (!headline || lang !== 'ta') return headline;
    let translated = headline.replace(
        /⚠️\s*500-Unit Subsidy Cliff Crossed\s*\(\+([\d.]+)\s*units over threshold\)/i,
        '⚠️ 500 யூனிட் மானிய வரம்பு தாண்டப்பட்டது (வரம்பை விட +$1 யூனிட்டுகள் அதிகம்)'
    );
    translated = translated.replace(
        /⚠️\s*Projected\s*([\d.]+)\s*units crosses 500-unit subsidy cliff/i,
        '⚠️ கணிக்கப்பட்ட $1 யூனிட்டுகள் 500 யூனிட் மானிய வரம்பைத் தாண்டுகிறது'
    );
    translated = translated.replace(
        /⚡\s*Approaching 500-Unit Cliff\s*\(Only ([\d.]+)\s*units buffer remaining\)/i,
        '⚡ 500 யூனிட் மானிய வரம்பை நெருங்குகிறது (இன்னும் $1 யூனிட்டுகள் மட்டுமே மீதம் உள்ளது)'
    );
    translated = translated.replace(
        /⚡\s*Close to 500-Unit Cliff\s*\(Only ([\d.]+)\s*units buffer remaining\)/i,
        '⚡ 500 யூனிட் மானிய வரம்பை நெருங்குகிறது (இன்னும் $1 யூனிட்டுகள் மட்டுமே மீதம் உள்ளது)'
    );
    translated = translated.replace(
        /✅\s*Subsidized Tier Active\s*\(([\d.]+)\s*units bi-monthly\)/i,
        '✅ மானிய அடுக்கு பயன்பாட்டில் உள்ளது (இரு மாதத்திற்கு $1 யூனிட்டுகள்)'
    );
    translated = translated.replace(
        /🏭\s*Industrial MSME (?:Load|Power) Optimization\s*\(([\d.]+)\s*kWh\/cycle\)/i,
        '🏭 குறு, சிறு, நடுத்தர தொழிற்துறை மின் சுமை உகப்பாக்கம் ($1 kWh/சுழற்சி)'
    );
    translated = translated.replace(
        /🏢\s*High Commercial Tariff Triggered\s*\(>100 Units Flat Rate\)/i,
        '🏢 உயர் வணிகக் கட்டணம் அமலானது (>100 யூனிட்டுகள் நேரடி வீதம்)'
    );
    translated = translated.replace(
        /✅\s*Base Commercial Rate Applied\s*\(₹6.65\/unit\)/i,
        '✅ அடிப்படை வணிகக் கட்டணம் அமலில் உள்ளது (₹6.65/யூனிட்)'
    );
    return translated;
};

const translateAction = (action, lang) => {
    if (!action || lang !== 'ta') return action;

    const match = action.match(/^Reduce (.*?) by ([\d.]+) hr\/day \(target:\s*([\d.]+) hrs\)$/i);
    if (match) {
        const appName = getApplianceLabel(match[1], 'ta');
        const hrs = match[2];
        const target = match[3];
        return `${appName} பயன்பாட்டை நாள் ஒன்றுக்கு ${hrs} மணிநேரம் குறைக்கவும் (இலக்கு: ${target} மணிநேரம்)`;
    }

    if (action.includes('Maintain current energy schedule')) {
        return 'தற்போதைய மின் பயன்பாட்டு அட்டவணையைத் தொடரவும்';
    }
    if (action.includes('Shift') && action.includes('outside grid peak hours')) {
        return 'மின் பயன்பாட்டு உச்ச நேரங்களைத் தவிர்த்து (காலை 6-9 & மாலை 6-9) இயக்கவும்';
    }
    if (action.includes('Maintain APFC capacitor bank') || action.includes('Maintain Automatic Power Factor')) {
        return '0.92 பவர் ஃபேக்டருக்கு மேல் பராமரிக்க APFC மின்தேக்கி வங்கியைப் பராமரிக்கவும்';
    }
    if (action.includes('Curtail non-critical daytime lighting')) {
        return 'பகலில் அத்தியாவசியமற்ற விளக்குகள் மற்றும் குளிரூட்டும் சுமைகளைக் குறைக்கவும்';
    }
    if (action.includes('Consumption is under 100 units commercial threshold')) {
        return 'மின் நுகர்வு 100 யூனிட் வணிக வரம்பிற்குள் உள்ளது';
    }
    if (action.includes('Reduce overall load by')) {
        return 'மானியத்தைத் தக்கவைக்க ஒட்டுமொத்த மின் சுமையைக் குறைக்கவும்';
    }
    return action;
};

const translateTip = (tip, lang) => {
    if (!tip || lang !== 'ta') return tip;

    const tip1Match = tip.match(/^Reduce your (.*?) by ([\d.]+) hr\/day to drop below 500 units and (?:restore|retain) your 200 free units subsidy\.$/i);
    if (tip1Match) {
        const appName = getApplianceLabel(tip1Match[1], 'ta');
        const hrs = tip1Match[2];
        return `உங்கள் ${appName} பயன்பாட்டை நாள் ஒன்றுக்கு ${hrs} மணிநேரம் குறைத்து, 500 யூனிட்டுகளுக்குள் கொண்டுவந்து உங்கள் 200 இலவச யூனிட் மானியத்தைப் பாதுகாக்கவும்.`;
    }

    const tip2Match = tip.match(/Crossing 500 units removes your 200 free units subsidy and escalates (?:tariff )?rates up to ₹9\.00\/unit\. Staying under saves ~?₹?([0-9,]+) (?:bi-monthly|every 2 months)\./i);
    if (tip2Match) {
        const savings = tip2Match[1];
        return `500 யூனிட்டுகளைத் தாண்டினால் 200 இலவச யூனிட் மானியம் ரத்தாகி, கட்டணம் ஒரு யூனிட்டுக்கு ₹9.00 வரை உயரும். 500க்குள் இருப்பது இரு மாதத்திற்கு ₹${savings} வரை சேமிக்கும்.`;
    }

    const tip3Match = tip.match(/You have only ([\d.]+) units of (?:buffer|leeway) before crossing the 500-unit subsidy cutoff\.\s*Limit (.*?) usage\./i);
    if (tip3Match) {
        const buffer = tip3Match[1];
        const appName = getApplianceLabel(tip3Match[2], 'ta');
        return `500 யூனிட் மானிய வரம்பை எட்டுவதற்கு முன் உங்களிடம் ${buffer} யூனிட்டுகள் மட்டுமே உள்ளன. ${appName} பயன்பாட்டைக் கட்டுப்படுத்தவும்.`;
    }

    if (tip.includes('Set Air Conditioner temperature to 24°C')) {
        return 'ஏசி வெப்பநிலையை 18°C-க்கு பதிலாக 24°C-ல் வைத்தால் கம்ப்ரசர் மின் நுகர்வு 18-24% வரை குறையும்.';
    }
    if (tip.includes('Ensure refrigerator rear coils have at least 15 cm')) {
        return 'குளிர்சாதனப் பெட்டியின் பின்புறம் வெப்பம் சீராக வெளியேற சுவரிலிருந்து குறைந்தது 15 செ.மீ இடைவெளி விடவும்.';
    }
    if (tip.includes('Limit Water Geyser timer to 20 minutes')) {
        return 'வாட்டர் கீசரை குளிப்பதற்கு 20 நிமிடங்களுக்கு முன் மட்டுமே இயக்கவும்; தொடர்ந்து சுடுநீரை சூடாக்குவது நாள் ஒன்றுக்கு 1.5 kWh வரை வீணடிக்கும்.';
    }
    if (tip.includes('Install VFDs (Variable Frequency Drives)')) {
        return '3-பேஸ் தூண்டல் மோட்டார்களில் VFD பொருத்துவது பகுதி சுமை மின் நுகர்வை 25-35% வரை சேமிக்கும்.';
    }
    if (tip.includes('Audit pneumatic pipe couplings') || tip.includes('compressed air leaks')) {
        return 'தொழிலக நியூமேடிக் காற்று குழாய் கசிவுகளை சரிசெய்வதன் மூலம் மாதம் ~₹1,500 வரை சேமிக்கலாம்.';
    }
    if (tip.includes('Automatic Power Factor Correction') || tip.includes('Ensure APFC')) {
        return 'TNERC குறைந்த பவர் ஃபேக்டர் கூடுதல் கட்டணத்தைத் தவிர்க்க APFC மூலம் பவர் ஃபேக்டரை 0.92-க்கு மேல் பராமரிக்கவும்.';
    }
    if (tip.includes('De-energize idle CNC cooling')) {
        return 'ஷிப்ட் இடைவேளையின் போது செயலற்ற சிஎன்சி மற்றும் வெல்டிங் டிரான்ஸ்பார்மர் மின்சுற்றுகளை அணைத்து கூடுதல் மின் நுகர்வைத் தவிர்க்கவும்.';
    }
    if (tip.includes('well within the low-tariff subsidized tier')) {
        return 'உங்கள் மின் நுகர்வு குறைந்த கட்டண மானிய அடுக்குக்குள் உள்ளது. உங்களுக்கு 200 இலவச யூனிட்டுகள் கிடைக்கும்.';
    }
    if (tip.includes('staggering heavy machinery') || tip.includes('staggering high-draw machinery')) {
        return 'TANGEDCO LT-IIIB விதிகளின்படி அதிக மின்சாரம் எடுக்கும் இயந்திரங்களை நேர இடைவெளியில் இயக்குவது உச்ச சுமை அபராதங்களைத் தவிர்க்கும்.';
    }
    if (tip.includes('solar hours (10 AM - 3 PM)')) {
        return 'அதிக திறன் கொண்ட மின்சார மோட்டார்கள் மற்றும் ஏர் கம்ப்ரசர்களை சூரிய ஒளி நேரங்களில் (காலை 10 - மதியம் 3) இயக்குவது உகந்தது.';
    }
    if (tip.includes('LT-V Commercial rules, consuming >100 units') || tip.includes('LT-V Commercial rules')) {
        return 'TANGEDCO LT-V வணிக விதிகளின்படி, 100 யூனிட்டுகளுக்கு மேல் நுகர்வு இருந்தால் அனைத்து யூனிட்டுகளுக்கும் ஒரு யூனிட்டுக்கு ₹10.45 வசூலிக்கப்படும்.';
    }

    return tip;
};

export default function ApplianceProfiler() {
    const { t, language } = useLanguage();
    const [connectionType, setConnectionType] = useState('LT-1A_DOMESTIC');
    const [appliances, setAppliances] = useState(DEFAULT_APPLIANCES['LT-1A_DOMESTIC']);
    const [aiResult, setAiResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiError, setAiError] = useState('');

    const handleCategorySwitch = (newType) => {
        setConnectionType(newType);
        setAppliances(DEFAULT_APPLIANCES[newType] || DEFAULT_APPLIANCES['LT-1A_DOMESTIC']);
        setAiResult(null);
        setAiError('');
    };

    // Real-time calculations
    const stats = useMemo(() => {
        const processed = appliances.map(app => {
            const w = Number(app.wattage) || 0;
            const h = Number(app.hoursPerDay) || 0;
            const q = Number(app.quantity) || 1;
            const dailyKwh = (w * h * q) / 1000;
            const bimonthlyKwh = dailyKwh * 60;
            return {
                ...app,
                dailyKwh,
                bimonthlyKwh
            };
        });

        const totalDaily = processed.reduce((sum, item) => sum + item.dailyKwh, 0);
        const totalBimonthly = totalDaily * 60;
        const sorted = [...processed].sort((a, b) => b.bimonthlyKwh - a.bimonthlyKwh);

        // Bi-monthly Bill calculation under official TANGEDCO rules
        let estimatedCost = 0;
        if (connectionType === 'LT-1A_DOMESTIC') {
            const units = totalBimonthly;
            if (units <= 500) {
                // Tier 1 (<= 500 units) - 200 Free Units Subsidy Applied
                let rem = Math.max(0, units - 200);
                const s2 = Math.min(rem, 200); // 201-400 @ 4.50
                estimatedCost += s2 * 4.50;
                rem = Math.max(0, rem - 200);
                const s3 = Math.min(rem, 100); // 401-500 @ 6.00
                estimatedCost += s3 * 6.00;
            } else {
                // Tier 2 (> 500 units) - Subsidy lost & higher slabs
                let rem = Math.max(0, units - 100);
                const s2 = Math.min(rem, 300); // 101-400
                estimatedCost += s2 * 4.50;
                rem = Math.max(0, rem - 300);
                const s3 = Math.min(rem, 100); // 401-500
                estimatedCost += s3 * 6.00;
                rem = Math.max(0, rem - 100);
                const s4 = Math.min(rem, 100); // 501-600
                estimatedCost += s4 * 8.00;
                rem = Math.max(0, rem - 100);
                const s5 = Math.min(rem, 200); // 601-800
                estimatedCost += s5 * 9.00;
                rem = Math.max(0, rem - 200);
                if (rem > 0) estimatedCost += rem * 11.00;
            }
        } else if (connectionType === 'LT-V_COMMERCIAL') {
            // Commercial Non-Telescopic
            const demandCharge = 3.0 * 110.0; // 3 kW standard
            if (totalBimonthly <= 100) {
                estimatedCost = (totalBimonthly * 6.65 + demandCharge) * 1.05;
            } else {
                estimatedCost = (totalBimonthly * 10.45 + demandCharge) * 1.05;
            }
        } else {
            // Industrial LT-IIIB
            const energyCharge = totalBimonthly * 7.65;
            const demandCharge = 10.0 * 600.0; // 10 kW standard industrial load = ₹6,000
            estimatedCost = (energyCharge + demandCharge) * 1.05; // 5% electricity duty
        }

        return {
            processed,
            totalDaily: Number(totalDaily.toFixed(2)),
            totalBimonthly: Number(totalBimonthly.toFixed(1)),
            topConsumer: sorted[0],
            estimatedCost: Math.round(estimatedCost)
        };
    }, [appliances, connectionType]);

    // Threshold & Status logic based on category
    const isDomestic = connectionType === 'LT-1A_DOMESTIC';
    const isCommercial = connectionType === 'LT-V_COMMERCIAL';
    const isIndustrial = connectionType === 'LT-IIIB_INDUSTRIAL';

    const cliffThreshold = isDomestic ? 500 : isCommercial ? 100 : 2000;
    const unitsOver = stats.totalBimonthly - cliffThreshold;
    const isCliffExceeded = stats.totalBimonthly > cliffThreshold;
    const isNearCliff = !isCliffExceeded && (cliffThreshold - stats.totalBimonthly <= (isDomestic ? 80 : isCommercial ? 25 : 300));

    // Progress percentage
    const maxScale = isDomestic ? 750 : isCommercial ? 250 : 3500;
    const progressPercent = Math.min(100, Math.round((stats.totalBimonthly / maxScale) * 100));
    const cliffMarkerPercent = Math.round((cliffThreshold / maxScale) * 100);

    const handleUpdate = (id, field, value) => {
        setAppliances(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
        setAiResult(null);
    };

    const handleRemove = (id) => {
        setAppliances(prev => prev.filter(item => item.id !== id));
        setAiResult(null);
    };

    const handleAddPreset = (preset) => {
        const newItem = {
            id: Date.now().toString(),
            name: preset.name,
            wattage: preset.wattage,
            hoursPerDay: preset.defaultHours,
            quantity: 1
        };
        setAppliances(prev => [...prev, newItem]);
        setAiResult(null);
    };

    const handleResetDefaults = () => {
        setAppliances(DEFAULT_APPLIANCES[connectionType] || DEFAULT_APPLIANCES['LT-1A_DOMESTIC']);
        setAiResult(null);
        setAiError('');
    };

    const fetchAiAdvice = async () => {
        setAnalyzing(true);
        setAiError('');
        try {
            const { data } = await api.post('/predictions/appliance-advice', {
                appliances,
                connectionType
            });
            if (data && data.success) {
                setAiResult(data);
            } else {
                setAiError('Could not process appliance profiling recommendations.');
            }
        } catch (err) {
            setAiError(err.response?.data?.message || 'AI energy advisor encountered an issue.');
        } finally {
            setAnalyzing(false);
        }
    };

    const currentPresets = PRESET_CATALOGS[connectionType] || PRESET_CATALOGS['LT-1A_DOMESTIC'];

    return (
        <div className="space-y-8 w-full min-w-0">
            {/* Tariff Category & Profile Selector (3-Way: Domestic, Commercial, Industrial) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel border border-panelBorder p-5 rounded-2xl shadow-xl">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Cpu className="text-gold-500" size={22} />
                        {language === 'ta' ? 'மின்சாதன ஆற்றல் பகுப்பாய்வி' : 'Appliance Energy Profiler'}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                        {language === 'ta' 
                            ? 'வீட்டு, வணிகம் மற்றும் தொழிற்துறை சாதனங்களை மாதிரியமைத்து மின் கட்டணத்தை மேம்படுத்துங்கள்.'
                            : 'Model domestic, commercial, and industrial equipment to identify energy hogs and avoid tariff penalties.'}
                    </p>
                </div>

                {/* 3-Category Toggle Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap gap-1.5 bg-darker p-1 rounded-xl border border-panelBorder self-start sm:self-auto w-full sm:w-auto">
                    <button
                        onClick={() => handleCategorySwitch('LT-1A_DOMESTIC')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                            isDomestic
                                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Home size={14} /> {language === 'ta' ? 'LT-1A வீட்டு உபயோகம்' : 'LT-1A Domestic'}
                    </button>
                    <button
                        onClick={() => handleCategorySwitch('LT-V_COMMERCIAL')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                            isCommercial
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Building2 size={14} /> {language === 'ta' ? 'LT-V வணிக உபயோகம்' : 'LT-V Commercial'}
                    </button>
                    <button
                        onClick={() => handleCategorySwitch('LT-IIIB_INDUSTRIAL')}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                            isIndustrial
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Factory size={14} /> {language === 'ta' ? 'LT-IIIB தொழிற்துறை' : 'LT-IIIB Industrial'}
                    </button>
                </div>
            </div>

            {/* SUBSIDY / TARIFF THRESHOLD RADAR & LIVE METRICS */}
            <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 w-full min-w-0 ${
                isCliffExceeded 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                    : isNearCliff
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                        : 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
            }`}>
                {/* Status Badge & Alert Headline */}
                <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2">
                        {isCliffExceeded ? (
                            <AlertTriangle className="text-rose-400 animate-bounce" size={18} />
                        ) : isNearCliff ? (
                            <AlertTriangle className="text-amber-400" size={18} />
                        ) : (
                            <CheckCircle2 className="text-emerald-400" size={18} />
                        )}
                        <span className={`text-xs font-mono uppercase tracking-wider font-bold ${
                            isCliffExceeded ? 'text-rose-400' : isNearCliff ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                            {isDomestic 
                                ? (language === 'ta' ? 'மானிய இடர் நிலை' : 'Subsidy Risk Meter') 
                                : isCommercial
                                    ? (language === 'ta' ? 'வணிகக் கட்டண வரம்பு' : 'Commercial Flat Tariff Threshold')
                                    : (language === 'ta' ? 'தொழிற்துறை மின்சுமை வரம்பு' : 'Industrial Demand & Load Index')}
                        </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white break-words leading-snug">
                        {isDomestic ? (
                            isCliffExceeded 
                                ? (language === 'ta' 
                                    ? `⚠️ அபராத மண்டலம்: 500 யூனிட் வரம்பு ${unitsOver.toFixed(1)} யூனிட்கள் தாண்டப்பட்டது! 200 யூனிட் மானியம் ரத்து.` 
                                    : `⚠️ Penalty Zone: Exceeded 500 Units by ${unitsOver.toFixed(1)} kWh! 200 Free Units Revoked.`)
                                : isNearCliff
                                    ? (language === 'ta' 
                                        ? `⚡ எச்சரிக்கை மண்டலம்: மானியம் இழக்க இன்னும் ${(cliffThreshold - stats.totalBimonthly).toFixed(1)} யூனிட்கள் மட்டுமே!` 
                                        : `⚡ Warning Zone: ${(cliffThreshold - stats.totalBimonthly).toFixed(1)} kWh buffer before 500 cutoff!`)
                                    : (language === 'ta' ? '✅ பாதுகாப்பு மண்டலம் (0-400 யூனிட்கள்) - 200 இலவச யூனிட்கள் பொருந்தும்' : '✅ Safe Zone (0 - 400 Units) - 200 Free Units Active')
                        ) : isCommercial ? (
                            isCliffExceeded
                                ? (language === 'ta'
                                    ? `⚠️ வணிக நேரடிக் கட்டணம் இயங்குகிறது: 100 யூனிட் தாண்டியதால் ₹10.45 நேரடிக் கட்டணம் பொருந்தும்.`
                                    : `⚠️ Commercial Punitive Rate: Crossed 100 Units! Billed flat at ₹10.45/unit across ALL units.`)
                                : (language === 'ta' ? '✅ குறைந்த வணிகக் கட்டணம் (100 யூனிட்கள் வரை: ₹6.65/யூனிட்)' : '✅ Low Commercial Bracket (≤ 100 Units: ₹6.65/unit)')
                        ) : (
                            isCliffExceeded
                                ? (language === 'ta'
                                    ? `⚠️ அதிக தொழிற்துறை மின்சுமை: ${stats.totalBimonthly} kWh. உச்சநேர மின்சுமை அபராதத்தைத் தவிர்க்கவும்.`
                                    : `⚠️ High Industrial Draw: ${stats.totalBimonthly} kWh. Shift non-critical loads away from 6-9 AM/PM peak window.`)
                                : (language === 'ta' ? '✅ சீரான தொழிற்துறை நுகர்வு (Flat ₹7.65 + ₹600/kW நிலைக்கட்டணம்)' : '✅ Optimal Industrial Demand Profile (Flat ₹7.65/unit + ₹600/kW Demand)')
                        )}
                    </h3>
                </div>

                {/* Dedicated 3-Card Metrics Strip (Never Collides with Text) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                    <div className="bg-darker/90 border border-panelBorder p-3.5 rounded-xl shadow-inner">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">{t('dailyLoad')}</span>
                        <span className="text-xl font-extrabold font-mono text-white mt-1 block">{stats.totalDaily} <span className="text-xs font-normal text-slate-400">kWh</span></span>
                    </div>
                    <div className="bg-darker/90 border border-panelBorder p-3.5 rounded-xl shadow-inner">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">{t('cycleUnits')}</span>
                        <span className="text-xl font-extrabold font-mono text-gold-400 mt-1 block">{stats.totalBimonthly} <span className="text-xs font-normal text-slate-400">kWh</span></span>
                    </div>
                    <div className="bg-darker/90 border border-panelBorder p-3.5 rounded-xl shadow-inner">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">{t('estimatedBill')}</span>
                        <span className="text-xl font-extrabold font-mono text-white mt-1 block">₹{stats.estimatedCost.toLocaleString()}</span>
                    </div>
                </div>

                {/* Visual Progress Bar with Threshold Indicator */}
                <div className="space-y-2">
                    <div className="relative h-4 bg-darker rounded-full overflow-hidden border border-panelBorder p-0.5">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                isCliffExceeded 
                                    ? 'bg-gradient-to-r from-amber-500 to-rose-500' 
                                    : isNearCliff
                                        ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                                        : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                        {/* Marker Pin */}
                        <div 
                            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none"
                            style={{ left: `${cliffMarkerPercent}%` }}
                            title={`Threshold: ${cliffThreshold} Units`}
                        ></div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                        <span>0 kWh</span>
                        <span className="text-gold-400 font-bold">
                            {language === 'ta' ? `வரம்பு வரம்புக் கோடு: ${cliffThreshold} kWh` : `Cutoff Threshold: ${cliffThreshold} kWh`}
                        </span>
                        <span>{maxScale} {language === 'ta' ? 'kWh அதிகபட்ச அளவு' : 'kWh Max Scale'}</span>
                    </div>
                </div>

                {/* Subsidized Explanation */}
                <div className="mt-4 pt-3 border-t border-panelBorder/50 text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                    <Info size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>
                        {isDomestic ? (
                            language === 'ta' ? (
                                <>
                                    தமிழ்நாட்டில், <strong>500 யூனிட்டுகளுக்குக் கீழ்</strong> உள்ள வீட்டு நுகர்வோர் <strong>200 இலவச யூனிட்கள்</strong> மற்றும் குறைக்கப்பட்ட படிநிலைக் கட்டணங்களை (₹4.50 முதல் ₹6.00 வரை) பெறுகின்றனர். 500 யூனிட்டுகளைத் தாண்டினால் இலவச அடுக்கு மானியம் ரத்தாகி கட்டணம் யூனிட்டுக்கு <strong>₹9.00 வரை</strong> உயரும்.
                                </>
                            ) : (
                                <>
                                    In Tamil Nadu, residential consumers below <strong>500 units</strong> enjoy <strong>200 free units</strong> and reduced telescopic rates (₹4.50 to ₹6.00). Crossing 500 units revokes the free tier subsidy and charges escalate up to <strong>₹9.00/unit</strong>.
                                </>
                            )
                        ) : isCommercial ? (
                            language === 'ta' ? (
                                <>
                                    வணிக LT-V பயனர்கள் <strong>&le; 100 யூனிட்கள்</strong> நுகர்வுக்கு ₹6.65/யூனிட் செலுத்துகின்றனர். 101+ யூனிட்களைப் பயன்படுத்தினால் <strong>அனைத்து யூனிட்களுக்கும் ₹10.45 நேரடிக் கட்டணம்</strong> மற்றும் ₹110/kW தேவைக் கட்டணம், 5% மின்சார வரி விதிக்கப்படும்.
                                </>
                            ) : (
                                <>
                                    Commercial LT-V users consuming <strong>&le; 100 units</strong> pay ₹6.65/unit. Consuming 101+ units triggers a flat punitive rate of <strong>₹10.45/unit across ALL units</strong> plus ₹110/kW demand charges and 5% electricity tax.
                                </>
                            )
                        ) : (
                            language === 'ta' ? (
                                <>
                                    தொழிற்துறை LT-IIIB பயனர்களுக்கு நேரடி <strong>₹7.65/யூனிட்</strong> மற்றும் <strong>₹600/kW இருமாத நிலை தேவைக் கட்டணம்</strong>, 5% மின்சார வரி விதிக்கப்படும். குறைந்த PF அபராதங்களைத் தவிர்க்க APFC மின்தேக்கிகள் மூலம் பவர் ஃபேக்டரை 0.90-க்கு மேல் பராமரிக்கவும்.
                                </>
                            ) : (
                                <>
                                    Industrial LT-IIIB users are billed at flat <strong>₹7.65/unit</strong> plus <strong>₹600/kW bi-monthly fixed demand charges</strong> and 5% Electricity Duty. Maintain Power Factor above 0.90 with APFC capacitor banks to eliminate low-PF surcharges.
                                </>
                            )
                        )}
                    </span>
                </div>
            </div>

            {/* QUICK PRESET ADD BUTTONS */}
            <div className="bg-panel border border-panelBorder p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                        {isDomestic 
                            ? (language === 'ta' ? 'வீட்டு உபயோக சாதன முன்னமைவுகள்' : 'Domestic Appliance Presets')
                            : isCommercial 
                                ? (language === 'ta' ? 'வணிக உபகரண முன்னமைவுகள்' : 'Commercial Equipment Presets') 
                                : (language === 'ta' ? 'தொழிற்துறை இயந்திர முன்னமைவுகள்' : 'Industrial Machinery & MSME Presets')}
                    </span>
                    <button
                        onClick={handleResetDefaults}
                        className="text-xs text-slate-400 hover:text-gold-400 flex items-center gap-1 transition cursor-pointer"
                    >
                        <RotateCcw size={12} /> {language === 'ta' ? 'இயல்புநிலை அமை' : 'Reset Defaults'}
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {currentPresets.map((preset, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAddPreset(preset)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-darker hover:bg-dark border border-panelBorder hover:border-gold-500/50 text-slate-300 hover:text-gold-400 text-xs font-medium transition cursor-pointer"
                        >
                            <Plus size={12} /> {getApplianceLabel(preset.name, language)} ({preset.wattage >= 1000 ? `${(preset.wattage/1000).toFixed(1)} kW` : `${preset.wattage}W`})
                        </button>
                    ))}
                </div>
            </div>

            {/* APPLIANCE CARDS TABLE / LIST */}
            <div className="bg-panel border border-panelBorder rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-panelBorder flex justify-between items-center bg-darker/40">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Sliders size={16} className="text-gold-500" />
                        {language === 'ta' ? 'பதிவு செய்யப்பட்ட சாதனங்கள்' : 'Configured Load Matrix'} ({appliances.length})
                    </h3>
                    <button
                        onClick={() => handleAddPreset({ 
                            name: isIndustrial ? (language === 'ta' ? 'தனிப்பயன் இயந்திரம்' : 'Custom Machinery') : isCommercial ? (language === 'ta' ? 'தனிப்பயன் உபகரணம்' : 'Custom Equipment') : (language === 'ta' ? 'தனிப்பயன் சாதனம்' : 'Custom Device'), 
                            wattage: isIndustrial ? 3000 : 500, 
                            defaultHours: 4 
                        })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-darker font-bold text-xs transition shadow-md cursor-pointer"
                    >
                        <Plus size={14} /> {language === 'ta' ? 'சாதனம் சேர்' : 'Add Custom'}
                    </button>
                </div>

                <div className="divide-y divide-panelBorder">
                    {appliances.map(app => {
                        const dailyKwh = ((Number(app.wattage) || 0) * (Number(app.hoursPerDay) || 0) * (Number(app.quantity) || 1)) / 1000;
                        const bimonthly = dailyKwh * 60;
                        const pctShare = stats.totalBimonthly > 0 ? ((bimonthly / stats.totalBimonthly) * 100).toFixed(1) : 0;

                        return (
                            <div 
                                key={app.id} 
                                className="p-4 sm:p-5 hover:bg-darker/30 transition grid grid-cols-1 lg:grid-cols-[280px_130px_1fr_80px_40px] items-center gap-4 lg:gap-6"
                            >
                                {/* Column 1: Name and Category */}
                                <div className="min-w-0">
                                    <input 
                                        type="text" 
                                        value={getApplianceLabel(app.name, language)}
                                        onChange={(e) => handleUpdate(app.id, 'name', e.target.value)}
                                        className="bg-transparent font-bold text-white text-sm hover:border-b border-panelBorder focus:outline-none focus:border-gold-500 w-full truncate"
                                    />
                                    <div className="flex items-center gap-2 mt-1 whitespace-nowrap">
                                        <span className="text-[11px] font-mono text-gold-400 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20 tabular-nums">
                                            {bimonthly.toFixed(1)} {language === 'ta' ? 'kWh / சுழற்சி' : 'kWh / cycle'}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                                            ({pctShare}% {language === 'ta' ? 'மொத்த சுமையில்' : 'of total load'})
                                        </span>
                                    </div>
                                </div>

                                {/* Column 2: Rated Power (Watts) */}
                                <div className="min-w-0">
                                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1 truncate">
                                        {language === 'ta' ? 'மின் திறன் (வாட்ஸ்)' : 'Rated Power (Watts)'}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            min="1"
                                            max="50000"
                                            value={app.wattage}
                                            onChange={(e) => handleUpdate(app.id, 'wattage', Math.max(1, Number(e.target.value)))}
                                            className="w-full bg-darker border border-panelBorder rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-gold-500 focus:outline-none tabular-nums"
                                        />
                                        <span className="absolute right-2.5 top-1.5 text-[10px] text-slate-500">W</span>
                                    </div>
                                </div>

                                {/* Column 3: Daily Runtime Slider */}
                                <div className="min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] text-slate-400 uppercase font-semibold truncate">
                                            {language === 'ta' ? 'தினசரி பயன்பாட்டு நேரம்' : 'Daily Runtime'}
                                        </label>
                                        <span className="text-xs font-mono font-bold text-gold-400 tabular-nums pl-2 text-right">
                                            {app.hoursPerDay} {language === 'ta' ? 'மணி' : 'hrs'}
                                        </span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="0.1"
                                        max="24"
                                        step="0.5"
                                        value={app.hoursPerDay}
                                        onChange={(e) => handleUpdate(app.id, 'hoursPerDay', Number(e.target.value))}
                                        className="w-full accent-gold-500 cursor-pointer h-1.5 bg-darker rounded-lg"
                                    />
                                </div>

                                {/* Column 4: Quantity */}
                                <div className="min-w-0">
                                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1 text-center truncate">
                                        {language === 'ta' ? 'எண்ணிக்கை' : 'Qty'}
                                    </label>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={app.quantity}
                                        onChange={(e) => handleUpdate(app.id, 'quantity', Math.max(1, Number(e.target.value)))}
                                        className="w-full bg-darker border border-panelBorder rounded-lg px-2 py-1.5 text-xs text-white font-mono text-center focus:border-gold-500 focus:outline-none tabular-nums"
                                    />
                                </div>

                                {/* Column 5: Action (Delete) */}
                                <div className="flex items-center justify-center pt-3 lg:pt-3">
                                    <button 
                                        onClick={() => handleRemove(app.id)}
                                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                        title={language === 'ta' ? 'சாதனத்தை நீக்கு' : 'Remove appliance'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Profiler Bottom Action Bar */}
                <div className="p-5 bg-darker/60 border-t border-panelBorder flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-400">
                        {language === 'ta' ? 'அதிக மின் நுகர்வு சாதனம்: ' : 'Top consumer: '}
                        <strong className="text-white">
                            {stats.topConsumer ? getApplianceLabel(stats.topConsumer.name, language) : (language === 'ta' ? 'எதுவுமில்லை' : 'None')}
                        </strong> ({language === 'ta' ? 'சுமார்' : 'approx'} {stats.topConsumer?.bimonthlyKwh.toFixed(1)} kWh)
                    </div>

                    <button
                        onClick={fetchAiAdvice}
                        disabled={analyzing || appliances.length === 0}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-darker font-extrabold text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                        {analyzing ? (
                            <>
                                <div className="w-4 h-4 border-2 border-darker border-t-transparent rounded-full animate-spin"></div>
                                {language === 'ta' ? 'ஏஐ மின் ஆலோசகர் இயங்குகிறது...' : 'Running AI Energy Advisor...'}
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                {language === 'ta' ? 'ஏஐ உகப்பாக்க ஆலோசனையைப் பெறு' : 'Get AI Optimization Advice'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* AI RECOMMENDATION RESULTS SECTION */}
            {aiError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle size={16} /> {aiError}
                </div>
            )}

            {aiResult && (
                <div className="bg-panel border border-gold-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-panelBorder">
                        <div>
                            <div className="flex items-center gap-2 text-gold-400 mb-1">
                                <Sparkles size={18} />
                                <span className="text-xs uppercase tracking-widest font-mono font-bold">
                                    {language === 'ta' ? 'ஏஐ நுகர்வு உத்தி' : 'AI Consumption Strategy'}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-white">
                                {translateHeadline(aiResult.headline, language)}
                            </h3>
                        </div>

                        {aiResult.potentialSavingsInr > 0 && (
                            <div className="bg-gold-500/10 border border-gold-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 self-start md:self-auto">
                                <TrendingDown size={28} className="text-gold-400" />
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gold-400 block tracking-wider">
                                        {language === 'ta' ? 'இரு மாத சாத்தியமான சேமிப்பு' : 'Potential Bi-Monthly Savings'}
                                    </span>
                                    <span className="text-2xl font-extrabold font-mono text-white">
                                        ~₹{aiResult.potentialSavingsInr.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Primary Highlight Action */}
                    {aiResult.primaryAction && (
                        <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-gold-500/10 to-transparent border border-gold-500/40 flex items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-gold-400">
                                    {language === 'ta' ? 'பரிந்துரைக்கப்பட்ட முதன்மை நடவடிக்கை' : 'Recommended Primary Action'}
                                </span>
                                <p className="text-sm font-bold text-white flex items-center gap-2">
                                    <ArrowRight size={16} className="text-gold-400" />
                                    {translateAction(aiResult.primaryAction, language)}
                                </p>
                            </div>
                            {aiResult.highestConsumer && (
                                <span className="text-xs font-mono text-slate-400 bg-darker px-3 py-1.5 rounded-lg border border-panelBorder hidden sm:inline-block">
                                    {language === 'ta' ? 'முக்கிய காரணி:' : 'Primary Driver:'} {getApplianceLabel(aiResult.highestConsumer, language)} ({aiResult.highestConsumerPercent}%)
                                </span>
                            )}
                        </div>
                    )}

                    {/* Actionable Tips List */}
                    {aiResult.actionableTips && aiResult.actionableTips.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                                {language === 'ta' ? 'செயல்படுத்தக்கூடிய மின் சேமிப்பு வழிகள்' : 'Actionable Energy Conservation Measures'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {aiResult.actionableTips.map((tip, idx) => (
                                    <div key={idx} className="p-4 bg-darker border border-panelBorder rounded-xl flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-gold-500/20 text-gold-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                            {idx + 1}
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed">
                                            {translateTip(tip, language)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Appliance Distribution Breakdown */}
                    {aiResult.applianceBreakdown && (
                        <div className="pt-4 border-t border-panelBorder space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                                {language === 'ta' ? 'மின் பயன்பாட்டு பகிர்வு விவரம்' : 'Relative Power Distribution Matrix'}
                            </h4>
                            <div className="space-y-2">
                                {aiResult.applianceBreakdown.map((item, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-300 font-semibold">{getApplianceLabel(item.name, language)}</span>
                                            <span className="font-mono text-slate-400">
                                                {item.bimonthlyKwh} kWh ({item.percentShare}%)
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-darker rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gold-500 rounded-full"
                                                style={{ width: `${item.percentShare}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
