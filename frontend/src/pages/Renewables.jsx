import React, { useState } from 'react';
import api from '../services/api';
import { 
    Sun, BatteryCharging, Zap, ShieldCheck, ExternalLink, 
    TrendingDown, Leaf, Award, Calculator, Info 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Renewables() {
    const { t, language } = useLanguage();

    const [solarInput, setSolarInput] = useState('350');
    const [solarData, setSolarData] = useState(null);
    const [loadingSolar, setLoadingSolar] = useState(false);
    
    const [loadWatts, setLoadWatts] = useState('400');
    const [backupHours, setBackupHours] = useState('4');
    const [batteryData, setBatteryData] = useState(null);

    const [evCapacity, setEvCapacity] = useState('30.2');
    const [evRate, setEvRate] = useState('8.00');
    const [evData, setEvData] = useState(null);

    const handleSolar = async (e) => {
        if (e) e.preventDefault();
        setLoadingSolar(true);
        try {
            const { data } = await api.post('/renewables/solar', { monthlyConsumption: Number(solarInput) });
            if (data.success) {
                setSolarData(data.data);
            }
        } catch (err) {
            console.error('Solar error:', err);
        } finally {
            setLoadingSolar(false);
        }
    };

    const handleBattery = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/renewables/battery', { 
                loadWatts: Number(loadWatts), 
                backupHours: Number(backupHours) 
            });
            if (data.success) {
                setBatteryData(data.data);
            }
        } catch (err) {
            console.error('Battery error:', err);
        }
    };

    const handleEV = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/renewables/ev', { 
                batteryCapacityKwh: Number(evCapacity), 
                chargingRatePerUnit: Number(evRate) 
            });
            if (data.success) {
                setEvData(data.data);
            }
        } catch (err) {
            console.error('EV error:', err);
        }
    };

    return (
        <div className="space-y-8 w-full">
            {/* Page Header */}
            <div className="border-b border-panelBorder pb-6">
                <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <Sun className="text-gold-500" size={30} />
                    <span>{language === 'ta' ? 'சூரிய மின்சக்தி & புதுப்பிக்கத்தக்க ஆற்றல்' : 'Solar & Renewable Energy'} <span className="text-gold-500">{language === 'ta' ? 'போர்ட்டல்' : 'Portal'}</span></span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                    {language === 'ta'
                        ? 'அதிகாரப்பூர்வ பிஎம் சூர்ய கர்: இலவச மின்சாரத் திட்ட மானியம் மற்றும் சூரிய மின்சக்தி கணக்கீட்டுக் கருவி.'
                        : 'Official PM Surya Ghar: Muft Bijli Yojana national subsidy calculator, battery sizing, and EV charging optimizer.'}
                </p>
            </div>

            {/* PM SURYA GHAR NATIONAL SCHEME BANNER */}
            <div className="bg-gradient-to-r from-amber-500/15 via-gold-500/10 to-transparent border border-gold-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-xs font-bold uppercase tracking-wider">
                            <Award size={14} />
                            {language === 'ta' ? 'மத்திய அரசு & தமிழ்நாடு மின்சார வாரியத் திட்டம்' : 'Government of India & TANGEDCO Initiative'}
                        </div>
                        <h2 className="text-2xl font-extrabold text-white">
                            {language === 'ta' ? 'பிஎம் சூர்ய கர்: இலவச மின்சாரத் திட்டம் (PM Surya Ghar)' : 'PM Surya Ghar: Muft Bijli Yojana (Rooftop Solar Scheme)'}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {language === 'ta'
                                ? 'தமிழ்நாடு குடியிருப்பு நுகர்வோருக்கு கூரை சூரிய மின் தகடு அமைக்க ₹30,000 முதல் ₹78,000 வரை நேரடி வங்கி மானியம் வழங்கப்படுகிறது. 3kW சூரிய மின்தகடு அமைப்பதன் மூலம் உங்கள் மாதாந்திர மின்கட்டணத்தை பூஜ்ஜியமாக்கலாம்!'
                                : 'Domestic consumers in Tamil Nadu receive up to ₹78,000 in direct central DBT capital subsidy for installing rooftop solar panels. Generate up to 300 free units monthly and eliminate your bi-monthly bill!'}
                        </p>
                    </div>

                    <a 
                        href="https://pmsuryaghar.gov.in" 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-bold text-xs uppercase tracking-wider transition shadow-lg shrink-0 cursor-pointer"
                    >
                        <span>{language === 'ta' ? 'தேசிய போர்ட்டலில் விண்ணப்பிக்கவும்' : 'Apply on National Portal'}</span>
                        <ExternalLink size={14} />
                    </a>
                </div>

                {/* Quick Subsidy Structure Pill Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-gold-500/20">
                    <div className="bg-darker/70 border border-panelBorder p-3 rounded-xl">
                        <span className="text-[11px] font-mono text-slate-400 block font-bold">1 kW {language === 'ta' ? 'அமைப்பு' : 'System'}</span>
                        <span className="text-base font-extrabold text-gold-400 font-mono">₹30,000 {language === 'ta' ? 'மானியம்' : 'Subsidy'}</span>
                    </div>
                    <div className="bg-darker/70 border border-panelBorder p-3 rounded-xl">
                        <span className="text-[11px] font-mono text-slate-400 block font-bold">2 kW {language === 'ta' ? 'அமைப்பு' : 'System'}</span>
                        <span className="text-base font-extrabold text-gold-400 font-mono">₹60,000 {language === 'ta' ? 'மானியம்' : 'Subsidy'}</span>
                    </div>
                    <div className="bg-darker/70 border border-panelBorder p-3 rounded-xl">
                        <span className="text-[11px] font-mono text-slate-400 block font-bold">3 kW - 10 kW {language === 'ta' ? 'அமைப்பு' : 'System'}</span>
                        <span className="text-base font-extrabold text-gold-400 font-mono">₹78,000 {language === 'ta' ? 'அதிகபட்ச மானியம்' : 'Max Subsidy'}</span>
                    </div>
                </div>
            </div>

            {/* THREE SECTION GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. PM SURYA GHAR SOLAR CALCULATOR */}
                <div className="bg-panel border border-panelBorder rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div>
                        <div className="flex items-center gap-2 text-gold-400 mb-2">
                            <Sun size={20} />
                            <h2 className="text-base font-bold text-white">
                                {language === 'ta' ? 'சூரிய மின் தகடு கணக்கீட்டுக் கருவி' : 'PM Surya Ghar Solar Calculator'}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-5">
                            {language === 'ta'
                                ? 'தமிழ்நாடு சூரிய கதிர்வீச்சுக்கு ஏற்ப (~120 யூனிட்கள்/மாதம் ஒரு kW-க்கு) துல்லியமாக கணக்கிடப்படுகிறது.'
                                : 'Calibrated for Tamil Nadu solar irradiance (~120 units/month generated per 1 kW).'}
                        </p>

                        <form onSubmit={handleSolar} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                    {language === 'ta' ? 'மாதாந்திர மின் பயன்பாடு (kWh)' : 'Monthly Consumption (kWh)'}
                                </label>
                                <input 
                                    type="number" 
                                    min="50"
                                    max="2000"
                                    required 
                                    value={solarInput} 
                                    onChange={e => setSolarInput(e.target.value)}
                                    className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-gold-500 focus:outline-none" 
                                    placeholder="e.g. 350"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={loadingSolar}
                                className="w-full py-2.5 bg-gold-500 hover:bg-gold-400 text-darker font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Calculator size={15} />
                                {loadingSolar ? 'Calculating...' : (language === 'ta' ? 'மானியத்தை கணக்கிடு' : 'Compute PM Surya Subsidy')}
                            </button>
                        </form>
                    </div>

                    {solarData && (
                        <div className="mt-6 p-4 bg-darker border border-panelBorder rounded-xl space-y-2.5 text-xs font-mono">
                            <div className="flex justify-between items-center pb-2 border-b border-panelBorder">
                                <span className="text-slate-400">{language === 'ta' ? 'பரிந்துரைக்கப்பட்ட திறன்:' : 'Capacity:'}</span>
                                <span className="text-gold-400 text-sm font-extrabold">{solarData.requiredCapacityKw} kW</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-300">
                                <span>{language === 'ta' ? 'மொத்த திட்ட மதிப்பீடு:' : 'Gross Cost:'}</span>
                                <span>₹{solarData.grossCost?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                                <span>{language === 'ta' ? 'மத்திய அரசு மானியம்:' : 'Central Govt Subsidy:'}</span>
                                <span>- ₹{solarData.subsidyAmount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-panelBorder font-extrabold text-sm text-white">
                                <span>{language === 'ta' ? 'நிகர செலவு (Net Cost):' : 'Net Out-of-Pocket:'}</span>
                                <span className="text-gold-400">₹{solarData.netCost?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 pt-1">
                                <span>{language === 'ta' ? 'ஆண்டு சேமிப்பு:' : 'Annual Savings:'}</span>
                                <span className="text-emerald-400">~₹{solarData.annualSavings?.toLocaleString()} / yr</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400">
                                <span>{language === 'ta' ? 'முதலீடு திரும்பப் பெறும் காலம்:' : 'Payback Period:'}</span>
                                <span className="text-emerald-300 font-bold">~{solarData.paybackYears} {language === 'ta' ? 'ஆண்டுகள்' : 'Years'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. INVERTER BATTERY SIZER */}
                <div className="bg-panel border border-panelBorder rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div>
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <BatteryCharging size={20} />
                            <h2 className="text-base font-bold text-white">
                                {language === 'ta' ? 'இன்வெர்ட்டர் பேட்டரி அளவு' : 'Inverter Battery Sizer'}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-5">
                            {language === 'ta'
                                ? '12V டியூபுலர் லெட்-ஆசிட் பேட்டரிகளுக்கான ஆம்பியர்-மணிநேரம் (Ah) தேவையை கணக்கிடுகிறது.'
                                : 'Calculates required ampere-hours (Ah) for standard 12V tubular lead-acid batteries.'}
                        </p>

                        <form onSubmit={handleBattery} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                    {language === 'ta' ? 'மின்சுமை தேவை (Watts)' : 'Load Demand (Watts)'}
                                </label>
                                <input 
                                    type="number" 
                                    required 
                                    value={loadWatts} 
                                    onChange={e => setLoadWatts(e.target.value)}
                                    className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-blue-400 focus:outline-none" 
                                    placeholder="e.g. 400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                    {language === 'ta' ? 'காப்பு நேரம் (Hours)' : 'Backup Duration (Hours)'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.5"
                                    required 
                                    value={backupHours} 
                                    onChange={e => setBackupHours(e.target.value)}
                                    className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-blue-400 focus:outline-none" 
                                    placeholder="e.g. 4"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-darker font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                {language === 'ta' ? 'பேட்டரி அளவைக் கணக்கிடு' : 'Calculate Battery Capacity'}
                            </button>
                        </form>
                    </div>

                    {batteryData && (
                        <div className="mt-6 p-4 bg-darker border border-panelBorder rounded-xl space-y-2 text-xs font-mono">
                            <p className="text-slate-400">{language === 'ta' ? 'பரிந்துரைக்கப்பட்ட பேட்டரி அளவு:' : 'Recommended Size:'}</p>
                            <p className="text-2xl font-black text-blue-400">{batteryData.recommendedAh} Ah <span className="text-xs text-slate-400 font-sans">@ 12V</span></p>
                            <p className="text-slate-500 text-[10px]">{language === 'ta' ? 'குறைந்தபட்ச தேவை:' : 'Minimum required:'} {batteryData.requiredAh} Ah (80% Depth of Discharge)</p>
                        </div>
                    )}
                </div>

                {/* 3. EV CHARGING OPTIMIZER */}
                <div className="bg-panel border border-panelBorder rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <Zap size={20} />
                            <h2 className="text-base font-bold text-white">
                                {language === 'ta' ? 'மின்சார வாகன சார்ஜிங் செலவு' : 'EV Charging Cost Estimator'}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-5">
                            {language === 'ta'
                                ? 'முழு சார்ஜிங் செலவு மற்றும் ஒரு கிலோமீட்டருக்கான செலவைக் கணக்கிடுகிறது.'
                                : 'Estimates full-charge expenditure and running cost per km for electric vehicles.'}
                        </p>

                        <form onSubmit={handleEV} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                    {language === 'ta' ? 'பேட்டரி திறன் (kWh)' : 'Battery Pack Size (kWh)'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    required 
                                    value={evCapacity} 
                                    onChange={e => setEvCapacity(e.target.value)}
                                    className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none" 
                                    placeholder="e.g. 30.2"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                                    {language === 'ta' ? 'யூனிட் கட்டணம் (₹/kWh)' : 'Electricity Rate (₹/kWh)'}
                                </label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    required 
                                    value={evRate} 
                                    onChange={e => setEvRate(e.target.value)}
                                    className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none" 
                                    placeholder="8.00"
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-darker font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
                            >
                                {language === 'ta' ? 'சார்ஜிங் செலவைக் கணக்கிடு' : 'Calculate EV Running Cost'}
                            </button>
                        </form>
                    </div>

                    {evData && (
                        <div className="mt-6 p-4 bg-darker border border-panelBorder rounded-xl space-y-2 text-xs font-mono">
                            <div className="flex justify-between">
                                <span className="text-slate-400">{language === 'ta' ? 'முழு சார்ஜ் செலவு:' : 'Full Charge Cost:'}</span>
                                <span className="text-emerald-400 font-bold">₹{evData.chargingCost}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">{language === 'ta' ? 'மதிப்பிடப்பட்ட தூரம்:' : 'Estimated Range:'}</span>
                                <span className="text-slate-200">{evData.estimatedRangeKm} km</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-panelBorder font-bold">
                                <span className="text-slate-300">{language === 'ta' ? 'கிமீ-க்கான செலவு:' : 'Cost per km:'}</span>
                                <span className="text-gold-400">₹{evData.costPerKm} / km</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}