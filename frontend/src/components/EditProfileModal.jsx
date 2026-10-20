import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Hash, 
    Home, 
    Save, 
    X, 
    AlertCircle, 
    CheckCircle2, 
    Building2,
    ShieldCheck
} from 'lucide-react';

const TN_DISTRICTS = [
    { en: 'Ariyalur', ta: 'அரியலூர்' },
    { en: 'Chengalpattu', ta: 'செங்கல்பட்டு' },
    { en: 'Chennai', ta: 'சென்னை' },
    { en: 'Coimbatore', ta: 'கோயம்புத்தூர்' },
    { en: 'Cuddalore', ta: 'கடலூர்' },
    { en: 'Dharmapuri', ta: 'தருமபுரி' },
    { en: 'Dindigul', ta: 'திண்டுக்கல்' },
    { en: 'Erode', ta: 'ஈரோடு' },
    { en: 'Kallakurichi', ta: 'கள்ளக்குறிச்சி' },
    { en: 'Kanchipuram', ta: 'காஞ்சிபுரம்' },
    { en: 'Kanyakumari', ta: 'கன்னியாகுமரி' },
    { en: 'Karur', ta: 'கரூர்' },
    { en: 'Krishnagiri', ta: 'கிருஷ்ணகிரி' },
    { en: 'Madurai', ta: 'மதுரை' },
    { en: 'Mayiladuthurai', ta: 'மயிலாடுதுறை' },
    { en: 'Nagapattinam', ta: 'நாகப்பட்டினம்' },
    { en: 'Namakkal', ta: 'நாமக்கல்' },
    { en: 'Nilgiris', ta: 'நீலகிரி' },
    { en: 'Perambalur', ta: 'பெரம்பலூர்' },
    { en: 'Pudukkottai', ta: 'புதுக்கோட்டை' },
    { en: 'Ramanathapuram', ta: 'இராமநாதபுரம்' },
    { en: 'Ranipet', ta: 'ராணிப்பேட்டை' },
    { en: 'Salem', ta: 'சேலம்' },
    { en: 'Sivaganga', ta: 'சிவகங்கை' },
    { en: 'Tenkasi', ta: 'தென்காசி' },
    { en: 'Thanjavur', ta: 'தஞ்சாவூர்' },
    { en: 'Theni', ta: 'தேனி' },
    { en: 'Thoothukudi', ta: 'தூத்துக்குடி' },
    { en: 'Tiruchirappalli', ta: 'திருச்சிராப்பள்ளி' },
    { en: 'Tirunelveli', ta: 'திருநெல்வேலி' },
    { en: 'Tirupathur', ta: 'திருப்பத்தூர்' },
    { en: 'Tiruppur', ta: 'திருப்பூர்' },
    { en: 'Tiruvallur', ta: 'திருவள்ளூர்' },
    { en: 'Tiruvannamalai', ta: 'திருவண்ணாமலை' },
    { en: 'Tiruvarur', ta: 'திருவாரூர்' },
    { en: 'Vellore', ta: 'வேலூர்' },
    { en: 'Viluppuram', ta: 'விழுப்புரம்' },
    { en: 'Virudhunagar', ta: 'விருதுநகர்' }
];

