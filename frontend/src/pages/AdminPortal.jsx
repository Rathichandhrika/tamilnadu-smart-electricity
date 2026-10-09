import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { 
    ShieldCheck, 
    Users, 
    FileText, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Search, 
    Zap, 
    Building2, 
    ExternalLink, 
    X,
    Filter,
    ArrowUpDown,
    CreditCard,
    Coins,
    AlertTriangle,
    MapPin,
    Sparkles,
    BrainCircuit,
    Receipt,
    Send,
    Bell,
    DollarSign,
    RefreshCw,
    ShieldAlert,
    ChevronRight,
    Activity,
    Gauge,
    Sun,
    Wind,
    Flame,
    BarChart3,
    TrendingUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import AdminAiAssistant from '../components/AdminAiAssistant';

const TN_DISTRICTS_MAP_TA = {
    'Ariyalur': 'அரியலூர்',
    'Chengalpattu': 'செங்கல்பட்டு',
    'Chennai': 'சென்னை',
    'Coimbatore': 'கோயம்புத்தூர்',
    'Cuddalore': 'கடலூர்',
    'Dharmapuri': 'தருமபுரி',
    'Dindigul': 'திண்டுக்கல்',
    'Erode': 'ஈரோடு',
    'Kallakurichi': 'கள்ளக்குறிச்சி',
    'Kanchipuram': 'காஞ்சிபுரம்',
    'Kanyakumari': 'கன்னியாகுமரி',
    'Karur': 'கரூர்',
    'Krishnagiri': 'கிருஷ்ணகிரி',
    'Madurai': 'மதுரை',
    'Mayiladuthurai': 'மயிலாடுதுறை',
    'Nagapattinam': 'நாகப்பட்டினம்',
    'Namakkal': 'நாமக்கல்',
    'Nilgiris': 'நீலகிரி',
    'Perambalur': 'பெரம்பலூர்',
    'Pudukkottai': 'புதுக்கோட்டை',
    'Ramanathapuram': 'இராமநாதபுரம்',
    'Ranipet': 'ராணிப்பேட்டை',
    'Salem': 'சேலம்',
    'Sivaganga': 'சிவகங்கை',
    'Tenkasi': 'தென்காசி',
    'Thanjavur': 'தஞ்சாவூர்',
    'Theni': 'தேனி',
    'Thoothukudi': 'தூத்துக்குடி',
    'Tiruchirappalli': 'திருச்சிராப்பள்ளி',
    'Tirunelveli': 'திருநெல்வேலி',
    'Tirupathur': 'திருப்பத்தூர்',
    'Tiruppur': 'திருப்பூர்',
    'Tiruvallur': 'திருவள்ளூர்',
    'Tiruvannamalai': 'திருவண்ணாமலை',
    'Tiruvarur': 'திருவாரூர்',
    'Vellore': 'வேலூர்',
    'Viluppuram': 'விழுப்புரம்',
    'Virudhunagar': 'விருதுநகர்'
};

const formatDistrict = (district, lang) => {
    if (!district) return lang === 'ta' ? 'சென்னை' : 'Chennai';
    if (lang === 'ta') {
        return TN_DISTRICTS_MAP_TA[district] || district;
    }
    return district;
};

const formatCategory = (type, lang) => {
    if (lang === 'ta') {
        if (type === 'LT-IIIB_INDUSTRIAL') return 'LT-IIIB தொழிற்துறை';
        if (type === 'LT-V_COMMERCIAL') return 'LT-V வணிக உபயோகம்';
        return 'LT-1A வீட்டு உபயோகம்';
    }
    if (type === 'LT-IIIB_INDUSTRIAL') return 'LT-IIIB Industrial';
    if (type === 'LT-V_COMMERCIAL') return 'LT-V Commercial';
    return 'LT-1A Domestic';
};

const formatVerificationStatus = (st, lang) => {
    if (lang === 'ta') {
        if (st === 'APPROVED') return 'அங்கீகரிக்கப்பட்டது';
        if (st === 'REJECTED') return 'நிராகரிக்கப்பட்டது';
        return 'நிலுவையில்';
    }
    return st || 'PENDING';
};

export default function AdminPortal() {
    const { t, language } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Top Tabs: 'BILLING' | 'AI_ASSISTANT' | 'VERIFICATION' | 'GRID_ANALYTICS'
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTabState] = useState(urlTab || 'BILLING');

    useEffect(() => {
        if (urlTab && ['BILLING', 'AI_ASSISTANT', 'VERIFICATION', 'GRID_ANALYTICS'].includes(urlTab)) {
            setActiveTabState(urlTab);
        }
    }, [urlTab]);

    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        setSearchParams({ tab });
    };
    
    // KYC Verification States
    const [consumers, setConsumers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [selectedConsumer, setSelectedConsumer] = useState(null);
    const [selectedDocIndex, setSelectedDocIndex] = useState(0);
    const [rejectionModalConsumer, setRejectionModalConsumer] = useState(null);
    const [rejectionRemarks, setRejectionRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Billing & Revenue States
    const [bills, setBills] = useState([]);
    const [billsSummary, setBillsSummary] = useState(null);
    const [billsLoading, setBillsLoading] = useState(false);
    const [billStatusFilter, setBillStatusFilter] = useState('ALL');
    const [billDistrictFilter, setBillDistrictFilter] = useState('ALL');
    const [billSearch, setBillSearch] = useState('');
    const [scanningFines, setScanningFines] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);

    // Fine Adjustment Modal
    const [fineModalBill, setFineModalBill] = useState(null);
    const [customFineAmount, setCustomFineAmount] = useState(150);
    const [customFineReason, setCustomFineReason] = useState('');

    // Toast Notification
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 4500);
    };

    // Fetch initial KYC data
    const fetchAdminPortalData = async () => {
        setLoading(true);
        try {
            const [statsRes, consumersRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/consumers')
            ]);

            if (statsRes.data?.success) setStats(statsRes.data.data);
            if (consumersRes.data?.success) setConsumers(consumersRes.data.data);
        } catch (err) {
            console.error('Error loading Admin Portal data:', err);
            setError(err.response?.data?.message || 'Failed to load verification database.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Billing data
    const fetchBillsData = async () => {
        setBillsLoading(true);
        try {
            const res = await api.get('/admin/bills');
            if (res.data?.success) {
                setBills(res.data.data || []);
                setBillsSummary(res.data.summary || null);
            }
        } catch (err) {
            console.error('Error loading Admin bills:', err);
        } finally {
            setBillsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminPortalData();
        fetchBillsData();
    }, []);

    // KYC Status Update
    const handleStatusUpdate = async (consumerId, newStatus, remarks = '') => {
        setActionLoading(true);
        try {
            const { data } = await api.put(`/admin/verify/${consumerId}`, {
                status: newStatus,
                remarks: remarks
            });

            if (data.success) {
                showToast(`Consumer ${newStatus.toLowerCase()} successfully.`);
                setConsumers(prev => prev.map(c => {
                    if (c._id === consumerId) {
                        return {
                            ...c,
                            verificationStatus: newStatus,
                            user: c.user ? { ...c.user, verificationStatus: newStatus } : c.user
                        };
                    }
                    return c;
                }));

                if (selectedConsumer && selectedConsumer._id === consumerId) {
                    setSelectedConsumer(prev => ({ ...prev, verificationStatus: newStatus }));
                }

                setRejectionModalConsumer(null);
                setRejectionRemarks('');

                api.get('/admin/stats').then(res => {
                    if (res.data?.success) setStats(res.data.data);
                });
            }
        } catch (err) {
            console.error('Status update failed:', err);
            showToast(err.response?.data?.message || 'Failed to update verification status.');
        } finally {
            setActionLoading(false);
        }
    };

    // Connection Type Change
    const handleConnectionTypeChange = async (consumerId, newType) => {
        setActionLoading(true);
        try {
            const { data } = await api.put(`/admin/connection-type/${consumerId}`, {
                connectionType: newType
            });

            if (data.success) {
                showToast(`Connection type changed to ${newType === 'LT-V_COMMERCIAL' ? 'Commercial (LT-V)' : 'Domestic (LT-1A)'}.`);
                setConsumers(prev => prev.map(c => {
                    if (c._id === consumerId) {
                        return {
                            ...c,
                            connectionType: newType,
                            tariffCategory: newType === 'LT-V_COMMERCIAL' ? 'LT-5' : 'LT-1A'
                        };
                    }
                    return c;
                }));

                api.get('/admin/stats').then(res => {
                    if (res.data?.success) setStats(res.data.data);
                });
            }
        } catch (err) {
            console.error('Connection type update error:', err);
            showToast(err.response?.data?.message || 'Failed to update connection type.');
        } finally {
            setActionLoading(false);
        }
    };

    // Run Automated Overdue Fine Scan
    const handleRunOverdueScan = async () => {
        setScanningFines(true);
        try {
            const res = await api.post('/admin/bills/check-overdue');
            if (res.data?.success) {
                const count = res.data.data?.finesImposed || 0;
                if (count === 0 && (res.data.data?.scannedBills || 0) === 0) {
                    showToast(language === 'ta' ? 'அபராதம் விதிக்க வேண்டிய தாமதமான பில்கள் எதுவும் இல்லை (No users for overdue).' : 'No users with overdue bills requiring fine imposition.');
                } else {
                    showToast(res.data.message || 'Overdue check completed. Fines imposed & alerts sent.');
                }
                fetchBillsData();
            }
        } catch (err) {
            console.error('Scan error:', err);
            showToast(err.response?.data?.message || 'Failed to run overdue scan.');
        } finally {
            setScanningFines(false);
        }
    };

    // Send Approaching Due Date Reminders
    const handleSendReminders = async () => {
        setSendingReminders(true);
        try {
            const res = await api.post('/admin/bills/send-reminders');
            if (res.data?.success) {
                const count = res.data.count || 0;
                if (count === 0) {
                    showToast(language === 'ta' ? 'அடுத்த 5 நாட்களில் நிலுவைத் தேதி உள்ள நுகர்வோர் எவரும் இல்லை (No users for due date reminders).' : 'No users with upcoming due date reminders found.');
                } else {
                    showToast(res.data.message || 'Due date reminders dispatched.');
                }
                fetchBillsData();
            }
        } catch (err) {
            console.error('Reminder error:', err);
            showToast(err.response?.data?.message || 'Failed to send reminders.');
        } finally {
            setSendingReminders(false);
        }
    };

    // Impose / Adjust Custom Fine
    const handleApplyFine = async () => {
        if (!fineModalBill) return;
        setActionLoading(true);
        try {
            const res = await api.put(`/admin/bills/${fineModalBill._id}/fine`, {
                fineAmount: customFineAmount,
                reason: customFineReason
            });
            if (res.data?.success) {
                showToast(`Fine of ₹${customFineAmount} updated for ${fineModalBill.userName}. Alert sent.`);
                setFineModalBill(null);
                setCustomFineReason('');
                fetchBillsData();
            }
        } catch (err) {
            console.error('Fine apply error:', err);
            showToast(err.response?.data?.message || 'Failed to apply fine.');
        } finally {
            setActionLoading(false);
        }
    };

    // Admin Verify & Approve / Reject Payment Reference (Approach 1)
    const handleAdminVerifyPayment = async (bill, action = 'APPROVE') => {
        let rejectionReason = '';
        if (action === 'REJECT') {
            rejectionReason = window.prompt(
                language === 'ta'
                    ? 'நிராகரிப்பிற்கான காரணத்தைக் குறிப்பிடவும் (Rejection Reason):'
                    : 'Please enter the reason for rejection:'
            );
            if (!rejectionReason) return;
        } else {
            const confirmMsg = language === 'ta' 
                ? `${bill.userName}-ன் ${bill.billingMonth} மாத மின்கட்டணத்தை (ரசீது: ${bill.transactionRef || 'TNEB-QPAY'}, தொகை: ₹${bill.totalPayable?.toLocaleString()}) சரிபார்த்து உறுதிசெய்ய விரும்புகிறீர்களா?`
                : `Are you sure you want to verify and APPROVE the payment of ₹${bill.totalPayable?.toLocaleString()} (Ref: ${bill.transactionRef || 'TNEB-QPAY'}) for ${bill.userName}?`;
            if (!window.confirm(confirmMsg)) return;
        }

        try {
            const res = await api.post(`/admin/bills/${bill._id}/verify-payment`, {
                action,
                rejectionReason
            });
            if (res.data?.success) {
                showToast(
                    action === 'APPROVE'
                        ? (language === 'ta' ? 'மின்கட்டணம் வெற்றிகரமாக உறுதிசெய்யப்பட்டு ரசீது வழங்கப்பட்டது.' : 'Payment approved and verified successfully.')
                        : (language === 'ta' ? 'கட்டண ரசீது எண் நிராகரிக்கப்பட்டது.' : 'Payment reference rejected.')
                );
                fetchBillsData();
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update payment verification.');
        }
    };

    // Filter Consumers for KYC
    const filteredConsumers = consumers.filter(consumer => {
        const matchesStatus = statusFilter === 'ALL' || consumer.verificationStatus === statusFilter;
        const matchesType = typeFilter === 'ALL' || consumer.connectionType === typeFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || (
            consumer.serviceNumber?.toLowerCase().includes(q) ||
            consumer.user?.name?.toLowerCase().includes(q) ||
            consumer.user?.email?.toLowerCase().includes(q)
        );
        return matchesStatus && matchesType && matchesSearch;
    });

    // Filter Bills
    const filteredBills = bills.filter(bill => {
        const matchesStatus = billStatusFilter === 'ALL' || bill.status === billStatusFilter;
        const matchesDistrict = billDistrictFilter === 'ALL' || bill.district?.toLowerCase() === billDistrictFilter.toLowerCase();
        const q = billSearch.toLowerCase().trim();
        const matchesSearch = !q || (
            bill.serviceNumber?.toLowerCase().includes(q) ||
            bill.userName?.toLowerCase().includes(q) ||
            bill.userEmail?.toLowerCase().includes(q) ||
            bill.district?.toLowerCase().includes(q) ||
            bill.billingMonth?.toLowerCase().includes(q)
        );
        return matchesStatus && matchesDistrict && matchesSearch;
    });

    // Unique districts from bills
    const districtsList = Array.from(new Set(bills.map(b => b.district).filter(Boolean)));

    const isPdf = (url) => url && url.toLowerCase().endsWith('.pdf');

    return (
        <div className="space-y-8 pb-12">
            
            {/* Toast Notification */}
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
                        {activeTab === 'BILLING' && <Receipt className="text-gold-500" size={30} />}
                        {activeTab === 'AI_ASSISTANT' && <BrainCircuit className="text-gold-500" size={30} />}
                        {activeTab === 'VERIFICATION' && <ShieldAlert className="text-gold-500" size={30} />}
                        {activeTab === 'GRID_ANALYTICS' && <Activity className="text-gold-500" size={30} />}
                        <span>
                            {activeTab === 'BILLING' && (
                                <>
                                    {language === 'ta' ? 'TANGEDCO மத்திய ' : 'TANGEDCO Central '}
                                    <span className="text-gold-500">{language === 'ta' ? 'மின்கட்டண & நிலுவை நிர்வாகம்' : 'Billing & Payment Ledger'}</span>
                                </>
                            )}
                            {activeTab === 'AI_ASSISTANT' && (
                                <>
                                    {language === 'ta' ? 'TANGEDCO நிர்வாக ' : 'TANGEDCO Executive '}
                                    <span className="text-gold-500">{language === 'ta' ? 'ஏஐ உதவியாளர் (Live AI)' : 'AI Assistant'}</span>
                                </>
                            )}
                            {activeTab === 'VERIFICATION' && (
                                <>
                                    {language === 'ta' ? 'நுகர்வோர் ' : 'Consumer '}
                                    <span className="text-gold-500">{language === 'ta' ? 'இ-கேஒய்சி ஆவண சரிபார்ப்பு மையம்' : 'e-KYC Verification Hub'}</span>
                                </>
                            )}
                            {activeTab === 'GRID_ANALYTICS' && (
                                <>
                                    {language === 'ta' ? 'தமிழ்நாடு மாநில ' : 'Tamil Nadu State '}
                                    <span className="text-gold-500">{language === 'ta' ? 'கிரிட் & மாவட்ட சுமை கண்காணிப்பு' : 'Grid & District Telemetry'}</span>
                                </>
                            )}
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {activeTab === 'BILLING' && (language === 'ta' ? 'நுகர்வோர் மின்கட்டண வசூல், அபராத மேலாண்மை & விலைப்பட்டியல் வரலாறு' : 'Consumer Billing Status, Late Surcharge Engine, and Revenue Collections')}
                        {activeTab === 'AI_ASSISTANT' && (language === 'ta' ? 'நுகர்வோர் நிலுவை, அபராதம் & மாவட்ட வருவாய் பற்றிய நேரடி ஏஐ ஆய்வு மையம்' : 'Natural language query engine for real-time revenue, defaulters & grid analytics')}
                        {activeTab === 'VERIFICATION' && (language === 'ta' ? 'பதிவேற்றப்பட்ட ஆதார் மற்றும் சொத்து வரி ஆவணங்களை ஆய்வு செய்து சரிபார்க்க' : 'Audit uploaded Aadhar cards, property tax receipts, and commercial trade licenses')}
                        {activeTab === 'GRID_ANALYTICS' && (language === 'ta' ? 'நேரடி கிரிட் தேவை (MW), 38 மாவட்ட மின்கட்டண வசூல் விகிதம் & புதுப்பிக்கத்தக்க மின்சாரம்' : 'Real-time 230V/400kV transmission grid load, 38-district telemetry, and green energy mix')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="https://www.tnebnet.org/awp/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/40 text-gold-300 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                        <span>{language === 'ta' ? 'TNPDCL கட்டண தளம்' : 'TNPDCL Online Pay'}</span>
                        <ExternalLink size={13} />
                    </a>
                    <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                        <ShieldCheck size={14} /> ADMIN RBAC
                    </span>
                </div>
            </div>

            {/* TAB 1: BILLING & PAYMENT MANAGEMENT */}
            {activeTab === 'BILLING' && (
                <div className="space-y-6">
                    {/* Revenue & Surcharge KPI Cards */}
                    {billsSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Total Billed */}
                            <div className="bg-panel border border-panelBorder p-5 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400">
                                    <span>{language === 'ta' ? 'மொத்த மின்கட்டணம்' : 'Total Billed'}</span>
                                    <Receipt size={16} className="text-blue-400" />
                                </div>
                                <p className="text-2xl font-black text-white mt-3">₹{billsSummary.totalBilled?.toLocaleString()}</p>
                                <p className="text-[11px] text-slate-500 mt-1">{bills.length} {language === 'ta' ? 'விலைப்பட்டியல்கள்' : 'invoices issued'}</p>
                            </div>

                            {/* Total Collected (PAID) */}
                            <div className="bg-panel border border-emerald-500/30 p-5 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-center text-xs font-bold uppercase text-emerald-400">
                                    <span>{language === 'ta' ? 'செலுத்தப்பட்ட தொகை (Paid)' : 'Total Collected'}</span>
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                </div>
                                <p className="text-2xl font-black text-emerald-400 mt-3">₹{billsSummary.totalCollected?.toLocaleString()}</p>
                                <p className="text-[11px] text-emerald-400/80 mt-1">{billsSummary.paidCount} {language === 'ta' ? 'நுகர்வோர் செலுத்தினர்' : 'paid accounts'}</p>
                            </div>

                            {/* Total Outstanding (UNPAID) */}
                            <div className="bg-panel border border-amber-500/30 p-5 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-center text-xs font-bold uppercase text-amber-400">
                                    <span>{language === 'ta' ? 'நிலுவை தொகை (Unpaid)' : 'Total Outstanding'}</span>
                                    <Clock size={16} className="text-amber-400" />
                                </div>
                                <p className="text-2xl font-black text-amber-400 mt-3">₹{billsSummary.totalOutstanding?.toLocaleString()}</p>
                                <p className="text-[11px] text-amber-400/80 mt-1">{billsSummary.unpaidCount} {language === 'ta' ? 'நிலுவை கணக்குகள்' : 'pending accounts'}</p>
                            </div>

                            {/* Fines Imposed (OVERDUE) */}
                            <div className="bg-panel border border-red-500/40 p-5 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-center text-xs font-bold uppercase text-red-400">
                                    <span>{language === 'ta' ? 'விதிக்கப்பட்ட அபராதம்' : 'Fines Imposed'}</span>
                                    <ShieldAlert size={16} className="text-red-400" />
                                </div>
                                <p className="text-2xl font-black text-red-400 mt-3">₹{billsSummary.totalFines?.toLocaleString()}</p>
                                <p className="text-[11px] text-red-400/80 mt-1">
                                    {(billsSummary.finesCount ?? (billsSummary.totalFines > 0 ? Math.max(1, billsSummary.overdueCount) : billsSummary.overdueCount))} {language === 'ta' ? 'கணக்குகளுக்கு அபராதம்' : 'accounts with fines'}
                                </p>
                            </div>

                            {/* Approaching Due Date */}
                            <div className="bg-panel border border-yellow-500/30 p-5 rounded-2xl flex flex-col justify-between">
                                <div className="flex justify-between items-center text-xs font-bold uppercase text-yellow-400">
                                    <span>{language === 'ta' ? 'கடைசி நாள் நெருங்குபவை' : 'Due in ≤ 3 Days'}</span>
                                    <AlertTriangle size={16} className="text-yellow-400" />
                                </div>
                                <p className="text-2xl font-black text-yellow-400 mt-3">{billsSummary.nearingDueCount}</p>
                                <p className="text-[11px] text-yellow-300/80 mt-1">{language === 'ta' ? 'நினைவூட்டல் தயார்' : 'Ready for reminder'}</p>
                            </div>
                        </div>
                    )}

                    {/* Action Bar & Batch Triggers */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-darker border border-panelBorder flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                            <button
                                type="button"
                                disabled={scanningFines}
                                onClick={handleRunOverdueScan}
                                className="w-full h-11 sm:h-10 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                            >
                                <ShieldAlert size={16} className={`shrink-0 ${scanningFines ? 'animate-spin' : ''}`} />
                                <span className="leading-none">{scanningFines ? (language === 'ta' ? 'ஆய்வு செய்கிறது...' : 'Scanning...') : (language === 'ta' ? 'தாமத அபராதக் கணக்கீடு' : 'Run Overdue Fine Scan')}</span>
                            </button>

                            <button
                                type="button"
                                disabled={sendingReminders}
                                onClick={handleSendReminders}
                                className="w-full h-11 sm:h-10 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                            >
                                <Bell size={16} className={`shrink-0 ${sendingReminders ? 'animate-bounce' : ''}`} />
                                <span className="leading-none">{sendingReminders ? (language === 'ta' ? 'அனுப்பப்படுகிறது...' : 'Dispatching...') : (language === 'ta' ? 'கடைசி நாள் நினைவூட்டல்' : 'Send Due Date Reminders')}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full lg:w-auto lg:flex lg:flex-row">
                            <div className="relative w-full sm:w-auto lg:w-56 xl:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                                <input
                                    type="text"
                                    value={billSearch}
                                    onChange={(e) => setBillSearch(e.target.value)}
                                    placeholder={language === 'ta' ? 'பெயர், எண், மாவட்டம்...' : 'Search name, service no, district...'}
                                    className="w-full bg-dark border border-panelBorder text-white text-xs pl-9 pr-3 py-2.5 h-10 rounded-xl focus:border-gold-500 placeholder:text-slate-600"
                                />
                            </div>

                            <select
                                value={billStatusFilter}
                                onChange={(e) => setBillStatusFilter(e.target.value)}
                                className="w-full sm:w-auto bg-dark border border-panelBorder text-white text-xs px-3 py-2.5 h-10 rounded-xl focus:border-gold-500 cursor-pointer"
                            >
                                <option value="ALL">{language === 'ta' ? 'அனைத்து நிலை' : 'All Status'}</option>
                                <option value="PENDING_VERIFICATION">{language === 'ta' ? 'சரிபார்ப்பு நிலுவை (Pending Verification)' : 'Pending Verification'}</option>
                                <option value="PAID">{language === 'ta' ? 'செலுத்தப்பட்டது (PAID)' : 'PAID'}</option>
                                <option value="UNPAID">{language === 'ta' ? 'நிலுவை (UNPAID)' : 'UNPAID'}</option>
                                <option value="OVERDUE">{language === 'ta' ? 'அபராதம் (OVERDUE)' : 'OVERDUE'}</option>
                            </select>

                            <select
                                value={billDistrictFilter}
                                onChange={(e) => setBillDistrictFilter(e.target.value)}
                                className="w-full sm:w-auto bg-dark border border-panelBorder text-white text-xs px-3 py-2.5 h-10 rounded-xl focus:border-gold-500 cursor-pointer"
                            >
                                <option value="ALL">{language === 'ta' ? 'அனைத்து மாவட்டம்' : 'All Districts'}</option>
                                {districtsList.map(d => (
                                    <option key={d} value={d}>{formatDistrict(d, language)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Bills Table */}
                    <div className="bg-panel border border-panelBorder rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full min-w-[860px] text-left text-xs text-slate-300">
                                <thead className="bg-darker/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-panelBorder">
                                    <tr>
                                        <th className="p-4">{language === 'ta' ? 'நுகர்வோர் & இணைப்பு எண்' : 'Consumer & Service No'}</th>
                                        <th className="p-4">{language === 'ta' ? 'மாவட்டம் & பிரிவு' : 'District & Tariff'}</th>
                                        <th className="p-4">{language === 'ta' ? 'உருவாக்கப்பட்ட & கடைசி நாள்' : 'Generation & Due Date (15d)'}</th>
                                        <th className="p-4">{language === 'ta' ? 'நுகர்வு & கட்டணம்' : 'Units & Base Bill'}</th>
                                        <th className="p-4">{language === 'ta' ? 'தாமத அபராதம்' : 'Fine / LPSC'}</th>
                                        <th className="p-4">{language === 'ta' ? 'மொத்தம்' : 'Total Payable'}</th>
                                        <th className="p-4">{language === 'ta' ? 'கட்டண நிலை' : 'Status & Timeline'}</th>
                                        <th className="p-4 text-right">{language === 'ta' ? 'நிர்வாகச் செயல்கள்' : 'Admin Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panelBorder/60">
                                    {billsLoading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center p-8 text-slate-400">
                                                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-gold-400" />
                                                <span>{language === 'ta' ? 'மின்கட்டணத் தரவுகள் ஏற்றப்படுகின்றன...' : 'Loading central billing database...'}</span>
                                            </td>
                                        </tr>
                                    ) : filteredBills.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center p-8 text-slate-400">
                                                {language === 'ta' ? 'பொருந்தக்கூடிய விலைப்பட்டியல் தரவுகள் இல்லை.' : 'No consumer bills found matching selected filters.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBills.map((b) => {
                                            const genDate = new Date(b.createdAt || Date.now());
                                            const dueDate = new Date(b.dueDate);
                                            const isPendingVerification = b.status === 'PENDING_VERIFICATION' || b.paymentVerificationStatus === 'PENDING';

                                            return (
                                                <tr key={b._id} className={`transition ${isPendingVerification ? 'bg-cyan-500/5 hover:bg-cyan-500/10' : 'hover:bg-darker/40'}`}>
                                                    {/* Consumer & Service No */}
                                                    <td className="p-4">
                                                        <p className="font-bold text-white text-sm">{b.userName}</p>
                                                        <p className="font-mono text-xs text-gold-400 mt-0.5">{b.serviceNumber}</p>
                                                        <p className="text-[10px] text-slate-500">{b.userEmail}</p>
                                                    </td>

                                                    {/* District & Category */}
                                                    <td className="p-4">
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex items-center gap-1 font-medium text-slate-200">
                                                                <MapPin size={12} className="text-gold-400 shrink-0" />
                                                                <span>{formatDistrict(b.district, language)}</span>
                                                            </span>
                                                            <p className="text-[10px] text-slate-400">
                                                                {formatCategory(b.connectionType, language)}
                                                            </p>
                                                        </div>
                                                    </td>

                                                    {/* Generation & Due Date */}
                                                    <td className="p-4">
                                                        <div className="space-y-1 font-mono text-[11px]">
                                                            <div>
                                                                <span className="text-[10px] text-slate-500 font-sans block">
                                                                    {language === 'ta' ? 'உருவாக்கப்பட்டது:' : 'Generated:'}
                                                                </span>
                                                                <span className="text-slate-300 font-bold">
                                                                    {genDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-amber-400 font-sans block">
                                                                    {language === 'ta' ? 'கடைசி நாள் (15 நாட்கள்):' : 'Due Date (15 Days):'}
                                                                </span>
                                                                <span className="text-amber-300 font-bold">
                                                                    {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Units & Base Bill */}
                                                    <td className="p-4 font-mono">
                                                        <span className="font-bold text-white text-xs">{b.unitsConsumed} kWh</span>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">₹{b.totalAmount?.toLocaleString()}</p>
                                                    </td>

                                                    {/* Fine Amount */}
                                                    <td className="p-4 font-mono">
                                                        {b.fineAmount > 0 ? (
                                                            <span className="font-bold text-red-400 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 inline-block">
                                                                +₹{b.fineAmount}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500">₹0</span>
                                                        )}
                                                    </td>

                                                    {/* Total Payable */}
                                                    <td className="p-4 font-mono font-black text-gold-400 text-sm">
                                                        ₹{b.totalPayable?.toLocaleString()}
                                                    </td>

                                                    {/* Due Date & Status Badge */}
                                                    <td className="p-4 space-y-1">
                                                        {b.status === 'PAID' ? (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                                                                    <CheckCircle2 size={12} /> {language === 'ta' ? 'செலுத்தப்பட்டது' : 'PAID'}
                                                                </span>
                                                                {b.paidAt && (
                                                                    <p className="text-[9px] text-slate-500 mt-0.5">
                                                                        {new Date(b.paidAt).toLocaleDateString()} • {b.paymentMode || 'ONLINE'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : isPendingVerification ? (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 font-bold text-[10px] border border-cyan-500/30 animate-pulse">
                                                                    <Clock size={12} /> {language === 'ta' ? 'சரிபார்ப்பு நிலுவை' : 'VERIFICATION PENDING'}
                                                                </span>
                                                                {b.transactionRef && (
                                                                    <p className="text-[10px] text-gold-400 font-mono font-bold">
                                                                        Ref: {b.transactionRef}
                                                                    </p>
                                                                )}
                                                                {b.submittedAt && (
                                                                    <p className="text-[9px] text-slate-400">
                                                                        {new Date(b.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(b.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : b.status === 'OVERDUE' ? (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                                                                    <ShieldAlert size={12} /> {language === 'ta' ? 'அபராதம் / தாமதம்' : 'OVERDUE'}
                                                                </span>
                                                                <p className="text-[9px] text-red-400 font-bold mt-0.5">
                                                                    +{b.daysOverdue} {language === 'ta' ? 'நாட்கள் தாமதம்' : 'days overdue'}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] border border-amber-500/30">
                                                                    <Clock size={12} /> {language === 'ta' ? 'நிலுவை' : 'UNPAID'}
                                                                </span>
                                                                <p className={`text-[9px] mt-0.5 ${b.isNearingDue ? 'text-yellow-400 font-bold' : 'text-slate-400'}`}>
                                                                    {b.daysRemaining} {language === 'ta' ? 'நாட்கள் உள்ளன' : 'days left'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                            {isPendingVerification ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAdminVerifyPayment(b, 'APPROVE')}
                                                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-darker text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                                                                        title="Approve & Confirm Paid"
                                                                    >
                                                                        <Check size={12} className="stroke-[3]" />
                                                                        <span>{language === 'ta' ? 'அங்கீகரி' : 'Approve'}</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAdminVerifyPayment(b, 'REJECT')}
                                                                        className="px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold transition cursor-pointer"
                                                                        title="Reject Reference"
                                                                    >
                                                                        <span>{language === 'ta' ? 'நிராகரி' : 'Reject'}</span>
                                                                    </button>
                                                                </>
                                                            ) : b.status !== 'PAID' ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAdminVerifyPayment(b, 'APPROVE')}
                                                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                                                                        title="Verify & Mark as Paid"
                                                                    >
                                                                        <Check size={12} />
                                                                        <span>{language === 'ta' ? 'உறுதி செய்' : 'Verify Paid'}</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFineModalBill(b);
                                                                            setCustomFineAmount(b.fineAmount || 150);
                                                                            setCustomFineReason(b.fineReason || 'TANGEDCO Late Payment Surcharge (LPSC)');
                                                                        }}
                                                                        className="px-2.5 py-1.5 rounded-lg bg-dark hover:bg-panel border border-panelBorder text-slate-300 hover:text-gold-400 text-xs font-semibold transition cursor-pointer"
                                                                        title="Impose or adjust fine"
                                                                    >
                                                                        {language === 'ta' ? 'அபராதம்' : 'Fine'}
                                                                    </button>
                                                                </>
                                                            ) : null}

                                                            <a
                                                                href="https://www.tnebnet.org/awp/login"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-lg bg-dark hover:bg-panel border border-panelBorder text-slate-400 hover:text-white transition cursor-pointer"
                                                                title="TANGEDCO Portal"
                                                            >
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: DEDICATED ADMIN AI ASSISTANT */}
            {activeTab === 'AI_ASSISTANT' && (
                <div className="space-y-4">
                    <AdminAiAssistant onRefreshBills={fetchBillsData} />
                </div>
            )}

            {/* TAB 3: KYC VERIFICATION PORTAL */}
            {activeTab === 'VERIFICATION' && (
                <div className="space-y-6">
                    {/* KYC Overview Stats */}
                    {stats && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            <div className="bg-panel border border-panelBorder p-5 rounded-xl">
                                <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                                    <span>{t('admin.totalConnections')}</span>
                                    <Users size={16} className="text-gold-500" />
                                </div>
                                <p className="mt-3 text-3xl font-extrabold text-white">{stats.totalMeters || stats.totalUsers || 0}</p>
                            </div>

                            <div className={`p-5 rounded-xl border transition-all ${
                                (stats.pendingVerifications || 0) > 0 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-panel border-panelBorder'
                            }`}>
                                <div className="flex justify-between items-center text-xs font-bold uppercase">
                                    <span className={(stats.pendingVerifications || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}>
                                        {t('admin.pendingAudit')}
                                    </span>
                                    <Clock size={16} className={(stats.pendingVerifications || 0) > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'} />
                                </div>
                                <p className={`mt-3 text-3xl font-extrabold ${(stats.pendingVerifications || 0) > 0 ? 'text-amber-400' : 'text-white'}`}>
                                    {stats.pendingVerifications || 0}
                                </p>
                            </div>

                            <div className="bg-panel border border-panelBorder p-5 rounded-xl">
                                <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                                    <span>{t('admin.verifiedConnections')}</span>
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                </div>
                                <p className="mt-3 text-3xl font-extrabold text-emerald-400">
                                    {stats.approvedVerifications || 0}
                                </p>
                            </div>

                            <div className="bg-panel border border-panelBorder p-5 rounded-xl">
                                <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase">
                                    <span>{t('admin.tariffDistribution')}</span>
                                    <Building2 size={16} className="text-purple-400" />
                                </div>
                                <div className="mt-3 grid grid-cols-3 divide-x divide-panelBorder">
                                    <div className="min-w-0 pr-2">
                                        <span className="text-[11px] text-blue-400 font-bold block truncate">{t('admin.domestic')}</span>
                                        <p className="text-lg font-extrabold text-blue-400 mt-0.5">{stats.domesticCount || 0}</p>
                                    </div>
                                    <div className="min-w-0 px-2">
                                        <span className="text-[11px] text-purple-400 font-bold block truncate">{t('admin.commercial')}</span>
                                        <p className="text-lg font-extrabold text-purple-400 mt-0.5">{stats.commercialCount || 0}</p>
                                    </div>
                                    <div className="min-w-0 pl-2">
                                        <span className="text-[11px] text-gold-400 font-bold block truncate">{t('admin.industrial')}</span>
                                        <p className="text-lg font-extrabold text-gold-400 mt-0.5">{stats.industrialCount || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="p-4 bg-panel border border-panelBorder rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('admin.searchPlaceholder')}
                                className="w-full bg-dark border border-panelBorder text-white text-xs pl-10 pr-4 py-2.5 rounded-lg focus:border-gold-500 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-dark border border-panelBorder text-white text-xs px-3 py-2.5 rounded-lg focus:border-gold-500"
                            >
                                <option value="ALL">{t('admin.allStatus')}</option>
                                <option value="PENDING">{t('admin.filterPending')}</option>
                                <option value="APPROVED">{t('admin.filterApproved')}</option>
                                <option value="REJECTED">{t('admin.filterRejected')}</option>
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="bg-dark border border-panelBorder text-white text-xs px-3 py-2.5 rounded-lg focus:border-gold-500"
                            >
                                <option value="ALL">{t('admin.allCategories')}</option>
                                <option value="LT-1A_DOMESTIC">{t('admin.catDomestic')}</option>
                                <option value="LT-V_COMMERCIAL">{t('admin.catCommercial')}</option>
                                <option value="LT-IIIB_INDUSTRIAL">{t('admin.catIndustrial')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Consumer KYC Table */}
                    <div className="bg-panel border border-panelBorder rounded-2xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-darker/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-panelBorder">
                                    <tr>
                                        <th className="p-4">{t('admin.consumerDetails')}</th>
                                        <th className="p-4">{t('admin.serviceId')}</th>
                                        <th className="p-4">{t('admin.category')}</th>
                                        <th className="p-4">{t('admin.documents')}</th>
                                        <th className="p-4">{t('admin.auditStatus')}</th>
                                        <th className="p-4 text-right">{t('admin.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panelBorder/60">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="text-center p-8 text-slate-400">
                                                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-gold-400" />
                                                <span>{t('admin.loadingVerifications')}</span>
                                            </td>
                                        </tr>
                                    ) : filteredConsumers.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center p-8 text-slate-400">
                                                {t('admin.noConsumersFound')}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredConsumers.map((c) => {
                                            const docs = c.kycDocuments || c.user?.kycDocuments || [];
                                            const hasDocs = docs.length > 0;
                                            return (
                                                <tr key={c._id} className="hover:bg-darker/40 transition">
                                                    <td className="p-4">
                                                        <p className="font-bold text-white text-sm">{c.user?.name || 'N/A'}</p>
                                                        <p className="text-slate-400 text-xs">{c.user?.email || 'N/A'}</p>
                                                    </td>
                                                    <td className="p-4 font-mono font-bold text-gold-400">
                                                        {c.serviceNumber}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="font-medium text-slate-200">
                                                            {formatCategory(c.connectionType, language)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {hasDocs ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                                                <FileText size={13} /> {docs.length} {t('admin.attached')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 italic">{t('admin.noDocs')}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                            c.verificationStatus === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                                            c.verificationStatus === 'REJECTED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                                            'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                                        }`}>
                                                            {formatVerificationStatus(c.verificationStatus, language)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedConsumer(c);
                                                                setSelectedDocIndex(0);
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/40 text-gold-400 text-xs font-bold transition cursor-pointer"
                                                        >
                                                            {t('admin.inspectDocs')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: STATE-WIDE GRID & DISTRICT TELEMETRY */}
            {activeTab === 'GRID_ANALYTICS' && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* Top Grid Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Peak Load */}
                        <div className="bg-panel border border-blue-500/30 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex justify-between items-center text-xs font-bold uppercase text-blue-400">
                                <span>{language === 'ta' ? 'மாநில உச்ச மின் தேவை' : 'Peak Grid Demand'}</span>
                                <Activity size={18} className="text-blue-400 animate-pulse" />
                            </div>
                            <div className="mt-3">
                                <p className="text-3xl font-black text-white font-mono">15,420 <span className="text-sm font-normal text-blue-400">MW</span></p>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {language === 'ta' ? 'அதிகபட்ச சுமை 18,732 MW (82% பயன்பாடு)' : 'Capacity 18,732 MW (82.3% Load)'}
                                </p>
                            </div>
                        </div>

                        {/* Frequency & Voltage */}
                        <div className="bg-panel border border-emerald-500/30 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex justify-between items-center text-xs font-bold uppercase text-emerald-400">
                                <span>{language === 'ta' ? 'கிரிட் அலைவரிசை & நிலைப்புத்தன்மை' : 'Synchronous Frequency'}</span>
                                <Gauge size={18} className="text-emerald-400" />
                            </div>
                            <div className="mt-3">
                                <p className="text-3xl font-black text-emerald-400 font-mono">50.02 <span className="text-sm font-normal text-emerald-300">Hz</span></p>
                                <p className="text-[11px] text-emerald-400/80 mt-1">
                                    {language === 'ta' ? '230V சீரான மும்முனை விநியோகம்' : '230V Balanced 3-Phase Transmission'}
                                </p>
                            </div>
                        </div>

                        {/* Government Subsidy Protection */}
                        <div className="bg-panel border border-gold-500/30 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex justify-between items-center text-xs font-bold uppercase text-gold-400">
                                <span>{language === 'ta' ? '200 இலவச யூனிட் மானியம் (GO 25)' : '200 Free Units Subsidy (GO 25)'}</span>
                                <Zap size={18} className="text-gold-400" />
                            </div>
                            <div className="mt-3">
                                <p className="text-3xl font-black text-gold-400 font-mono">2.14 <span className="text-sm font-normal text-gold-300">Cr</span></p>
                                <p className="text-[11px] text-gold-400/80 mt-1">
                                    {language === 'ta' ? '₹482.6 கோடி மாத அரசு மானிய நிதி' : '₹482.6 Cr Monthly Grant Protected'}
                                </p>
                            </div>
                        </div>

                        {/* Clean Energy Feed */}
                        <div className="bg-panel border border-teal-500/30 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
                            <div className="flex justify-between items-center text-xs font-bold uppercase text-teal-400">
                                <span>{language === 'ta' ? 'புதுப்பிக்கத்தக்க பசுமை மின்சாரம்' : 'Green Energy Feed'}</span>
                                <Wind size={18} className="text-teal-400" />
                            </div>
                            <div className="mt-3">
                                <p className="text-3xl font-black text-teal-400 font-mono">48.2 <span className="text-sm font-normal text-teal-300">%</span></p>
                                <p className="text-[11px] text-teal-400/80 mt-1">
                                    {language === 'ta' ? 'முப்பந்தல் காற்று + கமுதி சூரிய மின்சாரம்' : 'Muppandal Wind + Kamuthi Solar'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Generation Mix & Major Substation Feeder Zones */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Generation Mix */}
                        <div className="bg-panel border border-panelBorder p-6 rounded-2xl space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                                    <BarChart3 className="text-gold-500" size={18} />
                                    <span>{language === 'ta' ? 'தமிழ்நாடு மின் உற்பத்தி பகிர்வு' : 'TN Generation Energy Mix'}</span>
                                </h3>
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">TANGEDCO 2026</span>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="flex items-center gap-1.5 text-slate-300">
                                            <Flame size={13} className="text-amber-500" />
                                            <span>{language === 'ta' ? 'அனல் மின் நிலையம் (மேட்டூர் & வடசென்னை)' : 'Thermal (Mettur & North Chennai)'}</span>
                                        </span>
                                        <span className="font-mono text-amber-400 font-bold">42% (6,476 MW)</span>
                                    </div>
                                    <div className="w-full bg-darker h-2 rounded-full overflow-hidden">
                                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '42%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="flex items-center gap-1.5 text-slate-300">
                                            <Wind size={13} className="text-teal-400" />
                                            <span>{language === 'ta' ? 'காற்றாலை மின்சாரம் (முப்பந்தல் வழித்தடம்)' : 'Wind (Muppandal Corridor)'}</span>
                                        </span>
                                        <span className="font-mono text-teal-400 font-bold">27% (4,163 MW)</span>
                                    </div>
                                    <div className="w-full bg-darker h-2 rounded-full overflow-hidden">
                                        <div className="bg-teal-400 h-full rounded-full" style={{ width: '27%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="flex items-center gap-1.5 text-slate-300">
                                            <Sun size={13} className="text-gold-400" />
                                            <span>{language === 'ta' ? 'சூரிய மின்சாரம் (கமுதி & பிஎம் சூர்ய கார்)' : 'Solar (Kamuthi & PM Surya Ghar)'}</span>
                                        </span>
                                        <span className="font-mono text-gold-400 font-bold">21% (3,238 MW)</span>
                                    </div>
                                    <div className="w-full bg-darker h-2 rounded-full overflow-hidden">
                                        <div className="bg-gold-500 h-full rounded-full" style={{ width: '21%' }}></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-xs font-semibold mb-1">
                                        <span className="flex items-center gap-1.5 text-slate-300">
                                            <Activity size={13} className="text-blue-400" />
                                            <span>{language === 'ta' ? 'நீர் மின்சாரம் (குந்தா & பயக்காரா)' : 'Hydro (Kundah & Pykara)'}</span>
                                        </span>
                                        <span className="font-mono text-blue-400 font-bold">10% (1,542 MW)</span>
                                    </div>
                                    <div className="w-full bg-darker h-2 rounded-full overflow-hidden">
                                        <div className="bg-blue-400 h-full rounded-full" style={{ width: '10%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Major Substation Feeder Grid */}
                        <div className="lg:col-span-2 bg-panel border border-panelBorder p-6 rounded-2xl space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                                    <Building2 className="text-emerald-400" size={18} />
                                    <span>{language === 'ta' ? 'முக்கிய துணை மின் நிலையங்களின் சுமை நிலை' : 'Key 400kV / 230kV Substation Feeders'}</span>
                                </h3>
                                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                    {language === 'ta' ? 'அனைத்து இணைப்புகளும் சீரானவை' : 'ALL SYSTEMS NOMINAL'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { 
                                        name: language === 'ta' ? 'சென்னை தெற்கு 400kV துணை மின் நிலையம்' : 'Chennai South 400kV Substation', 
                                        mw: '3,840 MW', 
                                        load: '91%', 
                                        status: language === 'ta' ? 'சீரானது' : 'OPTIMAL', 
                                        type: language === 'ta' ? 'பெருநகர மின் தேவை' : 'Metropolitan Load' 
                                    },
                                    { 
                                        name: language === 'ta' ? 'கோவை மேற்கு 230kV மின் இணைப்பு' : 'Coimbatore West 230kV Feeder', 
                                        mw: '2,910 MW', 
                                        load: '76%', 
                                        status: language === 'ta' ? 'சீரானது' : 'OPTIMAL', 
                                        type: language === 'ta' ? 'தொழிற்பேட்டை மண்டலம்' : 'Industrial Zone' 
                                    },
                                    { 
                                        name: language === 'ta' ? 'மதுரை ரிங் மெயின் 110kV நிலையம்' : 'Madurai Ring Main 110kV Station', 
                                        mw: '1,740 MW', 
                                        load: '68%', 
                                        status: language === 'ta' ? 'சீரானது' : 'OPTIMAL', 
                                        type: language === 'ta' ? 'வணிக & நகரப் பயன்பாடு' : 'Commercial & Urban' 
                                    },
                                    { 
                                        name: language === 'ta' ? 'திருச்சிராப்பள்ளி விநியோக இணைப்பு' : 'Tiruchirappalli Distribution Feeder', 
                                        mw: '1,520 MW', 
                                        load: '72%', 
                                        status: language === 'ta' ? 'சீரானது' : 'OPTIMAL', 
                                        type: language === 'ta' ? 'மத்திய மின் கட்டமைப்பு' : 'Central Grid' 
                                    },
                                    { 
                                        name: language === 'ta' ? 'திருநெல்வேலி முப்பந்தல் காற்றாலை வழித்தடம்' : 'Tirunelveli Muppandal Wind Corridor', 
                                        mw: '2,180 MW', 
                                        load: '100%', 
                                        status: language === 'ta' ? 'பசுமை மின் விநியோகம்' : 'GREEN FEED', 
                                        type: language === 'ta' ? 'புதுப்பிக்கத்தக்க ஆற்றல் மையம்' : 'Renewable Hub' 
                                    },
                                    { 
                                        name: language === 'ta' ? 'சேலம் ஸ்டீல் 230kV தொழிற்சாலை நிலையம்' : 'Salem Steel 230kV Industrial Station', 
                                        mw: '1,650 MW', 
                                        load: '82%', 
                                        status: language === 'ta' ? 'சீரானது' : 'OPTIMAL', 
                                        type: language === 'ta' ? 'கனரகத் தொழிற்துறை' : 'Heavy Industrial' 
                                    }
                                ].map((sub, i) => (
                                    <div key={i} className="p-3.5 rounded-xl bg-dark border border-panelBorder space-y-1.5 hover:border-gold-500/30 transition">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-white text-xs">{sub.name}</p>
                                                <p className="text-[10px] text-slate-400">{sub.type}</p>
                                            </div>
                                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                                sub.status === 'GREEN FEED' || sub.status === 'பசுமை மின் விநியோகம்'
                                                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' 
                                                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-mono pt-1">
                                            <span className="text-slate-300 font-semibold">{sub.mw}</span>
                                            <span className="text-gold-400 font-bold">{sub.load} {language === 'ta' ? 'பயன்பாடு' : 'load'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* District-Wise Revenue & Consumer Telemetry Table */}
                    <div className="bg-panel border border-panelBorder rounded-2xl shadow-xl overflow-hidden space-y-4 p-6">
                        <div className="flex items-center justify-between border-b border-panelBorder pb-4">
                            <div>
                                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                                    <MapPin className="text-gold-500" size={20} />
                                    <span>{language === 'ta' ? '38 மாவட்ட நுகர்வு & மின்கட்டண வசூல் மேலோட்டம்' : 'Tamil Nadu 38-District Energy & Revenue Ledger'}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {language === 'ta' ? 'நுகர்வோர் இணைப்புகள், வசூல் விகிதம் மற்றும் மின்கட்டண வசூல் புள்ளிவிவரங்கள்.' : 'Live district-level collection rate, active smart meters, and outstanding receivables.'}
                                </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-gold-400 bg-gold-500/10 px-3 py-1 rounded-xl border border-gold-500/30">
                                {districtsList.length > 0 
                                    ? (language === 'ta' ? `${districtsList.length} செயல்படும் மாவட்டங்கள்` : `${districtsList.length} Active Districts`)
                                    : (language === 'ta' ? '38 மாவட்டங்கள் கண்காணிக்கப்படுகின்றன' : '38 Districts Monitored')}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                                <thead className="bg-darker/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-panelBorder">
                                    <tr>
                                        <th className="p-3.5">{language === 'ta' ? 'மாவட்டம்' : 'District'}</th>
                                        <th className="p-3.5">{language === 'ta' ? 'விலைப்பட்டியல்கள்' : 'Active Invoices'}</th>
                                        <th className="p-3.5">{language === 'ta' ? 'மொத்த மின்கட்டணம்' : 'Total Billed (₹)'}</th>
                                        <th className="p-3.5">{language === 'ta' ? 'செலுத்தப்பட்டது (PAID)' : 'Collected (₹)'}</th>
                                        <th className="p-3.5">{language === 'ta' ? 'நிலுவை (UNPAID)' : 'Outstanding (₹)'}</th>
                                        <th className="p-3.5">{language === 'ta' ? 'வசூல் சதவீதம்' : 'Collection Rate'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-panelBorder/60 font-mono">
                                    {(districtsList.length > 0 ? districtsList : ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli']).map((d) => {
                                        const distBills = bills.filter(b => b.district?.toLowerCase() === d?.toLowerCase());
                                        const billed = distBills.reduce((acc, c) => acc + (c.totalAmount || 0), 0);
                                        const paid = distBills.filter(b => b.status === 'PAID').reduce((acc, c) => acc + (c.totalAmount || 0), 0);
                                        const pending = distBills.filter(b => b.status !== 'PAID').reduce((acc, c) => acc + (c.totalPayable || 0), 0);
                                        const rate = billed > 0 ? Math.round((paid / billed) * 100) : (distBills.length === 0 ? 94 : 0);

                                        return (
                                            <tr key={d} className="hover:bg-darker/40 transition">
                                                <td className="p-3.5 font-sans font-bold text-white flex items-center gap-2">
                                                    <MapPin size={13} className="text-gold-500 shrink-0" />
                                                    <span>{formatDistrict(d, language)}</span>
                                                </td>
                                                <td className="p-3.5 text-slate-300">
                                                    {distBills.length}
                                                </td>
                                                <td className="p-3.5 font-bold text-white">
                                                    ₹{billed.toLocaleString()}
                                                </td>
                                                <td className="p-3.5 text-emerald-400 font-bold">
                                                    ₹{paid.toLocaleString()}
                                                </td>
                                                <td className="p-3.5 text-amber-400">
                                                    ₹{pending.toLocaleString()}
                                                </td>
                                                <td className="p-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${rate >= 75 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                                                            {rate}%
                                                        </span>
                                                        <div className="w-16 bg-darker h-1.5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-slate-600'}`} style={{ width: `${rate}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Fine Surcharge Modal */}
            {fineModalBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-panel border border-red-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-panelBorder pb-3">
                            <div className="flex items-center gap-2.5 text-red-400">
                                <ShieldAlert size={22} />
                                <h3 className="text-base font-extrabold text-white">
                                    {language === 'ta' ? 'தாமத அபராதக் கட்டணம் நிர்ணயம்' : 'Impose Surcharge / Fine'}
                                </h3>
                            </div>
                            <button onClick={() => setFineModalBill(null)} className="text-slate-400 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-dark border border-panelBorder text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-400">{language === 'ta' ? 'நுகர்வோர்:' : 'Consumer:'}</span>
                                <span className="font-bold text-white">{fineModalBill.userName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">{language === 'ta' ? 'இணைப்பு எண்:' : 'Service No:'}</span>
                                <span className="font-mono text-gold-400">{fineModalBill.serviceNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">{language === 'ta' ? 'அடிப்படை மின்கட்டணம்:' : 'Base Bill:'}</span>
                                <span className="font-bold text-white">₹{fineModalBill.totalAmount?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                {language === 'ta' ? 'அபராதத் தொகை (₹)' : 'Fine Amount (₹)'} *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="10"
                                value={customFineAmount}
                                onChange={(e) => setCustomFineAmount(Number(e.target.value))}
                                className="w-full bg-dark border border-panelBorder text-white text-sm p-2.5 rounded-xl focus:border-red-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                {language === 'ta' ? 'காரணம் (Reason / Remarks)' : 'Reason / Statutory Clause'}
                            </label>
                            <textarea
                                rows="2"
                                value={customFineReason}
                                onChange={(e) => setCustomFineReason(e.target.value)}
                                placeholder="e.g., TANGEDCO Late Payment Surcharge (LPSC) for exceeding statutory due date"
                                className="w-full bg-dark border border-panelBorder text-white text-xs p-2.5 rounded-xl focus:border-red-500 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setFineModalBill(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white bg-dark border border-panelBorder cursor-pointer"
                            >
                                {t('admin.cancel', 'Cancel')}
                            </button>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleApplyFine}
                                className="px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white transition cursor-pointer shadow-lg shadow-red-500/20"
                            >
                                {actionLoading ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Applying...') : (language === 'ta' ? 'அபராதம் விதிக்க' : 'Impose Fine & Alert')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KYC Inspection Modal */}
            {selectedConsumer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                    <div className="bg-panel border border-panelBorder rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-panelBorder bg-darker flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-white">{selectedConsumer.user?.name}</h3>
                                <p className="text-xs text-gold-400 font-mono">{selectedConsumer.serviceNumber}</p>
                            </div>
                            <button onClick={() => setSelectedConsumer(null)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-xs bg-dark p-4 rounded-xl border border-panelBorder">
                                <div>
                                    <span className="text-slate-500">{language === 'ta' ? 'மின்னஞ்சல்:' : 'Email:'}</span>
                                    <p className="font-bold text-white">{selectedConsumer.user?.email}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">{language === 'ta' ? 'இணைப்பு வகை:' : 'Category:'}</span>
                                    <p className="font-bold text-white">{formatCategory(selectedConsumer.connectionType, language)}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">{language === 'ta' ? 'மாவட்டம்:' : 'District:'}</span>
                                    <p className="font-bold text-white">{formatDistrict(selectedConsumer.district || selectedConsumer.user?.district, language)}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">{language === 'ta' ? 'சரிபார்ப்பு நிலை:' : 'Status:'}</span>
                                    <p className="font-bold text-gold-400">{formatVerificationStatus(selectedConsumer.verificationStatus, language)}</p>
                                </div>
                            </div>

                            {/* Documents list */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold uppercase text-slate-400">{t('admin.documents')}</h4>
                                {(selectedConsumer.kycDocuments || selectedConsumer.user?.kycDocuments || []).length === 0 ? (
                                    <p className="text-xs text-slate-500 italic p-4 bg-dark rounded-xl text-center">
                                        {language === 'ta' ? 'பதிவேற்றப்பட்ட ஆவணங்கள் எதுவும் இல்லை.' : 'No identity/property tax proof documents uploaded yet.'}
                                    </p>
                                ) : (
                                    (selectedConsumer.kycDocuments || selectedConsumer.user?.kycDocuments || []).map((doc, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-dark border border-panelBorder flex justify-between items-center text-xs">
                                            <span className="font-mono text-slate-300 truncate max-w-xs">{doc}</span>
                                            <a
                                                href={`http://127.0.0.1:5000${doc}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gold-400 hover:text-gold-300 font-bold flex items-center gap-1"
                                            >
                                                <span>View</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t border-panelBorder bg-darker flex justify-between items-center">
                            <button
                                onClick={() => setSelectedConsumer(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-dark"
                            >
                                {t('admin.close', 'Close')}
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleStatusUpdate(selectedConsumer._id, 'REJECTED')}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400"
                                >
                                    {t('admin.rejectApplication', 'Reject')}
                                </button>
                                <button
                                    onClick={() => handleStatusUpdate(selectedConsumer._id, 'APPROVED')}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gold-500 hover:bg-gold-400 text-darker"
                                >
                                    {t('admin.approveKyc', 'Approve e-KYC')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
