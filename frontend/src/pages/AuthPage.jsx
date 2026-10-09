import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { Zap, Activity, BrainCircuit, Sun, ArrowRight, ShieldCheck, Eye, EyeOff, User, KeyRound, CheckCircle2, ArrowLeft, Globe, Sparkles, Mail, ExternalLink, X, Copy, Check, Inbox, MapPin } from 'lucide-react';

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

export default function AuthPage() {
    const { user, login, register, googleLogin } = useContext(AuthContext);
    const { t, language, toggleLanguage } = useLanguage();
    const navigate = useNavigate();

    // Auto-Redirect: If user is already authenticated, route them to their designated portal
    useEffect(() => {
        if (user) {
            const targetPath = user.role === 'ADMIN' ? '/admin' : '/dashboard';
            navigate(targetPath, { replace: true });
        }
    }, [user, navigate]);

    const [activeTab, setActiveTab] = useState('hero'); // 'hero' | 'login' | 'register' | 'forgot-password'
    const [loginRole, setLoginRole] = useState('CONSUMER');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Initial state without hardcoded consumer placeholders or credentials
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [regData, setRegData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        serviceNumber: '',
        connectionType: 'LT-1A_DOMESTIC',
        district: 'Chennai',
        sanctionedLoadKw: 2.0
    });

    // Google Onboarding State (for new Google sign-ups requiring service number, category, load)
    const [googleOnboarding, setGoogleOnboarding] = useState(null); // { profile, accessToken, serviceNumber, connectionType, sanctionedLoadKw }

    // Forgot Password States
    const [forgotStep, setForgotStep] = useState(1); // 1: Enter email, 2: Enter code + new password
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [generatedCodeNotice, setGeneratedCodeNotice] = useState('');
    const [inboxModalOpen, setInboxModalOpen] = useState(false);
    const [latestEmailData, setLatestEmailData] = useState(null);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    const handleFetchLatestEmail = async () => {
        setLoadingEmail(true);
        try {
            const res = await api.get(`/auth/latest-email?email=${encodeURIComponent(forgotEmail.trim())}`);
            if (res.data?.success && res.data?.data) {
                setLatestEmailData(res.data.data);
                setInboxModalOpen(true);
            } else {
                setError(language === 'ta' ? 'அனுப்பப்பட்ட மின்னஞ்சல் கிடைக்கவில்லை.' : 'No dispatched email found for this address.');
            }
        } catch (err) {
            setError(language === 'ta' ? 'அனுப்பப்பட்ட மின்னஞ்சல் முன்னோட்டம் கிடைக்கவில்லை.' : 'Dispatched email preview is not yet available.');
        } finally {
            setLoadingEmail(false);
        }
    };

    // Ensure all forms and fields are completely reset whenever user logs out or lands on AuthPage
    useEffect(() => {
        setLoginData({ email: '', password: '' });
        setRegData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            serviceNumber: '',
            connectionType: 'LT-1A_DOMESTIC',
            district: 'Chennai',
            sanctionedLoadKw: 2.0
        });
        setGoogleOnboarding(null);
        setLoginRole('CONSUMER');
        setError('');
        setSuccessMessage('');
        setForgotEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setGeneratedCodeNotice('');
        setForgotStep(1);
    }, [user]);

    const handleRoleSwitch = (role) => {
        setLoginRole(role);
        setError('');
        setSuccessMessage('');
        // Always reset inputs clean on role switch
        setLoginData({ email: '', password: '' });
    };

    const handleLoadDemoAdmin = () => {
        setLoginRole('ADMIN');
        setLoginData({ email: 'admin@smarttn.gov', password: 'adminpassword123' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const trimmedEmail = loginData.email.trim();
            const result = await login(trimmedEmail, loginData.password);

            if (result && result.success) {
                const targetPath = result.user?.role === 'ADMIN' || loginRole === 'ADMIN' ? '/admin' : '/dashboard';
                navigate(targetPath, { replace: true });
            } else {
                setError(result?.message || 'Invalid email or password. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'An unexpected connection error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (regData.password !== regData.confirmPassword) {
            setError("Passwords do not match. Please try again.");
            return;
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(regData.password)) {
            setError("Password must be at least 8 characters long and contain at least one letter and one number.");
            return;
        }

        setLoading(true);
        try {
            const cleanRegData = { ...regData, email: regData.email.trim() };
            const result = await register(cleanRegData);

            if (result && result.success) {
                navigate('/dashboard', { replace: true });
            } else {
                setError(result?.message || 'Registration failed. Check your details.');
            }
        } catch (err) {
            setError(err.message || 'Registration failed due to a server error.');
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 1: Request verification code
    const handleRequestResetCode = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setError('');
        setSuccessMessage('');
        setGeneratedCodeNotice('');
        const trimmedEmail = forgotEmail.trim();

        if (!trimmedEmail) {
            setError(language === 'ta' ? 'தயவுசெய்து உங்கள் பதிவுசெய்த மின்னஞ்சல் முகவரியை உள்ளிடவும்.' : 'Please enter your registered email address.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email: trimmedEmail });
            if (res.data?.success) {
                setForgotStep(2);
                if (res.data.previewCode) {
                    setGeneratedCodeNotice(res.data.previewCode);
                    setResetCode(res.data.previewCode);
                } else {
                    setResetCode('');
                    setGeneratedCodeNotice('');
                }
                setSuccessMessage(res.data.message || t('auth.codeSentSuccess', 'A 6-digit verification code has been sent to your email address.'));
            } else {
                setError(res.data?.message || 'Failed to send verification code.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Error sending verification code. Verify your email.');
        } finally {
            setLoading(false);
        }
    };

    // Forgot Password Step 2: Submit verification code and new password
    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!resetCode.trim()) {
            setError('Please enter the 6-digit verification code.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError("New passwords do not match. Please verify.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/reset-password', {
                email: forgotEmail.trim(),
                resetCode: resetCode.trim(),
                newPassword: newPassword
            });

            if (res.data?.success) {
                setSuccessMessage(t('auth.passwordResetSuccess', 'Your password has been reset successfully! Please sign in with your new password.'));
                // Clear fields and switch back to login
                setLoginData({ email: forgotEmail.trim(), password: '' });
                setNewPassword('');
                setConfirmNewPassword('');
                setResetCode('');
                setGeneratedCodeNotice('');
                setForgotStep(1);
                setTimeout(() => {
                    setActiveTab('login');
                }, 1500);
            } else {
                setError(res.data?.message || 'Failed to reset password.');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Invalid or expired verification code.');
        } finally {
            setLoading(false);
        }
    };

    // Google SSO Handler with OAuth popup flow
    const triggerGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setError('');
            setLoading(true);
            try {
                const result = await googleLogin({ accessToken: tokenResponse.access_token });
                if (result && result.requiresOnboarding) {
                    // Prompt user for their service number, connection category, and sanctioned load
                    setGoogleOnboarding({
                        profile: result.profile,
                        accessToken: tokenResponse.access_token,
                        serviceNumber: '',
                        connectionType: 'LT-1A_DOMESTIC',
                        district: 'Chennai',
                        sanctionedLoadKw: 2.0
                    });
                } else if (result && result.success) {
                    const targetPath = result.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                    navigate(targetPath, { replace: true });
                } else {
                    setError(result?.message || 'Google sign-in failed.');
                }
            } catch (err) {
                setError(err.message || 'An unexpected Google authentication error occurred.');
            } finally {
                setLoading(false);
            }
        },
        onError: (errorResponse) => {
            console.error('Google Sign-in error:', errorResponse);
            setError('Google Sign-In failed or was cancelled.');
        }
    });

    // Handle Google Onboarding Complete Submission
    const handleGoogleOnboardingSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!googleOnboarding?.serviceNumber?.trim()) {
            setError('Please enter your valid TNEB Service Number.');
            return;
        }

        setLoading(true);
        try {
            const result = await googleLogin({
                accessToken: googleOnboarding.accessToken,
                serviceNumber: googleOnboarding.serviceNumber.trim(),
                connectionType: googleOnboarding.connectionType,
                district: googleOnboarding.district || 'Chennai',
                sanctionedLoadKw: Number(googleOnboarding.sanctionedLoadKw) || 2.0
            });

            if (result && result.success) {
                setGoogleOnboarding(null);
                const targetPath = result.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
                navigate(targetPath, { replace: true });
            } else {
                setError(result?.message || 'Failed to complete registration.');
            }
        } catch (err) {
            setError(err.message || 'Registration error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-darker text-slate-200 relative overflow-x-hidden selection:bg-gold-500 selection:text-darker">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[15%] left-[10%] w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[140px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[130px]"></div>
                <div className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
            </div>

            {/* ========================================================= */}
            {/* VIEW 1: DEDICATED FULL-WIDTH HERO / LANDING PAGE          */}
            {/* ========================================================= */}
            {activeTab === 'hero' && (
                <div className="relative z-10 min-h-screen flex flex-col justify-between">
                    {/* Top Landing Navigation Bar */}
                    <header className="border-b border-panelBorder/70 bg-darker/80 backdrop-blur-md sticky top-0 z-30">
                        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
                            {/* Brand Logo */}
                            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
                                <div className="w-8 h-8 sm:w-11 sm:h-11 bg-gold-500/10 rounded-xl flex items-center justify-center border border-gold-500/30 shadow-lg shadow-gold-500/5 shrink-0">
                                    <Zap className="text-gold-500" size={17} />
                                </div>
                                <div className="shrink-0">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <h1 className="text-sm sm:text-lg lg:text-xl font-extrabold text-white tracking-wide sm:tracking-wider uppercase whitespace-nowrap">
                                            Smart TN <span className="text-gold-500 hidden sm:inline">{language === 'ta' ? 'மின்சாரம்' : 'Electricity'}</span>
                                        </h1>
                                        <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                            TNERC 2026
                                        </span>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden md:block truncate">
                                        {t('app.fullName', 'Tamil Nadu Generation and Distribution Corporation')}
                                    </p>
                                </div>
                            </div>

                            {/* Top Navigation CTAs & Language Switcher */}
                            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                {/* Language Switcher Toggle */}
                                <button
                                    type="button"
                                    onClick={toggleLanguage}
                                    className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-panel/90 hover:bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-200 hover:text-gold-400 font-semibold text-xs transition-all shadow-md backdrop-blur group cursor-pointer shrink-0"
                                    title={language === 'en' ? 'தமிழில் மாற்றவும்' : 'Switch to English'}
                                >
                                    <Globe size={13} className="text-gold-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
                                    <span className="tracking-wide hidden md:inline">{language === 'en' ? 'தமிழ்' : 'English'}</span>
                                    <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-dark border border-panelBorder text-gold-400">
                                        {language.toUpperCase()}
                                    </span>
                                </button>

                                {/* Sign In Button */}
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-panel hover:bg-dark border border-panelBorder hover:border-gold-500/50 text-slate-200 hover:text-gold-400 font-bold text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer shadow-md shrink-0 whitespace-nowrap"
                                >
                                    {t('auth.login', 'Sign In')}
                                </button>

                                {/* Register CTA (Shown on tablet/desktop, mobile has hero CTA) */}
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
                                    className="hidden sm:inline-flex px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-xs sm:text-sm uppercase tracking-wider transition shadow-lg shadow-gold-500/10 cursor-pointer items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap"
                                >
                                    <span>{t('auth.register', 'Register')}</span>
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Hero Body Content */}
                    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center my-auto">
                        {/* Sparkle Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm backdrop-blur animate-fadeIn">
                            <Sparkles size={14} className="animate-pulse text-gold-400" />
                            <span>{t('hero.badge', 'TNERC 2026 TARIFF ENGINE & REAL-TIME IOT')}</span>
                        </div>

                        {/* Hero Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.15] mb-6 tracking-tight max-w-4xl mx-auto">
                            <span className="block">{t('hero.titlePrefix', 'The Future of')}</span>
                            <span className="block mt-1 sm:mt-2 text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-yellow-400 to-amber-500">
                                {t('hero.titleHighlight', 'Energy Management')}
                            </span>
                        </h1>

                        {/* Hero Subtitle */}
                        <p className="text-slate-300 text-base sm:text-lg lg:text-xl mb-10 leading-relaxed font-normal max-w-3xl mx-auto">
                            {t('hero.subtitle', 'A unified smart power platform integrating official TANGEDCO 2026 tariff regulations with real-time IoT smart meter telemetry, AI peak load insights, and subsidy cliff alerts.')}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 max-w-xl mx-auto">
                            <button
                                type="button"
                                onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
                                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-2xl bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-gold-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
                            >
                                <span>{t('auth.getStarted', 'Get Started')}</span>
                                <ArrowRight size={18} />
                            </button>

                            <button
                                type="button"
                                onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-2xl bg-panel/90 hover:bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-200 hover:text-white font-bold text-sm sm:text-base uppercase tracking-wider shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
                            >
                                <User size={18} className="text-gold-400" />
                                <span>{t('auth.signInToPortal', 'Access Portal')}</span>
                            </button>
                        </div>

                        {/* 4 Feature Highlights Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left mb-12">
                            {/* Feature 1 */}
                            <div className="bg-panel/75 backdrop-blur border border-panelBorder hover:border-blue-500/40 transition-colors p-5 rounded-2xl shadow-lg flex flex-col justify-between group">
                                <div>
                                    <div className="w-10 h-10 rounded-xl bg-dark border border-panelBorder text-blue-400 group-hover:bg-blue-500/10 flex items-center justify-center mb-3.5 transition-colors">
                                        <Activity size={20} />
                                    </div>
                                    <h3 className="text-white font-bold text-sm leading-snug mb-1.5">
                                        {t('hero.liveTelemetry', 'Live IoT Telemetry')}
                                    </h3>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        {t('hero.liveTelemetryDesc', 'Sub-second bidirectional voltage, current and wattage monitoring.')}
                                    </p>
                                </div>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-panel/75 backdrop-blur border border-panelBorder hover:border-gold-500/40 transition-colors p-5 rounded-2xl shadow-lg flex flex-col justify-between group">
                                <div>
                                    <div className="w-10 h-10 rounded-xl bg-dark border border-panelBorder text-gold-400 group-hover:bg-gold-500/10 flex items-center justify-center mb-3.5 transition-colors">
                                        <BrainCircuit size={20} />
                                    </div>
                                    <h3 className="text-white font-bold text-sm leading-snug mb-1.5">
                                        {t('hero.aiInsights', 'AI Peak Advisor')}
                                    </h3>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        {t('hero.aiInsightsDesc', 'Machine-learning bill forecasting & proactive subsidy cliff defense.')}
                                    </p>
                                </div>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-panel/75 backdrop-blur border border-panelBorder hover:border-purple-500/40 transition-colors p-5 rounded-2xl shadow-lg flex flex-col justify-between group">
                                <div>
                                    <div className="w-10 h-10 rounded-xl bg-dark border border-panelBorder text-purple-400 group-hover:bg-purple-500/10 flex items-center justify-center mb-3.5 transition-colors">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <h3 className="text-white font-bold text-sm leading-snug mb-1.5">
                                        {t('hero.tariffRules', 'TANGEDCO Tariff Rules')}
                                    </h3>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        {t('hero.tariffRulesDesc', '3-Tier multi-category billing for domestic, commercial & industrial.')}
                                    </p>
                                </div>
                            </div>

                            {/* Feature 4 */}
                            <div className="bg-panel/75 backdrop-blur border border-panelBorder hover:border-emerald-500/40 transition-colors p-5 rounded-2xl shadow-lg flex flex-col justify-between group">
                                <div>
                                    <div className="w-10 h-10 rounded-xl bg-dark border border-panelBorder text-emerald-400 group-hover:bg-emerald-500/10 flex items-center justify-center mb-3.5 transition-colors">
                                        <Sun size={20} />
                                    </div>
                                    <h3 className="text-white font-bold text-sm leading-snug mb-1.5">
                                        {t('hero.renewables', 'Solar & Green Energy')}
                                    </h3>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        {t('hero.renewablesDesc', 'PM Surya Ghar rooftop ROI calculator and net-metering telemetry.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Live Compliance Ribbon */}
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-panel/90 border border-panelBorder font-medium text-slate-300 shadow">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                {t('hero.gridBalanced', 'Grid Status: 230V Balanced')}
                            </span>
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-panel/90 border border-panelBorder font-medium text-slate-300 shadow">
                                <span className="text-gold-400 font-bold">✓</span>
                                {t('hero.subsidyGuard', '200 Free Units Guard')}
                            </span>
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-panel/90 border border-panelBorder font-medium text-slate-300 shadow">
                                <span className="text-blue-400">🔒</span>
                                {t('hero.digitalVerified', 'SHA-256 E-Invoicing')}
                            </span>
                        </div>
                    </main>

                    {/* Landing Footer */}
                    <footer className="border-t border-panelBorder/70 py-6 bg-darker/60 text-center text-xs text-slate-500">
                        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                            <span>Tamil Nadu Generation and Distribution Corporation Ltd • TNERC 2026</span>
                            <span className="font-mono text-[11px]">v2.6.0 Telemetry Standard</span>
                        </div>
                    </footer>
                </div>
            )}

            {/* ========================================================= */}
            {/* VIEW 2: DEDICATED FOCUSED AUTH VIEW (LOGIN / REGISTER)    */}
            {/* ========================================================= */}
            {activeTab !== 'hero' && (
                <div className="relative z-10 min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6">
                    {/* Top Navigation Bar: Back to Home + Language Switcher */}
                    <div className="max-w-xl w-full mx-auto flex items-center justify-between gap-3 mb-6">
                        {/* Back to Hero / Home */}
                        <button
                            type="button"
                            onClick={() => { setActiveTab('hero'); setError(''); setSuccessMessage(''); }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-panel/90 hover:bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-300 hover:text-gold-400 text-xs font-bold uppercase tracking-wider transition shadow-md cursor-pointer"
                        >
                            <ArrowLeft size={15} />
                            <span>{t('auth.backToHome', 'Back to Home')}</span>
                        </button>

                        {/* Language Switcher */}
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel/90 hover:bg-panel border border-panelBorder hover:border-gold-500/50 text-slate-200 hover:text-gold-400 font-semibold text-xs transition shadow-md cursor-pointer"
                        >
                            <Globe size={14} className="text-gold-400" />
                            <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
                            <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-dark border border-panelBorder text-gold-400">
                                {language.toUpperCase()}
                            </span>
                        </button>
                    </div>

                    {/* Centered Auth Card */}
                    <div className="max-w-xl w-full mx-auto bg-panel/95 border border-panelBorder rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                        {/* Top Accent Bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 via-amber-500 to-yellow-600"></div>

                        {/* Brand Header */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400 mb-3 shadow-md">
                                <Zap size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-wide uppercase">
                                Smart TN <span className="text-gold-500">{language === 'ta' ? 'மின்சாரம்' : 'Electricity'}</span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">
                                {activeTab === 'register'
                                    ? t('auth.newConnectionSubtitle', 'Create your accredited consumer profile under TNERC regulations.')
                                    : t('auth.welcomeBackSubtitle', 'Sign in to access your TANGEDCO consumer dashboard & telemetry.')}
                            </p>
                        </div>

                        {/* Tab Switcher (Login vs Register) */}
                        {activeTab !== 'forgot-password' ? (
                            <div className="flex bg-darker p-1 rounded-xl mb-6 border border-panelBorder">
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'login' ? 'bg-gold-500 text-darker shadow-md' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {t('auth.login', 'Sign In')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('register'); setError(''); setSuccessMessage(''); }}
                                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'register' ? 'bg-gold-500 text-darker shadow-md' : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {t('auth.register', 'Register')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between mb-6 pb-2 border-b border-panelBorder">
                                <button
                                    type="button"
                                    onClick={() => { setActiveTab('login'); setError(''); setSuccessMessage(''); }}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition cursor-pointer"
                                >
                                    <ArrowLeft size={14} />
                                    {t('auth.backToSignIn', 'Back to Sign In')}
                                </button>
                                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                                    {t('auth.forgotPasswordTitle', 'Reset Password')}
                                </span>
                            </div>
                        )}

                        {/* Error & Success Banners */}
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-5 rounded-xl text-xs font-medium text-center">
                                {error}
                            </motion.div>
                        )}

                        {successMessage && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 mb-5 rounded-xl text-xs font-medium text-center flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} />
                                {successMessage}
                            </motion.div>
                        )}

                        {/* Dynamic Forms Container */}
                        <AnimatePresence mode="wait">
                            {/* 1. SIGN IN FORM */}
                            {activeTab === 'login' && (
                                <motion.form
                                    key="login-form"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    onSubmit={handleLogin}
                                    className="space-y-4"
                                    autoComplete="off"
                                >
                                    {/* Role Selector */}
                                    <div className="flex bg-darker p-1 rounded-xl mb-2 border border-panelBorder">
                                        <button
                                            type="button"
                                            onClick={() => handleRoleSwitch('CONSUMER')}
                                            className={`flex-1 py-2 text-xs font-bold uppercase flex justify-center items-center gap-2 rounded-lg transition-all cursor-pointer ${loginRole === 'CONSUMER' ? 'bg-panel text-gold-400 border border-panelBorder shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            <User size={14} /> {t('auth.consumer', 'Consumer')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRoleSwitch('ADMIN')}
                                            className={`flex-1 py-2 text-xs font-bold uppercase flex justify-center items-center gap-2 rounded-lg transition-all cursor-pointer ${loginRole === 'ADMIN' ? 'bg-panel text-red-400 border border-panelBorder shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            <ShieldCheck size={14} /> {t('auth.admin', 'Admin')}
                                        </button>
                                    </div>

                                    {loginRole === 'ADMIN' && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleLoadDemoAdmin}
                                                className="text-[11px] font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
                                            >
                                                {t('auth.fillDemoAdmin', 'Use Admin Demo')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Email */}
                                    <div>
                                        <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">
                                            {t('auth.email', 'Email Address')}
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            autoComplete="off"
                                            value={loginData.email}
                                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                            className="w-full bg-dark border border-panelBorder text-white p-3 rounded-xl focus:outline-none focus:border-gold-500 placeholder:text-slate-600 text-sm"
                                            placeholder={t('auth.emailPlaceholder', 'Enter your email address')}
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-slate-400 text-xs font-bold uppercase">
                                                {t('auth.password', 'Password')}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveTab('forgot-password');
                                                    setError('');
                                                    setSuccessMessage('');
                                                    setForgotEmail(loginData.email || '');
                                                }}
                                                className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors cursor-pointer"
                                            >
                                                {t('auth.forgotPassword', 'Forgot Password?')}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                autoComplete="new-password"
                                                value={loginData.password}
                                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                                className="w-full bg-dark border border-panelBorder text-white p-3 rounded-xl focus:outline-none focus:border-gold-500 pr-10 placeholder:text-slate-600 text-sm"
                                                placeholder={t('auth.passwordPlaceholder', 'Enter your password')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full font-bold p-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg disabled:opacity-50 text-sm uppercase tracking-wider ${loginRole === 'ADMIN' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gold-500 hover:bg-gold-400 text-darker'
                                            }`}
                                    >
                                        {loading ? t('auth.authenticating', 'Authenticating...') : (
                                            <>
                                                <span>{t('auth.signInToPortal', 'Access Portal')}</span>
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </motion.form>
                            )}

                            {/* 2. REGISTER FORM */}
                            {activeTab === 'register' && (
                                <motion.form
                                    key="register-form"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    onSubmit={handleRegister}
                                    className="space-y-3.5"
                                    autoComplete="off"
                                >
                                    {/* Full Name & Email */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                {t('auth.fullName', 'Full Name')} *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                autoComplete="off"
                                                value={regData.name}
                                                onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                                                className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 placeholder:text-slate-600"
                                                placeholder={t('auth.fullNamePlaceholder', 'Enter full name')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                {t('auth.email', 'Email Address')} *
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                autoComplete="off"
                                                value={regData.email}
                                                onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                                                className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 placeholder:text-slate-600"
                                                placeholder={t('auth.emailPlaceholder', 'Enter email')}
                                            />
                                        </div>
                                    </div>

                                    {/* Passwords */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                {t('auth.createPassword', 'Create Password')} *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    required
                                                    autoComplete="new-password"
                                                    value={regData.password}
                                                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                                                    className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 pr-9 placeholder:text-slate-600"
                                                    placeholder={t('auth.createPasswordPlaceholder', 'Min 8 chars, 1 number')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                {t('auth.confirmPassword', 'Confirm Password')} *
                                            </label>
                                            <input
                                                type="password"
                                                required
                                                autoComplete="new-password"
                                                value={regData.confirmPassword}
                                                onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                                                className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 placeholder:text-slate-600"
                                                placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter password')}
                                            />
                                        </div>
                                    </div>

                                    {/* 3-Way Category Selector */}
                                    <div>
                                        <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1.5">
                                            {t('auth.categoryOfConnection', 'Category of Connection')} *
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRegData({ ...regData, connectionType: 'LT-1A_DOMESTIC', sanctionedLoadKw: 2.0 })}
                                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[66px] ${regData.connectionType === 'LT-1A_DOMESTIC'
                                                        ? 'bg-gold-500/15 border-gold-500 text-gold-400 shadow-sm'
                                                        : 'bg-dark border-panelBorder text-slate-400 hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="text-xs font-bold block">LT-1A</span>
                                                <span className="text-[10px] opacity-80 leading-tight break-words">{t('auth.domestic', 'Domestic')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRegData({ ...regData, connectionType: 'LT-V_COMMERCIAL', sanctionedLoadKw: 2.0 })}
                                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[66px] ${regData.connectionType === 'LT-V_COMMERCIAL'
                                                        ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-sm'
                                                        : 'bg-dark border-panelBorder text-slate-400 hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="text-xs font-bold block">LT-V</span>
                                                <span className="text-[10px] opacity-80 leading-tight break-words">{t('auth.commercial', 'Commercial')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setRegData({ ...regData, connectionType: 'LT-IIIB_INDUSTRIAL', sanctionedLoadKw: 10.0 })}
                                                className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[66px] ${regData.connectionType === 'LT-IIIB_INDUSTRIAL'
                                                        ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-sm'
                                                        : 'bg-dark border-panelBorder text-slate-400 hover:text-slate-200'
                                                    }`}
                                            >
                                                <span className="text-xs font-bold block">LT-IIIB</span>
                                                <span className="text-[10px] opacity-80 leading-tight break-words">{t('auth.industrial', 'Industrial')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* District & Service Number */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                                <MapPin size={11} className="text-gold-400" />
                                                <span>{language === 'ta' ? 'மாவட்டம் (District)' : 'District (Tamil Nadu)'} *</span>
                                            </label>
                                            <select
                                                value={regData.district || 'Chennai'}
                                                onChange={(e) => setRegData({ ...regData, district: e.target.value })}
                                                className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 cursor-pointer"
                                            >
                                                {TN_DISTRICTS.map((d) => (
                                                    <option key={d.en} value={d.en} className="bg-dark text-white">
                                                        {language === 'ta' ? `${d.ta} (${d.en})` : `${d.en} (${d.ta})`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                {t('auth.serviceNumber', 'TNEB Service Number')} *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder={t('auth.serviceNumberPlaceholder', 'e.g., 04-123-004567')}
                                                autoComplete="off"
                                                value={regData.serviceNumber}
                                                onChange={(e) => setRegData({ ...regData, serviceNumber: e.target.value })}
                                                className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm font-mono focus:border-gold-500 placeholder:text-slate-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Sanctioned Load */}
                                    <div>
                                        <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                            {t('auth.sanctionedLoad', 'Sanctioned Load (kW)')} *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            min="0.5"
                                            placeholder={t('auth.sanctionedLoadPlaceholder', 'e.g., 2.0')}
                                            value={regData.sanctionedLoadKw}
                                            onChange={(e) => setRegData({ ...regData, sanctionedLoadKw: e.target.value })}
                                            className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm font-mono focus:border-gold-500 placeholder:text-slate-600"
                                        />
                                    </div>

                                    {/* e-KYC Compliance Notice */}
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-300 leading-relaxed">
                                        {t('auth.kycNotice', 'Note: New accounts start with PENDING e-KYC until identity documents are verified by Admin.')}
                                    </div>

                                    {/* Register Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gold-500 hover:bg-gold-400 text-darker font-extrabold p-3 rounded-xl transition-all shadow-lg shadow-gold-500/10 mt-1 cursor-pointer disabled:opacity-50 text-xs sm:text-sm uppercase tracking-wider"
                                    >
                                        {loading ? t('auth.registering', 'Registering Connection...') : t('auth.registerButton', 'Create Consumer Account')}
                                    </button>
                                </motion.form>
                            )}

                            {/* 3. FORGOT PASSWORD FORM */}
                            {activeTab === 'forgot-password' && (
                                <motion.div
                                    key="forgot-form"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="space-y-4"
                                >
                                    <div className="text-center mb-4">
                                        <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center mx-auto mb-2">
                                            <KeyRound size={22} />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">
                                            {t('auth.forgotPasswordTitle', 'Reset Password')}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {forgotStep === 1
                                                ? t('auth.forgotPasswordDesc', 'Enter your registered email address to receive a secure password reset code.')
                                                : t('auth.codeSentSuccess', 'Enter the 6-digit verification code and set your new password.')}
                                        </p>
                                    </div>

                                    {forgotStep === 1 && (
                                        <form onSubmit={handleRequestResetCode} className="space-y-4" autoComplete="off">
                                            <div>
                                                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">
                                                    {t('auth.email', 'Email Address')}
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    autoComplete="off"
                                                    value={forgotEmail}
                                                    onChange={(e) => setForgotEmail(e.target.value)}
                                                    className="w-full bg-dark border border-panelBorder text-white p-3 rounded-xl focus:outline-none focus:border-gold-500 placeholder:text-slate-600 text-sm"
                                                    placeholder={t('auth.emailPlaceholder', 'Enter registered email')}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-gold-500 hover:bg-gold-400 text-darker font-bold p-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 text-xs uppercase tracking-wider"
                                            >
                                                {loading ? 'Sending Code...' : t('auth.sendResetCode', 'Send Verification Code')}
                                            </button>
                                        </form>
                                    )}

                                    {forgotStep === 2 && (
                                        <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5" autoComplete="off">
                                            {/* Email Dispatched Alert Banner */}
                                            <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/30 text-xs text-slate-300 flex items-start gap-2.5">
                                                <Mail size={17} className="text-gold-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-white font-medium text-xs leading-relaxed">
                                                        {language === 'ta'
                                                            ? <>சரிபார்ப்புக் குறியீடு உங்கள் <strong>{forgotEmail}</strong> மின்னஞ்சலுக்கு அனுப்பப்பட்டுள்ளது.</>
                                                            : <>Verification code has been sent to <strong>{forgotEmail}</strong>.</>}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {language === 'ta' ? 'உங்கள் இன்பாக்ஸ் மற்றும் ஸ்பேம் கோப்புறையை பார்க்கவும் (15 நிமிடங்கள் செல்லும்).' : 'Please check your inbox & spam folder (valid for 15 mins).'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Instant Verification Code Banner */}
                                            {generatedCodeNotice && (
                                                <div className="p-3 rounded-xl bg-gold-500/15 border border-gold-500/40 flex items-center justify-between gap-2">
                                                    <div>
                                                        <span className="text-[10px] uppercase font-bold text-gold-400 block tracking-wider">
                                                            {language === 'ta' ? 'சரிபார்ப்புக் குறியீடு' : 'Verification Code'}
                                                        </span>
                                                        <span className="text-xl font-mono font-black text-white tracking-widest">
                                                            {generatedCodeNotice}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] bg-gold-500/20 border border-gold-500/30 text-gold-300 px-2.5 py-1 rounded-lg font-bold">
                                                        {language === 'ta' ? 'தானாக நிரப்பப்பட்டது' : 'Auto-Filled'}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Open Sent Email In-App Preview Button */}
                                            <div className="p-2.5 rounded-xl bg-panel/90 border border-gold-500/30 flex items-center justify-between gap-2 shadow-inner">
                                                <div className="flex items-center gap-2">
                                                    <Inbox size={15} className="text-gold-400 shrink-0" />
                                                    <span className="text-[11px] text-slate-300 font-medium">
                                                        {language === 'ta' ? 'அனுப்பப்பட்ட மின்னஞ்சல்' : 'Dispatched Mailbox'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleFetchLatestEmail}
                                                    disabled={loadingEmail}
                                                    className="px-2.5 py-1 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-gold-300 hover:text-gold-200 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                >
                                                    <ExternalLink size={12} />
                                                    {loadingEmail ? 'Loading...' : (language === 'ta' ? 'இன்பாக்ஸைத் திறக்கவும்' : 'Open Inbox Preview')}
                                                </button>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-slate-400 text-[10px] font-bold uppercase">
                                                        {t('auth.enterResetCode', 'Verification Code (6-digits)')}
                                                    </label>
                                                    <button
                                                        type="button"
                                                        disabled={loading}
                                                        onClick={handleRequestResetCode}
                                                        className="text-[10px] text-gold-400 hover:text-gold-300 transition underline underline-offset-2 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {language === 'ta' ? 'மீண்டும் அனுப்பு' : 'Resend Code'}
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    maxLength={6}
                                                    autoComplete="off"
                                                    value={resetCode}
                                                    onChange={(e) => setResetCode(e.target.value)}
                                                    className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm font-mono tracking-widest text-center focus:border-gold-500 placeholder:text-slate-600"
                                                    placeholder="123456"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                    {t('auth.newPassword', 'New Password')}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        required
                                                        autoComplete="new-password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 pr-9 placeholder:text-slate-600"
                                                        placeholder={t('auth.createPasswordPlaceholder', 'Min 8 chars')}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                                                    >
                                                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                                    {t('auth.confirmNewPassword', 'Confirm New Password')}
                                                </label>
                                                <input
                                                    type="password"
                                                    required
                                                    autoComplete="new-password"
                                                    value={confirmNewPassword}
                                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                    className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 placeholder:text-slate-600"
                                                    placeholder={t('auth.confirmPasswordPlaceholder', 'Re-enter new password')}
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-gold-500 hover:bg-gold-400 text-darker font-bold p-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 text-xs uppercase tracking-wider"
                                            >
                                                {loading ? 'Updating Password...' : t('auth.resetPasswordButton', 'Reset Password')}
                                            </button>

                                            <div className="text-center pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setForgotStep(1)}
                                                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                                                >
                                                    {language === 'ta' ? 'வேறு மின்னஞ்சல் முகவரியைப் பயன்படுத்து' : 'Use a different email address'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Google OAuth 2.0 1-Click SSO */}
                        {activeTab !== 'forgot-password' && (
                            <div className="mt-5 pt-4 border-t border-panelBorder">
                                <div className="relative mb-3.5 flex items-center gap-3">
                                    <div className="border-t border-panelBorder flex-1"></div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold shrink-0">
                                        {t('auth.or', 'or sign in with email')}
                                    </span>
                                    <div className="border-t border-panelBorder flex-1"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => triggerGoogleLogin()}
                                    disabled={loading}
                                    className="w-full bg-dark hover:bg-panel border border-panelBorder hover:border-gold-500/50 text-white font-medium p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-md group focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    <span className="text-xs sm:text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">
                                        {t('auth.continueWithGoogle', 'Continue with Google')}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-slate-500 mt-6">
                        <span>Tamil Nadu Generation and Distribution Corporation Ltd • 2026</span>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* FLOATING GOOGLE SIGN-UP ONBOARDING MODAL                  */}
            {/* ========================================================= */}
            {googleOnboarding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-panel border border-panelBorder rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 text-left relative overflow-hidden"
                    >
                        {/* Top Accent Gradient Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500"></div>

                        <div className="flex items-center gap-3.5 pb-3.5 border-b border-panelBorder">
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-2xl bg-dark border border-panelBorder flex items-center justify-center p-2.5 shadow-lg shadow-black/40">
                                    <svg className="w-full h-full" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-darker flex items-center justify-center shadow">
                                    <CheckCircle2 size={10} className="text-darker stroke-[3]" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-white leading-tight truncate">
                                    {language === 'ta' ? 'மின் இணைப்பு விவரங்கள்' : 'Complete Connection Setup'}
                                </h3>
                                <p className="text-xs text-slate-400 font-mono truncate">{googleOnboarding.profile?.email}</p>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300 leading-relaxed">
                            {t('auth.kycNotice', 'Note: New accounts start with PENDING e-KYC until identity documents are verified by Admin.')}
                        </div>

                        <form onSubmit={handleGoogleOnboardingSubmit} className="space-y-3.5">
                            {/* Connection Category */}
                            <div>
                                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1.5">
                                    {t('auth.categoryOfConnection', 'Category of Connection')} *
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setGoogleOnboarding({ ...googleOnboarding, connectionType: 'LT-1A_DOMESTIC', sanctionedLoadKw: 2.0 })}
                                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[66px] ${googleOnboarding.connectionType === 'LT-1A_DOMESTIC'
                                                ? 'bg-gold-500/15 border-gold-500 text-gold-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        <span className="text-xs font-bold block">LT-1A</span>
                                        <span className="text-[10px] opacity-80 leading-tight break-words">{t('auth.domestic', 'Domestic')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGoogleOnboarding({ ...googleOnboarding, connectionType: 'LT-V_COMMERCIAL', sanctionedLoadKw: 2.0 })}
                                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[66px] ${googleOnboarding.connectionType === 'LT-V_COMMERCIAL'
                                                ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        <span className="text-xs font-bold block">LT-V</span>
                                        <span className="text-[10px] opacity-80 leading-tight break-words">{t('auth.commercial', 'Commercial')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setGoogleOnboarding({ ...googleOnboarding, connectionType: 'LT-IIIB_INDUSTRIAL', sanctionedLoadKw: 10.0 })}
                                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[66px] ${googleOnboarding.connectionType === 'LT-IIIB_INDUSTRIAL'
                                                ? 'bg-blue-500/15 border-blue-500 text-blue-400 shadow-sm'
                                                : 'bg-dark border-panelBorder text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        <span className="text-xs font-bold block">LT-IIIB</span>
                                        <span className="text-[10px] opacity-80 leading-tight break-words">{t('auth.industrial', 'Industrial')}</span>
                                    </button>
                                </div>
                            </div>

                            {/* District & Service Number */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                        <MapPin size={11} className="text-gold-400" />
                                        <span>{language === 'ta' ? 'மாவட்டம்' : 'District'} *</span>
                                    </label>
                                    <select
                                        value={googleOnboarding.district || 'Chennai'}
                                        onChange={(e) => setGoogleOnboarding({ ...googleOnboarding, district: e.target.value })}
                                        className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm focus:border-gold-500 cursor-pointer"
                                    >
                                        {TN_DISTRICTS.map((d) => (
                                            <option key={d.en} value={d.en} className="bg-dark text-white">
                                                {language === 'ta' ? `${d.ta} (${d.en})` : `${d.en} (${d.ta})`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                        {t('auth.serviceNumber', 'TNEB Service Number')} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={t('auth.serviceNumberPlaceholder', 'e.g., 04-123-004567')}
                                        value={googleOnboarding.serviceNumber}
                                        onChange={(e) => setGoogleOnboarding({ ...googleOnboarding, serviceNumber: e.target.value })}
                                        className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm font-mono focus:border-gold-500 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                                    {t('auth.sanctionedLoad', 'Sanctioned Load (kW)')} *
                                </label>
                                <input
                                    type="number"
                                    required
                                    step="0.1"
                                    min="0.5"
                                    placeholder={t('auth.sanctionedLoadPlaceholder', 'e.g., 2.0')}
                                    value={googleOnboarding.sanctionedLoadKw}
                                    onChange={(e) => setGoogleOnboarding({ ...googleOnboarding, sanctionedLoadKw: e.target.value })}
                                    className="w-full bg-dark border border-panelBorder text-white p-2.5 rounded-xl text-sm font-mono focus:border-gold-500 placeholder:text-slate-600"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setGoogleOnboarding(null)}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-dark border border-panelBorder text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                                >
                                    {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-bold text-xs cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                                >
                                    {loading ? t('auth.registering', 'Creating Account...') : (language === 'ta' ? 'உள்நுழைக' : 'Complete & Sign In')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* In-App Mailbox Preview Modal (Accessible when ISP blocks standard SMTP ports) */}
            {inboxModalOpen && latestEmailData && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-panel border border-panelBorder rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* Modal Header */}
                        <div className="p-4 bg-gradient-to-r from-slate-900 to-darker border-b border-panelBorder flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                                    <Mail size={16} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">
                                        {language === 'ta' ? 'அனுப்பப்பட்ட சரிபார்ப்பு மின்னஞ்சல்' : 'Dispatched Verification Email'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400">
                                        To: <span className="text-gold-400 font-mono">{latestEmailData.to}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInboxModalOpen(false)}
                                className="w-7 h-7 rounded-lg bg-dark/60 hover:bg-dark border border-panelBorder flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Quick Copy Verification Code Banner */}
                        <div className="bg-gold-500/10 border-b border-gold-500/20 p-3 flex items-center justify-between gap-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider block">
                                    {language === 'ta' ? 'சரிபார்ப்புக் குறியீடு' : 'Verification Code'}
                                </span>
                                <span className="text-xl font-black font-mono tracking-widest text-white">
                                    {latestEmailData.code}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setResetCode(latestEmailData.code);
                                    setCopiedCode(true);
                                    setTimeout(() => {
                                        setCopiedCode(false);
                                        setInboxModalOpen(false);
                                    }, 800);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-darker font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition uppercase tracking-wider"
                            >
                                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                                {copiedCode ? (language === 'ta' ? 'பயன்படுத்தப்பட்டது!' : 'Applied!') : (language === 'ta' ? 'குறியீட்டை உள்ளிடவும்' : 'Insert Code')}
                            </button>
                        </div>

                        {/* Email HTML / Rendered Content Container */}
                        <div className="p-4 overflow-y-auto flex-1 text-slate-300 text-xs">
                            <div
                                className="rounded-xl overflow-hidden shadow-inner bg-darker p-2"
                                dangerouslySetInnerHTML={{ __html: latestEmailData.html }}
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 bg-darker/60 border-t border-panelBorder flex justify-end">
                            <button
                                type="button"
                                onClick={() => setInboxModalOpen(false)}
                                className="px-4 py-1.5 rounded-xl bg-dark hover:bg-panel border border-panelBorder text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                            >
                                {language === 'ta' ? 'மூடு' : 'Close'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}