export default function EditProfileModal({ isOpen, onClose, onProfileUpdated, targetConsumer = null }) {
    const { user: currentUser, setUser } = useContext(AuthContext);
    const { language } = useLanguage();

    // If targetConsumer provided (e.g. from Admin portal), use it; otherwise use logged-in user
    const effectiveUser = targetConsumer?.user || targetConsumer || currentUser;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [street, setStreet] = useState('');
    const [district, setDistrict] = useState('Chennai');
    const [pincode, setPincode] = useState('');
    const [serviceNumber, setServiceNumber] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (effectiveUser) {
            setName(effectiveUser.name || '');
            setEmail(effectiveUser.email || '');
            setPhone(effectiveUser.phone || targetConsumer?.phone || '');
            
            const rawAddr = effectiveUser.address || targetConsumer?.address || {};
            setStreet(typeof rawAddr === 'string' ? rawAddr : (rawAddr.street || ''));
            setDistrict(effectiveUser.district || targetConsumer?.district || rawAddr.district || 'Chennai');
            setPincode(rawAddr.pincode || effectiveUser.pincode || '');
            setServiceNumber(effectiveUser.serviceNumber || targetConsumer?.serviceNumber || '');
        }
        setError('');
        setSuccessMsg('');
    }, [effectiveUser, targetConsumer, isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!name.trim()) {
            setError(language === 'ta' ? 'பெயர் அவசியமானது.' : 'Full name is required.');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setError(language === 'ta' ? 'சரியான மின்னஞ்சலை உள்ளிடவும்.' : 'Please provide a valid email address.');
            return;
        }

        setLoading(true);
        try {
            const targetId = targetConsumer?._id || targetConsumer?.user?._id || (effectiveUser && effectiveUser._id !== currentUser?._id ? effectiveUser._id : null);
            const endpoint = (targetId && currentUser?.role === 'ADMIN')
                ? `/admin/consumer/${targetId}/profile`
                : '/auth/profile';

            const payload = {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                street: street.trim(),
                address: {
                    street: street.trim(),
                    city: district,
                    district: district,
                    pincode: pincode.trim()
                },
                district: district,
                pincode: pincode.trim(),
                serviceNumber: serviceNumber.trim(),
                consumerId: targetConsumer?._id || undefined,
                userId: targetConsumer?.user?._id || (effectiveUser && effectiveUser._id !== currentUser?._id ? effectiveUser._id : undefined)
            };

            const { data } = await api.put(endpoint, payload);

            if (data.success) {
                setSuccessMsg(language === 'ta' 
                    ? 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது.' 
                    : 'Consumer profile updated successfully.');

                // If updating logged in user, update AuthContext
                const isSelf = !targetConsumer || 
                               targetConsumer._id === currentUser?._id || 
                               effectiveUser?._id === currentUser?._id ||
                               email.trim().toLowerCase() === currentUser?.email?.toLowerCase();
                if (isSelf && setUser) {
                    setUser(prev => ({
                        ...prev,
                        ...(data.data || {}),
                        address: data.data?.address || payload.address
                    }));
                }

                if (onProfileUpdated) {
                    onProfileUpdated(data.data);
                }

                setTimeout(() => {
                    onClose();
                }, 1200);
            }
        } catch (err) {
            console.error('Update profile error:', err);
            setError(err.response?.data?.message || (language === 'ta' 
                ? 'சுயவிவரத்தைப் புதுப்பிப்பதில் தோல்வி ஏற்பட்டது.' 
                : 'Failed to update consumer profile. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                className="bg-panel border border-panelBorder rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-5 border-b border-panelBorder bg-darker flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-400">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-white">
                                {language === 'ta' ? 'நுகர்வோர் சுயவிவரத்தைத் திருத்து' : 'Edit Consumer Profile'}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {language === 'ta' ? 'உங்கள் பெயர், முகவரி மற்றும் இணைப்பு விவரங்களைப் புதுப்பிக்கவும்' : 'Update your personal identity, contact, and TANGEDCO connection details'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                {language === 'ta' ? 'முழுப் பெயர்' : 'Full Name'} *
                            </label>
                            <div className="relative">
                                <User size={15} className="absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Rm Sudhakar"
                                    required
                                    className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Email Address */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                {language === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Email Address'} *
                            </label>
                            <div className="relative">
                                <Mail size={15} className="absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    required
                                    className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                {language === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'}
                            </label>
                            <div className="relative">
                                <Phone size={15} className="absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Service Connection Number */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                {language === 'ta' ? 'மின் இணைப்பு எண்' : 'Service Connection Number'}
                            </label>
                            <div className="relative">
                                <Hash size={15} className="absolute left-3 top-3 text-gold-500" />
                                <input
                                    type="text"
                                    value={serviceNumber}
                                    onChange={(e) => setServiceNumber(e.target.value)}
                                    placeholder="e.g., 04-123-001234"
                                    className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-gold-400 font-mono placeholder:text-slate-600 focus:border-gold-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* District Dropdown */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                {language === 'ta' ? 'மாவட்டம்' : 'District'} *
                            </label>
                            <div className="relative">
                                <MapPin size={15} className="absolute left-3 top-3 text-slate-500" />
                                <select
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                    className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
                                >
                                    {TN_DISTRICTS.map((d) => (
                                        <option key={d.en} value={d.en}>
                                            {language === 'ta' ? `${d.ta} (${d.en})` : d.en}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Postal PIN Code */}
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                                {language === 'ta' ? 'அஞ்சல் குறியீட்டு எண்' : 'PIN Code'}
                            </label>
                            <div className="relative">
                                <Building2 size={15} className="absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    value={pincode}
                                    maxLength={6}
                                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="e.g., 600002"
                                    className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:border-gold-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Street Address */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                            {language === 'ta' ? 'வீட்டு எண் & தெரு முகவரி' : 'Door / Flat No, Street Address'}
                        </label>
                        <div className="relative">
                            <Home size={15} className="absolute left-3 top-3 text-slate-500" />
                            <textarea
                                rows={2}
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder="e.g., Door No. 14, Anna Salai, Guindy"
                                className="w-full bg-darker border border-panelBorder rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-gold-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Modal Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-panelBorder">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white bg-dark border border-panelBorder transition cursor-pointer"
                        >
                            {language === 'ta' ? 'ரத்துசெய்' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gold-500 hover:bg-gold-400 text-darker transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-darker border-t-transparent rounded-full animate-spin" />
                                    <span>{language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...'}</span>
                                </>
                            ) : (
                                <>
                                    <Save size={14} />
                                    <span>{language === 'ta' ? 'சுயவிவரத்தைச் சேமி' : 'Save Changes'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
