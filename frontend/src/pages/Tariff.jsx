import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    Receipt, Home, Building2, Factory, ShieldCheck, 
    AlertTriangle, Zap, Info, CheckCircle2, ArrowRight, Gauge
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Tariff() {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState('domestic'); // 'domestic' | 'commercial' | 'industrial'
    const [tariffData, setTariffData] = useState(null);

    useEffect(() => {
        const fetchTariffs = async () => {
            try {
                const res = await api.get('/bills/tariffs');
                if (res.data?.success && res.data.data?.tariffs) {
                    setTariffData(res.data.data.tariffs);
                }
            } catch (err) {
                console.warn('Using local tariff schedule fallback');
            }
        };
        fetchTariffs();
    }, []);

    return (
        <div className="space-y-8 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-panelBorder pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Receipt className="text-gold-500" size={30} />
                        <span>{language === 'ta' ? 'TANGEDCO கட்டண' : 'TANGEDCO Tariff'} <span className="text-gold-500">{language === 'ta' ? 'விதிமுறைகள்' : 'Rules & Schedules'}</span></span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {language === 'ta'
                            ? 'தமிழ்நாடு மின்சார ஒழுங்குமுறை ஆணையத்தின் (TNERC) அதிகாரப்பூர்வ 2026 கட்டண அட்டவணை.'
                            : 'Official 2026 tariff schedules governed by Tamil Nadu Electricity Regulatory Commission (TNERC).'}
                    </p>
                </div>

                {/* 3-Tab Category Switcher */}
                <div className="flex items-center gap-1.5 bg-panel border border-panelBorder p-1.5 rounded-2xl self-start md:self-auto shadow-xl">
                    <button
                        onClick={() => setActiveTab('domestic')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'domestic'
                                ? 'bg-gold-500 text-darker shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Home size={15} />
                        {language === 'ta' ? 'LT-1A வீட்டு உபயோகம்' : 'LT-1A Domestic'}
                    </button>
                    <button
                        onClick={() => setActiveTab('commercial')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'commercial'
                                ? 'bg-gold-500 text-darker shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Building2 size={15} />
                        {language === 'ta' ? 'LT-V வணிக உபயோகம்' : 'LT-V Commercial'}
                    </button>
                    <button
                        onClick={() => setActiveTab('industrial')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === 'industrial'
                                ? 'bg-gold-500 text-darker shadow-md'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Factory size={15} />
                        {language === 'ta' ? 'LT-IIIB தொழிற்துறை' : 'LT-IIIB Industrial'}
                    </button>
                </div>
            </div>

            {/* TAB 1: DOMESTIC LT-1A (TELESCOPIC SUBSIDIZED) */}
            {activeTab === 'domestic' && (
                <div className="space-y-6">
                    {/* Model Overview Banner */}
                    <div className="bg-panel border border-panelBorder p-5 rounded-2xl flex items-start gap-4 shadow-xl">
                        <Info size={22} className="text-gold-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">
                                {language === 'ta' ? 'படிநிலை மானியக் கட்டமைப்பு (Telescopic Billing Model)' : 'Telescopic Subsidized Billing Structure'}
                            </h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {language === 'ta'
                                    ? 'குடியிருப்பு நுகர்வோருக்கு 500 யூனிட்கள் வரை 200 இலவச யூனிட்களுடன் குறைந்த கட்டணம் பொருந்தும். 500 யூனிட்டைத் தாண்டினால், 200 இலவச யூனிட் மானியம் ரத்தாகி, அடுக்கு 2-ன் கீழ் யூனிட்டுக்கு ₹11.00 வரை அபராதக் கட்டணம் விதிக்கப்படும்.'
                                    : 'Tamil Nadu utilizes a telescopic tariff schedule for homes. Consuming ≤ 500 units grants 200 free units subsidy and lower slab rates (₹4.50 to ₹6.00). Consuming 501+ units eliminates the 200 free units and escalates all slabs up to ₹11.00/unit.'}
                            </p>
                        </div>
                    </div>

                    {/* Telescopic Comparison Visual Bar */}
                    <div className="bg-panel border border-panelBorder p-4 sm:p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
                            <span className="font-bold text-white uppercase tracking-wider font-mono">
                                {language === 'ta' ? 'படிநிலை அடுக்கு ஒப்பீடு' : 'Telescopic Slab Transition Bar'}
                            </span>
                            <span className="text-gold-400 font-mono font-bold text-[11px] sm:text-xs">
                                {language === 'ta' ? '500 kWh வரம்பு வரம்புக் கோடு' : '500 kWh Cutoff'}
                            </span>
                        </div>
                        <div className="overflow-x-auto pb-1 no-scrollbar">
                            <div className="min-w-[420px] h-7 bg-darker rounded-xl overflow-hidden flex border border-panelBorder p-0.5 gap-0.5">
                                <div className="h-full bg-emerald-500/80 rounded-l-lg flex items-center justify-center text-[10px] sm:text-xs font-bold text-darker font-mono px-1 whitespace-nowrap" style={{ width: '40%' }}>
                                    {language === 'ta' ? '0-200 இலவசம்' : '0-200 Free'}
                                </div>
                                <div className="h-full bg-emerald-600/80 flex items-center justify-center text-[10px] sm:text-xs font-bold text-emerald-100 font-mono px-1 whitespace-nowrap" style={{ width: '25%' }}>
                                    201-400 ₹4.50
                                </div>
                                <div className="h-full bg-amber-600/80 flex items-center justify-center text-[10px] sm:text-xs font-bold text-amber-100 font-mono px-1 whitespace-nowrap" style={{ width: '15%' }}>
                                    401-500 ₹6
                                </div>
                                <div className="h-full bg-rose-600/80 rounded-r-lg flex items-center justify-center text-[10px] sm:text-xs font-bold text-rose-100 font-mono px-1 whitespace-nowrap" style={{ width: '20%' }}>
                                    &gt; 500 (₹8 - ₹11)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tier 1 & Tier 2 Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tier 1: <= 500 Units */}
                        <div className="bg-panel border border-emerald-500/30 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-5 bg-emerald-950/20 border-b border-emerald-500/20 flex justify-between items-center gap-3">
                                <div>
                                    <h2 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                                        <ShieldCheck size={18} /> {language === 'ta' ? 'அடுக்கு 1: ≤ 500 யூனிட்கள் (மானியக் கட்டணம்)' : 'Tier 1: ≤ 500 Units (Subsidized)'}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {language === 'ta' ? '200 இலவச யூனிட்கள் + குறைந்த கட்டண விகிதங்கள்' : '200 units free + low slab rates'}
                                    </p>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 whitespace-nowrap shrink-0">
                                    {language === 'ta' ? 'பாதுகாப்பான அடுக்கு' : 'SAFE TIER'}
                                </span>
                            </div>
                            <div className="p-5">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-400 border-b border-panelBorder uppercase tracking-wider">
                                            <th className="pb-3">{language === 'ta' ? 'அடுக்குப் பிரிவு' : 'Slab Range'}</th>
                                            <th className="pb-3 text-right">{language === 'ta' ? 'கட்டண விகிதம்' : 'Tariff Rate'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-panelBorder font-mono">
                                        <tr><td className="py-3 text-slate-200">{language === 'ta' ? '0 - 200 யூனிட்கள்' : '0 - 200 units'}</td><td className="py-3 text-right text-emerald-400 font-bold">{language === 'ta' ? '100% இலவசம் (₹0.00)' : '100% FREE (₹0.00)'}</td></tr>
                                        <tr><td className="py-3 text-slate-200">{language === 'ta' ? '201 - 400 யூனிட்கள்' : '201 - 400 units'}</td><td className="py-3 text-right text-slate-200">{language === 'ta' ? '₹4.50 / யூனிட்' : '₹4.50 / unit'}</td></tr>
                                        <tr><td className="py-3 text-slate-200">{language === 'ta' ? '401 - 500 யூனிட்கள்' : '401 - 500 units'}</td><td className="py-3 text-right text-amber-400 font-bold">{language === 'ta' ? '₹6.00 / யூனிட்' : '₹6.00 / unit'}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tier 2: > 500 Units */}
                        <div className="bg-panel border border-rose-500/30 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-5 bg-rose-950/20 border-b border-rose-500/20 flex justify-between items-center gap-3">
                                <div>
                                    <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
                                        <AlertTriangle size={18} /> {language === 'ta' ? 'அடுக்கு 2: > 500 யூனிட்கள் (200 இலவச யூனிட் மானியம் ரத்து)' : 'Tier 2: > 500 Units (Subsidy Revoked)'}
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {language === 'ta' ? 'உயர் அடுக்குகளுக்கு அதிகபட்ச கட்டணங்கள் பொருந்தும்' : 'Punitive rates apply across upper slabs'}
                                    </p>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 whitespace-nowrap shrink-0">
                                    {language === 'ta' ? 'அபராத அடுக்கு' : 'PENALTY TIER'}
                                </span>
                            </div>
                            <div className="p-5">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-400 border-b border-panelBorder uppercase tracking-wider">
                                            <th className="pb-3">{language === 'ta' ? 'அடுக்குப் பிரிவு' : 'Slab Range'}</th>
                                            <th className="pb-3 text-right">{language === 'ta' ? 'கட்டண விகிதம்' : 'Tariff Rate'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-panelBorder font-mono">
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '0 - 100 யூனிட்கள்' : '0 - 100 units'}</td><td className="py-2.5 text-right text-slate-400">{language === 'ta' ? '100% இலவசம் (₹0.00)' : '100% FREE (₹0.00)'}</td></tr>
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '101 - 400 யூனிட்கள்' : '101 - 400 units'}</td><td className="py-2.5 text-right text-slate-200">{language === 'ta' ? '₹4.50 / யூனிட்' : '₹4.50 / unit'}</td></tr>
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '401 - 500 யூனிட்கள்' : '401 - 500 units'}</td><td className="py-2.5 text-right text-slate-200">{language === 'ta' ? '₹6.00 / யூனிட்' : '₹6.00 / unit'}</td></tr>
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '501 - 600 யூனிட்கள்' : '501 - 600 units'}</td><td className="py-2.5 text-right text-rose-400 font-bold">{language === 'ta' ? '₹8.00 / யூனிட்' : '₹8.00 / unit'}</td></tr>
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '601 - 800 யூனிட்கள்' : '601 - 800 units'}</td><td className="py-2.5 text-right text-rose-400 font-bold">{language === 'ta' ? '₹9.00 / யூனிட்' : '₹9.00 / unit'}</td></tr>
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '801 - 1000 யூனிட்கள்' : '801 - 1000 units'}</td><td className="py-2.5 text-right text-rose-400 font-bold">{language === 'ta' ? '₹10.00 / யூனிட்' : '₹10.00 / unit'}</td></tr>
                                        <tr><td className="py-2.5 text-slate-200">{language === 'ta' ? '1000 யூனிட்களுக்கு மேல்' : 'Above 1000 units'}</td><td className="py-2.5 text-right text-rose-500 font-black">{language === 'ta' ? '₹11.00 / யூனிட்' : '₹11.00 / unit'}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: COMMERCIAL LT-V (NON-TELESCOPIC PUNITIVE) */}
            {activeTab === 'commercial' && (
                <div className="space-y-6">
                    {/* Non-Telescopic Visual Warning Banner */}
                    <div className="bg-purple-950/20 border border-purple-500/40 p-6 rounded-2xl shadow-xl space-y-3">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Building2 size={20} />
                            <h2 className="text-base font-bold text-white uppercase tracking-wider">
                                {language === 'ta' ? 'ஒற்றை அடுக்கு கட்டண விதிமுறை (Non-Telescopic Math)' : 'Non-Telescopic Commercial Tariff Model (LT-V)'}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {language === 'ta'
                                ? 'வணிக இணைப்புகளுக்கு (கடைகள், அலுவலகங்கள், வணிக வளாகங்கள்) ஒற்றை அடுக்குக் கட்டணம் பொருந்தும். 100 யூனிட்கள் வரை நுகர்வு இருந்தால் ஒரு யூனிட்டுக்கு ₹6.65. ஆனால் பயன்பாடு 100 யூனிட்டைத் தாண்டினால், முதல் யூனிட் முதல் அனைத்து யூனிட்களுக்கும் யூனிட்டுக்கு ₹10.45 நேரடிக் கட்டணம் விதிக்கப்படும்! அத்துடன் ₹110/kW நிலைக்கட்டணம் மற்றும் 5% வரி விதிக்கப்படும்.'
                                : 'Commercial LT-V consumers are billed under a strict non-telescopic model. If bi-monthly usage is ≤ 100 units, all units are billed at ₹6.65. However, if total usage crosses 100 units, the lower rate is completely erased, and ALL units are charged flat at ₹10.45/unit from unit 1, plus ₹110/kW demand charges and 5% electricity tax.'}
                        </p>
                    </div>

                    {/* Non-Telescopic Visual Bar */}
                    <div className="bg-panel border border-panelBorder p-6 rounded-2xl shadow-xl space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-white uppercase tracking-wider font-mono">
                                {language === 'ta' ? 'வணிகக் கட்டண எல்லை (வரம்பு: 100 kWh)' : 'Commercial Jump Matrix (Threshold: 100 kWh)'}
                            </span>
                            <span className="text-purple-400 font-mono font-bold">
                                {language === 'ta' ? '101-வது யூனிட்டில் +57% கட்டண உயர்வு' : '+57% Price Surge on 101st Unit'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-darker border border-emerald-500/30 p-4 rounded-xl space-y-1">
                                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                                    {language === 'ta' ? 'பயன்பாடு ≤ 100 யூனிட்கள்' : 'Usage ≤ 100 Units'}
                                </span>
                                <p className="text-2xl font-black font-mono text-white">₹6.65 <span className="text-xs font-sans text-slate-400">{language === 'ta' ? '/ யூனிட்' : '/ unit'}</span></p>
                                <p className="text-[11px] text-slate-400">
                                    {language === 'ta' ? 'நுகர்வு வரம்பிற்குள் இருக்கும் போது பொருந்தும்.' : 'Applies to all units when monthly load remains capped.'}
                                </p>
                            </div>
                            <div className="bg-darker border border-purple-500/40 p-4 rounded-xl space-y-1">
                                <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                                    {language === 'ta' ? 'பயன்பாடு > 100 யூனிட்கள் (நேரடிக் கட்டணம்)' : 'Usage > 100 Units (Punitive Flat)'}
                                </span>
                                <p className="text-2xl font-black font-mono text-purple-400">₹10.45 <span className="text-xs font-sans text-slate-400">{language === 'ta' ? '/ யூனிட்' : '/ unit'}</span></p>
                                <p className="text-[11px] text-slate-400">
                                    {language === 'ta' ? '100 யூனிட் தாண்டினால் முதல் யூனிட் முதல் அனைத்து யூனிட்களுக்கும் பொருந்தும்!' : 'Applies flat across ALL units from the first unit consumed!'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Itemized Commercial Table */}
                    <div className="bg-panel border border-panelBorder rounded-2xl overflow-hidden shadow-xl p-6">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
                            {language === 'ta' ? 'வணிகக் கட்டண விவர அட்டவணை' : 'Commercial Charges Schedule'}
                        </h3>
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs text-slate-400 border-b border-panelBorder uppercase tracking-wider">
                                    <th className="pb-3">{language === 'ta' ? 'கூறு / பிரிவு' : 'Component'}</th>
                                    <th className="pb-3 text-center">{language === 'ta' ? 'விதி / கட்டணம்' : 'Rule / Rate'}</th>
                                    <th className="pb-3 text-right">{language === 'ta' ? 'பொருந்தும் நிலை' : 'Applicability'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-panelBorder font-mono">
                                <tr>
                                    <td className="py-3 text-slate-200 font-sans">{language === 'ta' ? 'அடிப்படை மின் நுகர்வு' : 'Base Energy Consumption'}</td>
                                    <td className="py-3 text-center text-slate-300">{language === 'ta' ? '₹6.65 / யூனிட்' : '₹6.65 / unit'}</td>
                                    <td className="py-3 text-right text-emerald-400">{language === 'ta' ? '≤ 100 யூனிட்கள் நுகர்வில்' : 'Consuming ≤ 100 units'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-slate-200 font-sans">{language === 'ta' ? 'அதிகரித்த மின் நுகர்வு' : 'Escalated Energy Consumption'}</td>
                                    <td className="py-3 text-center text-purple-400 font-bold">{language === 'ta' ? '₹10.45 / யூனிட்' : '₹10.45 / unit'}</td>
                                    <td className="py-3 text-right text-purple-400">{language === 'ta' ? '> 100 யூனிட்கள் நுகர்வில் (நேரடி)' : 'Consuming > 100 units (Flat)'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-slate-200 font-sans">{language === 'ta' ? 'அங்கீகரிக்கப்பட்ட தேவைக் கட்டணம்' : 'Sanctioned Demand Charge'}</td>
                                    <td className="py-3 text-center text-slate-300">₹110.00 / kW</td>
                                    <td className="py-3 text-right text-slate-400">{language === 'ta' ? 'ஒரு kW-க்கு இருமாதக் கட்டணம்' : 'Bi-monthly per sanctioned kW'}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 text-slate-200 font-sans">{language === 'ta' ? 'மாநில மின்சார வரி' : 'State Electricity Tax'}</td>
                                    <td className="py-3 text-center text-amber-400 font-bold">5.0%</td>
                                    <td className="py-3 text-right text-amber-400">{language === 'ta' ? 'மொத்தக் கட்டணத்தில்' : 'On total subtotal'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: INDUSTRIAL LT-IIIB (FLAT RATE + DEMAND CHARGES) */}
            {activeTab === 'industrial' && (
                <div className="space-y-6">
                    {/* Industrial Banner */}
                    <div className="bg-amber-950/20 border border-amber-500/40 p-6 rounded-2xl shadow-xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-400">
                            <Factory size={20} />
                            <h2 className="text-base font-bold text-white uppercase tracking-wider">
                                {language === 'ta' ? 'TANGEDCO LT-IIIB தொழிற்துறை மின்வழங்கல்' : 'TANGEDCO LT-IIIB Low Tension Industrial Supply'}
                            </h2>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {language === 'ta'
                                ? 'உற்பத்தி ஆலைகள், சிறு மற்றும் நடுத்தர தொழில்கள் (MSME), பட்டறைகள், மற்றும் தொழிற்துறை மோட்டார் இணைப்புகளுக்கு LT-IIIB கட்டணம் பொருந்தும். ஒரு யூனிட்டுக்கு ₹7.65 நேரடிக் கட்டணம், இருமாத நிலைக்கட்டணம் ₹600/kW, மற்றும் 5% தமிழ்நாடு மின்சார வரி விதிக்கப்படுகிறது.'
                                : 'Standard TANGEDCO industrial tariff applicable to small/medium manufacturing units, fabrication workshops, rice mills, and cottage industries. Features a flat energy rate of ₹7.65/unit, a bi-monthly fixed demand charge of ₹600.00/kW, and 5% State Electricity Duty.'}
                        </p>
                    </div>

                    {/* Industrial Rate Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-panel border border-panelBorder p-5 rounded-2xl shadow-xl space-y-1">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                                {language === 'ta' ? 'நேரடி மின் கட்டணம்' : 'Flat Energy Rate'}
                            </span>
                            <p className="text-3xl font-black font-mono text-gold-400">₹7.65</p>
                            <p className="text-xs text-slate-400">
                                {language === 'ta' ? 'அனைத்து யூனிட்களுக்கும் ஒரு kWh-க்கு' : 'Per kWh consumed across all units'}
                            </p>
                        </div>
                        <div className="bg-panel border border-panelBorder p-5 rounded-2xl shadow-xl space-y-1">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                                {language === 'ta' ? 'தேவைக் கட்டணம்' : 'Demand Charges'}
                            </span>
                            <p className="text-3xl font-black font-mono text-white">₹600.00</p>
                            <p className="text-xs text-slate-400">
                                {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட kW திறனுக்கு இருமாதக் கட்டணம்' : 'Bi-monthly per sanctioned kW capacity'}
                            </p>
                        </div>
                        <div className="bg-panel border border-panelBorder p-5 rounded-2xl shadow-xl space-y-1">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                                {language === 'ta' ? 'தமிழ்நாடு மின்சார வரி' : 'TN Electricity Duty'}
                            </span>
                            <p className="text-3xl font-black font-mono text-amber-400">5.0%</p>
                            <p className="text-xs text-slate-400">
                                {language === 'ta' ? 'ஆற்றல் + தேவைக் கட்டணத்தின் மீது' : 'Levied on energy + fixed demand charges'}
                            </p>
                        </div>
                    </div>

                    {/* Industrial Bill Simulation Box */}
                    <div className="bg-panel border border-panelBorder rounded-2xl p-6 shadow-xl space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                            {language === 'ta' ? 'தொழிற்துறை மின்கட்டணக் கணக்கீட்டு மாதிரி (1,000 யூனிட்கள் @ 15 kW சுமை)' : 'Industrial Billing Formula & Example (1,000 Units @ 15 kW Load)'}
                        </h3>
                        <div className="p-4 bg-darker border border-panelBorder rounded-xl font-mono text-xs space-y-2">
                            <div className="flex justify-between text-slate-300">
                                <span>{language === 'ta' ? '1. மின் நுகர்வுக் கட்டணம் (1,000 யூனிட்கள் × ₹7.65):' : '1. Energy Charges (1,000 units × ₹7.65):'}</span>
                                <span className="text-white font-bold">₹7,650.00</span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <span>{language === 'ta' ? '2. நிலையான தேவைக் கட்டணம் (15 kW × ₹600.00):' : '2. Fixed Demand Charges (15 kW × ₹600.00):'}</span>
                                <span className="text-white font-bold">₹9,000.00</span>
                            </div>
                            <div className="flex justify-between text-slate-400 pt-2 border-t border-panelBorder">
                                <span>{language === 'ta' ? 'கூடுதல் தொகை (ஆற்றல் + தேவை):' : 'Subtotal (Energy + Demand):'}</span>
                                <span>₹16,650.00</span>
                            </div>
                            <div className="flex justify-between text-amber-400">
                                <span>{language === 'ta' ? '3. மாநில மின்சார வரி (5%):' : '3. State Electricity Duty (5%):'}</span>
                                <span>₹832.50</span>
                            </div>
                            <div className="flex justify-between text-base font-extrabold text-gold-400 pt-2 border-t border-panelBorder">
                                <span>{language === 'ta' ? 'மொத்த செலுத்த வேண்டிய தொகை (இருமாதம்):' : 'Total Payable (Bi-Monthly):'}</span>
                                <span>₹17,482.50</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}