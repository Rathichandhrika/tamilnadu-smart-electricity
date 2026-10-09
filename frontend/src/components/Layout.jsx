import React, { useState, useContext } from 'react';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Menu, Zap, Globe } from 'lucide-react';

export default function Layout({ children }) {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { language, toggleLanguage, t } = useLanguage();

    return (
        <div className="flex min-h-screen bg-darker text-slate-200 relative">
            
            {/* 1. Mobile Top Bar (Hamburger + Brand + Lang) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-dark border-b border-panelBorder z-40 flex items-center justify-between px-4 shadow-lg">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center shadow">
                        <Zap className="text-darker fill-darker" size={16} />
                    </div>
                    <span className="font-extrabold text-white tracking-wide text-sm whitespace-nowrap">{t('app.name')}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={toggleLanguage}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-darker border border-panelBorder text-gold-400 text-xs font-mono font-bold hover:border-gold-500/40 transition cursor-pointer"
                        title={language === 'en' ? 'Switch to Tamil' : 'Switch to English'}
                    >
                        <Globe size={13} className="text-gold-400" />
                        <span>{language === 'en' ? 'தமிழ்' : 'EN'}</span>
                    </button>
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)} 
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-darker transition cursor-pointer"
                        aria-label="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                </div>
            </div>

            {/* 2. The Universal Sidebar (Desktop + Mobile Drawer) */}
            <Sidebar isOpen={isMobileMenuOpen} close={() => setIsMobileMenuOpen(false)} />

            {/* 3. Main Content Area */}
            <main className="flex-1 p-4 sm:p-6 pt-24 sm:pt-28 md:pt-8 md:ml-72 min-h-screen pb-28 sm:pb-36 min-w-0 max-w-full overflow-x-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="max-w-7xl mx-auto w-full min-w-0"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* 4. Global Web Speech API Voice AI Assistant (Consumers only, hidden on Admin Portal / for Admins) */}
            {!location.pathname.startsWith('/admin') && user?.role !== 'ADMIN' && <VoiceAssistant />}
        </div>
    );
}