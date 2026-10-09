import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info, Zap, ArrowRight, Gauge } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SubsidyRiskMeter({ initialUnits = 415, isInteractive = true, onChange }) {
    const { t, language } = useLanguage();
    const [units, setUnits] = useState(initialUnits);

    const handleUnitsChange = (val) => {
        const num = Math.max(0, Math.min(800, Number(val)));
        setUnits(num);
        if (onChange) onChange(num);
    };

    // Calculate zone
    const isSafe = units <= 400;
    const isWarning = units > 400 && units <= 500;
    const isPenalty = units > 500;

    // Remaining units to next cutoff
    const unitsToWarning = Math.max(0, 400 - units);
    const unitsToPenalty = Math.max(0, 500 - units);
    const excessUnits = Math.max(0, units - 500);

    // Compute visual marker percentage (0 to 800 scale)
    // Scale mapping: 0 to 400 takes 50% width, 400 to 500 takes 25% width, 500 to 800 takes 25% width
    let markerPercent = 0;
    if (units <= 400) {
        markerPercent = (units / 400) * 50;
    } else if (units <= 500) {
        markerPercent = 50 + ((units - 400) / 100) * 25;
    } else {
        markerPercent = 75 + (Math.min(300, units - 500) / 300) * 25;
    }

    return (
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
            isPenalty 
                ? 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
                : isWarning
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                    : 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
        }`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Gauge size={20} className={isPenalty ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'} />
                        <span className={`text-xs font-mono uppercase tracking-widest font-bold ${
                            isPenalty ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                            {t('riskMeter.title')}
                        </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-white">
                        {isPenalty ? (
                            <span className="flex items-center gap-2 text-rose-400">
                                <AlertOctagon size={22} className="animate-pulse" />
                                {t('riskMeter.penaltyZone')}
                            </span>
                        ) : isWarning ? (
                            <span className="flex items-center gap-2 text-amber-400">
                                <AlertTriangle size={22} className="animate-bounce" />
                                {t('riskMeter.warningZone')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-emerald-400">
                                <ShieldCheck size={22} />
                                {t('riskMeter.safeZone')}
                            </span>
                        )}
                    </h3>
                </div>

                {/* Units Counter Display */}
                <div className="flex items-center gap-3">
                    <div className="bg-darker/90 border border-panelBorder px-5 py-2.5 rounded-xl text-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                            {language === 'ta' ? 'தற்போதைய பயன்பாடு' : 'Current Projected Load'}
                        </span>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-2xl font-black font-mono text-white">{units}</span>
                            <span className="text-xs font-mono text-gold-400">kWh</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual 3-Zone Segmented Gauge Bar */}
            <div className="space-y-2 mb-6">
                <div className="relative">
                    {/* Gauge Segments Bar */}
                    <div className="h-6 w-full rounded-xl overflow-hidden flex bg-darker border border-panelBorder p-0.5 gap-0.5">
                        {/* Zone 1: Safe (0-400) - 50% width */}
                        <div 
                            className="h-full rounded-l-lg bg-gradient-to-r from-emerald-600/70 to-emerald-500/90 relative flex items-center justify-center"
                            style={{ width: '50%' }}
                        >
                            <span className="text-[10px] font-mono font-bold text-emerald-950 uppercase tracking-wider hidden sm:inline">
                                {language === 'ta' ? '0 - 400 பாதுகாப்பு' : '0 - 400 Safe'}
                            </span>
                        </div>

                        {/* Zone 2: Warning (400-500) - 25% width */}
                        <div 
                            className="h-full bg-gradient-to-r from-amber-500/80 to-amber-600/90 relative flex items-center justify-center"
                            style={{ width: '25%' }}
                        >
                            <span className="text-[10px] font-mono font-bold text-amber-950 uppercase tracking-wider hidden sm:inline">
                                {language === 'ta' ? '400 - 500 எச்சரிக்கை' : '400 - 500 Warn'}
                            </span>
                        </div>

                        {/* Zone 3: Penalty (>500) - 25% width */}
                        <div 
                            className="h-full rounded-r-lg bg-gradient-to-r from-rose-600/80 to-rose-700/90 relative flex items-center justify-center"
                            style={{ width: '25%' }}
                        >
                            <span className="text-[10px] font-mono font-bold text-rose-100 uppercase tracking-wider hidden sm:inline">
                                {language === 'ta' ? '> 500 அபராதம்' : '> 500 Penalty'}
                            </span>
                        </div>
                    </div>

                    {/* Dynamic Position Pin / Marker */}
                    <div 
                        className="absolute -top-1 bottom-0 transition-all duration-300 pointer-events-none flex flex-col items-center"
                        style={{ left: `${Math.min(99, Math.max(1, markerPercent))}%`, transform: 'translateX(-50%)' }}
                    >
                        <div className="w-3.5 h-3.5 bg-white border-2 border-dark rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] -mt-1 z-10"></div>
                        <div className="w-0.5 h-7 bg-white shadow-md"></div>
                    </div>
                </div>

                {/* Zone Labels Underneath */}
                <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 px-1 pt-1">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                        {language === 'ta' ? 'பாதுகாப்பு (0-400)' : 'Safe (0 - 400)'}
                    </span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                        {language === 'ta' ? 'எச்சரிக்கை (400-500)' : 'Warning (400 - 500)'}
                    </span>
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                        {language === 'ta' ? 'அபராதம் (>500)' : 'Penalty (> 500)'}
                    </span>
                </div>
            </div>

            {/* PLAIN-LANGUAGE ACTIONABLE ALERT CARD */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                isPenalty 
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' 
                    : isWarning 
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200' 
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
            }`}>
                <div className="mt-0.5 flex-shrink-0">
                    {isPenalty ? (
                        <AlertOctagon size={20} className="text-rose-400" />
                    ) : isWarning ? (
                        <AlertTriangle size={20} className="text-amber-400" />
                    ) : (
                        <ShieldCheck size={20} className="text-emerald-400" />
                    )}
                </div>

                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">
                        {isPenalty
                            ? (language === 'ta' ? 'மானிய ரத்து எச்சரிக்கை - கட்டணம் உயர்வு!' : 'Government Subsidy Revoked - Penalty Slab Active!')
                            : isWarning
                                ? (language === 'ta' ? 'முக்கிய எச்சரிக்கை: மானியம் இழக்கும் அபாயம்!' : 'Critical Warning: Immediate Subsidy Loss Risk!')
                                : (language === 'ta' ? 'பாதுகாப்பான பயன்பாட்டு மண்டலம்' : 'Subsidized Safe Zone Active')}
                    </h4>
                    <p className="text-xs leading-relaxed font-medium">
                        {isPenalty ? (
                            language === 'ta'
                                ? `நீங்கள் 500 யூனிட் வரம்பை ${excessUnits} யூனிட்கள் தாண்டிவிட்டீர்கள்! உங்கள் 200 இலவச யூனிட் மானியம் ரத்து செய்யப்பட்டு, அனைத்து யூனிட்களுக்கும் யூனிட்டுக்கு ₹9.00 முதல் ₹11.00 வரை கட்டணம் இருமடங்காக உயர்ந்துள்ளது.`
                                : `You crossed the 500-unit threshold by ${excessUnits} units! You lost your 200 free units government subsidy and your electricity rate has doubled up to ₹9.00 - ₹11.00/unit.`
                        ) : isWarning ? (
                            language === 'ta'
                                ? `நீங்கள் இன்னும் ${unitsToPenalty} யூனிட்களைப் பயன்படுத்தினால், உங்கள் 200 இலவச யூனிட் அரசு மானியத்தை இழப்பீர்கள், உங்கள் மின்கட்டணம் இருமடங்காக உயரும்.`
                                : `If you use ${unitsToPenalty} more units, you will lose your government subsidy and your rate will double.`
                        ) : (
                            language === 'ta'
                                ? `நீங்கள் குறைந்த கட்டண பாதுகாப்பு மண்டலத்தில் உள்ளீர்கள். எச்சரிக்கை மண்டலத்திற்குள் நுழைய இன்னும் ${unitsToWarning} யூனிட்கள் உள்ளன. 200 இலவச யூனிட் மானியம் முழுமையாகப் பொருந்துகிறது.`
                                : `You are comfortably inside the safe zone. You have ${unitsToWarning} units of buffer remaining before entering the warning zone. 200 free units subsidy applied.`
                        )}
                    </p>
                </div>
            </div>

            {/* Interactive Simulation Slider */}
            {isInteractive && (
                <div className="mt-5 pt-4 border-t border-panelBorder/60 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <label className="text-slate-400 font-medium flex items-center gap-1.5">
                            <Zap size={14} className="text-gold-400" />
                            {language === 'ta' ? 'பயன்பாட்டை மாற்றி மானிய மாற்றத்தை சோதிக்கவும்:' : 'Simulate units to test subsidy risk in real-time:'}
                        </label>
                        <span className="font-mono font-bold text-gold-400 bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded">
                            {units} kWh
                        </span>
                    </div>
                    <input 
                        type="range"
                        min="50"
                        max="750"
                        step="5"
                        value={units}
                        onChange={(e) => handleUnitsChange(e.target.value)}
                        className="w-full accent-gold-500 cursor-pointer h-2 bg-darker rounded-lg border border-panelBorder"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>50 kWh</span>
                        <span className="text-emerald-400">
                            {language === 'ta' ? '400 kWh (பாதுகாப்பு வரம்பு)' : '400 kWh (Safe limit)'}
                        </span>
                        <span className="text-amber-400 font-bold">
                            {language === 'ta' ? '500 kWh (கட்-ஆஃப் வரம்பு)' : '500 kWh (Cutoff limit)'}
                        </span>
                        <span>750 kWh</span>
                    </div>
                </div>
            )}
        </div>
    );
}
