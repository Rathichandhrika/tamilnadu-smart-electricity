import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, History, Receipt, FileText, CheckCircle2, AlertCircle, CreditCard, Zap, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';

const MONTHS_TA = {
    'January': 'ஜனவரி', 'February': 'பிப்ரவரி', 'March': 'மார்ச்',
    'April': 'ஏப்ரல்', 'May': 'மே', 'June': 'ஜூன்',
    'July': 'ஜூலை', 'August': 'ஆகஸ்ட்', 'September': 'செப்டம்பர்',
    'October': 'அக்டோபர்', 'November': 'நவம்பர்', 'December': 'டிசம்பர்'
};

const formatBillingMonth = (monthStr, lang) => {
    if (!monthStr) return '';
    if (lang !== 'ta') return monthStr;
    let result = monthStr;
    Object.entries(MONTHS_TA).forEach(([en, ta]) => {
        result = result.replace(new RegExp(`\\b${en}\\b`, 'gi'), ta);
    });
    return result;
};

const formatConnectionType = (type, lang) => {
    if (!type) return lang === 'ta' ? 'LT-1A வீட்டு உபயோகம்' : 'LT-1A_DOMESTIC';
    if (lang === 'ta') {
        if (type.includes('DOMESTIC') || type.includes('LT-1A')) return 'LT-1A வீட்டு உபயோகம்';
        if (type.includes('COMMERCIAL') || type.includes('LT-V') || type.includes('LT-5')) return 'LT-V வணிக உபயோகம்';
        if (type.includes('INDUSTRIAL') || type.includes('LT-IIIB') || type.includes('LT-3B')) return 'LT-IIIB தொழிற்துறை';
    }
    return type;
};

