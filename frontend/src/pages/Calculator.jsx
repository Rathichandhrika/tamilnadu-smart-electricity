import { useState, useContext } from 'react';
import api from '../services/api';
import { 
    Calculator as CalcIcon, 
    Zap, 
    CheckCircle2, 
    Building2, 
    Home, 
    Factory, 
    Receipt, 
    FileText, 
    Download, 
    CreditCard, 
    Gauge, 
    Calendar, 
    ArrowRight, 
    Clock, 
    Check, 
    ExternalLink,
    Sliders,
    Sparkles,
    ShieldCheck,
    AlertTriangle,
    ShieldAlert,
    Info
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';

const formatSlabName = (slab, lang) => {
    if (!slab) return '';
    if (lang === 'ta') {
        const text = slab.slab || slab.description || '';
        if (text.includes('0 - 100 Units (Commercial Base)')) return '0 - 100 யூனிட்கள் (அடிப்படை வணிக நுகர்வு)';
        if (text.includes('> 100 Units (Commercial High Usage)')) return '> 100 யூனிட்கள் (அதிக வணிகப் பயன்பாடு)';
        if (text.includes('Fixed Demand Charge')) return 'நிலையான தேவைக் கட்டணம்';
        if (text.includes('State Electricity Tax')) return 'மாநில மின்சார வரி (5%)';
        if (text.includes('Industrial Energy Draw (Flat Rate)')) return 'தொழிற்துறை ஆற்றல் நுகர்வு (நேரடிக் கட்டணம்)';
        if (text.includes('Bi-Monthly Demand Charge')) return 'இரு மாத தேவைக் கட்டணம்';
        if (text.includes('Tamil Nadu Electricity Duty (5%)')) return 'தமிழ்நாடு மின்சார வரி / தீர்வு (5%)';
        
        if (slab.minUnits !== undefined && slab.maxUnits !== undefined) {
            const max = slab.maxUnits === 99999 ? 'மேல்' : slab.maxUnits;
            return `${slab.minUnits} - ${max} யூனிட்கள்`;
        }
        if (typeof text === 'string' && text.toLowerCase().includes('units')) {
            return text.replace(/units/gi, 'யூனிட்கள்');
        }
    }
    return slab.slab || slab.description || `${slab.minUnits} - ${slab.maxUnits === 99999 ? 'Above' : slab.maxUnits} units`;
};

export default function Calculator() {
    const { t, language } = useLanguage();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const isKycApproved = user?.verificationStatus === 'APPROVED';

    // Mode 1: 'ESTIMATOR' (Calculation only) | Mode 2: 'BILL_GENERATOR' (Official invoice generation)
    const [calcMode, setCalcMode] = useState('ESTIMATOR');

    // Estimator State
    const [estUnits, setEstUnits] = useState('450');
    const [estConnectionType, setEstConnectionType] = useState('LT-1A_DOMESTIC');
    const [estSanctionedLoad, setEstSanctionedLoad] = useState('2.0');
    const [estBillData, setEstBillData] = useState(null);
    const [estLoading, setEstLoading] = useState(false);
    const [estError, setEstError] = useState('');

    // Official Bill Generator State
    const [inputMethod, setInputMethod] = useState('METER_READINGS'); // 'METER_READINGS' | 'DIRECT_UNITS'
    const [prevReading, setPrevReading] = useState('14250');
    const [currReading, setCurrReading] = useState('14690');
    const [genUnits, setGenUnits] = useState('440');
    const [billingMonth, setBillingMonth] = useState('September - October 2026');
    const [genConnectionType, setGenConnectionType] = useState('LT-1A_DOMESTIC');
    const [genSanctionedLoad, setGenSanctionedLoad] = useState('2.0');
    const [savedOfficialBill, setSavedOfficialBill] = useState(null);
    const [genLoading, setGenLoading] = useState(false);
    const [genError, setGenError] = useState('');
    const [selectedPayBill, setSelectedPayBill] = useState(null);

    // Calculate Units from physical readings
    const computedUnits = Math.max(0, (Number(currReading) || 0) - (Number(prevReading) || 0));

    // Handle Category Change in Estimator
    const handleEstCategoryChange = (type) => {
        setEstConnectionType(type);
        setEstBillData(null);
        if (type === 'LT-IIIB_INDUSTRIAL') {
            setEstSanctionedLoad('10.0');
            if (Number(estUnits) < 500) setEstUnits('1200');
        } else if (type === 'LT-V_COMMERCIAL') {
            setEstSanctionedLoad('3.0');
        } else {
            setEstSanctionedLoad('2.0');
        }
    };

    // Mode 1: Compute Estimate (Calculation only)
    const handleCalculateEstimate = async (e) => {
        e.preventDefault();
        setEstLoading(true);
        setEstError('');
        setEstBillData(null);

        try {
            const { data } = await api.post('/bills/calculate', { 
                unitsConsumed: Number(estUnits),
                connectionType: estConnectionType,
                sanctionedLoadKw: Number(estSanctionedLoad) || (estConnectionType === 'LT-IIIB_INDUSTRIAL' ? 10.0 : 2.0)
            });
            if (data.success) {
                setEstBillData(data.data);
            }
        } catch (err) {
            setEstError(err.response?.data?.message || (language === 'ta' ? 'மின்கட்டணக் கணக்கீட்டில் பிழை ஏற்பட்டது.' : 'Error processing tariff calculations'));
        } finally {
            setEstLoading(false);
        }
    };

    // Mode 2: Generate and Save Official Bill
    const handleGenerateOfficialBill = async (e) => {
        e.preventDefault();
        setGenLoading(true);
        setGenError('');
        setSavedOfficialBill(null);

        const unitsToBill = inputMethod === 'METER_READINGS' ? computedUnits : Number(genUnits);

        if (unitsToBill <= 0) {
            setGenError(language === 'ta' ? 'மின் நுகர்வு யூனிட்கள் 0க்கு மேல் இருக்க வேண்டும்.' : 'Units consumed must be greater than 0.');
            setGenLoading(false);
            return;
        }

        try {
            const { data } = await api.post('/bills', {
                unitsConsumed: unitsToBill,
                billingMonth: billingMonth,
                connectionType: genConnectionType
            });

            if (data.success) {
                setSavedOfficialBill(data.data);
            }
        } catch (err) {
            setGenError(err.response?.data?.message || (language === 'ta' ? 'அதிகாரப்பூர்வ பில் உருவாக்குவதில் பிழை.' : 'Failed to generate official bill record.'));
        } finally {
            setGenLoading(false);
        }
    };

    return (
        <div className="space-y-8 w-full">
            
            {/* Header */}
            <div className="border-b border-panelBorder pb-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <CalcIcon className="text-gold-500" size={30} />
                    <span>
                        {language === 'ta' ? 'இருவழி மின்கட்டண ' : 'Two-Way '}
                        <span className="text-gold-500">{language === 'ta' ? 'மையம் (Calculator & Bill Generator)' : 'Tariff & Billing Hub'}</span>
                    </span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    {language === 'ta'
                        ? '1) வெறும் மதிப்பீட்டுக் கணக்கீடு (Calculation Only) மற்றும் 2) நேரடி மீட்டர் அளவீடு மூலம் அதிகாரப்பூர்வ பில் உருவாக்கம் (Official Bill Generation).'
                        : 'Dual Engine: 1) Quick Tariff Estimation sandbox and 2) Official TANGEDCO Bill Generation with real meter readings.'}
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Mode 1 Button */}
                <button
                    type="button"
                    onClick={() => setCalcMode('ESTIMATOR')}
                    className={`p-4 sm:p-5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3.5 shadow-lg ${
                        calcMode === 'ESTIMATOR'
                            ? 'bg-panel border-gold-500 ring-2 ring-gold-500/30'
                            : 'bg-darker/70 border-panelBorder text-slate-400 hover:text-white hover:bg-darker'
                    }`}
                >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        calcMode === 'ESTIMATOR' ? 'bg-gold-500 text-darker shadow-md' : 'bg-dark text-slate-400'
                    }`}>
                        <CalcIcon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <h2 className="text-base font-extrabold text-white">
                                {language === 'ta' ? '1. விரைவு கட்டண கணிப்பான்' : '1. Quick Tariff Estimator'}
                            </h2>
                            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-gold-500/15 text-gold-400 border border-gold-500/30 shrink-0">
                                {language === 'ta' ? 'கணக்கீடு மட்டும்' : 'Sandbox Only'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {language === 'ta' 
                                ? 'பல்வேறு யூனிட்களை உள்ளிட்டு மின்கட்டண அடுக்குகள் மற்றும் மானியங்களை சோதித்துப் பார்க்க.'
                                : 'Simulate different kWh scenarios, slabs, and subsidies without saving or generating bills.'}
                        </p>
                    </div>
                </button>

                {/* Mode 2 Button */}
                <button
                    type="button"
                    onClick={() => setCalcMode('BILL_GENERATOR')}
                    className={`p-4 sm:p-5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3.5 shadow-lg ${
                        calcMode === 'BILL_GENERATOR'
                            ? 'bg-panel border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'bg-darker/70 border-panelBorder text-slate-400 hover:text-white hover:bg-darker'
                    }`}
                >
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        calcMode === 'BILL_GENERATOR' ? 'bg-emerald-500 text-darker shadow-md' : 'bg-dark text-slate-400'
                    }`}>
                        <Receipt size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <h2 className="text-base font-extrabold text-white">
                                {language === 'ta' ? '2. அதிகாரப்பூர்வ பில் உருவாக்கம்' : '2. Official Bill Generator'}
                            </h2>
                            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                {language === 'ta' ? 'உண்மையான பதிவு' : 'Live Ledger'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {language === 'ta' 
                                ? 'மீட்டர் அளவீடு (Previous - Current) மூலம் உண்மையான மின்கட்டணத்தை உருவாக்கி கணக்கில் சேமிக்க.'
                                : 'Enter physical meter counters to generate and commit an authentic TANGEDCO tax invoice.'}
                        </p>
                    </div>
                </button>
            </div>

            {/* =========================================================================
               MODE 1: ESTIMATOR (CALCULATION PURPOSE ONLY)
               ========================================================================= */}
            {calcMode === 'ESTIMATOR' && (
                <div className="space-y-6 animate-fadeIn">

                    {/* Mode 1 Simulation Banner */}
                    <div className="p-4 bg-sky-500/10 border border-sky-500/25 rounded-2xl flex items-start gap-3 shadow-md">
                        <Info size={20} className="text-sky-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-sky-200 leading-relaxed">
                            <p className="font-bold text-sky-100">
                                {language === 'ta' ? '💡 மாதிரி கட்டண கணிப்பான் (Simulation & Sandbox Only)' : '💡 Tariff Estimation Sandbox (Simulation Only)'}
                            </p>
                            <p className="mt-0.5 text-slate-300">
                                {language === 'ta'
                                    ? 'இங்கு செய்யப்படும் கணக்கீடுகள் மாதிரி நோக்கத்திற்காக மட்டுமே. இதன் மூலம் உத்தியோகபூர்வ விலைப்பட்டியல் (Invoice) எதுவும் உருவாக்கப்படாது அல்லது கட்டண வரலாற்றில் சேமிக்கப்படாது.'
                                    : 'Calculations performed here are for estimation and scenario simulation only. No official tax invoices will be generated or committed to your account ledger.'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Input Card */}
                    <div className="bg-panel border border-panelBorder p-6 rounded-2xl space-y-6 shadow-xl">
                        {/* Category Selector */}
                        <div>
                            <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2.5">
                                {language === 'ta' ? 'கட்டணப் பிரிவைத் தேர்ந்தெடுக்கவும்' : 'Select Tariff Category'}
                            </label>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {/* LT-1A Domestic */}
                                <button
                                    type="button"
                                    onClick={() => handleEstCategoryChange('LT-1A_DOMESTIC')}
                                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                                        estConnectionType === 'LT-1A_DOMESTIC'
                                            ? 'bg-gold-500/15 border-gold-500 text-gold-400 shadow-md ring-1 ring-gold-500/40'
                                            : 'bg-darker border-panelBorder text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Home size={20} className={estConnectionType === 'LT-1A_DOMESTIC' ? 'text-gold-500 shrink-0 mt-0.5' : 'text-slate-500 shrink-0 mt-0.5'} />
                                    <div>
                                        <p className="font-bold text-sm text-white">{language === 'ta' ? 'LT-1A வீட்டு உபயோகம்' : 'LT-1A Domestic'}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{language === 'ta' ? '200 இலவச யூனிட் மானியம்' : 'Telescopic & 200 free units'}</p>
                                    </div>
                                </button>

                                {/* LT-V Commercial */}
                                <button
                                    type="button"
                                    onClick={() => handleEstCategoryChange('LT-V_COMMERCIAL')}
                                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                                        estConnectionType === 'LT-V_COMMERCIAL'
                                            ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-md ring-1 ring-purple-500/40'
                                            : 'bg-darker border-panelBorder text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Building2 size={20} className={estConnectionType === 'LT-V_COMMERCIAL' ? 'text-purple-400 shrink-0 mt-0.5' : 'text-slate-500 shrink-0 mt-0.5'} />
                                    <div>
                                        <p className="font-bold text-sm text-white">{language === 'ta' ? 'LT-V வணிக உபயோகம்' : 'LT-V Commercial'}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{language === 'ta' ? 'ஒற்றை அடுக்கு (₹110/kW + 5%)' : 'Non-telescopic flat rate'}</p>
                                    </div>
                                </button>

                                {/* LT-IIIB Industrial */}
                                <button
                                    type="button"
                                    onClick={() => handleEstCategoryChange('LT-IIIB_INDUSTRIAL')}
                                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                                        estConnectionType === 'LT-IIIB_INDUSTRIAL'
                                            ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md ring-1 ring-amber-500/40'
                                            : 'bg-darker border-panelBorder text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Factory size={20} className={estConnectionType === 'LT-IIIB_INDUSTRIAL' ? 'text-amber-400 shrink-0 mt-0.5' : 'text-slate-500 shrink-0 mt-0.5'} />
                                    <div>
                                        <p className="font-bold text-sm text-white">{language === 'ta' ? 'LT-IIIB தொழிற்துறை' : 'LT-IIIB Industrial'}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{language === 'ta' ? '₹7.65/யூனிட் + ₹600/kW + 5%' : 'Flat ₹7.65/u + Demand Charge'}</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleCalculateEstimate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-2">
                            <div className={estConnectionType === 'LT-1A_DOMESTIC' ? 'md:col-span-8' : 'md:col-span-6'}>
                                <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                                    {language === 'ta' ? 'மாதிரி இரு மாத மின் பயன்பாடு (kWh)' : 'Hypothetical Bi-Monthly Units (kWh)'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        required
                                        value={estUnits} 
                                        onChange={(e) => setEstUnits(e.target.value)}
                                        className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-gold-500 transition"
                                        placeholder="e.g. 450"
                                    />
                                    <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-mono">kWh</span>
                                </div>
                            </div>

                            {estConnectionType !== 'LT-1A_DOMESTIC' && (
                                <div className="md:col-span-3">
                                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                                        {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட சுமை (kW)' : 'Sanctioned Load (kW)'}
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            min="0.5" 
                                            step="0.5" 
                                            required
                                            value={estSanctionedLoad} 
                                            onChange={(e) => setEstSanctionedLoad(e.target.value)}
                                            className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-gold-500 transition"
                                        />
                                        <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-mono">kW</span>
                                    </div>
                                </div>
                            )}

                            <div className={estConnectionType === 'LT-1A_DOMESTIC' ? 'md:col-span-4' : 'md:col-span-3'}>
                                <button 
                                    type="submit" 
                                    disabled={estLoading}
                                    className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-darker font-extrabold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 uppercase tracking-wide text-xs sm:text-sm"
                                >
                                    <CalcIcon size={18} />
                                    <span>{estLoading ? (language === 'ta' ? 'கணக்கிடுகிறது...' : 'Calculating...') : (language === 'ta' ? 'கட்டணம் கணக்கிடு' : 'Calculate Estimate')}</span>
                                </button>
                            </div>
                        </form>

                        {estError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
                                {estError}
                            </div>
                        )}
                    </div>

                    {/* Breakdown Display */}
                    {estBillData && (
                        <div className="bg-panel border border-panelBorder rounded-2xl overflow-hidden shadow-2xl animate-fadeIn">
                            <div className="p-6 border-b border-panelBorder flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-darker/50">
                                <div>
                                    <span className="text-xs uppercase tracking-widest text-gold-500 font-bold">
                                        {language === 'ta' ? 'மதிப்பிடப்பட்ட தொகை (Calculation Result)' : 'Calculated Scenario Amount'}
                                    </span>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <span className="text-4xl font-extrabold text-white font-mono">₹{estBillData.totalAmount?.toFixed(2)}</span>
                                        <span className="text-xs text-slate-400">
                                            {language === 'ta' ? 'வரிகள் & நிலைக்கட்டணம் உட்பட' : 'incl. all charges & 5% duty'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-xs text-slate-400">{language === 'ta' ? 'கட்டண விதி' : 'Applied Tariff'}</p>
                                    <p className="text-sm font-bold text-slate-200 mt-0.5">{estBillData.tariffCategory} — {estBillData.tariffDescription}</p>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                                    <Zap size={16} className="text-gold-500" /> 
                                    {language === 'ta' ? 'கட்டண அடுக்கு விவரங்கள்' : 'Itemized Slab Breakdown'}
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-panelBorder text-slate-400 text-xs uppercase tracking-wider">
                                                <th className="py-3 px-4">{language === 'ta' ? 'அடுக்குப் பிரிவு' : 'Billing Category'}</th>
                                                <th className="py-3 px-4 text-center">{language === 'ta' ? 'யூனிட்கள்' : 'Billed Units'}</th>
                                                <th className="py-3 px-4 text-right">{language === 'ta' ? 'யூனிட் கட்டணம்' : 'Rate'}</th>
                                                <th className="py-3 px-4 text-right">{language === 'ta' ? 'தொகை' : 'Subtotal'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-panelBorder font-mono">
                                            {estBillData.slabBreakdown.map((slab, index) => (
                                                <tr key={index} className="hover:bg-darker/40 transition">
                                                    <td className="py-3 px-4 text-slate-200 font-sans">
                                                        <div className="flex items-center gap-2">
                                                            {slab.isFreeSlab && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                    <CheckCircle2 size={12} /> {language === 'ta' ? 'இலவசம்' : 'Subsidy'}
                                                                </span>
                                                            )}
                                                            <span>{formatSlabName(slab, language)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center text-slate-300">{slab.unitsBilled !== undefined ? slab.unitsBilled : '-'}</td>
                                                    <td className="py-3 px-4 text-right text-slate-400">{slab.isFreeSlab ? '₹0.00' : slab.ratePerUnit ? `₹${slab.ratePerUnit.toFixed(2)}` : '-'}</td>
                                                    <td className="py-3 px-4 text-right font-bold text-white">₹{slab.charge?.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            {estBillData.fixedCharge > 0 && (
                                                <tr className="border-t-2 border-panelBorder text-slate-300">
                                                    <td colSpan="3" className="py-3 px-4 text-right font-sans text-xs uppercase tracking-wider text-slate-400">
                                                        {language === 'ta' ? `நிலைக்கட்டணம் (${estBillData.sanctionedLoadKw} kW)` : `Fixed Demand Charge (${estBillData.sanctionedLoadKw} kW)`}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono font-bold text-gold-400">₹{estBillData.fixedCharge?.toFixed(2)}</td>
                                                </tr>
                                            )}
                                            {estBillData.electricityTax > 0 && (
                                                <tr className="border-t border-panelBorder text-slate-300">
                                                    <td colSpan="3" className="py-2.5 px-4 text-right font-sans text-xs uppercase tracking-wider text-amber-400">
                                                        {language === 'ta' ? 'தமிழ்நாடு மின்சார வரி / தீர்வு (5%)' : 'State Electricity Duty (5%)'}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-400">₹{estBillData.electricityTax?.toFixed(2)}</td>
                                                </tr>
                                            )}
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* =========================================================================
               MODE 2: OFFICIAL METER READING & BILL GENERATOR (REAL BILLING LEDGER)
               ========================================================================= */}
            {calcMode === 'BILL_GENERATOR' && (
                <div className="space-y-6 animate-fadeIn">

                    {/* 15-Day Statutory Due Date Policy & Notifications Notice */}
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3.5 shadow-md">
                        <Clock size={20} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-200 leading-relaxed">
                            <p className="font-bold text-amber-100 flex items-center gap-2">
                                <span>{language === 'ta' ? '📜 15 நாட்கள் சட்டப்பூர்வ கால அவகாசம் (15-Day Statutory Due Date Window)' : '📜 15-Day Statutory Payment Window & Notice'}</span>
                            </p>
                            <p className="mt-0.5 text-slate-300">
                                {language === 'ta'
                                    ? 'அதிகாரப்பூர்வ பில் உருவாக்கப்பட்ட நாளிலிருந்து கட்டணம் செலுத்த நுகர்வோருக்கு சரியாக 15 நாட்கள் கால அவகாசம் உள்ளது. கடைசி தேதிக்கு 3 நாட்களுக்கு முன் நினைவூட்டல் அறிவிப்பும், குறிப்பிட்ட தேதிக்குள் கட்டணம் செலுத்தாவிட்டால் ₹150 தாமத அபராதக் கட்டணம் விதிக்கப்படும் என்ற எச்சரிக்கையும் உங்கள் அறிவிப்புப் பிரிவுக்கு (Notifications & Alerts) அனுப்பப்படும்.'
                                    : 'From the bill generation date, consumers have exactly 15 days to pay the statutory invoice. Automatic notifications with invoice details and a fine surcharge warning (₹150 penalty) will be dispatched 3 days prior to the due date.'}
                            </p>
                        </div>
                    </div>

                    {/* e-KYC Requirement Verification Status Banner */}
                    {!isKycApproved ? (
                        <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                            <div className="flex items-start gap-3">
                                <ShieldAlert size={24} className="text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-extrabold text-rose-300">
                                        {language === 'ta' ? 'e-KYC சரிபார்ப்பு நிலுவையில் உள்ளது (e-KYC Required)' : 'e-KYC Verification Required for Official Invoices'}
                                    </h4>
                                    <p className="text-xs text-slate-300 mt-1">
                                        {language === 'ta'
                                            ? 'TANGEDCO விதிகளின்படி உத்தியோகபூர்வ மின்கட்டண விலைப்பட்டியலை (Tax Invoice) உருவாக்க e-KYC சரிபார்ப்பு (APPROVED) கட்டாயமாகும். தயவுசெய்து உங்கள் சுயவிவரத்தில் ஆவணங்களைச் சமர்ப்பித்து அனுமதி பெறவும்.'
                                            : 'Official TANGEDCO tax invoice generation requires an approved e-KYC status. Please complete your Aadhaar / Consumer verification in your Profile before committing bills.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shrink-0 shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
                            >
                                <ShieldCheck size={16} />
                                <span>{language === 'ta' ? 'சுயவிவரம் / e-KYC செல்க' : 'Go to Profile e-KYC'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-xs shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold">
                                <ShieldCheck size={18} className="text-emerald-400" />
                                <span>{language === 'ta' ? 'e-KYC சரிபார்க்கப்பட்டது (e-KYC Verified & Authorized Consumer)' : 'e-KYC Verified & Authorized Consumer'}</span>
                            </div>
                            <span className="text-[10px] font-mono px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-bold uppercase border border-emerald-500/30">
                                {user?.consumerNumber || 'TN-TNEB'}
                            </span>
                        </div>
                    )}
                    
                    {/* Bill Generation Form */}
                    <div className="bg-panel border border-emerald-500/30 p-6 rounded-2xl space-y-6 shadow-xl">
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-panelBorder">
                            <div>
                                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                                    <Receipt className="text-emerald-400" size={20} />
                                    <span>{language === 'ta' ? 'அதிகாரப்பூர்வ மீட்டர் அளவீடு & பில் உருவாக்கம்' : 'Commit Official Meter Reading'}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {language === 'ta' ? 'உருவாக்கப்படும் பில் உங்கள் கட்டண வரலாற்றிலும் நிர்வாக தளத்திலும் உடனே சேமிக்கப்படும்.' : 'Commits a legally stamped TANGEDCO invoice to your active account ledger.'}
                                </p>
                            </div>

                            {/* Input Method Toggle */}
                            <div className="flex bg-darker p-1 rounded-xl border border-panelBorder">
                                <button
                                    type="button"
                                    onClick={() => setInputMethod('METER_READINGS')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        inputMethod === 'METER_READINGS' ? 'bg-emerald-500 text-darker shadow' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {language === 'ta' ? 'மீட்டர் எண்கள் (Prev/Curr)' : 'Physical Meter Numbers'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputMethod('DIRECT_UNITS')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        inputMethod === 'DIRECT_UNITS' ? 'bg-emerald-500 text-darker shadow' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {language === 'ta' ? 'நேரடி யூனிட்கள்' : 'Direct Units (kWh)'}
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleGenerateOfficialBill} className="space-y-5">
                            
                            {/* Billing Cycle & Category */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                                        {language === 'ta' ? 'விலைப்பட்டியல் சுழற்சி / மாதம்' : 'Billing Cycle / Month'} *
                                    </label>
                                    <select
                                        value={billingMonth}
                                        onChange={(e) => setBillingMonth(e.target.value)}
                                        className="w-full bg-darker border border-panelBorder rounded-xl p-3 text-white text-sm focus:border-emerald-500 cursor-pointer"
                                    >
                                        <option value="September - October 2026">September - October 2026</option>
                                        <option value="November - December 2026">November - December 2026</option>
                                        <option value="January - February 2027">January - February 2027</option>
                                        <option value="March - April 2027">March - April 2027</option>
                                        <option value="May - June 2027">May - June 2027</option>
                                        <option value="July - August 2026">July - August 2026</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                                        {language === 'ta' ? 'இணைப்பு வகை' : 'Connection Tariff Category'} *
                                    </label>
                                    <select
                                        value={genConnectionType}
                                        onChange={(e) => setGenConnectionType(e.target.value)}
                                        className="w-full bg-darker border border-panelBorder rounded-xl p-3 text-white text-sm focus:border-emerald-500 cursor-pointer"
                                    >
                                        <option value="LT-1A_DOMESTIC">{language === 'ta' ? 'LT-1A வீட்டு உபயோகம் (Domestic)' : 'LT-1A Domestic'}</option>
                                        <option value="LT-V_COMMERCIAL">{language === 'ta' ? 'LT-V வணிக உபயோகம் (Commercial)' : 'LT-V Commercial'}</option>
                                        <option value="LT-IIIB_INDUSTRIAL">{language === 'ta' ? 'LT-IIIB தொழிற்துறை (Industrial)' : 'LT-IIIB Industrial'}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Meter Readings Mode vs Direct Units Mode */}
                            {inputMethod === 'METER_READINGS' ? (
                                <div className="p-4 rounded-xl bg-darker border border-panelBorder space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                        <div>
                                            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                                                {language === 'ta' ? 'முந்தைய மீட்டர் அளவு (Prev kWh)' : 'Previous Reading (kWh)'} *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={prevReading}
                                                onChange={(e) => setPrevReading(e.target.value)}
                                                className="w-full bg-dark border border-panelBorder rounded-xl p-3 text-white font-mono text-sm focus:border-emerald-500"
                                                placeholder="e.g. 14250"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                                                {language === 'ta' ? 'தற்போதைய மீட்டர் அளவு (Curr kWh)' : 'Current Reading (kWh)'} *
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                value={currReading}
                                                onChange={(e) => setCurrReading(e.target.value)}
                                                className="w-full bg-dark border border-panelBorder rounded-xl p-3 text-white font-mono text-sm focus:border-emerald-500"
                                                placeholder="e.g. 14690"
                                            />
                                        </div>

                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                                                {language === 'ta' ? 'நுகரப்பட்ட யூனிட்கள்' : 'Actual Consumed'}
                                            </span>
                                            <p className="text-2xl font-black text-white font-mono mt-0.5">
                                                {computedUnits} <span className="text-xs font-normal text-emerald-400">kWh</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                                        {language === 'ta' ? 'உண்மையான மொத்த பயன்பாட்டு யூனிட்கள் (kWh)' : 'Actual Total Units Consumed (kWh)'} *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            required
                                            value={genUnits}
                                            onChange={(e) => setGenUnits(e.target.value)}
                                            className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-3 text-white font-mono focus:border-emerald-500"
                                            placeholder="e.g. 440"
                                        />
                                        <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-mono">kWh</span>
                                    </div>
                                </div>
                            )}

                            {genError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
                                    {genError}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={genLoading || !isKycApproved}
                                className={`w-full py-4 font-black text-sm uppercase tracking-wider rounded-xl transition cursor-pointer shadow-xl flex items-center justify-center gap-2 ${
                                    !isKycApproved 
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600 shadow-none'
                                        : 'bg-emerald-500 hover:bg-emerald-400 text-darker shadow-emerald-500/20'
                                }`}
                            >
                                <Zap size={18} className={!isKycApproved ? 'fill-slate-400' : 'fill-darker'} />
                                <span>
                                    {!isKycApproved
                                        ? (language === 'ta' ? 'e-KYC சரிபார்ப்பு முடிந்த பிறகே பில் உருவாக்க முடியும்' : 'e-KYC Approval Required to Generate Invoice')
                                        : genLoading 
                                            ? (language === 'ta' ? 'பில் உருவாக்கப்பட்டு சேமிக்கப்படுகிறது...' : 'Generating Official TANGEDCO Bill...') 
                                            : (language === 'ta' ? 'அதிகாரப்பூர்வ மின்கட்டணத்தை உருவாக்குக & சேமிக்க' : 'Generate & Commit Official Bill to Ledger')}
                                </span>
                            </button>
                        </form>
                    </div>

                    {/* Official Bill Commited Card */}
                    {savedOfficialBill && (
                        <div className="bg-panel border border-emerald-500 rounded-2xl p-6 shadow-2xl space-y-5 animate-fadeIn">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-panelBorder pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                        <CheckCircle2 size={26} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            OFFICIAL INVOICE COMMITTED
                                        </span>
                                        <h3 className="text-xl font-black text-white mt-1">
                                            {savedOfficialBill.billingMonth}
                                        </h3>
                                    </div>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-xs text-slate-400">{language === 'ta' ? 'மொத்த கட்டணத் தொகை' : 'Net Total Payable'}</p>
                                    <p className="text-3xl font-black text-gold-400 font-mono">₹{savedOfficialBill.totalAmount?.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-darker p-4 rounded-xl border border-panelBorder font-mono">
                                <div>
                                    <span className="text-slate-500 block font-sans">{language === 'ta' ? 'நுகர்வு யூனிட்கள்:' : 'Units Consumed:'}</span>
                                    <span className="font-bold text-white text-sm">{savedOfficialBill.unitsConsumed} kWh</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block font-sans">{language === 'ta' ? 'ஆற்றல் கட்டணம்:' : 'Energy Charge:'}</span>
                                    <span className="font-bold text-white text-sm">₹{savedOfficialBill.energyCharge?.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block font-sans">{language === 'ta' ? 'கடைசி தேதி:' : 'Statutory Due Date:'}</span>
                                    <span className="font-bold text-amber-400 text-sm">{new Date(savedOfficialBill.dueDate).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block font-sans">{language === 'ta' ? 'கட்டண நிலை:' : 'Payment Status:'}</span>
                                    <span className="font-bold text-rose-400 text-sm">{savedOfficialBill.status || 'UNPAID'}</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPayBill(savedOfficialBill)}
                                    className="w-full sm:w-auto flex-1 py-3 px-6 bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-gold-500/10 flex items-center justify-center gap-2"
                                >
                                    <Zap size={16} className="fill-darker" />
                                    <span>{language === 'ta' ? 'TANGEDCO மூலம் இப்போதே செலுத்துக' : 'Pay via TANGEDCO Quick Pay'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/history')}
                                    className="w-full sm:w-auto flex-1 py-3 px-6 bg-dark hover:bg-panel border border-panelBorder text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <FileText size={16} className="text-gold-400" />
                                    <span>{language === 'ta' ? 'கட்டண வரலாற்றில் பார்க்க' : 'View in Bill History'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Gateway Modal */}
            <PaymentModal
                bill={selectedPayBill}
                isOpen={!!selectedPayBill}
                onClose={() => setSelectedPayBill(null)}
                onPaymentSuccess={(paidData) => {
                    if (savedOfficialBill && savedOfficialBill._id === paidData.billId) {
                        setSavedOfficialBill(prev => ({ ...prev, status: 'PAID', paidAt: paidData.paidAt }));
                    }
                }}
            />
        </div>
    );
}