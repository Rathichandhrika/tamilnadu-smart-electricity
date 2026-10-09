import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
    Inbox, AlertOctagon, TrendingUp, Sun, Flame,
    CheckCircle2, ChevronDown, ChevronUp, RefreshCw,
    Clock, ShieldAlert, Sliders, Info, Zap
} from 'lucide-react';

export default function EnergyInbox({
    defaultEstimated = 340,
    initialCurrentUnits = 225,
    initialDaysPassed = 24,
    onAnomalyChange
}) {
    const { t, language } = useLanguage();

    // Core interactive state variables
    const [daysPassed, setDaysPassed] = useState(initialDaysPassed); // Day 1 to 59 of 60-day cycle
    const [currentUnits, setCurrentUnits] = useState(initialCurrentUnits); // Actual units used so far in cycle
    const [estimatedUnits, setEstimatedUnits] = useState(defaultEstimated); // From Appliance Builder
    const [previousCycleUnits, setPreviousCycleUnits] = useState(410); // From historical bill
    const [historicalBills, setHistoricalBills] = useState([]);
    const [isAprilMayApproaching, setIsAprilMayApproaching] = useState(true);
    const [historicalSummerJumpPercent, setHistoricalSummerJumpPercent] = useState(40);

    // UI state
    const [showAdjuster, setShowAdjuster] = useState(false);
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'INFO'
    const [dismissedCards, setDismissedCards] = useState({});

    // Fetch real historical billing data on mount
    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const res = await api.get('/bills/history').catch(() => null);
                if (isMounted && res?.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
                    const bills = res.data.data;
                    setHistoricalBills(bills);
                    if (bills[0]?.unitsConsumed) {
                        setPreviousCycleUnits(bills[0].unitsConsumed);
                    }

                    // Check if summer months (Mar-Jun) historically show a >=30% jump
                    const summerBills = bills.filter(b => {
                        const m = (b.billingMonth || '').toLowerCase();
                        return m.includes('apr') || m.includes('may') || m.includes('jun') || m.includes('mar');
                    });
                    const winterBills = bills.filter(b => {
                        const m = (b.billingMonth || '').toLowerCase();
                        return m.includes('nov') || m.includes('dec') || m.includes('jan') || m.includes('feb');
                    });

                    if (summerBills.length > 0 && winterBills.length > 0) {
                        const avgSummer = summerBills.reduce((acc, curr) => acc + (curr.unitsConsumed || 0), 0) / summerBills.length;
                        const avgWinter = winterBills.reduce((acc, curr) => acc + (curr.unitsConsumed || 0), 0) / winterBills.length;
                        if (avgWinter > 0) {
                            const jump = Math.round(((avgSummer - avgWinter) / avgWinter) * 100);
                            if (jump >= 25) setHistoricalSummerJumpPercent(jump);
                        }
                    }
                }
            } catch (err) {
                console.warn('Baseline historical fallback applied:', err);
            }
        };

        fetchHistory();
        return () => { isMounted = false; };
    }, []);

    // Check calendar month for April/May proximity (Feb to May)
    useEffect(() => {
        const now = new Date();
        const currentMonthIdx = now.getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr, 4 = May
        // If current month is between February (1) and May (4), trigger summer spike warning
        setIsAprilMayApproaching(currentMonthIdx >= 1 && currentMonthIdx <= 4);
    }, []);

    // =========================================================================
    // FEATURE 3: THE "USAGE VELOCITY" GAUGE (Pace Anomaly)
    // Formula: (current_units / days_passed) * 60
    // =========================================================================
    const dailyVelocity = useMemo(() => {
        if (daysPassed <= 0) return 0;
        return Number((currentUnits / daysPassed).toFixed(2));
    }, [currentUnits, daysPassed]);

    const projectedCycleUnits = useMemo(() => {
        if (daysPassed <= 0) return 0;
        return Math.round((currentUnits / daysPassed) * 60);
    }, [currentUnits, daysPassed]);

    // =========================================================================
    // FEATURE 4: TRAFFIC LIGHT HEALTH SCORE
    // Compare projectedCycleUnits to previousCycleUnits
    // 🟢 Normal: Matches historical average (< 10% change)
    // 🟡 Elevated: 10% - 25% higher than last cycle
    // 🔴 Abnormal: > 25% spike compared to normal habits
    // =========================================================================
    const healthStatus = useMemo(() => {
        if (!previousCycleUnits || previousCycleUnits <= 0) {
            return {
                grade: 'NORMAL',
                percentDiff: 0,
                label: t('energyInbox.normalHealth', 'Normal Consumption'),
                desc: t('energyInbox.normalHealthDesc', 'Matches your historical average baseline.'),
                dotColor: 'bg-emerald-400',
                badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            };
        }
        const diff = ((projectedCycleUnits - previousCycleUnits) / previousCycleUnits) * 100;
        const roundedDiff = Math.round(diff);

        if (diff > 25) {
            return {
                grade: 'ABNORMAL',
                percentDiff: roundedDiff,
                label: t('energyInbox.abnormalHealth', 'Abnormal Consumption'),
                desc: t('energyInbox.abnormalHealthDesc', {
                    diff: roundedDiff,
                    defaultValue: `${roundedDiff}% spike compared to normal billing habits. Immediate action advised.`
                }),
                dotColor: 'bg-rose-500',
                badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            };
        } else if (diff >= 10) {
            return {
                grade: 'ELEVATED',
                percentDiff: roundedDiff,
                label: t('energyInbox.elevatedHealth', 'Elevated Pace'),
                desc: t('energyInbox.elevatedHealthDesc', {
                    diff: roundedDiff,
                    defaultValue: `${roundedDiff}% higher than last cycle. Keep heavy loads in check.`
                }),
                dotColor: 'bg-amber-400',
                badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            };
        } else {
            return {
                grade: 'NORMAL',
                percentDiff: roundedDiff,
                label: t('energyInbox.normalHealth', 'Normal Consumption'),
                desc: t('energyInbox.normalHealthDesc', 'Matches your historical average baseline.'),
                dotColor: 'bg-emerald-400',
                badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            };
        }
    }, [projectedCycleUnits, previousCycleUnits, t]);

    // =========================================================================
    // FEATURE 1: THE "PHANTOM LOAD" DETECTIVE (Mismatch Anomaly)
    // Compare estimated_units with actual_units (or projected cycle units).
    // If actual > 20% higher than estimated -> trigger leak warning.
    // =========================================================================
    const phantomLeak = useMemo(() => {
        if (!estimatedUnits || estimatedUnits <= 0) return null;

        // Compare projected units to user's appliance builder estimate
        const diffUnits = projectedCycleUnits - estimatedUnits;
        const percentOver = (diffUnits / estimatedUnits) * 100;

        if (percentOver > 20 && diffUnits > 20) {
            return {
                detected: true,
                leakUnits: Math.round(diffUnits),
                percentOver: Math.round(percentOver)
            };
        }
        return { detected: false, leakUnits: 0, percentOver: 0 };
    }, [projectedCycleUnits, estimatedUnits]);

    // =========================================================================
    // COMPOSE THE INBOX CARDS
    // Strictly:
    // - Solid background: `bg-darker`
    // - Colored left border indicating severity (Red / Gold / Emerald)
    // - Maximum of 2 sentences in plain English (or Tamil via `t()`)
    // =========================================================================
    const inboxCards = useMemo(() => {
        const cards = [];

        // 1. The "Phantom Load" Detective (Mismatch Anomaly)
        if (phantomLeak?.detected) {
            cards.push({
                id: 'inbox-phantom-leak',
                type: 'PHANTOM_LOAD',
                severity: 'HIGH',
                borderColor: 'border-l-rose-500',
                iconColor: 'text-rose-400',
                icon: AlertOctagon,
                badge: t('energyInbox.phantomLoadBadge', 'Leak Detected'),
                badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                title: `⚠️ ${t('energyInbox.phantomLoadTitle', 'Unexplained Usage Detected')}`,
                text: t('energyInbox.phantomLoadText', {
                    estimated: estimatedUnits,
                    actual: projectedCycleUnits,
                    leak: phantomLeak.leakUnits,
                    defaultValue: `Your appliances should only use ~${estimatedUnits} units, but your meter shows ${projectedCycleUnits} units. You have a ${phantomLeak.leakUnits}-unit leak. Check for older, inefficient appliances or wiring faults.`
                }),
                metric: `+${phantomLeak.leakUnits} kWh`,
                timestamp: t('energyInbox.today', 'Today'),
                category: t('energyInbox.phantomLoadCategory', 'Mismatch Anomaly')
            });
        }

        // 2. The "Usage Velocity" Gauge (Pace Anomaly)
        if (projectedCycleUnits > 500) {
            cards.push({
                id: 'inbox-usage-velocity',
                type: 'VELOCITY_SPIKE',
                severity: 'HIGH',
                borderColor: 'border-l-rose-500',
                iconColor: 'text-rose-400',
                icon: TrendingUp,
                badge: t('energyInbox.velocitySpikeBadge', 'High Velocity'),
                badgeStyle: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                title: `📈 ${t('energyInbox.velocitySpikeTitle', 'Fast Burn Rate Detected')}`,
                text: t('energyInbox.velocitySpikeText', {
                    currentUnits: currentUnits,
                    daysPassed: daysPassed,
                    projectedUnits: projectedCycleUnits,
                    defaultValue: `You have used ${currentUnits} units in just ${daysPassed} days. At this pace, you will finish the cycle at ${projectedCycleUnits} units and lose your tier-1 subsidy.`
                }),
                metric: `${dailyVelocity} kWh/day`,
                timestamp: t('energyInbox.livePace', 'Live Pace'),
                category: t('energyInbox.velocitySpikeCategory', 'Pace Anomaly')
            });
        } else if (projectedCycleUnits >= 420) {
            // Buffer warning when velocity approaches the 500-unit cutoff
            const buffer = 500 - projectedCycleUnits;
            cards.push({
                id: 'inbox-velocity-warning',
                type: 'VELOCITY_BUFFER',
                severity: 'MEDIUM',
                borderColor: 'border-l-amber-500',
                iconColor: 'text-amber-400',
                icon: Flame,
                badge: t('energyInbox.velocityBufferBadge', 'Cliff Margin'),
                badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                title: `⚡ ${t('energyInbox.velocityBufferTitle', 'Nearing 500-Unit Subsidy Cliff')}`,
                text: t('energyInbox.velocityBufferText', {
                    dailyVelocity: dailyVelocity,
                    currentUnits: currentUnits,
                    daysPassed: daysPassed,
                    cushion: buffer,
                    defaultValue: `You are burning ${dailyVelocity} units/day (${currentUnits} kWh in ${daysPassed} days). You only have an ${buffer}-unit cushion remaining before crossing the 500-unit tariff cliff.`
                }),
                metric: `${dailyVelocity} kWh/day`,
                timestamp: t('energyInbox.livePace', 'Live Pace'),
                category: t('energyInbox.velocityBufferCategory', 'Pace Warning')
            });
        }

        // 3. Seasonal "Bill Shock" Predictor
        if (isAprilMayApproaching && historicalSummerJumpPercent >= 25) {
            cards.push({
                id: 'inbox-summer-shock',
                type: 'SEASONAL_SHOCK',
                severity: 'MEDIUM',
                borderColor: 'border-l-amber-500',
                iconColor: 'text-amber-400',
                icon: Sun,
                badge: t('energyInbox.summerSpikeBadge', 'Summer Spike'),
                badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                title: `☀️ ${t('energyInbox.summerSpikeTitle', 'Summer Spike Warning')}`,
                text: t('energyInbox.summerSpikeText', {
                    jumpPercent: historicalSummerJumpPercent,
                    defaultValue: `Based on your history, your usage typically jumps by ${historicalSummerJumpPercent}% in April & May. Set your AC to 24°C instead of 18°C to avoid crossing the 500-unit penalty slab.`
                }),
                metric: `+${historicalSummerJumpPercent}% Summer`,
                timestamp: t('energyInbox.seasonal', 'Seasonal'),
                category: t('energyInbox.summerSpikeCategory', 'Seasonal Predictor')
            });
        }

        // 4. Fallback Safe Baseline Card (if no active alerts exist)
        if (cards.length === 0) {
            cards.push({
                id: 'inbox-optimal-schedule',
                type: 'OPTIMAL_PACING',
                severity: 'SAFE',
                borderColor: 'border-l-emerald-500',
                iconColor: 'text-emerald-400',
                icon: CheckCircle2,
                badge: t('energyInbox.optimalBadge', 'Optimized'),
                badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                title: `🟢 ${t('energyInbox.optimalTitle', 'Optimal Consumption Pace')}`,
                text: t('energyInbox.optimalText', {
                    dailyVelocity: dailyVelocity,
                    defaultValue: `Your household is tracking at an optimal ~${dailyVelocity} units/day. Staying on this track keeps you safely within the 200 free units subsidy zone.`
                }),
                metric: `${projectedCycleUnits} kWh Projected`,
                timestamp: t('energyInbox.today', 'Today'),
                category: t('energyInbox.optimalCategory', 'Subsidized Tier')
            });
        }

        return cards;
    }, [
        phantomLeak, projectedCycleUnits, estimatedUnits, daysPassed, currentUnits,
        dailyVelocity, isAprilMayApproaching, historicalSummerJumpPercent, t
    ]);

    // Notify parent if anomaly count changes
    useEffect(() => {
        if (onAnomalyChange) {
            const highCount = inboxCards.filter(c => c.severity === 'HIGH').length;
            onAnomalyChange({ total: inboxCards.length, highPriority: highCount });
        }
    }, [inboxCards, onAnomalyChange]);

    // Filtered cards list
    const visibleCards = useMemo(() => {
        return inboxCards
            .filter(card => !dismissedCards[card.id])
            .filter(card => {
                if (activeFilter === 'HIGH') return card.severity === 'HIGH';
                if (activeFilter === 'INFO') return card.severity !== 'HIGH';
                return true;
            });
    }, [inboxCards, dismissedCards, activeFilter]);

    const handleDismiss = (id) => {
        setDismissedCards(prev => ({ ...prev, [id]: true }));
    };

    const handleResetAll = () => {
        setDismissedCards({});
        setDaysPassed(initialDaysPassed);
        setCurrentUnits(initialCurrentUnits);
        setEstimatedUnits(defaultEstimated);
    };

    return (
        <div className="space-y-6 w-full min-w-0">
            {/* 1. TOP HEADER & TRAFFIC LIGHT HEALTH SCORE HERO */}
            <div className="bg-panel border border-panelBorder rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-panelBorder pb-5">

                    {/* Title & Description */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <div className="p-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-500">
                                <Inbox size={22} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
                                    <span>{t('energyInbox.title', 'AI Energy Inbox')}</span>
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {t('energyInbox.subtitle', 'Plain-English intelligence comparing historical bills, meter readings, and appliance loads')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* FEATURE 4: TRAFFIC LIGHT HEALTH SCORE BADGE */}
                    <div className="flex items-center gap-3 bg-darker border border-panelBorder p-3 rounded-xl">
                        {/* Traffic Light Dots */}
                        <div className="flex flex-col gap-1.5 items-center justify-center px-1">
                            <span
                                title="Abnormal (>25% spike)"
                                className={`w-2.5 h-2.5 rounded-full transition-all ${healthStatus.grade === 'ABNORMAL' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] scale-125' : 'bg-slate-700'
                                    }`}
                            />
                            <span
                                title="Elevated (10-25% jump)"
                                className={`w-2.5 h-2.5 rounded-full transition-all ${healthStatus.grade === 'ELEVATED' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] scale-125' : 'bg-slate-700'
                                    }`}
                            />
                            <span
                                title="Normal (matches baseline)"
                                className={`w-2.5 h-2.5 rounded-full transition-all ${healthStatus.grade === 'NORMAL' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] scale-125' : 'bg-slate-700'
                                    }`}
                            />
                        </div>

                        {/* Health Summary Text */}
                        <div className="border-l border-panelBorder pl-3 min-w-[170px]">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                                    {t('energyInbox.healthScore', 'Health Score')}
                                </span>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${healthStatus.badgeBg}`}>
                                    {healthStatus.label}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
                                {healthStatus.desc}
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPI TELEMETRY STRIP */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-5">
                    {/* Metric 1: Cycle Progress */}
                    <div className="bg-darker border border-panelBorder/70 p-3 rounded-xl min-w-0">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold truncate">
                            {t('energyInbox.billingCycle', 'Billing Cycle')}
                        </span>
                        <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                            <span className="text-base sm:text-lg font-bold font-mono text-white">Day {daysPassed}</span>
                            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">/ 60</span>
                        </div>
                    </div>

                    {/* Metric 2: Current Meter Run */}
                    <div className="bg-darker border border-panelBorder/70 p-3 rounded-xl min-w-0">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold truncate">
                            {t('energyInbox.recordedUnits', 'Recorded Units')}
                        </span>
                        <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                            <span className="text-base sm:text-lg font-bold font-mono text-gold-400">{currentUnits}</span>
                            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">kWh</span>
                        </div>
                    </div>

                    {/* Metric 3: Current Daily Pace */}
                    <div className="bg-darker border border-panelBorder/70 p-3 rounded-xl min-w-0">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold truncate">
                            {t('energyInbox.usageVelocity', 'Usage Velocity')}
                        </span>
                        <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                            <span className={`text-base sm:text-lg font-bold font-mono ${dailyVelocity > 8.33 ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                {dailyVelocity}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">kWh/day</span>
                        </div>
                    </div>

                    {/* Metric 4: Projected Total */}
                    <div className="bg-darker border border-panelBorder/70 p-3 rounded-xl min-w-0">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold truncate">
                            {t('energyInbox.projectedTotal', 'Cycle Projected')}
                        </span>
                        <div className="flex flex-wrap items-baseline gap-1 mt-0.5">
                            <span className={`text-base sm:text-lg font-bold font-mono ${projectedCycleUnits > 500 ? 'text-rose-400' : 'text-white'
                                }`}>
                                {projectedCycleUnits}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500">
                                {projectedCycleUnits > 500 ? t('energyInbox.projectedOver', '>500 Cutoff') : t('energyInbox.projectedUnder', 'kWh (Under 500)')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Collapsible Simulation / Tuning Drawer Toggle */}
                <div className="pt-4 mt-4 border-t border-panelBorder/60 flex flex-wrap items-center justify-between gap-2.5">
                    <button
                        onClick={() => setShowAdjuster(prev => !prev)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-gold-400 hover:text-gold-300 font-semibold transition cursor-pointer"
                    >
                        <Sliders size={13} className="shrink-0" />
                        <span className="text-left">
                            {showAdjuster
                                ? t('energyInbox.hideAdjuster', 'Hide Live Parameter Adjuster')
                                : t('energyInbox.showAdjuster', 'Open Live Parameter Adjuster (Test Anomalies)')}
                        </span>
                        {showAdjuster ? <ChevronUp size={13} className="shrink-0" /> : <ChevronDown size={13} className="shrink-0" />}
                    </button>

                    <button
                        onClick={handleResetAll}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer shrink-0"
                        title={t('energyInbox.resetDefaults', 'Reset Defaults')}
                    >
                        <RefreshCw size={11} className="shrink-0" />
                        <span>{t('energyInbox.resetDefaults', 'Reset Defaults')}</span>
                    </button>
                </div>

                {/* INTERACTIVE TUNING PANEL (Allows tester & user to trigger all 4 anomalies) */}
                {showAdjuster && (
                    <div className="mt-4 p-4 rounded-xl bg-darker border border-gold-500/20 grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in">
                        {/* Control 1: Days Passed in Cycle */}
                        <div>
                            <div className="flex justify-between items-center text-xs font-mono mb-1">
                                <span className="text-slate-400">
                                    {t('energyInbox.daysIntoCycle', 'Days into 60-Day Cycle:')}
                                </span>
                                <span className="text-gold-400 font-bold">{daysPassed} days</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="59"
                                value={daysPassed}
                                onChange={(e) => setDaysPassed(Number(e.target.value))}
                                className="w-full accent-gold-500 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Velocity calculation: (units / days) × 60
                            </p>
                        </div>

                        {/* Control 2: Current Meter Reading */}
                        <div>
                            <div className="flex justify-between items-center text-xs font-mono mb-1">
                                <span className="text-slate-400">
                                    {t('energyInbox.meterReadingSoFar', 'Meter Reading so far:')}
                                </span>
                                <span className="text-gold-400 font-bold">{currentUnits} kWh</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="600"
                                step="5"
                                value={currentUnits}
                                onChange={(e) => setCurrentUnits(Number(e.target.value))}
                                className="w-full accent-gold-500 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Drag higher early in cycle to trigger "Fast Burn Rate"
                            </p>
                        </div>

                        {/* Control 3: Appliance Estimate Baseline */}
                        <div>
                            <div className="flex justify-between items-center text-xs font-mono mb-1">
                                <span className="text-slate-400">
                                    {t('energyInbox.applianceProfilerEst', 'Appliance Profiler Est:')}
                                </span>
                                <span className="text-gold-400 font-bold">{estimatedUnits} kWh</span>
                            </div>
                            <input
                                type="range"
                                min="150"
                                max="600"
                                step="10"
                                value={estimatedUnits}
                                onChange={(e) => setEstimatedUnits(Number(e.target.value))}
                                className="w-full accent-gold-500 cursor-pointer"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Set lower than actual to trigger "Phantom Load Detective"
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. INBOX FILTER TABS & COUNT BANNER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                        {t('energyInbox.activeNotices', 'Active Inbox Feed:')}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/30">
                        {visibleCards.length} {visibleCards.length === 1 ? t('energyInbox.notice', 'Notice') : t('energyInbox.notices', 'Notices')}
                    </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                        onClick={() => setActiveFilter('ALL')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${activeFilter === 'ALL'
                                ? 'bg-gold-500 text-darker shadow-sm'
                                : 'bg-darker text-slate-400 hover:text-white border border-panelBorder'
                            }`}
                    >
                        {t('energyInbox.filterAll', 'All')}
                    </button>
                    <button
                        onClick={() => setActiveFilter('HIGH')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${activeFilter === 'HIGH'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'bg-darker text-slate-400 hover:text-rose-400 border border-panelBorder'
                            }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        {t('energyInbox.filterHigh', 'High Severity')}
                    </button>
                    <button
                        onClick={() => setActiveFilter('INFO')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${activeFilter === 'INFO'
                                ? 'bg-panel text-gold-400 border border-gold-500/40'
                                : 'bg-darker text-slate-400 hover:text-white border border-panelBorder'
                            }`}
                    >
                        {t('energyInbox.filterAdvisory', 'Advisory')}
                    </button>
                </div>
            </div>

            {/* 3. VERTICAL LIST OF SOLID "INSIGHT CARDS" (Plain-English Email Inbox Style) */}
            <div className="space-y-3.5">
                {visibleCards.length === 0 ? (
                    <div className="p-12 text-center bg-darker border border-panelBorder rounded-2xl space-y-2">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                        <h4 className="text-sm font-bold text-white">
                            {t('energyInbox.inboxZeroTitle', 'Inbox Zero — All Clear!')}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                            {t('energyInbox.inboxZeroDesc', 'No unexplained leaks, velocity spikes, or seasonal risks are currently pending for this connection.')}
                        </p>
                        <button
                            onClick={handleResetAll}
                            className="mt-3 px-3 py-1.5 rounded-lg bg-panel border border-panelBorder text-gold-400 text-xs font-mono font-bold hover:border-gold-500/40 transition cursor-pointer"
                        >
                            {t('energyInbox.restoreAll', 'Restore All Notifications')}
                        </button>
                    </div>
                ) : (
                    visibleCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.id}
                                className={`bg-darker border border-panelBorder ${card.borderColor} border-l-4 p-5 rounded-2xl shadow-lg transition-all duration-200 hover:border-panelBorder/90 relative group`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">

                                    {/* Left: Icon, Title, and Plain-English Max-2-Sentences Text */}
                                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                        <div className={`p-2 rounded-xl bg-dark border border-panelBorder shrink-0 ${card.iconColor}`}>
                                            <Icon size={20} />
                                        </div>

                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            {/* Header Row */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-extrabold text-white tracking-wide">
                                                    {card.title}
                                                </h3>
                                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${card.badgeStyle}`}>
                                                    {card.badge}
                                                </span>
                                            </div>

                                            {/* Plain-English Max 2-Sentence Body Text */}
                                            <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                                {card.text}
                                            </p>

                                            {/* Sub-strip with Timestamp & Metric */}
                                            <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} className="text-slate-500" />
                                                    {card.timestamp}
                                                </span>
                                                <span className="text-slate-600">•</span>
                                                <span className="text-gold-400 font-semibold">{card.category}</span>
                                                <span className="text-slate-600">•</span>
                                                <span className="text-slate-300 font-bold">{card.metric}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Quick Action & Dismiss */}
                                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-panelBorder/40">
                                        <button
                                            onClick={() => handleDismiss(card.id)}
                                            className="text-[11px] font-mono text-slate-500 hover:text-slate-300 px-2 py-1 rounded hover:bg-dark transition cursor-pointer"
                                            title="Mark as read / Dismiss from view"
                                        >
                                            {t('energyInbox.dismiss', 'Dismiss')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 4. PLAIN-ENGLISH FOOTNOTE ON HOW DETECTION OPERATES */}
            <div className="p-4 rounded-xl bg-panel border border-panelBorder text-xs text-slate-400 flex items-start gap-2.5">
                <Info size={16} className="text-gold-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                    <strong className="text-slate-200">
                        {t('energyInbox.howItWorksTitle', 'How this Energy Inbox works:')}
                    </strong>{' '}
                    {t('energyInbox.howItWorksText', 'Instead of complex scatter plots, the platform compares your past bi-monthly bills, appliance profiler outputs, and 60-day velocity to protect your 200 free units subsidy under Tamil Nadu GO Ms. 25.')}
                </p>
            </div>
        </div>
    );
}