export default function BillHistory() {
    const { t, language } = useLanguage();
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadingLatest, setDownloadingLatest] = useState(false);
    const [downloadingHistory, setDownloadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [selectedPayBill, setSelectedPayBill] = useState(null);

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const { data } = await api.get('/bills/history');
                if (data.success) setBills(data.data);
            } catch (err) {
                setError(language === 'ta' ? 'விலைப்பட்டியல் வரலாற்றைப் பெற முடியவில்லை.' : 'Failed to retrieve historical invoices.');
            } finally {
                setLoading(false);
            }
        };
        fetchBills();
    }, [language]);

    const handleDownloadPDF = async (billId, month) => {
        setDownloadingId(billId);
        try {
            const response = await api.get(`/reports/invoice?billId=${billId}`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeMonth = (month || 'Bill').replace(/\s+/g, '_');
            link.setAttribute('download', `TNEB_Tax_Invoice_${safeMonth}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            setError(language === 'ta' ? 'அதிகாரப்பூர்வ வரி விலைப்பட்டியலை உருவாக்க முடியவில்லை.' : "Could not generate official PDF tax invoice.");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadLatest = async () => {
        setDownloadingLatest(true);
        setError('');
        try {
            const response = await api.get('/reports/invoice', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TNEB_Tax_Invoice_Latest.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download latest error:', error);
            setError(language === 'ta' ? 'பதிவிறக்கம் செய்ய விலைப்பட்டியல் கிடைக்கவில்லை.' : "No available invoice found to download.");
        } finally {
            setDownloadingLatest(false);
        }
    };

    const handleDownloadHistoryPDF = async () => {
        setDownloadingHistory(true);
        setError('');
        try {
            const response = await api.get('/reports/bill-history', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `TNEB_Bill_History_Statement.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download history statement error:', error);
            setError(language === 'ta' ? 'கட்டண வரலாற்று அறிக்கையை உருவாக்க முடியவில்லை.' : "Could not generate consolidated bill history statement PDF.");
        } finally {
            setDownloadingHistory(false);
        }
    };

    return (
        <div className="space-y-8 w-full">
            {/* Header with Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-panelBorder pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <History className="text-gold-500" size={30} />
                        <span>{language === 'ta' ? 'மின்கட்டண' : 'Billing'} <span className="text-gold-500">{language === 'ta' ? 'வரலாறு' : 'History'}</span></span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {language === 'ta' 
                            ? 'முந்தைய மின் கட்டண ரசீதுகள் மற்றும் பதிவிறக்கம் செய்யக்கூடிய TANGEDCO வரி விலைப்பட்டியல்கள்.' 
                            : 'Historical archived receipts and downloadable TANGEDCO PDF tax invoices.'}
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-nowrap shrink-0">
                    <button
                        onClick={handleDownloadHistoryPDF}
                        disabled={downloadingHistory || bills.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-200 hover:text-gold-400 font-bold text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                    >
                        {downloadingHistory ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                                {language === 'ta' ? 'அறிக்கை தயாராகிறது...' : 'Generating Statement...'}
                            </>
                        ) : (
                            <>
                                <Download size={15} />
                                {language === 'ta' ? 'கட்டண வரலாறு PDF' : 'Download History (PDF)'}
                            </>
                        )}
                    </button>

                    {bills.length > 0 && (
                        <button
                            onClick={handleDownloadLatest}
                            disabled={downloadingLatest}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-bold text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                        >
                            {downloadingLatest ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-darker border-t-transparent rounded-full animate-spin"></div>
                                    {language === 'ta' ? 'விலைப்பட்டியல் தயாராகிறது...' : 'Generating Invoice...'}
                                </>
                            ) : (
                                <>
                                    <FileText size={16} />
                                    {language === 'ta' ? 'சமீபத்திய விலைப்பட்டியல்' : 'Latest Invoice (PDF)'}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="bg-panel border border-panelBorder rounded-2xl overflow-hidden shadow-2xl">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse">
                        {language === 'ta' ? 'TANGEDCO கட்டணப் பதிவேடு பெறப்படுகிறது...' : 'Querying TANGEDCO billing ledger...'}
                    </div>
                ) : bills.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                        {language === 'ta' ? 'உங்கள் கணக்கில் இதுவரை கட்டண ரசீதுகள் எதுவும் சேமிக்கப்படவில்லை.' : 'No saved bills found on this consumer profile yet.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-panelBorder bg-darker/60 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="py-4 px-6">{language === 'ta' ? 'கட்டணச் சுழற்சி' : 'Billing Cycle'}</th>
                                    <th className="py-4 px-6">{language === 'ta' ? 'கட்டண வகை' : 'Tariff Type'}</th>
                                    <th className="py-4 px-6">{language === 'ta' ? 'யூனிட்கள்' : 'Units'}</th>
                                    <th className="py-4 px-6">{language === 'ta' ? 'மொத்தத் தொகை' : 'Total Amount'}</th>
                                    <th className="py-4 px-6">{language === 'ta' ? 'நிலை' : 'Status'}</th>
                                    <th className="py-4 px-6 text-right">{language === 'ta' ? 'அதிகாரப்பூர்வ ரசீது' : 'Official Invoice'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-panelBorder font-mono">
                                {bills.map(bill => (
                                    <tr key={bill._id} className="hover:bg-darker/30 transition">
                                        <td className="py-4 px-6 font-sans font-bold text-white">
                                            {formatBillingMonth(bill.billingMonth, language)}
                                        </td>
                                        <td className="py-4 px-6 font-sans">
                                            <span className="text-[11px] font-mono text-slate-300 bg-darker px-2 py-0.5 rounded border border-panelBorder">
                                                {formatConnectionType(bill.connectionType, language)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-300">{bill.unitsConsumed} kWh</td>
                                        <td className="py-4 px-6 font-mono font-bold text-white">
                                            ₹{(bill.totalAmount + (bill.fineAmount || 0)).toFixed(2)}
                                            {bill.fineAmount > 0 && (
                                                <span className="block text-[10px] text-red-400 font-normal">
                                                    (+₹{bill.fineAmount} {language === 'ta' ? 'அபராதம்' : 'Fine'})
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 font-sans">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                                bill.status === 'PAID' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                : bill.status === 'OVERDUE' || bill.fineAmount > 0
                                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {bill.status === 'PAID'
                                                    ? (language === 'ta' ? 'செலுத்தப்பட்டது' : 'PAID')
                                                    : bill.status === 'OVERDUE' || bill.fineAmount > 0
                                                    ? (language === 'ta' ? 'அபராதம் / நிலுவை' : 'OVERDUE')
                                                    : (language === 'ta' ? 'செலுத்தப்படவில்லை' : 'UNPAID')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {bill.status !== 'PAID' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPayBill(bill)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-darker text-xs font-sans font-extrabold uppercase tracking-wide transition cursor-pointer shadow-md shadow-gold-500/10"
                                                    >
                                                        <Zap size={13} className="fill-darker" />
                                                        <span>{language === 'ta' ? 'செலுத்துக' : 'Pay Bill'}</span>
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleDownloadPDF(bill._id, bill.billingMonth)}
                                                    disabled={downloadingId === bill._id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-300 hover:text-gold-400 text-xs font-sans font-semibold transition disabled:opacity-50 cursor-pointer"
                                                >
                                                    {downloadingId === bill._id ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                                                            Streaming...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download size={14} /> {language === 'ta' ? 'விலைப்பட்டியல்' : 'Tax Invoice'}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Official TANGEDCO Payment Gateway Modal */}
            <PaymentModal
                bill={selectedPayBill}
                isOpen={!!selectedPayBill}
                onClose={() => setSelectedPayBill(null)}
                onPaymentSuccess={(paidData) => {
                    setBills(prev => prev.map(b => {
                        if (b._id === paidData.billId) {
                            return { ...b, status: 'PAID', paidAt: paidData.paidAt, paymentMode: paidData.paymentMode };
                        }
                        return b;
                    }));
                }}
            />
        </div>
    );
}