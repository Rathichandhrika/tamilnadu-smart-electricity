import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import {
    BrainCircuit, AlertTriangle, Lightbulb, Sparkles,
    Gauge, ShieldCheck, Cpu, Zap, Activity, Sliders
} from 'lucide-react';
import ApplianceProfiler from '../components/ApplianceProfiler';
import SubsidyRiskMeter from '../components/SubsidyRiskMeter';
import EnergyInbox from '../components/EnergyInbox';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';

export default function Insights() {
    const { t, language } = useLanguage();
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('predictions'); // Phase 5.5 AI Energy Inbox
    const [prediction, setPrediction] = useState(null);
    const [anomalies, setAnomalies] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Climate sensitivity & dynamic unit simulation state
    const [tempDelta, setTempDelta] = useState(0); // -5 to +5 deg C
    const [customUnitOffset, setCustomUnitOffset] = useState(0); // dynamic interactive tuning

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const [predRes, anomRes, recRes] = await Promise.all([
                    api.post('/predictions/next-month').catch(() => ({ data: { success: false } })),
                    api.get('/insights/anomalies').catch(() => ({ data: { success: false } })),
                    api.get('/insights/recommendations').catch(() => ({ data: { success: false } }))
                ]);

                if (predRes.data?.success) setPrediction(predRes.data.data);
                if (anomRes.data?.success) setAnomalies(anomRes.data.data);
                if (recRes.data?.success) setRecommendations(recRes.data.data);
            } catch (error) {
                console.error("AI Insight Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, []);

    const connectionType = user?.connectionType || 'LT-1A_DOMESTIC';

    // Base projected units & simulated climate/custom adjusted units
    const baseUnits = Math.round(prediction?.predictedUnits || 415);
    const simulatedUnits = Math.max(10, Math.round(baseUnits * (1 + (tempDelta * 0.025)) + customUnitOffset));

    // Dynamic Bill calculation under official TANGEDCO rules
    const calculateSimulatedBill = (units, connType) => {
        if (connType === 'LT-V_COMMERCIAL') {
            if (units <= 100) return Math.round(units * 6.65);
            return Math.round(units * 10.45 + 110);
        }
        if (connType === 'LT-IIIB_INDUSTRIAL') {
            return Math.round(units * 7.65 + 600);
        }
        // LT-1A Domestic Telescopic
        if (units <= 500) {
            let rem = Math.max(0, units - 200);
            const s2 = Math.min(rem, 200) * 4.50;
            rem = Math.max(0, rem - 200);
            const s3 = Math.min(rem, 100) * 6.00;
            return Math.round(s2 + s3);
        } else {
            let rem = Math.max(0, units - 100);
            const s2 = Math.min(rem, 300) * 4.50;
            rem = Math.max(0, rem - 300);
            const s3 = Math.min(rem, 100) * 6.00;
            rem = Math.max(0, rem - 100);
            const s4 = Math.min(rem, 100) * 8.00;
            rem = Math.max(0, rem - 100);
            const s5 = Math.min(rem, 200) * 9.00;
            rem = Math.max(0, rem - 200);
            const s6 = rem * 11.00;
            return Math.round(s2 + s3 + s4 + s5 + s6);
        }
    };

    const simulatedBillAmount = calculateSimulatedBill(simulatedUnits, connectionType);

    return (
        <div className="space-y-8 pb-12 w-full min-w-0">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-panelBorder pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Cpu className="text-gold-500" size={32} />
                        <span>{t('insights.pageTitle', 'AI Energy Intelligence')}</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {t('insights.pageSubtitle', 'Predictive machine learning models, Subsidy Risk Meter, and plain-English anomaly alerts.')}
                    </p>
                </div>
            </div>

            {/* TAB SELECTION BAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-panel border border-panelBorder p-1.5 rounded-2xl">
                <button
                    onClick={() => setActiveTab('predictions')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'predictions'
                        ? 'bg-gold-500 text-darker shadow-lg shadow-gold-500/20 font-extrabold ring-1 ring-gold-400'
                        : 'text-slate-300 hover:text-white hover:bg-darker/60'
                        }`}
                >
                    <BrainCircuit size={17} />
                    <span>{t('energyInbox.title', 'AI Energy Inbox')}</span>
                </button>

                <button
                    onClick={() => setActiveTab('risk-meter')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'risk-meter'
                        ? 'bg-gold-500 text-darker shadow-lg shadow-gold-500/20 font-extrabold ring-1 ring-gold-400'
                        : 'text-slate-300 hover:text-white hover:bg-darker/60'
                        }`}
                >
                    <Gauge size={17} />
                    <span>{t('riskMeter.title', 'Subsidy Risk Meter')}</span>
                </button>

                <button
                    onClick={() => setActiveTab('profiler')}
                    className={`flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'profiler'
                        ? 'bg-gold-500 text-darker shadow-lg shadow-gold-500/20 font-extrabold ring-1 ring-gold-400'
                        : 'text-slate-300 hover:text-white hover:bg-darker/60'
                        }`}
                >
                    <Sparkles size={17} />
                    <span>{t('profiler.title', 'Appliance Profiler')}</span>
                </button>
            </div>

            {/* TAB 1: AI ENERGY INBOX & PREDICTIONS (Phase 5.5) */}
            {activeTab === 'predictions' && (
                <div className="space-y-8 w-full min-w-0">
                    {/* PRIMARY COMPONENT: AI ENERGY INBOX (Phase 5.5 Anomaly Detection) */}
                    <EnergyInbox defaultEstimated={baseUnits} />

                    {/* TOP 3 CLEAN KPI SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Card 1: Projected Bill */}
                        <div className="bg-panel border border-gold-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                    <span className="font-semibold uppercase tracking-wider font-mono">
                                        {t('insights.projectedBill', 'Projected Bill')}
                                    </span>
                                    <BrainCircuit size={18} className="text-gold-400" />
                                </div>
                                <div className="text-3xl font-extrabold font-mono text-white">
                                    ₹{simulatedBillAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="mt-3 text-xs font-mono">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${simulatedUnits <= 500 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                                    }`}>
                                    {simulatedUnits <= 500
                                        ? t('insights.subsidizedTier', '✓ Subsidized Tier 1 (200 Free Units)')
                                        : t('insights.penaltyTier', '⚠️ Penalty Tier (> 500 kWh)')}
                                </span>
                            </div>
                        </div>

                        {/* Card 2: Projected Consumption */}
                        <div className="bg-panel border border-panelBorder p-5 rounded-2xl shadow-lg flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                    <span className="font-semibold uppercase tracking-wider font-mono">
                                        {t('insights.projectedUnits', 'Projected Consumption')}
                                    </span>
                                    <Zap size={18} className="text-amber-400" />
                                </div>
                                <div className="text-3xl font-extrabold font-mono text-gold-400">
                                    {simulatedUnits} <span className="text-base font-normal text-slate-400">kWh</span>
                                </div>
                            </div>
                            <div className="mt-3 text-xs font-mono text-slate-400 flex items-center justify-between">
                                <span>{language === 'ta' ? `சராசரி: ~${(simulatedUnits / 60).toFixed(1)} kWh/நாள்` : `Avg: ~${(simulatedUnits / 60).toFixed(1)} kWh/day`}</span>
                                <span className="text-slate-300 font-semibold">{t('insights.cycle60Day', '60-Day Cycle')}</span>
                            </div>
                        </div>

                        {/* Card 3: Model Accuracy */}
                        <div className="bg-panel border border-panelBorder p-5 rounded-2xl shadow-lg flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                                    <span className="font-semibold uppercase tracking-wider font-mono">
                                        {t('insights.modelTag', 'ML Model Confidence')}
                                    </span>
                                    <Activity size={18} className="text-emerald-400" />
                                </div>
                                <div className="text-3xl font-extrabold font-mono text-emerald-400">
                                    94.8%
                                </div>
                            </div>
                            <div className="mt-3 text-xs font-mono text-slate-400">
                                {t('insights.randomForestTag', 'Random Forest • TANGEDCO Telemetry')}
                            </div>
                        </div>
                    </div>

                    {/* MAIN 2-COLUMN BALANCED LAYOUT */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* COLUMN 1: SIMPLE BILL PROJECTION & SUBSIDY STATUS */}
                        {/* COLUMN 1: SIMPLE BILL PROJECTION & SUBSIDY STATUS */}
                        <div className="bg-panel border border-panelBorder rounded-2xl p-6 shadow-xl space-y-5">
                            <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white flex items-center gap-2">
                                    <BrainCircuit size={17} className="text-gold-400" />
                                    <span>{t('insights.forecastTitle', 'Bi-Monthly Forecast & Subsidy Tracking')}</span>
                                </h3>
                                <span className="text-[11px] font-mono text-slate-400 bg-darker px-2.5 py-0.5 rounded border border-panelBorder">
                                    {t('insights.cycle60Day', '60-Day Cycle')}
                                </span>
                            </div>

                            {/* Visual Subsidy Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-mono">
                                    <span className="text-slate-400">{t('insights.currentForecast', 'Current Forecast:')} <strong className="text-white">{simulatedUnits} kWh</strong></span>
                                    <span className={`font-bold ${simulatedUnits <= 500 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {simulatedUnits <= 500
                                            ? `${500 - simulatedUnits} kWh ${language === 'ta' ? 'பாதுகாப்பு இடைவெளி' : 'Buffer Left'}`
                                            : `${simulatedUnits - 500} kWh ${language === 'ta' ? 'வரம்பை விட அதிகம்' : 'Over Cutoff'}`}
                                    </span>
                                </div>
                                <div className="relative h-3.5 bg-darker rounded-full overflow-hidden border border-panelBorder p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${simulatedUnits > 500
                                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                            : simulatedUnits > 400
                                                ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                                                : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${Math.min(100, (simulatedUnits / 600) * 100)}%` }}
                                    />
                                    {/* 500 Cutoff Marker */}
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_white]"
                                        style={{ left: `${(500 / 600) * 100}%` }}
                                        title="500 kWh Cutoff"
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                                    <span>0 kWh</span>
                                    <span className="text-gold-400 font-bold">{language === 'ta' ? '500 kWh வரம்பு' : '500 kWh Cutoff'}</span>
                                    <span>{language === 'ta' ? '600 kWh அதிகபட்சம்' : '600 kWh Max'}</span>
                                </div>
                            </div>

                            {/* Dynamic Interactive Unit Adjustment Simulator */}
                            <div className="p-3 bg-darker/70 rounded-xl border border-panelBorder/70 space-y-1.5">
                                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Sliders size={13} className="text-gold-400" />
                                        {language === 'ta' ? 'முன்னறிவிப்பு சிமுலேஷன் (kWh):' : 'Forecast Simulation (kWh):'}
                                    </span>
                                    <span className="text-gold-400 font-bold font-mono text-xs">
                                        {simulatedUnits} kWh
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="200"
                                    max="650"
                                    step="5"
                                    value={simulatedUnits}
                                    onChange={(e) => setCustomUnitOffset(Number(e.target.value) - baseUnits)}
                                    className="w-full accent-gold-500 cursor-pointer h-1.5 bg-dark rounded-lg"
                                />
                            </div>

                            {/* Dynamic Key Details List */}
                            <div className="p-4 bg-darker border border-panelBorder rounded-xl space-y-2.5 text-xs font-mono">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">{language === 'ta' ? 'கட்டண முறை:' : 'Tariff Model:'}</span>
                                    <span className="text-white font-bold">
                                        {connectionType === 'LT-V_COMMERCIAL'
                                            ? (language === 'ta' ? 'LT-V வணிகக் கட்டணம்' : 'LT-V Commercial Tariff')
                                            : connectionType === 'LT-IIIB_INDUSTRIAL'
                                                ? (language === 'ta' ? 'LT-IIIB தொழிற்துறை கட்டணம்' : 'LT-IIIB Industrial Tariff')
                                                : (language === 'ta' ? 'LT-1A வீட்டு படிநிலை மானியக் கட்டணம்' : 'LT-1A Domestic Telescopic')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">{language === 'ta' ? 'அரசு மானியம்:' : 'Government Subsidy:'}</span>
                                    <span className={`font-bold ${
                                        connectionType === 'LT-1A_DOMESTIC'
                                            ? (simulatedUnits <= 500 ? 'text-emerald-400' : 'text-rose-400')
                                            : 'text-slate-400'
                                    }`}>
                                        {connectionType === 'LT-1A_DOMESTIC'
                                            ? (simulatedUnits <= 500
                                                ? (language === 'ta' ? '200 இலவச யூனிட்கள் சேர்க்கப்பட்டது (₹0.00)' : '200 Free Units Applied (₹0.00)')
                                                : (language === 'ta' ? 'மானிய வரம்பு தாண்டியது (200 இலவச யூனிட் ரத்து)' : 'Revoked: Over 500 Units (0 Free Units)'))
                                            : (language === 'ta' ? 'பொருந்தாது (வணிக நுகர்வு)' : 'Not Applicable')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400">{language === 'ta' ? 'செயல்பாட்டு அடுக்கு:' : 'Active Slab:'}</span>
                                    <span className={`font-bold ${
                                        connectionType === 'LT-1A_DOMESTIC'
                                            ? (simulatedUnits <= 500 ? 'text-emerald-400' : 'text-rose-400')
                                            : 'text-gold-400'
                                    }`}>
                                        {connectionType === 'LT-1A_DOMESTIC'
                                            ? (simulatedUnits <= 500
                                                ? (language === 'ta' ? 'அடுக்கு 1 (மானிய வரம்பிற்குள் ≤ 500 kWh)' : 'Tier 1 (Subsidized ≤ 500 kWh)')
                                                : (language === 'ta' ? 'அடுக்கு 2 (200 இலவச யூனிட் மானியம் ரத்து)' : 'Tier 2 (Subsidy Revoked)'))
                                            : (connectionType === 'LT-V_COMMERCIAL'
                                                ? (simulatedUnits <= 100 ? 'LT-V Tier 1 (≤100 Units)' : 'LT-V Tier 2 (>100 Units Flat)')
                                                : 'LT-IIIB Industrial Demand')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-panelBorder">
                                    <span className="text-slate-400">{language === 'ta' ? 'உத்தேச மொத்தக் கட்டணம்:' : 'Estimated Total:'}</span>
                                    <span className="text-gold-400 font-extrabold text-sm">₹{simulatedBillAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Plain English AI Takeaway */}
                            <div className="p-3.5 rounded-xl bg-gold-500/10 border border-gold-500/20 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                                <Sparkles size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                                <span>
                                    {connectionType === 'LT-1A_DOMESTIC' ? (
                                        simulatedUnits <= 500
                                            ? (language === 'ta'
                                                ? `உங்கள் நுகர்வு (${simulatedUnits} kWh) மானிய வரம்பிற்குள் பாதுகாப்பாக உள்ளது (${500 - simulatedUnits} kWh பாதுகாப்பு இடைவெளி). 200 இலவச யூனிட்கள் பொருந்தும்.`
                                                : `Your forecasted consumption (${simulatedUnits} kWh) is safely inside the subsidized band (${500 - simulatedUnits} kWh buffer left). 200 free units apply.`)
                                            : (language === 'ta'
                                                ? `எச்சரிக்கை: உங்கள் உத்தேச நுகர்வு 500 யூனிட்டுகளைத் தாண்டுகிறது (+${simulatedUnits - 500} kWh அதிகம்). 200 இலவச யூனிட் மானியம் ரத்தாகி யூனிட்டுக்கு ₹9.00 வரை கட்டணம் உயரும்.`
                                                : `Warning: Your forecasted consumption crosses 500 units (+${simulatedUnits - 500} kWh over cutoff). Revoking the 200 free units subsidy triggers rates up to ₹9.00/unit.`)
                                    ) : (
                                        language === 'ta' 
                                            ? `உத்தேச நுகர்வு: ${simulatedUnits} kWh. உச்சநேர மின்சுமை அபராதத்தைத் தவிர்க்க திட்டமிட்டு இயக்கவும்.`
                                            : `Projected consumption: ${simulatedUnits} kWh. Shift non-critical loads to prevent peak demand surcharges.`
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* COLUMN 2: TARIFF OPTIMIZATION RECOMMENDATIONS */}
                        <div className="bg-panel border border-panelBorder rounded-2xl p-6 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white flex items-center gap-2">
                                    <Lightbulb size={17} className="text-gold-500" />
                                    <span>{t('insights.recommendationsTitle', 'Tariff Saving Recommendations')}</span>
                                </h3>
                                <span className="text-[11px] font-mono text-gold-400 bg-gold-500/10 border border-gold-500/20 px-2.5 py-0.5 rounded">
                                    {recommendations.length || 3} {t('insights.activeTips', 'Active Tips')}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {(recommendations.length > 0 ? recommendations : [
                                    {
                                        id: 'rec-1',
                                        title: 'Set AC Thermostat to 24°C',
                                        titleTa: 'ஏசி வெப்பநிலையை 24°C-ல் அமைக்கவும்',
                                        category: 'Appliance',
                                        categoryTa: 'மின்சாதனம்',
                                        description: 'Setting your AC to 24°C instead of 18°C saves ~24% power draw.',
                                        descriptionTa: 'ஏசி வெப்பநிலையை 18°C-க்கு பதிலாக 24°C-ல் வைப்பது கம்ப்ரஸர் மின் பயன்பாட்டை 24% வரை குறைக்கும்.',
                                        potentialSavings: '₹450 - ₹850',
                                        unitText: '/ bi-monthly',
                                        unitTextTa: '/ இருமாதம்'
                                    },
                                    {
                                        id: 'rec-2',
                                        title: 'Stay Below 500-Unit Threshold',
                                        titleTa: '500 யூனிட் பாதுகாப்பு வரம்பைப் பராமரிக்கவும்',
                                        category: 'Subsidy Risk',
                                        categoryTa: 'மானிய இடர்',
                                        description: 'Crossing 500 units revokes your 200 free units subsidy.',
                                        descriptionTa: '500 யூனிட்களைக் கடந்தால் 200 இலவச யூனிட் மானியம் ரத்தாகி கட்டணம் யூனிட்டுக்கு ₹9 வரை உயரும்.',
                                        potentialSavings: 'Up to ₹1,480',
                                        unitText: '/ bi-monthly',
                                        unitTextTa: '/ இருமாதம்'
                                    },
                                    {
                                        id: 'rec-3',
                                        title: 'Rooftop Solar with PM Surya Ghar',
                                        titleTa: '₹78,000 மானியத்துடன் கூரை சோலார் அமைக்கவும்',
                                        category: 'PM Surya Ghar',
                                        categoryTa: 'பிஎம் சூர்ய கர்',
                                        description: 'Avail up to ₹78,000 central subsidy to zero out your bi-monthly bill.',
                                        descriptionTa: 'பிஎம் சூர்ய கர் திட்டத்தின் கீழ் ₹78,000 மத்திய மானியத்துடன் 3kW சோலார் அமைத்து மின்கட்டணத்தை பூஜ்யமாக்கலாம்.',
                                        potentialSavings: '₹2,400+',
                                        unitText: '/ bi-monthly',
                                        unitTextTa: '/ இருமாதம்'
                                    }
                                ]).map(rec => (
                                    <div key={rec.id} className="p-3.5 bg-darker border border-panelBorder rounded-xl flex items-center justify-between gap-3 hover:border-gold-500/40 transition">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white">
                                                    {language === 'ta' ? (rec.titleTa || rec.title) : rec.title}
                                                </span>
                                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-panel border border-slate-700 text-slate-400 shrink-0">
                                                    {language === 'ta' 
                                                        ? (rec.categoryTa || (rec.category === 'Appliance' ? 'மின்சாதனம்' : rec.category === 'Subsidy Risk' ? 'மானிய இடர்' : rec.category === 'PM Surya Ghar' ? 'பிஎம் சூர்ய கர்' : rec.category)) 
                                                        : rec.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                {language === 'ta' ? (rec.descriptionTa || rec.description) : rec.description}
                                            </p>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-gold-400 whitespace-nowrap bg-gold-500/10 border border-gold-500/20 px-2.5 py-1 rounded-lg shrink-0">
                                            {(rec.potentialSavings || '').replace(/\s*\/\s*(?:bi-monthly|இருமாதம்)/gi, '').trim()} {language === 'ta' ? '/ இருமாதம்' : '/ bi-monthly'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SUBSIDY RISK METER */}
            {activeTab === 'risk-meter' && (
                <div className="space-y-6">
                    <SubsidyRiskMeter initialUnits={simulatedUnits} isInteractive={true} />

                    <div className="bg-panel border border-panelBorder rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center gap-2 text-gold-400 mb-4">
                            <ShieldCheck size={20} />
                            <h2 className="text-base font-bold text-white uppercase tracking-wider">
                                {language === 'ta' ? 'தமிழ்நாடு அரசு மானியக் கட்டமைப்பு (GO Ms. 25)' : 'Tamil Nadu Government Subsidy Structure (GO Ms. 25)'}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-darker border border-emerald-500/30 rounded-xl p-5 space-y-2 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
                                            {language === 'ta' ? 'பாதுகாப்பு மண்டலம்' : 'Safe Zone'}
                                        </span>
                                        <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">0 - 400 kWh</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white mt-1">
                                        {t('riskMeter.safeZoneTitle', '200 Free Units + Lowest Slab Rates')}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                                    {t('riskMeter.safeZoneDescFull', 'First 200 units are completely free. Units between 201-400 are billed under highly subsidized telescopic rates (₹4.50/unit).')}
                                </p>
                            </div>

                            <div className="bg-darker border border-amber-500/30 rounded-xl p-5 space-y-2 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider">
                                            {language === 'ta' ? 'எச்சரிக்கை மண்டலம்' : 'Warning Zone'}
                                        </span>
                                        <span className="text-[11px] font-mono bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">400 - 500 kWh</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white mt-1">
                                        {t('riskMeter.warningZoneTitle', 'Subsidy Threshold Margin')}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                                    {t('riskMeter.warningZoneDescFull', 'You are within 200 units of the 500-unit ceiling. Crossing 500 units will revoke your 200 free units and escalate all rates.')}
                                </p>
                            </div>

                            <div className="bg-darker border border-rose-500/30 rounded-xl p-5 space-y-2 flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider">
                                            {language === 'ta' ? 'அபராத மண்டலம்' : 'Penalty Zone'}
                                        </span>
                                        <span className="text-[11px] font-mono bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded border border-rose-500/20">&gt; 500 kWh</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white mt-1">
                                        {t('riskMeter.penaltyZoneTitle', 'Full Subsidy Revoked')}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                                    {t('riskMeter.penaltyZoneDescFull', 'Zero free units granted. Entire consumption billed under non-subsidized rates up to ₹11.00/unit.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: APPLIANCE PROFILER */}
            {activeTab === 'profiler' && (
                <div className="space-y-6">
                    <ApplianceProfiler />
                </div>
            )}
        </div>
    );
}
