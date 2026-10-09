import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard,
    Zap,
    ExternalLink,
    Clock,
    CheckCircle2,
    ShieldAlert,
    Copy,
    Check,
    FileText,
    Calendar,
    AlertTriangle,
    ArrowRight,
    RefreshCw,
    Building2,
    Home,
    Factory,
    HelpCircle,
    Receipt
} from 'lucide-react';

const TANGEDCO_PAYMENT_URL = 'https://www.tnebnet.org/awp/login';

export default function Payment() {
    const { user } = useContext(AuthContext);
    const { language, t } = useLanguage();
    const navigate = useNavigate();

    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedField, setCopiedField] = useState(null);

    // Modal state for confirming payment reference after paying on TANGEDCO
    const [selectedBillForConfirmation, setSelectedBillForConfirmation] = useState(null);
    const [tnebTxnRef, setTnebTxnRef] = useState('');
    const [confirmingPayment, setConfirmingPayment] = useState(false);
    const [confirmationSuccess, setConfirmationSuccess] = useState('');
    const [confirmationError, setConfirmationError] = useState('');

    const fetchBills = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/bills/history');
            if (data.success) {
                setBills(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching bills for payment:', err);
            setError(language === 'ta' ? 'கட்டணத் தகவல்களைப் பெறுவதில் பிழை.' : 'Failed to fetch bills for payment.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    const copyToClipboard = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2500);
    };

    const handleRedirectToTangedco = (bill) => {
        // Direct redirection to official TANGEDCO / TNPDCL portal
        window.open(TANGEDCO_PAYMENT_URL, '_blank', 'noopener,noreferrer');
    };

    const handleConfirmPaymentSubmission = async (e) => {
        e.preventDefault();
        if (!selectedBillForConfirmation) return;

        setConfirmingPayment(true);
        setConfirmationError('');
        setConfirmationSuccess('');

        try {
            const { data } = await api.post(`/bills/${selectedBillForConfirmation._id}/pay`, {
                paymentMode: 'TANGEDCO_QUICKPAY',
                transactionRef: tnebTxnRef.trim() || `TNEB-${Date.now().toString().slice(-8)}`
            });

            if (data.success) {
                setConfirmationSuccess(
                    language === 'ta'
                        ? 'மின்கட்டணப் பதிவு வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது! ரசீது உருவாக்கப்பட்டது.'
                        : 'Payment reference recorded and invoice marked as PAID successfully!'
                );
                setTimeout(() => {
                    setSelectedBillForConfirmation(null);
                    setTnebTxnRef('');
                    setConfirmationSuccess('');
                    fetchBills();
                }, 2000);
            }
        } catch (err) {
            setConfirmationError(
                err.response?.data?.message ||
                (language === 'ta' ? 'கட்டணத்தை உறுதிப்படுத்துவதில் பிழை ஏற்பட்டது.' : 'Failed to submit payment confirmation.')
            );
        } finally {
            setConfirmingPayment(false);
        }
    };

    const now = new Date();
    const unpaidBills = bills.filter(b => b.status !== 'PAID');
    const paidBills = bills.filter(b => b.status === 'PAID');

    const totalUnpaidAmount = unpaidBills.reduce((acc, b) => {
        return acc + (b.totalAmount || 0) + (b.fineAmount || 0);
    }, 0);

    return (
        <div className="space-y-8 w-full">
            
            {/* Header */}
            <div className="border-b border-panelBorder pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <CreditCard className="text-gold-500" size={30} />
                        <span>
                            {language === 'ta' ? 'மின்கட்டணம் ' : 'TANGEDCO '}
                            <span className="text-gold-500">{language === 'ta' ? 'செலுத்துதல் (Quick Pay)' : 'Bill Settlement & Quick Pay'}</span>
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {language === 'ta'
                            ? 'அதிகாரப்பூர்வ தமிழ்நாடு மின்சார வாரிய (TANGEDCO / TNPDCL) இணையதளத்திற்கு நேரடியாகச் சென்று உங்கள் மின்கட்டணத்தை பாதுகாப்பாகச் செலுத்தலாம்.'
                            : 'Direct payment redirection to the official Tamil Nadu Power Distribution Corporation Limited (TNPDCL / TANGEDCO) Quick Pay portal.'}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={fetchBills}
                    className="p-2.5 rounded-xl bg-dark hover:bg-panel border border-panelBorder text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin text-gold-400' : ''} />
                    <span>{language === 'ta' ? 'புதுப்பிக்க' : 'Refresh'}</span>
                </button>
            </div>

            {/* Consumer Identity & Direct Redirection Notice */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Account Details Card with 1-Click Copy */}
                <div className="bg-panel border border-panelBorder p-6 rounded-2xl shadow-xl space-y-4 lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-bold">
                            {language === 'ta' ? 'நுகர்வோர் இணைப்பு விவரங்கள்' : 'Consumer Connection Profile'}
                        </span>
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-gold-500/15 text-gold-400 border border-gold-500/30">
                            {user?.connectionType || 'LT-1A_DOMESTIC'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="p-3 bg-darker rounded-xl border border-panelBorder">
                            <span className="text-slate-400 text-[11px] block font-sans">
                                {language === 'ta' ? 'நுகர்வோர் பெயர்:' : 'Consumer Name:'}
                            </span>
                            <span className="text-white font-bold text-sm font-sans block mt-0.5">{user?.name || 'Consumer'}</span>
                        </div>

                        <div className="p-3 bg-darker rounded-xl border border-gold-500/30 flex items-center justify-between">
                            <div>
                                <span className="text-gold-400 text-[11px] block font-sans font-bold">
                                    {language === 'ta' ? 'மின் இணைப்பு / சேவை எண்:' : 'Consumer Service Number:'}
                                </span>
                                <span className="text-white font-black text-sm block mt-0.5">{user?.consumerNumber || '04-123-456-789'}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(user?.consumerNumber || '04-123-456-789', 'consumerNumber')}
                                className="p-2 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 transition cursor-pointer flex items-center gap-1 text-[10px] font-sans font-bold"
                                title="Copy Service Number"
                            >
                                {copiedField === 'consumerNumber' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                <span>{copiedField === 'consumerNumber' ? (language === 'ta' ? 'நகலெடுக்கப்பட்டது' : 'Copied') : (language === 'ta' ? 'நகலெடு' : 'Copy')}</span>
                            </button>
                        </div>

                        <div className="p-3 bg-darker rounded-xl border border-panelBorder">
                            <span className="text-slate-400 text-[11px] block font-sans">
                                {language === 'ta' ? 'மின் மாவட்டம் / வட்டம்:' : 'District / Region:'}
                            </span>
                            <span className="text-white font-bold text-sm font-sans block mt-0.5">{user?.district || 'Chennai'}</span>
                        </div>

                        <div className="p-3 bg-darker rounded-xl border border-panelBorder">
                            <span className="text-slate-400 text-[11px] block font-sans">
                                {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட சுமை:' : 'Sanctioned Load:'}
                            </span>
                            <span className="text-white font-bold text-sm block mt-0.5">2.0 kW (Single Phase)</span>
                        </div>
                    </div>
                </div>

                {/* Direct Redirection Policy Card */}
                <div className="bg-panel border border-emerald-500/30 p-6 rounded-2xl shadow-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <ShieldAlert size={20} />
                            <h3 className="font-extrabold text-sm uppercase tracking-wide text-white">
                                {language === 'ta' ? 'அதிகாரப்பூர்வ நேரடி தளம்' : 'Official Portal Gateway'}
                            </h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {language === 'ta'
                                ? 'எங்கள் மென்பொருளில் போலியான உள் கட்டண அமைப்புகள் (UPI / Netbanking) கிடையாது. உங்கள் இணைப்பு எண்ணை நகலெடுத்து, அதிகாரப்பூர்வ TANGEDCO இணையதளத்தில் நேரடியாக பணம் செலுத்தலாம்.'
                                : 'No mock internal payment forms. Your transaction takes place directly on the official TANGEDCO / TNPDCL Quick Pay portal with zero intermediaries.'}
                        </p>
                    </div>

                    <a
                        href={TANGEDCO_PAYMENT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-darker font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                        <span>{language === 'ta' ? 'TANGEDCO தளத்திற்குச் செல்க' : 'Open TANGEDCO Portal'}</span>
                        <ExternalLink size={15} />
                    </a>
                </div>
            </div>

            {/* Total Outstanding Banner if unpaid bills exist */}
            {unpaidBills.length > 0 && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-panel to-darker border border-amber-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                            <Clock size={24} />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                                {language === 'ta' ? 'செலுத்த வேண்டிய மொத்த நிலுவைத் தொகை' : 'Total Pending Dues Payable'}
                            </span>
                            <h2 className="text-3xl font-black text-white font-mono mt-0.5">
                                ₹{totalUnpaidAmount.toLocaleString()}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href={TANGEDCO_PAYMENT_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-3 px-6 bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-gold-500/20 flex items-center gap-2"
                        >
                            <Zap size={16} className="fill-darker" />
                            <span>{language === 'ta' ? 'TANGEDCO Quick Pay மூலம் செலுத்துக' : 'Pay All via TANGEDCO'}</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            )}

            {/* =========================================================================
               SECTION 1: UNPAID & OVERDUE BILLS (ACTION REQUIRED)
               ========================================================================= */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-white flex items-center gap-2.5">
                        <Receipt size={20} className="text-amber-400" />
                        <span>{language === 'ta' ? 'செலுத்தப்படாத மின்கட்டணங்கள்' : 'Unpaid & Due Invoices'}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {unpaidBills.length}
                        </span>
                    </h2>
                </div>

                {loading ? (
                    <div className="p-12 text-center bg-panel border border-panelBorder rounded-2xl text-slate-400">
                        <RefreshCw size={24} className="animate-spin text-gold-500 mx-auto mb-3" />
                        <p>{language === 'ta' ? 'கட்டண விவரங்கள் ஏற்றப்படுகின்றன...' : 'Loading pending invoices...'}</p>
                    </div>
                ) : unpaidBills.length === 0 ? (
                    <div className="p-8 text-center bg-panel border border-emerald-500/30 rounded-2xl shadow-xl space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 size={28} />
                        </div>
                        <h3 className="text-lg font-black text-white">
                            {language === 'ta' ? 'நிலுவைக் கட்டணங்கள் ஏதுமில்லை!' : 'No Pending Invoices! All Bills Cleared'}
                        </h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                            {language === 'ta'
                                ? 'உங்கள் மின் கணக்கில் செலுத்தப்பட வேண்டிய நிலுவைகள் எதுவும் இல்லை. புதிய பில் உருவானதும் இங்கு தோன்றும்.'
                                : 'You have no outstanding payments. Official bills will appear here when generated via the official meter reading engine.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {unpaidBills.map((bill) => {
                            const dueDateObj = new Date(bill.dueDate);
                            const createdDateObj = new Date(bill.createdAt || bill.generatedAt || Date.now());
                            const diffDays = Math.ceil((dueDateObj - now) / (1000 * 60 * 60 * 24));
                            const isOverdue = diffDays < 0;
                            const isNearingDue = diffDays >= 0 && diffDays <= 3;
                            const totalWithFine = Number(((bill.totalAmount || 0) + (bill.fineAmount || 0)).toFixed(2));

                            return (
                                <div
                                    key={bill._id}
                                    className={`bg-panel rounded-2xl p-6 border shadow-xl transition space-y-5 ${
                                        isOverdue
                                            ? 'border-rose-500/50 ring-1 ring-rose-500/30'
                                            : isNearingDue
                                                ? 'border-amber-500/50 ring-1 ring-amber-500/30'
                                                : 'border-panelBorder'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-panelBorder pb-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                isOverdue ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {isOverdue ? <ShieldAlert size={20} /> : <Clock size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-black text-white">{bill.billingMonth}</h3>
                                                    <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border ${
                                                        isOverdue
                                                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                                            : isNearingDue
                                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                                                : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                                                    }`}>
                                                        {isOverdue
                                                            ? (language === 'ta' ? `தாமதம் (+${Math.abs(diffDays)} நாட்கள்)` : `OVERDUE (+${Math.abs(diffDays)}d)`)
                                                            : isNearingDue
                                                                ? (language === 'ta' ? `கடைசி நாள் நெருங்குகிறது (${diffDays} நாட்கள்)` : `DUE IN ${diffDays} DAYS`)
                                                                : (language === 'ta' ? `${diffDays} நாட்கள் உள்ளன` : `${diffDays} DAYS LEFT`)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                                                    <span>
                                                        {language === 'ta' ? 'உருவாக்கப்பட்ட தேதி: ' : 'Generated on: '}
                                                        <strong className="text-slate-300">{createdDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {language === 'ta' ? 'சட்டப்பூர்வ கடைசி நாள் (15 நாட்கள்): ' : 'Statutory Due Date (15 Days): '}
                                                        <strong className="text-amber-300">{dueDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-left sm:text-right">
                                            <span className="text-xs text-slate-400 block">{language === 'ta' ? 'செலுத்த வேண்டிய தொகை' : 'Net Total Payable'}</span>
                                            <p className="text-2xl font-black text-gold-400 font-mono">₹{totalWithFine.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Breakdown Items */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-darker p-4 rounded-xl border border-panelBorder font-mono">
                                        <div>
                                            <span className="text-slate-500 block font-sans">{language === 'ta' ? 'நுகர்வு யூனிட்கள்:' : 'Units Consumed:'}</span>
                                            <span className="font-bold text-white text-sm">{bill.unitsConsumed} kWh</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block font-sans">{language === 'ta' ? 'ஆற்றல் கட்டணம்:' : 'Energy Charge:'}</span>
                                            <span className="font-bold text-slate-200 text-sm">₹{bill.energyCharge?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block font-sans">{language === 'ta' ? 'நிலைக்கட்டணம்:' : 'Fixed Demand:'}</span>
                                            <span className="font-bold text-slate-200 text-sm">₹{bill.fixedCharge?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block font-sans">{language === 'ta' ? 'மின்சார வரி (5%):' : 'Duty (5%):'}</span>
                                            <span className="font-bold text-slate-200 text-sm">₹{bill.electricityTax?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block font-sans">{language === 'ta' ? 'தாமத அபராதம்:' : 'Fine / LPSC:'}</span>
                                            <span className={`font-bold text-sm ${bill.fineAmount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                ₹{bill.fineAmount?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Row */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <HelpCircle size={14} className="text-gold-500 shrink-0" />
                                            <span>
                                                {language === 'ta'
                                                    ? 'TANGEDCO தளத்தில் கட்டிய பின் கீழே உள்ள உறுதிப்படுத்தல் பொத்தானை அழுத்தவும்.'
                                                    : 'After settling on TANGEDCO portal, click below to record your payment reference.'}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                            {/* Primary Redirection Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleRedirectToTangedco(bill)}
                                                className="flex-1 sm:flex-initial py-2.5 px-5 bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2"
                                            >
                                                <Zap size={15} className="fill-darker" />
                                                <span>{language === 'ta' ? 'TANGEDCO தளத்தில் செலுத்துக' : 'Pay via TANGEDCO'}</span>
                                                <ExternalLink size={13} />
                                            </button>

                                            {/* Post-Payment Submission Button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedBillForConfirmation(bill);
                                                    setTnebTxnRef('');
                                                    setConfirmationError('');
                                                    setConfirmationSuccess('');
                                                }}
                                                className="flex-1 sm:flex-initial py-2.5 px-4 bg-dark hover:bg-darker border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>{language === 'ta' ? 'செலுத்தியதை உறுதிப்படுத்துக' : 'Confirm Payment Reference'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* =========================================================================
               SECTION 2: PAID BILLS / E-RECEIPTS
               ========================================================================= */}
            {paidBills.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-panelBorder">
                    <h2 className="text-lg font-black text-white flex items-center gap-2.5">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                        <span>{language === 'ta' ? 'செலுத்தப்பட்ட கட்டண ரசீதுகள்' : 'Settled Invoices & E-Receipts'}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {paidBills.length}
                        </span>
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paidBills.slice(0, 6).map((pb) => (
                            <div key={pb._id} className="bg-panel border border-panelBorder rounded-2xl p-5 shadow-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-extrabold text-white text-sm">{pb.billingMonth}</h4>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                        PAID
                                    </span>
                                </div>

                                <div className="space-y-1 text-xs text-slate-400 font-mono">
                                    <div className="flex justify-between">
                                        <span className="font-sans">{language === 'ta' ? 'செலுத்தப்பட்ட தொகை:' : 'Paid Amount:'}</span>
                                        <span className="font-bold text-white font-mono">₹{pb.totalAmount?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-sans">{language === 'ta' ? 'செலுத்தப்பட்ட நாள்:' : 'Paid On:'}</span>
                                        <span className="text-slate-300">{pb.paidAt ? new Date(pb.paidAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-sans">{language === 'ta' ? 'ரசீது எண்:' : 'Reference:'}</span>
                                        <span className="text-gold-400 font-bold">{pb.transactionRef || 'TNEB-QPAY'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* =========================================================================
               MODAL: CONFIRM TANGEDCO PAYMENT SUBMISSION
               ========================================================================= */}
            {selectedBillForConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-panel border border-emerald-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
                        <div className="flex items-center justify-between border-b border-panelBorder pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-base">
                                        {language === 'ta' ? 'TANGEDCO கட்டண உறுதிப்படுத்தல்' : 'Submit TANGEDCO Payment Reference'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {selectedBillForConfirmation.billingMonth} — ₹{selectedBillForConfirmation.totalAmount?.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedBillForConfirmation(null)}
                                className="text-slate-500 hover:text-white text-lg font-bold p-1 cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleConfirmPaymentSubmission} className="space-y-4">
                            <div className="p-3.5 bg-darker rounded-xl border border-panelBorder text-xs text-slate-300 leading-relaxed">
                                <p>
                                    {language === 'ta'
                                        ? 'TANGEDCO இணையதளத்தில் நீங்கள் கட்டணம் செலுத்திய பிறகு கிடைத்த பரிவர்த்தனை எண் / ரசீது எண்ணை (Transaction / Receipt Ref No.) கீழே உள்ளிட்டு சேமிக்கவும். இது உங்கள் மின்கட்டண நிலையை உடனே புதுப்பிக்கும்.'
                                        : 'Enter the Transaction Reference Number or Receipt ID generated on the official TANGEDCO portal to update your ledger status.'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-400 mb-2">
                                    {language === 'ta' ? 'TANGEDCO பரிவர்த்தனை / ரசீது எண் (Transaction Ref ID)' : 'TANGEDCO Transaction Reference / Receipt Ref'}
                                </label>
                                <input
                                    type="text"
                                    value={tnebTxnRef}
                                    onChange={(e) => setTnebTxnRef(e.target.value)}
                                    placeholder="e.g. TNEB-2026-89472910"
                                    className="w-full bg-darker border border-panelBorder rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-emerald-500"
                                    required
                                />
                            </div>

                            {confirmationError && (
                                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                                    {confirmationError}
                                </div>
                            )}

                            {confirmationSuccess && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-bold">
                                    {confirmationSuccess}
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedBillForConfirmation(null)}
                                    className="flex-1 py-3 bg-dark hover:bg-darker border border-panelBorder text-slate-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                                >
                                    {language === 'ta' ? 'ரத்து செய்க' : 'Cancel'}
                                </button>

                                <button
                                    type="submit"
                                    disabled={confirmingPayment}
                                    className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-darker font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                >
                                    {confirmingPayment ? (
                                        <RefreshCw size={15} className="animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={15} />
                                    )}
                                    <span>
                                        {confirmingPayment
                                            ? (language === 'ta' ? 'பதிவாகிறது...' : 'Submitting...')
                                            : (language === 'ta' ? 'உறுதிப்படுத்தி சேமிக்க' : 'Confirm & Mark as Paid')}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
