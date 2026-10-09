import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import {
    Zap,
    Activity,
    Calculator,
    ShieldCheck,
    ArrowUpRight,
    TrendingUp,
    Upload,
    FileText,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Home,
    Trash2,
    ExternalLink,
    X,
    LayoutDashboard
} from 'lucide-react';

export default function Dashboard() {
    const { user, setUser } = useContext(AuthContext);
    const { t, language } = useLanguage();

    // KYC Upload & File Management states
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('AADHAR');
    const [uploading, setUploading] = useState(false);
    const [deletingDoc, setDeletingDoc] = useState(null);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [invoiceNotice, setInvoiceNotice] = useState('');
    const fileInputRef = useRef(null);

    // Close modal popup window on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && confirmDeleteDoc) {
                setConfirmDeleteDoc(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmDeleteDoc]);

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const handleRemoveSelectedFile = () => {
        setFile(null);
        setUploadError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleChangeSelectedFile = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleDownloadInvoice = async () => {
        setDownloadingInvoice(true);
        setInvoiceNotice('');
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
            console.error('Invoice download error:', error);
            setInvoiceNotice(language === 'ta' ? 'பதிவிறக்கம் செய்ய வரி விலைப்பட்டியல் கிடைக்கவில்லை.' : 'No available official tax invoice found to download.');
        } finally {
            setDownloadingInvoice(false);
        }
    };

    const handleKycUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setUploadError('Please choose a PDF or image file to upload.');
            return;
        }

        setUploading(true);
        setUploadError('');
        setUploadSuccess('');

        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', docType);

        try {
            const { data } = await api.post('/auth/kyc/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (data.success) {
                setUploadSuccess(t('kycSubmittedSuccess', 'KYC document submitted successfully. Admin verification is pending.'));
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                // Update local user state
                if (setUser) {
                    setUser(prev => ({
                        ...prev,
                        verificationStatus: 'PENDING',
                        kycDocuments: data.data?.kycDocuments || [...(prev?.kycDocuments || []), data.data?.latestDocument]
                    }));
                }
            }
        } catch (err) {
            console.error('KYC upload error:', err);
            setUploadError(err.response?.data?.message || 'Failed to upload document. Please ensure it is a PDF or Image under 10MB.');
        } finally {
            setUploading(false);
        }
    };

    const getDocUrl = (doc) => {
        if (!doc) return '#';
        if (doc.startsWith('http://') || doc.startsWith('https://')) return doc;
        const base = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api\/?$/, '') : `http://${window.location.hostname || 'localhost'}:5000`;
        return `${base}${doc.startsWith('/') ? '' : '/'}${doc}`;
    };

    const promptDeleteDocument = (docPath) => {
        setConfirmDeleteDoc(docPath);
        setUploadError('');
        setUploadSuccess('');
    };

    const cancelDeleteDocument = () => {
        setConfirmDeleteDoc(null);
    };

    const executeDeleteDocument = async (docPath) => {
        if (!docPath) return;

        setDeletingDoc(docPath);
        setUploadError('');
        setUploadSuccess('');

        try {
            const { data } = await api.delete('/auth/kyc/document', {
                data: { documentPath: docPath }
            });

            if (data.success) {
                setUploadSuccess(t('docDeletedSuccess', 'KYC document removed successfully.'));
                setConfirmDeleteDoc(null);
                if (setUser) {
                    setUser(prev => ({
                        ...prev,
                        kycDocuments: (prev?.kycDocuments || []).filter(d => d !== docPath)
                    }));
                }
            }
        } catch (err) {
            console.error('Delete KYC document error:', err);
            setUploadError(err.response?.data?.message || 'Failed to delete KYC document. Please try again.');
        } finally {
            setDeletingDoc(null);
        }
    };

    const status = user?.verificationStatus || 'PENDING';
    const connectionType = user?.connectionType || 'LT-1A_DOMESTIC';

    return (
        <div className="space-y-8 pb-12 w-full">
            {/* Header Banner */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-panelBorder pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-gold-500" size={30} />
                        <span>{t('dashboard.title', 'Consumer Dashboard')}</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {t('dashboard.welcome', 'Welcome back,')} <span className="text-slate-200 font-semibold">{user?.name}</span>. {t('dashboard.monitoredUnder', 'Monitored under TANGEDCO Supply')} ({connectionType === 'LT-V_COMMERCIAL' ? (language === 'ta' ? 'LT-V வணிகம்' : 'LT-V Commercial') : (language === 'ta' ? 'LT-1A வீட்டு உபயோகம்' : 'LT-1A Domestic')}).
                    </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap overflow-x-auto pb-1 xl:pb-0 shrink-0">
                    {/* Connection Type Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 whitespace-nowrap ${connectionType === 'LT-V_COMMERCIAL'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                        {connectionType === 'LT-V_COMMERCIAL' ? <Building2 size={13} /> : <Home size={13} />}
                        {connectionType === 'LT-V_COMMERCIAL' ? (language === 'ta' ? 'LT-V வணிகம்' : 'LT-V Commercial') : (language === 'ta' ? 'LT-1A வீட்டு உபயோகம்' : 'LT-1A Domestic')}
                    </span>

                    {/* Verification Status Pill */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                        {status === 'APPROVED' ? <CheckCircle2 size={13} /> : status === 'REJECTED' ? <AlertCircle size={13} /> : <Clock size={13} className="animate-spin" />}
                        {t('dashboard.kycStatus', 'KYC Status')}: {status === 'APPROVED' ? (language === 'ta' ? 'அங்கீகரிக்கப்பட்டது' : 'APPROVED') : status === 'REJECTED' ? (language === 'ta' ? 'மறுபரிசீலனை தேவை' : 'REVISE DOCUMENTS') : (language === 'ta' ? 'சரிபார்ப்பு நிலுவையில்' : 'PENDING VERIFICATION')}
                    </span>

                    {/* Tax Invoice Download Quick Action */}
                    <button
                        onClick={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-300 hover:text-gold-400 transition cursor-pointer shadow-sm disabled:opacity-50 shrink-0 whitespace-nowrap"
                        title="Download official TANGEDCO tax invoice"
                    >
                        {downloadingInvoice ? (
                            <>
                                <div className="w-3 h-3 border-2 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                                {language === 'ta' ? 'பதிவிறக்குகிறது...' : 'Streaming...'}
                            </>
                        ) : (
                            <>
                                <FileText size={13} className="text-gold-500" />
                                {t('dashboard.downloadInvoice', 'Tax Invoice (PDF)')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* In-Page Invoice Notification Banner */}
            {invoiceNotice && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle size={16} className="shrink-0" />
                        <span className="font-medium">{invoiceNotice}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setInvoiceNotice('')}
                        className="text-amber-400 hover:text-amber-200 p-1 rounded hover:bg-amber-500/20 transition cursor-pointer"
                        title="Dismiss"
                        aria-label="Dismiss notice"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-panel border border-panelBorder p-5 rounded-xl relative overflow-hidden group hover:border-gold-500/40 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">{t('connectionId')}</p>
                            <ShieldCheck size={18} className="text-gold-500" />
                        </div>
                        <p className="mt-3 text-xl font-mono font-bold text-white tracking-wide">
                            {user?.serviceNumber || '04-123-001234'}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        {connectionType === 'LT-V_COMMERCIAL' ? (language === 'ta' ? 'LT-V வணிகக் கட்டண முறை' : 'LT-V Commercial Tariff') : (language === 'ta' ? 'LT-1A வீட்டு உபயோகம் (1 Phase)' : 'LT-1A Domestic (1 Phase)')}
                    </p>
                </div>

                <div className="bg-panel border border-panelBorder p-5 rounded-xl relative overflow-hidden group hover:border-gold-500/40 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">{t('currentLoad')}</p>
                            <Zap size={18} className="text-gold-500" />
                        </div>
                        <p className="mt-3 text-2xl font-bold text-white tracking-wide">
                            {user?.sanctionedLoadKw || 2.0} <span className="text-sm font-normal text-slate-400">kW</span>
                        </p>
                    </div>
                    <p className="text-xs text-emerald-400 mt-2">{t('sanctionedCapacity')}</p>
                </div>

                <div className="bg-panel border border-panelBorder p-5 rounded-xl relative overflow-hidden group hover:border-gold-500/40 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">{t('tariffStructure')}</p>
                            <TrendingUp size={18} className="text-gold-500" />
                        </div>
                        <p className="mt-3 text-xl font-bold text-white tracking-wide">
                            {connectionType === 'LT-V_COMMERCIAL' ? t('nonTelescopic') : t('telescopic')}
                        </p>
                    </div>
                    <p className="text-xs text-gold-400 mt-2">
                        {connectionType === 'LT-V_COMMERCIAL' ? (language === 'ta' ? '₹110/kW நிலைக்கட்டணம் + 5% வரி' : '₹110/kW Demand + 5% Tax') : t('dashboard.freeSubsidy', '200 Free Units Subsidy Applied')}
                    </p>
                </div>

                <div className="bg-panel border border-panelBorder p-5 rounded-xl relative overflow-hidden group hover:border-gold-500/40 transition-all flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">{t('smartMeter')}</p>
                            <Activity size={18} className="text-gold-500" />
                        </div>
                        <p className="mt-3 text-2xl font-bold text-white tracking-wide">{language === 'ta' ? 'தயார்' : 'Ready'}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{t('iotActive')}</p>
                </div>
            </div>

            {/* KYC Document Upload Section (Shown when Pending or Unapproved, or showing verified files) */}
            {status !== 'APPROVED' ? (
                <div className="bg-panel border border-gold-500/30 rounded-xl p-6 relative overflow-hidden shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-500">
                                <FileText size={22} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('uploadKycTitle')}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {t('uploadKycDesc')}
                                </p>
                            </div>
                        </div>

                        <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 self-start md:self-auto">
                            {t('actionRequired', 'Action Required')}
                        </span>
                    </div>

                    {uploadSuccess && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {uploadSuccess}
                        </div>
                    )}

                    {uploadError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                            <AlertCircle size={16} />
                            {uploadError}
                        </div>
                    )}

                    <form onSubmit={handleKycUpload} className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
                        <div className="xl:col-span-4 flex flex-col justify-end">
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-2 h-4 truncate">{t('documentType', 'Document Type')}</label>
                            <select
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                                className="w-full h-11 bg-darker border border-panelBorder rounded-lg px-3 text-sm text-white focus:outline-none focus:border-gold-500"
                            >
                                <option value="AADHAR">{t('docTypeAadhar', 'Aadhar Card (Identity Proof)')}</option>
                                <option value="PROPERTY_TAX">{t('docTypePropertyTax', 'Property Tax Receipt (Address Proof)')}</option>
                                <option value="COMMERCIAL_LICENSE">{t('docTypeCommercialLicense', 'Commercial Trade License')}</option>
                            </select>
                        </div>

                        <div className="xl:col-span-5 flex flex-col justify-end">
                            <div className="flex items-center justify-between mb-2 h-4">
                                <label className="block text-xs font-bold uppercase text-slate-400 truncate">
                                    {file ? t('selectedDoc', 'Selected Document (Max 10MB)') : t('attachDoc', 'Attach PDF / Image (Max 10MB)')}
                                </label>
                                {file && (
                                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-semibold shrink-0">
                                        <CheckCircle2 size={12} /> {language === 'ta' ? 'தயார்' : 'Ready'}
                                    </span>
                                )}
                            </div>

                            {/* Hidden native file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/webp"
                                onChange={(e) => {
                                    setFile(e.target.files?.[0] || null);
                                    setUploadError('');
                                }}
                                className="hidden"
                            />

                            {/* Custom Bilingual File Selector when no file staged */}
                            {!file && (
                                <div
                                    onClick={handleChangeSelectedFile}
                                    className="w-full h-11 bg-darker border border-panelBorder hover:border-gold-500/50 rounded-lg px-2.5 flex items-center justify-between cursor-pointer transition select-none gap-2"
                                    title={t('chooseFile', 'Choose File')}
                                >
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20 whitespace-nowrap shrink-0 leading-tight">
                                        {t('chooseFile', 'Choose File')}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono truncate ml-1 text-right flex-1">
                                        {t('noFileChosen', 'No file chosen')}
                                    </span>
                                </div>
                            )}

                            {/* Staged File Card with Change and Remove Actions */}
                            {file && (
                                <div className="flex items-center justify-between h-11 bg-darker border border-gold-500/40 rounded-lg px-3 shadow-sm animate-in fade-in duration-150">
                                    <div className="flex items-center gap-2.5 min-w-0 mr-2">
                                        <div className="p-1.5 rounded-md bg-gold-500/10 border border-gold-500/20 text-gold-400 shrink-0">
                                            <FileText size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-white truncate max-w-[170px] sm:max-w-[220px]" title={file.name}>
                                                {file.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-mono leading-none">
                                                {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleChangeSelectedFile}
                                            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-panel hover:bg-panelBorder border border-panelBorder rounded-md transition cursor-pointer"
                                            title={language === 'ta' ? 'வேறு கோப்பைத் தேர்ந்தெடு' : 'Change selected file'}
                                        >
                                            {language === 'ta' ? 'மாற்று' : 'Change'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveSelectedFile}
                                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-md transition cursor-pointer"
                                            title={t('remove', 'Remove')}
                                                aria-label={t('remove', 'Remove')}
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="xl:col-span-3 flex flex-col justify-end">
                            <div className="h-4 mb-2 hidden xl:block"></div>
                            <button
                                type="submit"
                                disabled={uploading || !file}
                                className="w-full h-11 px-3 bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-darker font-bold rounded-lg text-xs md:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md whitespace-nowrap"
                            >
                                <Upload size={16} className="shrink-0" />
                                {uploading ? t('submitting') : t('uploadButton')}
                            </button>
                        </div>
                    </form>

                    {/* Uploaded Documents List with View & Delete Actions */}
                    {(user?.kycDocuments || []).length > 0 && (
                        <div className="mt-5 pt-4 border-t border-panelBorder">
                            <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText size={13} className="text-gold-500" />
                                    {t('submittedFiles')} ({user.kycDocuments.length}):
                                </span>
                                <span className="text-[11px] text-slate-500 hidden sm:inline">
                                    {t('clickToPreview', 'Click file to preview or remove')}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                                {user.kycDocuments.map((doc, idx) => {
                                    const isDeleting = deletingDoc === doc;
                                    const isTargeted = confirmDeleteDoc === doc;
                                    const fileName = doc.split('/').pop() || `Doc #${idx + 1}`;
                                    const fileUrl = getDocUrl(doc);

                                    return (
                                        <div
                                            key={idx}
                                            className={`group flex items-center bg-darker border rounded-lg pl-3 pr-1.5 py-1.5 transition-all shadow-sm ${isTargeted
                                                ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-500/5'
                                                : 'border-panelBorder hover:border-gold-500/50'
                                                }`}
                                        >
                                            <a
                                                href={fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-mono text-gold-400 group-hover:text-gold-300 hover:underline flex items-center gap-1.5 mr-2 max-w-[200px] truncate"
                                                title={`View document: ${fileName}`}
                                            >
                                                <FileText size={13} className="text-gold-500 shrink-0" />
                                                <span className="truncate">{language === 'ta' ? 'ஆவணம்' : 'Doc'} #{idx + 1} ({fileName.slice(-12)})</span>
                                                <ExternalLink size={11} className="opacity-60 group-hover:opacity-100 shrink-0" />
                                            </a>

                                            <button
                                                type="button"
                                                onClick={() => promptDeleteDocument(doc)}
                                                disabled={isDeleting}
                                                className={`p-1.5 rounded-md transition cursor-pointer disabled:opacity-50 ${isTargeted
                                                    ? 'bg-rose-500 text-white shadow-sm'
                                                    : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/15'
                                                    }`}
                                                title={t('deleteDocument')}
                                                aria-label={`Delete document ${idx + 1}`}
                                            >
                                                {isDeleting ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 size={13} />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (user?.kycDocuments || []).length > 0 ? (
                /* When status is APPROVED but documents are on file */
                <div className="bg-panel border border-emerald-500/30 rounded-xl p-5 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">{t('accreditedKycDocs', 'Accredited KYC Documents')}</h3>
                                <p className="text-xs text-slate-400">{t('officialVerifiedDocs', 'Official verified documents on file with TANGEDCO.')}</p>
                            </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
                            {t('verifiedActive', 'Verified & Active')}
                        </span>
                    </div>

                    {uploadSuccess && (
                        <div className="mb-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                <span>{uploadSuccess}</span>
                            </div>
                            <button onClick={() => setUploadSuccess('')} className="text-emerald-400 hover:text-emerald-300">
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    {uploadError && (
                        <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} />
                                <span>{uploadError}</span>
                            </div>
                            <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-300">
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2.5 pt-3 border-t border-panelBorder">
                        {user.kycDocuments.map((doc, idx) => {
                            const isDeleting = deletingDoc === doc;
                            const isTargeted = confirmDeleteDoc === doc;
                            const fileName = doc.split('/').pop() || `Doc #${idx + 1}`;
                            const fileUrl = getDocUrl(doc);

                            return (
                                <div
                                    key={idx}
                                    className={`group flex items-center bg-darker border rounded-lg pl-3 pr-1.5 py-1.5 transition-all shadow-sm ${isTargeted
                                        ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-500/5'
                                        : 'border-panelBorder hover:border-emerald-500/40'
                                        }`}
                                >
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-mono text-emerald-400 group-hover:text-emerald-300 hover:underline flex items-center gap-1.5 mr-2 max-w-[200px] truncate"
                                        title={`View document: ${fileName}`}
                                    >
                                        <FileText size={13} className="text-emerald-500 shrink-0" />
                                        <span className="truncate">{language === 'ta' ? 'ஆவணம்' : 'Doc'} #{idx + 1} ({fileName.slice(-12)})</span>
                                        <ExternalLink size={11} className="opacity-60 group-hover:opacity-100 shrink-0" />
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => promptDeleteDocument(doc)}
                                        disabled={isDeleting}
                                        className={`p-1.5 rounded-md transition cursor-pointer disabled:opacity-50 ${isTargeted
                                            ? 'bg-rose-500 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/15'
                                            }`}
                                        title={t('deleteDocument')}
                                        aria-label={`Delete document ${idx + 1}`}
                                    >
                                        {isDeleting ? (
                                            <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 size={13} />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {/* Quick Action Navigation Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-panel border border-panelBorder rounded-xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-500">
                                <Calculator size={22} />
                            </div>
                            <h2 className="text-lg font-bold text-white">{t('billEstimator')}</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                            {t('billEstimatorDesc', 'Calculate consumption charges using the official 2026 TANGEDCO telescopic or commercial non-telescopic tariff engines.')}
                        </p>
                    </div>
                    <div>
                        <NavLink
                            to="/calculator"
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-gold-500 text-darker hover:bg-gold-400 transition cursor-pointer shadow-md"
                        >
                            {t('launchEstimator')} <ArrowUpRight size={16} />
                        </NavLink>
                    </div>
                </div>

                <div className="bg-panel border border-panelBorder rounded-xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                <Activity size={22} />
                            </div>
                            <h2 className="text-lg font-bold text-white">{t('liveIotMonitoring')}</h2>
                        </div>
                        <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                            {t('liveIotMonitoringDesc', 'Inspect real-time telemetry from your connected smart meter, including voltage fluctuations, line current, and active wattage.')}
                        </p>
                    </div>
                    <div>
                        <NavLink
                            to="/iot"
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg bg-dark border border-panelBorder text-slate-200 hover:border-gold-500/50 hover:text-gold-400 transition cursor-pointer shadow-sm"
                        >
                            {t('viewTelemetry')} <ArrowUpRight size={16} />
                        </NavLink>
                    </div>
                </div>
            </div>

            {/* In-Page Confirmation Popup Window (Modal Dialog) */}
            {confirmDeleteDoc && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={cancelDeleteDocument}
                >
                    <div
                        className="bg-panel border border-gold-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Top decorative gradient bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-gold-500" />

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={cancelDeleteDocument}
                            disabled={deletingDoc}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:opacity-50"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>

                        {/* Header with Icon */}
                        <div className="flex items-start gap-3.5 mb-4">
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0 shadow-inner">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">
                                    {t('deleteKycModalTitle', 'Delete KYC Document?')}
                                </h3>
                                <p className="text-xs text-rose-300/80 mt-0.5">
                                    {t('deleteKycModalWarning', 'This action is permanent and cannot be undone.')}
                                </p>
                            </div>
                        </div>

                        {/* File Info Box */}
                        <div className="bg-darker/90 border border-panelBorder rounded-xl p-3.5 mb-5 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gold-500/10 text-gold-400 shrink-0">
                                <FileText size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-white truncate" title={confirmDeleteDoc}>
                                    {confirmDeleteDoc.split('/').pop()}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட ஆவணம்' : 'Accredited Verification Document'}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-6">
                            {t('confirmDeleteDoc') || (language === 'ta'
                                ? 'இந்த ஆவணத்தை உங்கள் சுயவிவரத்திலிருந்து நிச்சயமாக நிரந்தரமாக நீக்க விரும்புகிறீர்களா?'
                                : 'Are you sure you want to permanently remove this document from your TANGEDCO KYC records?')}
                        </p>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-panelBorder">
                            <button
                                type="button"
                                onClick={cancelDeleteDocument}
                                disabled={deletingDoc}
                                className="px-4 py-2.5 rounded-xl border border-panelBorder bg-darker hover:bg-dark text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                            >
                                {t('cancel', 'Cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => executeDeleteDocument(confirmDeleteDoc)}
                                disabled={deletingDoc}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50 disabled:opacity-50"
                            >
                                {deletingDoc ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{t('deleting', 'Deleting...')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>{language === 'ta' ? 'ஆம், நீக்கு' : 'Yes, Delete Document'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}