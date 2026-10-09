import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { 
    BrainCircuit, 
    Send, 
    Mic, 
    MicOff, 
    Volume2, 
    VolumeX, 
    Sparkles, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Coins, 
    MapPin, 
    RefreshCw,
    User,
    ArrowRight,
    ExternalLink,
    Zap,
    Building2,
    ShieldAlert
} from 'lucide-react';

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

export default function AdminAiAssistant({ onSelectBill, onRefreshBills }) {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: language === 'ta' 
                ? 'வணக்கம் TANGEDCO நிர்வாகியே! நான் உங்கள் பிரத்யேக நிர்வாக ஏஐ உதவியாளர். பணம் செலுத்தியவர்கள், நிலுவையில் உள்ளவர்கள், அபராதம் விதிக்கப்பட்டவர்கள், அல்லது கடைசி நாள் நெருங்குபவர்கள் பற்றிய விவரங்களைக் கேட்கலாம்.'
                : 'Hello TANGEDCO Administrator! I am your dedicated Admin AI Assistant. Ask me about paid consumers, unpaid bills, overdue fines, approaching due dates, or district-wise revenue metrics.',
            intent: 'GREETING',
            timestamp: new Date()
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    // Synchronize initial greeting when language changes
    useEffect(() => {
        setMessages(prev => {
            if (prev.length === 1 && (prev[0].intent === 'GREETING' || !prev[0].intent)) {
                return [{
                    role: 'assistant',
                    content: language === 'ta' 
                        ? 'வணக்கம் TANGEDCO நிர்வாகியே! நான் உங்கள் பிரத்யேக நிர்வாக ஏஐ உதவியாளர். பணம் செலுத்தியவர்கள், நிலுவையில் உள்ளவர்கள், அபராதம் விதிக்கப்பட்டவர்கள், அல்லது கடைசி நாள் நெருங்குபவர்கள் பற்றிய விவரங்களைக் கேட்கலாம்.'
                        : 'Hello TANGEDCO Administrator! I am your dedicated Admin AI Assistant. Ask me about paid consumers, unpaid bills, overdue fines, approaching due dates, or district-wise revenue metrics.',
                    intent: 'GREETING',
                    timestamp: prev[0].timestamp || new Date()
                }];
            }
            return prev;
        });
    }, [language]);

    // Initialize Web Speech API for voice input
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setQuery(transcript);
                setIsListening(false);
                handleSendQuery(transcript);
            };

            recognition.onerror = () => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, [language]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert(language === 'ta' ? 'உங்கள் உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை.' : 'Voice recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleSendQuery = async (customQuery = null) => {
        const textToSend = customQuery || query;
        if (!textToSend || !textToSend.trim()) return;

        const userMsg = {
            role: 'user',
            content: textToSend.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setLoading(true);

        try {
            const res = await api.post('/admin/ai-query', {
                query: textToSend,
                language: language
            });

            if (res.data?.success) {
                const assistantMsg = {
                    role: 'assistant',
                    content: res.data.answer,
                    intent: res.data.intent,
                    summary: res.data.summary,
                    structuredData: res.data.structuredData,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMsg]);
            }
        } catch (err) {
            console.error('Admin AI Query failed:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: language === 'ta' ? 'மன்னிக்கவும், தரவுகளைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Unable to retrieve administrative analytics. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const quickQueries = [
        {
            label: language === 'ta' ? '🟢 பணம் செலுத்தியவர்கள் (Paid)' : '🟢 Paid Consumers',
            query: language === 'ta' ? 'பணம் செலுத்திய நுகர்வோர் விவரங்கள்' : 'Who has paid their bills?'
        },
        {
            label: language === 'ta' ? '🟡 நிலுவையில் உள்ளவர்கள் (Unpaid)' : '🟡 Unpaid Defaulters',
            query: language === 'ta' ? 'மின்கட்டணம் செலுத்தாத நிலுவைதாரர்கள் யார்?' : 'Who has unpaid bills?'
        },
        {
            label: language === 'ta' ? '🔴 அபராதம் விதிக்கப்பட்டவர்கள் (Fines)' : '🔴 Fines Imposed',
            query: language === 'ta' ? 'அபராதம் மற்றும் தாமதக் கட்டணம் விதிக்கப்பட்டவர்கள் யார்?' : 'Who has overdue fines imposed?'
        },
        {
            label: language === 'ta' ? '⏳ கடைசி நாள் நெருங்குபவர்கள்' : '⏳ Due Date Approaching',
            query: language === 'ta' ? 'கட்டணக் கடைசி நாள் நெருங்கும் நுகர்வோர் யார்?' : 'Whose payment due date is nearing?'
        },
        {
            label: language === 'ta' ? '📍 மாவட்ட வாரியான வசூல்' : '📍 District Breakdown',
            query: language === 'ta' ? 'மாவட்ட வாரியான மின்கட்டண வசூல் நிலவரம் என்ன?' : 'Show district-wise billing revenue'
        }
    ];

    return (
        <div className="bg-panel border border-panelBorder rounded-2xl shadow-xl overflow-hidden flex flex-col h-[640px]">
            {/* Header */}
            <div className="p-4 bg-darker/80 border-b border-panelBorder flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-amber-600 flex items-center justify-center text-darker shadow-lg shadow-gold-500/20">
                        <BrainCircuit size={22} className="text-darker" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                            <span>{language === 'ta' ? 'TANGEDCO நிர்வாக ஏஐ உதவியாளர்' : 'TANGEDCO Executive AI Assistant'}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/30">
                                LIVE NLP
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400">
                            {language === 'ta' ? 'கட்டணம், நிலுவை, அபராதம் மற்றும் மாவட்ட நுண்ணறிவு' : 'Real-time billing, defaulters, fines & district analytics'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setMessages([
                            {
                                role: 'assistant',
                                content: language === 'ta' 
                                    ? 'உரையாடல் புதுப்பிக்கப்பட்டது. உங்கள் கேள்வியைக் கேளுங்கள்.' 
                                    : 'Assistant reset. How can I help you manage consumer accounts today?',
                                timestamp: new Date()
                            }
                        ]);
                    }}
                    className="p-2 rounded-xl bg-dark hover:bg-panel border border-panelBorder text-slate-400 hover:text-white transition cursor-pointer"
                    title="Reset conversation"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {/* Quick Action Suggestions Bar */}
            <div className="px-4 py-2.5 bg-dark/60 border-b border-panelBorder flex items-center gap-2 overflow-x-auto no-scrollbar">
                <Sparkles size={14} className="text-gold-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0">
                    {language === 'ta' ? 'விரைவு தேடல்கள்:' : 'Quick Prompts:'}
                </span>
                {quickQueries.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSendQuery(item.query)}
                        className="px-3 py-1 rounded-lg bg-panel hover:bg-dark border border-panelBorder hover:border-gold-500/40 text-slate-300 hover:text-gold-400 text-xs font-medium whitespace-nowrap transition cursor-pointer shadow-sm"
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Message Thread Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-darker/40">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div
                            className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 shadow-md ${
                                msg.role === 'user'
                                    ? 'bg-gradient-to-r from-gold-500 to-amber-600 text-darker font-medium'
                                    : 'bg-panel border border-panelBorder text-slate-200'
                            }`}
                        >
                            {/* Message Header */}
                            <div className="flex items-center gap-2 mb-1.5 opacity-75 text-[11px]">
                                {msg.role === 'user' ? (
                                    <span className="font-bold flex items-center gap-1">
                                        <User size={12} /> {language === 'ta' ? 'நிர்வாகி' : 'Admin'}
                                    </span>
                                ) : (
                                    <span className="font-bold text-gold-400 flex items-center gap-1">
                                        <BrainCircuit size={12} /> {language === 'ta' ? 'TANGEDCO ஏஐ' : 'TANGEDCO AI'}
                                    </span>
                                )}
                                <span>•</span>
                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Main Content */}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                {msg.content}
                            </p>

                            {/* Structured Visual Cards for Insights */}
                            {msg.intent === 'PAID_USERS' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-panelBorder/70 space-y-2">
                                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                        <CheckCircle2 size={14} />
                                        <span>{language === 'ta' ? 'செலுத்தப்பட்ட நுகர்வோர் பட்டியல்:' : 'Verified Paid Accounts:'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {msg.structuredData.map((item, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-dark/80 border border-panelBorder flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{item.name}</p>
                                                    <p className="text-[11px] font-mono text-slate-400">{item.serviceNumber} • {formatDistrict(item.district, language)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-emerald-400">₹{item.amount?.toLocaleString()}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase">{item.paymentMode || 'PAID'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.intent === 'FINE_USERS' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-panelBorder/70 space-y-2">
                                    <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                        <ShieldAlert size={14} />
                                        <span>{language === 'ta' ? 'அபராதம் விதிக்கப்பட்ட கணக்குகள்:' : 'Overdue Accounts with Fines:'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {msg.structuredData.map((item, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{item.name}</p>
                                                    <p className="text-[11px] font-mono text-slate-400">{item.serviceNumber} • {formatDistrict(item.district, language)}</p>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                                                        +{item.daysOverdue} {language === 'ta' ? 'நாட்கள் தாமதம்' : 'days overdue'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-white">₹{item.total?.toLocaleString()}</p>
                                                    <p className="text-[10px] text-red-400 font-bold">+{language === 'ta' ? 'அபராதம்' : 'Fine'}: ₹{item.fine}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.intent === 'UNPAID_USERS' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-panelBorder/70 space-y-2">
                                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                        <Clock size={14} />
                                        <span>{language === 'ta' ? 'நிலுவை கணக்குகள் (Grace Period):' : 'Pending Defaulters (Active):'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {msg.structuredData.map((item, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{item.name}</p>
                                                    <p className="text-[11px] font-mono text-slate-400">{item.serviceNumber} • {formatDistrict(item.district, language)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-amber-400">₹{item.total?.toLocaleString()}</p>
                                                    <p className="text-[9px] text-slate-400">{item.daysRemaining} {language === 'ta' ? 'நாட்கள் உள்ளன' : 'days left'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.intent === 'NEARING_DUE' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-panelBorder/70 space-y-2">
                                    <div className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} />
                                        <span>{language === 'ta' ? 'கடைசி நாள் நெருங்கும் கணக்குகள் (3 நாட்களுக்குள்):' : 'Deadlines Approaching (≤ 3 Days):'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {msg.structuredData.map((item, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex justify-between items-center text-xs">
                                                <div>
                                                    <p className="font-bold text-white">{item.name}</p>
                                                    <p className="text-[11px] font-mono text-slate-400">{item.serviceNumber} • {formatDistrict(item.district, language)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-yellow-400">₹{item.total?.toLocaleString()}</p>
                                                    <p className="text-[10px] text-yellow-300 font-bold">{item.daysRemaining} {language === 'ta' ? 'நாள் மட்டுமே' : 'days left'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.intent === 'DISTRICT_BREAKDOWN' && Array.isArray(msg.structuredData) && msg.structuredData.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-panelBorder/70 space-y-2">
                                    <div className="text-xs font-bold text-gold-400 flex items-center gap-1.5">
                                        <MapPin size={14} />
                                        <span>{language === 'ta' ? 'மாவட்ட வாரியான வசூல் ஒப்பீடு:' : 'District Revenue Breakdown:'}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                        {msg.structuredData.map((d, i) => (
                                            <div key={i} className="p-2.5 rounded-xl bg-dark/90 border border-panelBorder text-xs space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-white flex items-center gap-1">
                                                        <MapPin size={12} className="text-gold-400" /> {formatDistrict(d.district, language)}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-slate-400">{d.totalBills} {language === 'ta' ? 'இணைப்புகள்' : 'bills'}</span>
                                                </div>
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-emerald-400">{language === 'ta' ? 'வசூல்:' : 'Paid:'} ₹{d.revenueCollected?.toLocaleString()}</span>
                                                    <span className="text-red-400">{language === 'ta' ? 'நிலுவை:' : 'Due:'} ₹{d.outstanding?.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-panel border border-panelBorder max-w-xs text-xs text-slate-400 animate-pulse">
                        <BrainCircuit size={16} className="text-gold-400 animate-spin" />
                        <span>{language === 'ta' ? 'TANGEDCO தரவுகளை ஆய்வு செய்கிறது...' : 'Analyzing billing database & calculating metrics...'}</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Box & Voice Trigger */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuery();
                }}
                className="p-3 bg-darker border-t border-panelBorder flex items-center gap-2"
            >
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        isListening 
                            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/20' 
                            : 'bg-dark hover:bg-panel border border-panelBorder text-slate-400 hover:text-gold-400'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice query'}
                >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                        language === 'ta' 
                            ? 'கேளுங்கள்: "யார் பணம் செலுத்தியுள்ளார்?", "நிலுவை நுகர்வோர்", "அபராதம்"...' 
                            : 'Ask: "Who has paid?", "Show unpaid bills", "Who has fine imposed?", "District stats"...'
                    }
                    className="flex-1 bg-dark border border-panelBorder text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-gold-500 placeholder:text-slate-600"
                />

                <button
                    type="submit"
                    disabled={!query.trim() || loading}
                    className="p-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-40 text-darker font-bold transition shadow-md cursor-pointer flex items-center justify-center"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}
