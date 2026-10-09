import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { queryAiKnowledge } from '../services/aiAssistantService';
import {
    Mic, MicOff, Volume2, Sparkles, X, ChevronRight,
    Bot, ArrowRight, Activity, Calculator, BrainCircuit, Globe, Send
} from 'lucide-react';

export default function VoiceAssistant() {
    const { user } = useContext(AuthContext);
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();

    if (user?.role === 'ADMIN') return null;

    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [textInput, setTextInput] = useState('');
    const [responseMessage, setResponseMessage] = useState('');
    const [recognitionSupported, setRecognitionSupported] = useState(true);

    const recognitionRef = useRef(null);
    const audioRef = useRef(null);

    // Cancel and stop all audio playback & speech synthesis immediately
    const stopAllAudio = () => {
        if (audioRef.current) {
            try {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            } catch (e) { }
            audioRef.current = null;
        }
        if (window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) { }
        }
        setIsSpeaking(false);
    };

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setRecognitionSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

        recognition.onstart = () => {
            setIsListening(true);
            setTranscript('');
        };

        recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript;
            setTranscript(spokenText);
            processVoiceCommand(spokenText);
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) { }
            }
            stopAllAudio();
        };
    }, [language]);

    const [availableVoices, setAvailableVoices] = useState([]);

    // Preload and monitor available SpeechSynthesis voices
    useEffect(() => {
        if (!window.speechSynthesis) return;

        const loadVoices = () => {
            const vList = window.speechSynthesis.getVoices();
            if (vList && vList.length > 0) {
                setAvailableVoices(vList);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    // Helper: Find best browser voice for fallback
    const getBestVoiceConfig = (lang) => {
        if (!window.speechSynthesis) return { voice: null, pitch: 1.35, rate: 1.0 };
        const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return { voice: null, pitch: 1.35, rate: 1.0 };

        const isTa = lang === 'ta' || lang === 'ta-IN';
        const femaleKeywords = ['zira', 'heera', 'samantha', 'victoria', 'female', 'kavya', 'karen', 'moira', 'fiona', 'tessa', 'susan', 'jenny', 'aria', 'sonia', 'neerja', 'kalpana', 'swara', 'google தமிழ்', 'google tamil', 'google uk english female', 'google us english'];
        const maleKeywords = ['david', 'mark', 'ravi', 'george', 'male', 'guy', 'stefan', 'richard', 'james', 'mohan', 'deepak', 'paul', 'pradeep', 'anand', 'cosimo'];

        if (isTa) {
            const taVoices = voices.filter(v => 
                v.lang.toLowerCase().includes('ta') || 
                v.name.toLowerCase().includes('tamil') || 
                v.name.toLowerCase().includes('valluvar')
            );

            const taFemale = taVoices.find(v => {
                const name = v.name.toLowerCase();
                return femaleKeywords.some(f => name.includes(f)) && !maleKeywords.some(m => name.includes(m));
            });
            if (taFemale) {
                return { voice: taFemale, pitch: 1.25, rate: 1.0 };
            }

            if (taVoices.length > 0) {
                return { voice: taVoices[0], pitch: 1.60, rate: 1.02 };
            }

            return { voice: null, pitch: 1.50, rate: 1.0 };
        }

        const enVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        const verifiedFemale = enVoices.find(v => {
            const name = v.name.toLowerCase();
            return femaleKeywords.some(f => name.includes(f)) && !maleKeywords.some(m => name.includes(m));
        });
        if (verifiedFemale) {
            return { voice: verifiedFemale, pitch: 1.25, rate: 1.0 };
        }

        return { voice: enVoices[0] || null, pitch: 1.35, rate: 1.0 };
    };

    // Offline Web Speech API fallback
    const speakWithWebSpeech = (text, isTamil) => {
        if (!window.speechSynthesis) {
            setIsSpeaking(false);
            return;
        }

        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }

            const cleanText = text.replace(/[*_#`~[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = isTamil ? 'ta-IN' : 'en-IN';

            const config = getBestVoiceConfig(utterance.lang);
            if (config.voice) {
                utterance.voice = config.voice;
            }
            utterance.pitch = config.pitch;
            utterance.rate = config.rate;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            setIsSpeaking(false);
        }
    };

    // Handle High-Definition Neural Female Voice Playback (Tamil & English)
    const speakResponse = (text, langCode = null) => {
        stopAllAudio();
        if (!text || !text.trim()) return;

        const targetLang = langCode || (language === 'ta' ? 'ta' : 'en');
        const isTamil = targetLang === 'ta' || targetLang === 'ta-IN';
        const cleanText = text.replace(/[*_#`~[\]()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 350);

        try {
            // 1. High-Definition Neural Female Voice Stream from Backend (/api/tts)
            const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=${isTamil ? 'ta' : 'en'}`;
            const audio = new Audio(ttsUrl);
            audioRef.current = audio;

            let playbackStarted = false;

            audio.onplay = () => {
                playbackStarted = true;
                setIsSpeaking(true);
            };

            audio.onended = () => {
                setIsSpeaking(false);
                audioRef.current = null;
            };

            audio.onerror = (err) => {
                console.warn('Neural TTS stream error, falling back to browser synthesis:', err);
                if (!playbackStarted) {
                    audioRef.current = null;
                    speakWithWebSpeech(cleanText, isTamil);
                }
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    if (!playbackStarted) {
                        audioRef.current = null;
                        speakWithWebSpeech(cleanText, isTamil);
                    }
                });
            }
        } catch (err) {
            speakWithWebSpeech(cleanText, isTamil);
        }
    };

    // Greeting generator
    const getGreetingMessage = (lang = language) => {
        return lang === 'ta'
            ? "வணக்கம்! நான் மின்னி, உங்கள் ஸ்மார்ட் தமிழ்நாடு ஏஐ மின்சார உதவியாளர். உங்களுக்கு நான் எவ்வாறு உதவ முடியும்?"
            : "Hello! I am Minni, your Smart TN Electricity Voice Assistant. How can I help you today?";
    };

    // Handle initial greeting on modal open
    const handleOpenAssistant = () => {
        setIsOpen(true);
        const greeting = getGreetingMessage(language);
        setResponseMessage(greeting);
        setTranscript('');
        setTimeout(() => {
            speakResponse(greeting);
        }, 150);
    };

    // Keep initial/greeting message in sync when language changes
    useEffect(() => {
        if (!transcript) {
            const greeting = getGreetingMessage(language);
            setResponseMessage(greeting);
        }
    }, [language]);

    // Voice & Query NLP Processing Engine for all electricity & website questions
    const processVoiceCommand = (text) => {
        if (!text || !text.trim()) return;

        const result = queryAiKnowledge(text, language);
        // DYNAMICALLY UPDATE AI REPLY DISPLAY IMMEDIATELY
        setResponseMessage(result.text);
        speakResponse(result.text);

        if (result.navigation) {
            setTimeout(() => {
                navigate(result.navigation);
                setIsOpen(false);
            }, 2000);
        }
    };

    const handleTextSubmit = (e) => {
        e.preventDefault();
        if (!textInput.trim()) return;
        const q = textInput.trim();
        setTranscript(q);
        processVoiceCommand(q);
        setTextInput('');
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            try { recognitionRef.current.stop(); } catch (e) { }
            setIsListening(false);
        } else {
            // Cancel any speaking first
            stopAllAudio();
            try {
                recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
                recognitionRef.current.start();
            } catch (err) {
                console.warn('Speech start error:', err);
            }
        }
    };

    const handlePromptClick = (promptText) => {
        setTranscript(promptText);
        processVoiceCommand(promptText);
    };

    return (
        <>
            {/* FLOATING ACTION PILL (Always visible at bottom right) */}
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2">
                <button
                    onClick={() => {
                        if (!isOpen) {
                            handleOpenAssistant();
                        } else {
                            setIsOpen(false);
                            stopAllAudio();
                        }
                    }}
                    className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-gold-500 via-amber-500 to-gold-600 hover:from-gold-400 hover:to-amber-400 text-darker font-black text-xs sm:text-sm uppercase tracking-wide shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] transition-all transform hover:scale-105 cursor-pointer"
                >
                    <Sparkles size={15} className="stroke-[2.5]" />
                    <span className="font-black text-xs sm:text-sm tracking-tight">{language === 'ta' ? 'மின்னி ஏஐ குரல்' : 'MINNI AI VOICE'}</span>
                    {isSpeaking && (
                        <span className="w-2 h-2 rounded-full bg-darker animate-ping"></span>
                    )}
                </button>
            </div>

            {/* INTERACTIVE VOICE AI MODAL OVERLAY */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-panel border border-gold-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-6">

                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-panelBorder pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-500">
                                    <Bot size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white tracking-wide">
                                        {language === 'ta' ? 'மின்னி ஏஐ குரல்' : 'MINNI AI VOICE'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        {language === 'ta' ? 'தமிழ் மற்றும் ஆங்கில குரல் அறிதல்' : 'Bilingual Tamil & English Speech Engine'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Language Toggle Inside Modal */}
                                <button
                                    onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
                                    className="px-2.5 py-1 rounded-lg bg-darker border border-panelBorder hover:border-gold-500/40 text-slate-300 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                    <Globe size={12} className="text-gold-500" />
                                    {language === 'en' ? 'தமிழ்' : 'English'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        stopAllAudio();
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-darker transition cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* SPEECH WAVE / STATUS VISUALIZER */}
                        <div className="text-center py-4 space-y-4">
                            {/* Animated Glowing Mic Circle */}
                            <div className="flex justify-center">
                                <button
                                    onClick={toggleListening}
                                    disabled={!recognitionSupported}
                                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${isListening
                                        ? 'bg-rose-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.6)] animate-pulse scale-105'
                                        : isSpeaking
                                            ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-darker shadow-[0_0_40px_rgba(245,158,11,0.5)]'
                                            : 'bg-darker border-2 border-gold-500/50 hover:border-gold-400 text-gold-400 hover:scale-105'
                                        }`}
                                >
                                    {isListening ? (
                                        <Mic size={38} className="animate-bounce" />
                                    ) : (
                                        <Mic size={38} />
                                    )}
                                </button>
                            </div>

                            {/* Status Text & Audio Wave Simulation */}
                            <div>
                                <p className="text-sm font-bold text-white">
                                    {isListening
                                        ? (language === 'ta' ? 'கேட்கிறது... இப்போது பேசுங்கள்' : 'Listening... Speak now')
                                        : isSpeaking
                                            ? (language === 'ta' ? 'ஏஐ பேசுகிறது...' : 'AI is speaking...')
                                            : (language === 'ta' ? 'ஆங்கிலம் அல்லது தமிழில் பேச மைக் ஐகானை அழுத்தவும்' : 'Click microphone to ask in English or தமிழ்')}
                                </p>
                                {isListening && (
                                    <p className="text-xs text-slate-400 mt-1 font-mono">
                                        {language === 'ta' ? '🇮🇳 தமிழ் கேட்பு இயக்கத்தில் உள்ளது' : '🇬🇧 English recognition active'}
                                    </p>
                                )}
                            </div>

                            {/* Simulated Voice Waves */}
                            {(isListening || isSpeaking) && (
                                <div className="flex items-center justify-center gap-1.5 h-6">
                                    <span className="w-1 bg-gold-400 rounded-full animate-[pulse_0.4s_infinite_100ms] h-3"></span>
                                    <span className="w-1 bg-gold-400 rounded-full animate-[pulse_0.4s_infinite_200ms] h-6"></span>
                                    <span className="w-1 bg-gold-400 rounded-full animate-[pulse_0.4s_infinite_300ms] h-4"></span>
                                    <span className="w-1 bg-gold-400 rounded-full animate-[pulse_0.4s_infinite_150ms] h-7"></span>
                                    <span className="w-1 bg-gold-400 rounded-full animate-[pulse_0.4s_infinite_250ms] h-5"></span>
                                    <span className="w-1 bg-gold-400 rounded-full animate-[pulse_0.4s_infinite_350ms] h-2"></span>
                                </div>
                            )}
                        </div>

                        {/* TRANSCRIPT & AI RESPONSE CONTAINER */}
                        {(transcript || responseMessage) && (
                            <div className="space-y-3 bg-darker p-4 rounded-2xl border border-panelBorder">
                                {transcript && (
                                    <div className="flex items-start gap-2 text-xs">
                                        <span className="text-[10px] uppercase font-mono font-bold text-slate-400 min-w-[70px]">
                                            {language === 'ta' ? 'கேள்வி' : 'Query'}:
                                        </span>
                                        <span className="text-slate-200 font-semibold italic">"{transcript}"</span>
                                    </div>
                                )}
                                {responseMessage && (
                                    <div className="flex items-start gap-2 text-xs pt-2 border-t border-panelBorder/50">
                                        <span className="text-[10px] uppercase font-mono font-bold text-gold-400 min-w-[70px] flex items-center gap-1">
                                            <Volume2 size={12} /> {language === 'ta' ? 'ஏஐ பதில்' : 'AI Reply'}:
                                        </span>
                                        <p className="text-white font-medium leading-relaxed">{responseMessage}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ONE-CLICK SUGGESTION PILLS */}
                        <div className="space-y-2.5 pt-1">
                            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                                {language === 'ta' ? 'குரல் பரிந்துரைகள்' : 'VOICE SUGGESTIONS'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button
                                    onClick={() => handlePromptClick(language === 'ta' ? 'என் மின்கட்டணம் என்ன?' : 'What is my current bill?')}
                                    className="p-2.5 rounded-xl bg-darker hover:bg-dark border border-panelBorder hover:border-gold-500/40 text-left text-xs text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                                >
                                    <span>{language === 'ta' ? 'என் கட்டணம் என்ன?' : 'What is my bill?'}</span>
                                    <ChevronRight size={12} className="text-gold-500 shrink-0" />
                                </button>
                                <button
                                    onClick={() => handlePromptClick(language === 'ta' ? 'மானிய இடர் சரிபார்' : 'Check subsidy risk meter')}
                                    className="p-2.5 rounded-xl bg-darker hover:bg-dark border border-panelBorder hover:border-gold-500/40 text-left text-xs text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                                >
                                    <span>{language === 'ta' ? 'மானிய இடர் மீட்டர்' : 'Subsidy Risk Meter'}</span>
                                    <ChevronRight size={12} className="text-gold-500 shrink-0" />
                                </button>
                                <button
                                    onClick={() => handlePromptClick(language === 'ta' ? 'நேரலை மீட்டர் திரையைக் காட்டு' : 'Show live IoT meter')}
                                    className="p-2.5 rounded-xl bg-darker hover:bg-dark border border-panelBorder hover:border-gold-500/40 text-left text-xs text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                                >
                                    <span>{language === 'ta' ? 'மீட்டர் காட்டு' : 'Show Live Meter'}</span>
                                    <ChevronRight size={12} className="text-gold-500 shrink-0" />
                                </button>
                                <button
                                    onClick={() => handlePromptClick(language === 'ta' ? 'மின்சாரத்தை சேமிப்பது எப்படி?' : 'How to save electricity?')}
                                    className="p-2.5 rounded-xl bg-darker hover:bg-dark border border-panelBorder hover:border-gold-500/40 text-left text-xs text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                                >
                                    <span>{language === 'ta' ? 'மின்சாரத்தை சேமிப்பது எப்படி?' : 'How to save electricity?'}</span>
                                    <ChevronRight size={12} className="text-gold-500 shrink-0" />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Text Query Input Footer */}
                        <form onSubmit={handleTextSubmit} className="relative pt-2 shrink-0">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder={language === 'ta' ? 'மின்சாரம் அல்லது போர்டல் பற்றி எதையும் கேளுங்கள்...' : 'Ask anything about electricity or this portal...'}
                                className="w-full bg-darker border border-panelBorder focus:border-gold-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none pr-10 shadow-inner"
                            />
                            <button
                                type="submit"
                                disabled={!textInput.trim()}
                                className="absolute right-2 top-3.5 p-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-darker disabled:opacity-30 transition cursor-pointer"
                                title={language === 'ta' ? 'கேள்' : 'Submit'}
                            >
                                <Send size={13} />
                            </button>
                        </form>

                    </div>
                </div>
            )}
        </>
    );
}
