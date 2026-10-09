import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import {
    LayoutDashboard, Calculator, Receipt, Activity, BrainCircuit,
    Sun, History, ShieldAlert, LogOut, Zap, X, Globe, UserCheck,
    Building2, Factory, Home, ChevronRight, Bell, CreditCard
} from 'lucide-react';

export default function Sidebar({ isOpen, close }) {
    const { user, logout } = useContext(AuthContext);
    const { language, toggleLanguage, t } = useLanguage();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    const isAdmin = user?.role === 'ADMIN';
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'BILLING';

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const res = await api.get('/alerts/unread-count');
            if (res.data?.success && typeof res.data.count === 'number') {
                setUnreadCount(res.data.count);
            }
        } catch {
            // Silently ignore if unauthenticated or network hiccup
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        const handleUpdate = (e) => {
            if (e?.detail && typeof e.detail.unreadCount === 'number') {
                setUnreadCount(e.detail.unreadCount);
            } else {
                fetchUnreadCount();
            }
        };

        window.addEventListener('notifications-updated', handleUpdate);
        window.addEventListener('focus', fetchUnreadCount);
        const timer = setInterval(fetchUnreadCount, 15000);

        return () => {
            window.removeEventListener('notifications-updated', handleUpdate);
            window.removeEventListener('focus', fetchUnreadCount);
            clearInterval(timer);
        };
    }, [user, location.pathname]);

    const checkIsActive = (item) => {
        if (item.path.startsWith('/admin')) {
            if (location.pathname !== '/admin') return false;
            return (item.tab || 'BILLING') === currentTab;
        }
        return location.pathname === item.path;
    };

    // Consumer-only navigation items
    const consumerNavItems = [
        {
            name: t('nav.dashboard', 'Dashboard'),
            path: '/dashboard',
            icon: <LayoutDashboard size={19} />
        },
        {
            name: language === 'ta' ? 'அறிவிப்புகள் & நினைவூட்டல்' : 'Notifications & Alerts',
            path: '/notifications',
            icon: <Bell size={19} />,
            badge: unreadCount > 0 ? `${unreadCount}` : null,
            badgeColor: 'bg-red-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shadow-md shadow-red-500/30 animate-pulse border-0'
        },
        {
            name: language === 'ta' ? 'மின்கட்டணம் செலுத்துதல்' : 'Bill Payment (Quick Pay)',
            path: '/payment',
            icon: <CreditCard size={19} />
        },
        {
            name: t('nav.liveMeter', 'Live Meter'),
            path: '/iot',
            icon: <Activity size={19} />
        },
        {
            name: t('nav.insights', 'AI Insights'),
            path: '/insights',
            icon: <BrainCircuit size={19} />
        },
        {
            name: t('nav.calculator', 'Bill Calculator'),
            path: '/calculator',
            icon: <Calculator size={19} />
        },
        {
            name: t('nav.tariff', 'Tariff Rules'),
            path: '/tariff',
            icon: <Receipt size={19} />
        },
        {
            name: t('nav.renewables', 'Solar & Renewables'),
            path: '/renewables',
            icon: <Sun size={19} />
        },
        {
            name: t('nav.billHistory', 'Bill History'),
            path: '/history',
            icon: <History size={19} />
        },
    ];

    // Dedicated Executive Admin Navigation (No consumer personal tools)
    const adminNavItems = [
        {
            name: language === 'ta' ? 'மின்கட்டண & நிலுவை நிர்வாகம்' : 'Billing & Payment Ledger',
            path: '/admin?tab=BILLING',
            tab: 'BILLING',
            icon: <Receipt size={19} />
        },
        {
            name: language === 'ta' ? 'நிர்வாக ஏஐ உதவியாளர்' : 'Admin AI Assistant',
            path: '/admin?tab=AI_ASSISTANT',
            tab: 'AI_ASSISTANT',
            icon: <BrainCircuit size={19} />,
            badge: 'AI LIVE',
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        },
        {
            name: language === 'ta' ? 'இ-கேஒய்சி ஆவண சரிபார்ப்பு' : 'e-KYC Verification',
            path: '/admin?tab=VERIFICATION',
            tab: 'VERIFICATION',
            icon: <ShieldAlert size={19} />
        },
        {
            name: language === 'ta' ? 'மாநில கிரிட் & மாவட்ட சுமை' : 'State Grid & District Hub',
            path: '/admin?tab=GRID_ANALYTICS',
            tab: 'GRID_ANALYTICS',
            icon: <Activity size={19} />
        },
        {
            name: language === 'ta' ? 'கட்டண விதிமுறைகள் & ஆணை' : 'Tariff & Regulatory Policy',
            path: '/tariff',
            icon: <Calculator size={19} />
        }
    ];

    const currentNavItems = isAdmin ? adminNavItems : consumerNavItems;

    // Connection Type formatting
    const formatConnectionType = (type) => {
        if (language === 'ta') {
            if (type === 'LT-IIIB_INDUSTRIAL') return 'LT-IIIB தொழிற்துறை';
            if (type === 'LT-V_COMMERCIAL') return 'LT-V வணிக உபயோகம்';
            return 'LT-1A வீட்டு உபயோகம்';
        }
        if (!type) return 'LT-1A Domestic';
        if (type === 'LT-IIIB_INDUSTRIAL') return 'LT-IIIB Industrial';
        if (type === 'LT-V_COMMERCIAL') return 'LT-V Commercial';
        return 'LT-1A Domestic';
    };

    const getUserDisplayName = () => {
        if (!user?.name) return language === 'ta' ? 'நுகர்வோர்' : 'Consumer';
        if (user.name === 'System Admin' && language === 'ta') return 'கணினி நிர்வாகி';
        return user.name;
    };

    const getUserRoleLabel = () => {
        if (user?.role === 'ADMIN') return language === 'ta' ? 'மத்திய நிர்வாகி (ADMIN)' : 'EXECUTIVE ADMIN';
        if (user?.role === 'CONSUMER') return language === 'ta' ? 'நுகர்வோர்' : 'CONSUMER';
        return user?.role || (language === 'ta' ? 'சரிபார்க்கப்பட்டது' : 'AUTHENTICATED');
    };

    return (
        <>
            {/* Mobile Dark Backdrop Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
                    onClick={close}
                ></div>
            )}

            {/* Main Sidebar Drawer */}
            <aside
                className={`fixed inset-y-0 left-0 w-72 bg-dark border-r border-panelBorder flex flex-col shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* 1. Brand Header */}
                <div className="p-5 border-b border-panelBorder bg-darker/60 flex justify-between items-center">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
                                <Zap className="text-darker fill-darker" size={18} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-white tracking-wider flex items-center gap-1.5 leading-none">
                                    <span>{isAdmin ? (language === 'ta' ? 'TANGEDCO நிர்வாகம்' : 'TANGEDCO Admin') : t('app.name')}</span>
                                </h1>
                                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-1">
                                    {isAdmin ? (language === 'ta' ? 'மத்திய நிர்வாக கட்டளை மையம்' : 'Central Executive Hub') : 'TANGEDCO • Tamil Nadu'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={close}
                        className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-darker transition cursor-pointer"
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Interactive Language Switcher Banner */}
                <div className="px-4 py-2.5 bg-darker/40 border-b border-panelBorder flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono">
                        <Globe size={13} className="text-gold-500" />
                        <span className="text-[11px] uppercase font-bold tracking-wider">
                            {language === 'ta' ? 'மொழி' : 'Language'}
                        </span>
                    </div>

                    <div className="inline-flex rounded-lg bg-dark p-0.5 border border-panelBorder">
                        <button
                            onClick={() => language !== 'en' && toggleLanguage()}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition cursor-pointer ${language === 'en'
                                    ? 'bg-gold-500 text-darker shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => language !== 'ta' && toggleLanguage()}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition cursor-pointer ${language === 'ta'
                                    ? 'bg-gold-500 text-darker shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            தமிழ்
                        </button>
                    </div>
                </div>

                {/* 3. Navigation Links List */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
                    {isAdmin && (
                        <div className="px-3 pb-2 pt-1">
                            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-gold-400/90">
                                {language === 'ta' ? 'நிர்வாகக் கட்டுப்பாடுகள்' : 'EXECUTIVE CONTROLS'}
                            </span>
                        </div>
                    )}

                    {currentNavItems.map((item, idx) => {
                        const active = checkIsActive(item);
                        return (
                            <NavLink
                                key={idx}
                                to={item.path}
                                onClick={close}
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group relative ${active
                                    ? 'bg-gradient-to-r from-gold-500/15 via-gold-500/5 to-transparent text-gold-400 font-bold border-l-2 border-gold-500 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-darker/60'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`transition-transform duration-200 ${active ? 'text-gold-400 scale-105' : 'text-slate-400 group-hover:text-gold-400'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="truncate">{item.name}</span>
                                </div>

                                {item.badge && (
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${item.badgeColor || 'bg-gold-500/20 text-gold-300 border-gold-500/40'}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* 4. Consumer Profile & Connection Badge Footer */}
                <div className="p-3.5 border-t border-panelBorder bg-darker/60 space-y-3">
                    {/* User Card */}
                    <div className="bg-dark/80 border border-panelBorder/80 p-2.5 rounded-xl flex items-center gap-3 shadow-inner">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-panel to-darker border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold text-sm shrink-0 shadow">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate leading-tight">
                                {getUserDisplayName()}
                            </p>

                            {/* Service Number or Role */}
                            {user?.serviceNumber ? (
                                <p className="text-[10px] font-mono text-gold-400/90 truncate flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0"></span>
                                    {user.serviceNumber}
                                </p>
                            ) : (
                                <p className={`text-[10px] font-mono font-bold uppercase mt-0.5 ${user?.role === 'ADMIN' ? 'text-rose-400' : 'text-slate-400'
                                    }`}>
                                    {getUserRoleLabel()}
                                </p>
                            )}

                            {/* Tariff Type Tag */}
                            {user?.connectionType && (
                                <span className="inline-block text-[9px] font-mono text-slate-400 bg-panel px-1.5 py-0.5 rounded border border-panelBorder mt-1 truncate max-w-full">
                                    {formatConnectionType(user.connectionType)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={() => { logout(); close(); }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-darker hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs font-bold uppercase tracking-wider transition border border-panelBorder hover:border-rose-500/30 cursor-pointer shadow-sm"
                    >
                        <LogOut size={14} />
                        <span>{t('nav.logout')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}