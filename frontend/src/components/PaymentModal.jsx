import React, { useState } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
    CreditCard, 
    Zap, 
    CheckCircle2, 
    AlertTriangle, 
    ShieldCheck, 
    ExternalLink, 
    Copy, 
    Check, 
    X, 
    QrCode, 
    Building2,
    Lock,
    Receipt,
    Clock
} from 'lucide-react';

export default function PaymentModal({ bill, isOpen, onClose, onPaymentSuccess }) {
    const { t, language } = useLanguage();
    const [paymentMode, setPaymentMode] = useState('TANGEDCO_QUICKPAY'); // 'TANGEDCO_QUICKPAY' | 'UPI' | 'NETBANKING' | 'CARD'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [paymentResult, setPaymentResult] = useState(null);

    if (!isOpen || !bill) return null;

    const totalAmount = bill.totalAmount || 0;
    const fineAmount = bill.fineAmount || 0;
    const totalPayable = Number((totalAmount + fineAmount).toFixed(2));
    const serviceNumber = bill.serviceNumber || bill.consumer?.serviceNumber || '04-123-004567';
    const isOverdue = bill.status === 'OVERDUE' || (bill.fineImposed && fineAmount > 0);

    const handleCopyServiceNumber = () => {
        navigator.clipboard.writeText(serviceNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleProcessPayment = async () => {
        setLoading(true);
        setError('');
        try {
            const billId = bill._id || bill.id;
            const res = await api.post(`/bills/${billId}/pay`, {
                paymentMode: paymentMode,
                transactionRef: `TNEB-QPAY-${Date.now().toString().slice(-8)}`
            });

            if (res.data?.success) {
                setPaymentResult(res.data.data);
                if (onPaymentSuccess) {
                    onPaymentSuccess(res.data.data);
                }
            } else {
                setError(res.data?.message || 'Payment processing failed.');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError(err.response?.data?.message || 'An error occurred while processing the payment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-panel border border-panelBorder rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-200">
                
                {/* Modal Header */}
                <div className="p-5 bg-darker/90 border-b border-panelBorder flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-md">
                            <Zap size={22} />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                                <span>{language === 'ta' ? 'TANGEDCO நேரடி மின்கட்டண தளம்' : 'TANGEDCO Official Payment Portal'}</span>
                            </h2>
                            <p className="text-xs text-slate-400">
                                {language === 'ta' ? 'அரசு அங்கீகரிக்கப்பட்ட பாதுகாப்பான பணப்பரிவர்த்தனை' : 'Government Authorized E-Payment Gateway'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark transition cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    
                    {/* Success Screen */}
                    {paymentResult ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">
                                    {language === 'ta' ? 'மின்கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது!' : 'Payment Received Successfully!'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {language === 'ta' ? 'TANGEDCO அதிகாரப்பூர்வ ரசீது உருவாக்கப்பட்டுள்ளது.' : 'Official TANGEDCO E-Tax Receipt has been generated.'}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-dark border border-panelBorder text-left space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{language === 'ta' ? 'பரிவர்த்தனை எண் (Ref):' : 'Transaction Ref:'}</span>
                                    <span className="font-mono font-bold text-gold-400">{paymentResult.transactionRef}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{language === 'ta' ? 'செலுத்தப்பட்ட தொகை:' : 'Amount Paid:'}</span>
                                    <span className="font-bold text-emerald-400">₹{paymentResult.amountPaid?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{language === 'ta' ? 'கட்டண முறை:' : 'Payment Mode:'}</span>
                                    <span className="font-medium text-white">{paymentResult.paymentMode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">{language === 'ta' ? 'செலுத்தப்பட்ட நேரம்:' : 'Paid At:'}</span>
                                    <span className="text-slate-300">{new Date(paymentResult.paidAt).toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-sm uppercase tracking-wider transition cursor-pointer shadow-lg shadow-gold-500/10"
                            >
                                {language === 'ta' ? 'முடிந்தது' : 'Done & Close'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Official TANGEDCO Quick Pay Banner */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-dark to-darker border border-gold-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gold-400 uppercase tracking-wide">
                                        <Building2 size={14} />
                                        <span>{language === 'ta' ? 'TANGEDCO விரைவு கட்டண தளம் (Quick Pay)' : 'Official TANGEDCO Quick Pay'}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                        {language === 'ta' ? 'இணைப்பு எண்:' : 'Consumer Service No:'} <span className="font-mono font-bold text-white">{serviceNumber}</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={handleCopyServiceNumber}
                                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-dark hover:bg-panel border border-panelBorder text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        title="Copy Service Number"
                                    >
                                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                        <span>{copied ? (language === 'ta' ? 'நகலெடுக்கப்பட்டது' : 'Copied') : (language === 'ta' ? 'எண் நகல்' : 'Copy No')}</span>
                                    </button>

                                    <a
                                        href="https://www.tnebnet.org/awp/login"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-xs font-bold text-gold-300 flex items-center justify-center gap-1.5 transition"
                                    >
                                        <span>{language === 'ta' ? 'TNPDCL தளம்' : 'TNPDCL Portal'}</span>
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            </div>

                            {/* Overdue Warning Notice if applicable */}
                            {isOverdue && (
                                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                                    <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">
                                            {language === 'ta' ? 'நிலுவைத் தேதி கடந்துவிட்டது (Overdue Fine Applied)' : 'Statutory Due Date Exceeded'}
                                        </p>
                                        <p className="text-[11px] text-red-300/80 mt-0.5">
                                            {language === 'ta' 
                                                ? `கட்டணக் கடைசி நாள் கடந்துவிட்டதால் TANGEDCO விதிகளின்படி ₹${fineAmount} தாமத அபராதக் கட்டணம் சேர்க்கப்பட்டுள்ளது.`
                                                : `A late payment surcharge (LPSC) of ₹${fineAmount} has been imposed per TANGEDCO billing regulations.`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Bill Breakdown Summary Card */}
                            <div className="p-4 rounded-xl bg-dark/90 border border-panelBorder space-y-2.5 text-xs">
                                <div className="flex justify-between text-slate-400">
                                    <span>{language === 'ta' ? 'விலைப்பட்டியல் மாதம்:' : 'Billing Cycle / Month:'}</span>
                                    <span className="font-bold text-white">{bill.billingMonth}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>{language === 'ta' ? 'நுகர்வு யூனிட்கள்:' : 'Units Consumed:'}</span>
                                    <span className="font-mono text-white">{bill.unitsConsumed} kWh</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>{language === 'ta' ? 'அடிப்படை மின்கட்டணம்:' : 'Base Energy Charges:'}</span>
                                    <span className="text-white">₹{bill.energyCharge?.toLocaleString() || bill.totalAmount?.toLocaleString()}</span>
                                </div>
                                {bill.fixedCharge > 0 && (
                                    <div className="flex justify-between text-slate-400">
                                        <span>{language === 'ta' ? 'நிலைக்கட்டணம் (Demand):' : 'Fixed Demand Charge:'}</span>
                                        <span className="text-white">₹{bill.fixedCharge?.toLocaleString()}</span>
                                    </div>
                                )}
                                {fineAmount > 0 && (
                                    <div className="flex justify-between text-red-400 font-semibold pt-1 border-t border-panelBorder/40">
                                        <span>{language === 'ta' ? 'தாமத அபராதக் கட்டணம் (Fine):' : 'Late Payment Surcharge (Fine):'}</span>
                                        <span>+₹{fineAmount?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-panelBorder">
                                    <span>{language === 'ta' ? 'மொத்தம் செலுத்த வேண்டிய தொகை:' : 'Total Payable Amount:'}</span>
                                    <span className="text-gold-400 text-base">₹{totalPayable.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Select Payment Gateway Mode */}
                            <div>
                                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-2">
                                    {language === 'ta' ? 'கட்டண முறையைத் தேர்ந்தெடுக்கவும் (Payment Method)' : 'Select Payment Method'}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMode('TANGEDCO_QUICKPAY')}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                                            paymentMode === 'TANGEDCO_QUICKPAY'
                                                ? 'bg-gold-500/15 border-gold-500 text-gold-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Zap size={16} />
                                        <div className="leading-tight">
                                            <p className="text-xs font-bold">{language === 'ta' ? 'TANGEDCO குவிக் பே' : 'TNEB QuickPay'}</p>
                                            <p className="text-[9px] opacity-75">{language === 'ta' ? 'நேரடி முறை' : 'Direct Gateway'}</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMode('UPI')}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                                            paymentMode === 'UPI'
                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <QrCode size={16} />
                                        <div className="leading-tight">
                                            <p className="text-xs font-bold">UPI / GPay / PhonePe</p>
                                            <p className="text-[9px] opacity-75">{language === 'ta' ? 'QR குறியீடு' : 'Instant QR'}</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMode('NETBANKING')}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                                            paymentMode === 'NETBANKING'
                                                ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Building2 size={16} />
                                        <div className="leading-tight">
                                            <p className="text-xs font-bold">{language === 'ta' ? 'நெட் பேங்கிங்' : 'Net Banking'}</p>
                                            <p className="text-[9px] opacity-75">SBI / HDFC / Canara</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMode('CARD')}
                                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                                            paymentMode === 'CARD'
                                                ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <CreditCard size={16} />
                                        <div className="leading-tight">
                                            <p className="text-xs font-bold">{language === 'ta' ? 'டெபிட் / கிரெடிட் கார்டு' : 'Debit / Credit Card'}</p>
                                            <p className="text-[9px] opacity-75">RuPay / Visa / Master</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-xs">
                                    {error}
                                </div>
                            )}

                            {/* Pay Now Button */}
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleProcessPayment}
                                className="w-full py-3.5 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-darker font-black text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-gold-500/20"
                            >
                                <Lock size={16} />
                                <span>
                                    {loading 
                                        ? (language === 'ta' ? 'பரிவர்த்தனை செயலாக்கப்படுகிறது...' : 'Processing Payment...') 
                                        : `${language === 'ta' ? '₹' + totalPayable.toLocaleString() + ' இப்போது செலுத்துக' : 'Pay ₹' + totalPayable.toLocaleString() + ' Now'}`}
                                </span>
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                                <ShieldCheck size={12} className="text-emerald-400" />
                                <span>256-Bit Encrypted TANGEDCO Payment Gateway</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
