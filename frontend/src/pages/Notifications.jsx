import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import PaymentModal from '../components/PaymentModal';
import { 
    Bell, 
    CheckCircle2, 
    AlertTriangle, 
    ShieldAlert, 
    Receipt, 
    Clock, 
    CreditCard, 
    ExternalLink, 
    CheckCheck, 
    RefreshCw, 
    Filter, 
    Info, 
    Trash2,
    Calendar,
    ChevronRight,
    MapPin,
    Building2,
    FileText
} from 'lucide-react';

export default function Notifications() {
    const { user } = useContext(AuthContext);
    const { t, language } = useLanguage();

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'DUE_DATE' | 'FINES' | 'INVOICES' | 'PAYMENTS'
    const [selectedPayBill, setSelectedPayBill] = useState(null);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4000);
    };

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alerts');
            if (res.data?.success) {
                const fetched = res.data.data || [];
                setAlerts(fetched);
                const unread = fetched.filter(a => !a.isResolved).length;
                window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: unread } }));
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e?.stopPropagation();
        try {
            const res = await api.put(`/alerts/${id}/resolve`);
            if (res.data?.success) {
                setAlerts(prev => {
                    const updated = prev.map(a => a._id === id ? { ...a, isResolved: true } : a);
                    const unread = updated.filter(a => !a.isResolved).length;
                    window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: unread } }));
                    return updated;
                });
                showToast(language === 'ta' ? 'அறிவிப்பு வாசிக்கப்பட்டதாக குறிக்கப்பட்டது.' : 'Alert marked as read.');
            }
        } catch (err) {
            console.error('Error resolving alert:', err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const res = await api.put('/alerts/mark-all-read');
            if (res.data?.success) {
                setAlerts(prev => prev.map(a => ({ ...a, isResolved: true })));
                window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: 0 } }));
                showToast(language === 'ta' ? 'அனைத்து அறிவிப்புகளும் வாசிக்கப்பட்டன.' : 'All alerts marked as read.');
            }
        } catch (err) {
            console.error('Error marking all read:', err);
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        if (selectedCategory === 'DUE_DATE') return alert.type === 'DUE_DATE_NEAR';
        if (selectedCategory === 'FINES') return alert.type === 'FINE_IMPOSED' || alert.type === 'BILL_OVERDUE';
        if (selectedCategory === 'INVOICES') return alert.type === 'INVOICE_GENERATED';
        if (selectedCategory === 'PAYMENTS') return alert.type === 'PAYMENT_SUCCESS';
        return true;
    });

    const unreadCount = alerts.filter(a => !a.isResolved).length;

    const getAlertIcon = (type) => {
        switch (type) {
            case 'DUE_DATE_NEAR':
                return <Clock className="text-amber-400 shrink-0" size={22} />;
            case 'FINE_IMPOSED':
            case 'BILL_OVERDUE':
                return <ShieldAlert className="text-red-400 shrink-0" size={22} />;
            case 'PAYMENT_SUCCESS':
                return <CheckCircle2 className="text-emerald-400 shrink-0" size={22} />;
            case 'INVOICE_GENERATED':
                return <Receipt className="text-blue-400 shrink-0" size={22} />;
            default:
                return <Bell className="text-gold-400 shrink-0" size={22} />;
        }
    };

    const getAlertBadge = (type, severity, lang) => {
        if (type === 'DUE_DATE_NEAR') {
            return (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {lang === 'ta' ? 'கடைசி நாள் எச்சரிக்கை (≤ 3 நாட்கள்)' : 'DUE DATE NEARING (≤ 3 DAYS)'}
                </span>
            );
        }
        if (type === 'FINE_IMPOSED' || type === 'BILL_OVERDUE') {
            return (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                    {lang === 'ta' ? 'அபராதம் விதிக்கப்பட்டது' : 'FINE IMPOSED (OVERDUE)'}
                </span>
            );
        }
        if (type === 'PAYMENT_SUCCESS') {
            return (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {lang === 'ta' ? 'கட்டணம் செலுத்தப்பட்டது' : 'E-RECEIPT ISSUED'}
                </span>
            );
        }
        if (type === 'INVOICE_GENERATED') {
            return (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    {lang === 'ta' ? 'விலைப்பட்டியல் (15 நாட்கள் அவகாசம்)' : 'OFFICIAL INVOICE (15 DAYS DUE)'}
                </span>
            );
        }
        return (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/30">
                {severity || 'NOTIFICATION'}
            </span>
        );
    };

    return (
        <div className="space-y-6 pb-12">
            
            {/* Toast Message */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 bg-panel border border-gold-500/40 text-gold-400 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fadeIn">
                    <CheckCircle2 size={18} className="text-gold-500 shrink-0" />
                    <span className="text-sm font-semibold">{toastMessage}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-panelBorder">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Bell className="text-gold-500" size={30} />
                        <span>{language === 'ta' ? 'அறிவிப்புகள் & நினைவூட்டல் மையம்' : 'Notifications & Alert Center'}</span>
                        {unreadCount > 0 && (
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-red-500 text-white animate-pulse">
                                {unreadCount} {language === 'ta' ? 'புதியவை' : 'New'}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        {language === 'ta' 
                            ? 'கட்டணக் கடைசி நாள் நினைவூட்டல்கள், அபராத எச்சரிக்கைகள் மற்றும் அதிகாரப்பூர்வ விலைப்பட்டியல் அறிவிப்புகள்.' 
                            : 'Real-time billing deadline alerts, late fee surcharge notices, and official TANGEDCO receipts.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 rounded-xl bg-panel hover:bg-dark border border-panelBorder hover:border-gold-500/40 text-slate-300 hover:text-gold-400 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
                        >
                            <CheckCheck size={16} className="text-emerald-400" />
                            <span>{language === 'ta' ? 'அனைத்தையும் வாசித்ததாக குறிக்கவும்' : 'Mark All as Read'}</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={fetchAlerts}
                        className="p-2.5 rounded-xl bg-panel hover:bg-dark border border-panelBorder text-slate-400 hover:text-white transition cursor-pointer"
                        title="Refresh notifications"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-gold-400' : ''} />
                    </button>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'ALL', label: language === 'ta' ? 'அனைத்து அறிவிப்புகள்' : 'All Notifications', count: alerts.length },
                    { id: 'DUE_DATE', label: language === 'ta' ? '⏳ கடைசி நாள் நினைவூட்டல் (≤ 3 நாட்கள்)' : '⏳ Due Date Reminders (≤ 3 Days)', count: alerts.filter(a => a.type === 'DUE_DATE_NEAR').length },
                    { id: 'FINES', label: language === 'ta' ? '🔴 அபராத எச்சரிக்கைகள்' : '🔴 Fines & Overdue', count: alerts.filter(a => a.type === 'FINE_IMPOSED' || a.type === 'BILL_OVERDUE').length },
                    { id: 'INVOICES', label: language === 'ta' ? '📄 புதிய விலைப்பட்டியல்கள்' : '📄 Invoices Generated', count: alerts.filter(a => a.type === 'INVOICE_GENERATED').length },
                    { id: 'PAYMENTS', label: language === 'ta' ? '🟢 ரசீதுகள் & செலுத்தியவை' : '🟢 Payment Receipts', count: alerts.filter(a => a.type === 'PAYMENT_SUCCESS').length }
                ].map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                            selectedCategory === cat.id
                                ? 'bg-gold-500 text-darker shadow-md'
                                : 'bg-panel border border-panelBorder text-slate-400 hover:text-white hover:border-gold-500/30'
                        }`}
                    >
                        <span>{cat.label}</span>
                        {cat.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                selectedCategory === cat.id ? 'bg-darker text-gold-400' : 'bg-dark text-slate-400'
                            }`}>
                                {cat.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notifications Feed */}
            {loading && alerts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-panel border border-panelBorder rounded-2xl">
                    <RefreshCw size={24} className="animate-spin text-gold-400 mx-auto mb-3" />
                    <p className="text-sm">{language === 'ta' ? 'அறிவிப்புகள் ஏற்றப்படுகின்றன...' : 'Loading notification stream...'}</p>
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-panel border border-panelBorder rounded-2xl space-y-3">
                    <div className="w-16 h-16 rounded-full bg-darker border border-panelBorder flex items-center justify-center mx-auto text-slate-500">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-base font-bold text-white">
                        {language === 'ta' ? 'அறிவிப்புகள் எதுவும் இல்லை' : 'All Clear! No Active Notifications'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {language === 'ta' 
                            ? 'மின்கட்டணக் கடைசி நாள் நெருங்கும் போதோ அல்லது அபராத அறிவிப்புகள் வரும் போதோ இங்கே உடனடியாகக் காண்பிக்கப்படும்.' 
                            : 'Upcoming due dates, fine notices, and electricity payment receipts will automatically appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAlerts.map(alert => {
                        const isNearing = alert.type === 'DUE_DATE_NEAR';
                        const isFine = alert.type === 'FINE_IMPOSED' || alert.type === 'BILL_OVERDUE';
                        const isPayment = alert.type === 'PAYMENT_SUCCESS';
                        const isInvoice = alert.type === 'INVOICE_GENERATED';

                        const titleText = (language === 'ta' && alert.titleTa) ? alert.titleTa : (alert.title || 'TANGEDCO Notification');
                        const msgText = (language === 'ta' && alert.messageTa) ? alert.messageTa : alert.message;

                        return (
                            <div 
                                key={alert._id} 
                                className={`p-5 rounded-2xl border transition shadow-lg ${
                                    !alert.isResolved 
                                        ? isFine 
                                            ? 'bg-red-950/20 border-red-500/40' 
                                            : isNearing 
                                                ? 'bg-amber-950/20 border-amber-500/40' 
                                                : isPayment 
                                                    ? 'bg-emerald-950/20 border-emerald-500/40' 
                                                    : 'bg-panel border-gold-500/40 ring-1 ring-gold-500/20'
                                        : 'bg-panel border-panelBorder opacity-75 hover:opacity-100'
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    
                                    {/* Left: Icon & Alert Message */}
                                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                        <div className="p-2.5 rounded-xl bg-dark border border-panelBorder mt-0.5">
                                            {getAlertIcon(alert.type)}
                                        </div>

                                        <div className="space-y-2 flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {getAlertBadge(alert.type, alert.severity, language)}
                                                {!alert.isResolved && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                                )}
                                                <span className="text-[11px] text-slate-500 font-mono">
                                                    {new Date(alert.createdAt).toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-white leading-snug">
                                                {titleText}
                                            </h3>

                                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                                {msgText}
                                            </p>

                                            {/* Actionable Attached Bill Card */}
                                            {alert.bill && (
                                                <div className="mt-3 p-3.5 rounded-xl bg-dark/90 border border-panelBorder flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-white flex items-center gap-2">
                                                            <span>{alert.bill.billingMonth || 'October 2026'}</span>
                                                            <span className="font-mono text-gold-400 font-black">
                                                                ₹{(alert.bill.status !== 'PAID' && alert.bill.fineImposed ? (alert.bill.totalAmount + (alert.bill.fineAmount || 0)) : alert.bill.totalAmount).toLocaleString()}
                                                            </span>
                                                            {alert.bill.status === 'PAID' && (
                                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                    {language === 'ta' ? 'செலுத்தப்பட்டது' : 'PAID'}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {language === 'ta' ? 'கடைசி நாள்:' : 'Due Date:'} <span className="font-mono text-amber-400 font-bold">{new Date(alert.bill.dueDate).toLocaleDateString()}</span>
                                                            {alert.bill.status !== 'PAID' && alert.bill.fineImposed && alert.bill.fineAmount > 0 && (
                                                                <span className="text-red-400 font-bold ml-2">
                                                                    ({language === 'ta' ? `அபராதம்: ₹${alert.bill.fineAmount}` : `Fine: ₹${alert.bill.fineAmount}`})
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    {alert.bill.status !== 'PAID' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedPayBill(alert.bill)}
                                                            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-gold-500/10"
                                                        >
                                                            <CreditCard size={14} />
                                                            <span>{language === 'ta' ? 'உடனே கட்டணம் செலுத்து' : 'Pay Bill Now'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Dismiss / Mark Read button */}
                                    <div className="flex items-center gap-2 sm:self-start">
                                        {!alert.isResolved ? (
                                            <button
                                                type="button"
                                                onClick={(e) => handleMarkAsRead(alert._id, e)}
                                                className="px-3 py-1.5 rounded-lg bg-dark hover:bg-panel border border-panelBorder text-xs text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                                                title="Mark as read"
                                            >
                                                <CheckCheck size={14} className="text-emerald-400" />
                                                <span>{language === 'ta' ? 'வாசிக்கப்பட்டது' : 'Mark Read'}</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-slate-500 font-mono italic">
                                                {language === 'ta' ? 'வாசிக்கப்பட்டது' : 'Read'}
                                            </span>
                                        )}
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Quick Pay Modal Integration */}
            {selectedPayBill && (
                <PaymentModal
                    bill={selectedPayBill}
                    isOpen={!!selectedPayBill}
                    onClose={() => setSelectedPayBill(null)}
                    onPaymentSuccess={() => {
                        setSelectedPayBill(null);
                        showToast(language === 'ta' ? 'மின்கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது!' : 'Payment received successfully!');
                        fetchAlerts();
                    }}
                />
            )}

        </div>
    );
}
