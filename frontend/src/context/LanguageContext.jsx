import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('smart_tn_lang') || 'en';
    });

    useEffect(() => {
        localStorage.setItem('smart_tn_lang', language);
        if (i18n.language !== language) {
            i18n.changeLanguage(language);
        }
        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('lang', language);
            if (language === 'ta') {
                document.documentElement.classList.add('lang-ta');
                document.title = 'தமிழ்நாடு மின்சார நுகர்வோர் போர்டல்';
            } else {
                document.documentElement.classList.remove('lang-ta');
                document.title = 'Smart TN Electricity Portal';
            }
        }
    }, [language]);

    const setLanguage = (lang) => {
        setLanguageState(lang);
        i18n.changeLanguage(lang);
    };

    const toggleLanguage = () => {
        const nextLang = language === 'en' ? 'ta' : 'en';
        setLanguage(nextLang);
    };

    const aliases = {
        'portalTitle': 'app.portalTitle',
        'actionRequired': 'dashboard.actionRequired',
        'documentType': 'dashboard.documentType',
        'docTypeAadhar': 'dashboard.docTypeAadhar',
        'docTypePropertyTax': 'dashboard.docTypePropertyTax',
        'docTypeCommercialLicense': 'dashboard.docTypeCommercialLicense',
        'chooseFile': 'dashboard.chooseFile',
        'noFileChosen': 'dashboard.noFileChosen',
        'docDeletedSuccess': 'dashboard.docDeletedSuccess',
        'kycSubmittedSuccess': 'dashboard.kycSubmittedSuccess',
        'consumerDashboard': 'dashboard.title',
        'welcomeBack': 'dashboard.welcome',
        'appName': 'app.name',
        'boardName': 'app.board',
        'aiInsights': 'nav.insights',
        'adminPortal': 'nav.admin',
        'subsidyCliffGauge': 'riskMeter.title',
        'commercialCliffGauge': 'riskMeter.subtitle',
        'safeZone': 'riskMeter.safeZone',
        'dailyLoad': 'profiler.dailyLoad',
        'cycleUnits': 'profiler.cycleUnits',
        'estimatedBill': 'profiler.estimatedBill',
        'quickAddPresets': 'profiler.quickAdd',
        'resetHome': 'profiler.resetDefaults',
        'configuredMatrix': 'profiler.configuredAppliances',
        'runningAiAdvisor': 'profiler.analyzing',
        'getAiAdvice': 'profiler.getAdvice',
        'potentialSavings': 'profiler.biMonthlySavings',
        'primaryAction': 'profiler.primaryAction',
        'suggestionBill': 'voice.hintBill',
        'suggestionCliff': 'voice.hintRisk',
        'suggestionMeter': 'voice.hintMeter',
        'suggestionTips': 'voice.hintTips',
        'liveTelemetryTitle': 'liveMeter.title',
        'liveTelemetrySubtitle': 'liveMeter.subtitle',
        'simulatedNotice': 'liveMeter.simulatedNotice',
        'powerLegend': 'liveMeter.powerLegend',
        'voltageLegend': 'liveMeter.voltageLegend',
        'underVoltageWarning': 'liveMeter.underVoltage',
        'overloadWarning': 'liveMeter.overload',
        'gridStatusNormal': 'liveMeter.normal',
        'activePower': 'liveMeter.activePower',
        'supplyVoltage': 'liveMeter.supplyVoltage',
        'lineCurrent': 'liveMeter.lineCurrent',
        'cumulativeMeter': 'liveMeter.cumulativeMeter',
        'gridFrequency': 'liveMeter.gridFrequency',
        'powerFactor': 'liveMeter.powerFactor',
        'activeLoadSpectrum': 'liveMeter.activeLoadSpectrum',
        'streamOnline': 'liveMeter.streamOnline',
        'streamOffline': 'liveMeter.streamOffline',
        'applianceProfilerTitle': 'profiler.title',
        'applianceProfilerSubtitle': 'profiler.subtitle',
        'fastFourierSpectralAnalysis': 'liveMeter.activeLoadSpectrum'
    };

    const namespaces = [
        'dashboard', 'hero', 'auth', 'nav', 'app', 'riskMeter', 
        'insights', 'profiler', 'renewables', 'liveMeter', 
        'tariff', 'history', 'voice', 'energyInbox', 'admin'
    ];

    const t = (key, options = {}) => {
        if (!key) return '';

        const isStringFallback = typeof options === 'string';
        const fallback = isStringFallback ? options : (options && typeof options === 'object' ? options.defaultValue : undefined);
        const opts = isStringFallback ? {} : (options || {});

        // 1. Direct key match (e.g. 'nav.dashboard' or 'dashboard.title')
        if (i18n.exists(key)) {
            return i18n.t(key, opts);
        }

        // 2. Check aliases (e.g. 'documentType' -> 'dashboard.documentType')
        if (aliases[key] && i18n.exists(aliases[key])) {
            return i18n.t(aliases[key], opts);
        }

        // 3. Search across namespaces (e.g. 'billEstimatorDesc' -> 'dashboard.billEstimatorDesc')
        for (const ns of namespaces) {
            const nested = `${ns}.${key}`;
            if (i18n.exists(nested)) {
                return i18n.t(nested, opts);
            }
        }

        // 4. Return fallback string or key if not found in any translation dictionary
        return fallback !== undefined ? fallback : key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
