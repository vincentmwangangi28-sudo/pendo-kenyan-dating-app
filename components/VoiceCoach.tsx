import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, Loader2, Sparkles, X, MessageSquare, Send } from 'lucide-react';
import { generateVoiceCoachResponse, generateSpeech } from '../services/geminiService';

interface VoiceCoachProps {
    onClose: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'coach';
    text: string;
}

export const VoiceCoach: React.FC<VoiceCoachProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking' | 'error'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [typedInput, setTypedInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'coach',
            text: "Sasa! I am Pendo, your personal dating and conversation coach. Let's practice! Speak to me or type a message below, and let's see how we can level up your conversational vibe."
        }
    ]);

    // Speech Recognition references
    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const isComponentMounted = useRef(true);

    useEffect(() => {
        isComponentMounted.current = true;
        // Initialize Web Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-KE'; // Kenyan English friendly

            rec.onstart = () => {
                if (isComponentMounted.current) setStatus('listening');
            };

            rec.onresult = async (event: any) => {
                const speechToText = event.results[0][0].transcript;
                if (speechToText && isComponentMounted.current) {
                    await handleUserMessage(speechToText);
                }
            };

            rec.onerror = (e: any) => {
                console.error("Speech recognition error:", e);
                if (isComponentMounted.current) {
                    if (e.error === 'not-allowed') {
                        setStatus('idle');
                    } else {
                        setStatus('error');
                    }
                }
            };

            rec.onend = () => {
                if (isComponentMounted.current && status === 'listening') {
                    setStatus('idle');
                }
            };

            recognitionRef.current = rec;
        }

        return () => {
            isComponentMounted.current = false;
            stopAudio();
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {}
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser or iframe. Feel free to use the keyboard input!");
            return;
        }

        stopAudio();

        if (status === 'listening') {
            recognitionRef.current.stop();
            setStatus('idle');
        } else {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error("Failed to start recognition:", err);
                setStatus('error');
            }
        }
    };

    const stopAudio = () => {
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.stop();
            } catch (e) {}
            audioSourceRef.current = null;
        }
        if (status === 'speaking') {
            setStatus('idle');
        }
    };

    const playVoiceResponse = async (text: string) => {
        if (isMuted) return;

        try {
            if (isComponentMounted.current) setStatus('speaking');
            const base64Audio = await generateSpeech(text);

            if (!base64Audio || !isComponentMounted.current) {
                if (isComponentMounted.current) setStatus('idle');
                return;
            }

            // Play via Web Audio Context
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            
            // Resume if suspended
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Decode base64
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
            
            // Stop any playing sound
            if (audioSourceRef.current) {
                try { audioSourceRef.current.stop(); } catch (e) {}
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            source.onended = () => {
                if (isComponentMounted.current) {
                    setStatus('idle');
                }
            };

            audioSourceRef.current = source;
            source.start(0);

        } catch (error) {
            console.error("TTS playback failed:", error);
            if (isComponentMounted.current) setStatus('idle');
        }
    };

    const handleUserMessage = async (text: string) => {
        const userMsg: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            text
        };

        if (!isComponentMounted.current) return;
        setMessages(prev => [...prev, userMsg]);
        setStatus('processing');

        try {
            // Get history stripped to match format
            const history = messages.map(m => ({
                role: m.role,
                text: m.text
            }));

            const coachReply = await generateVoiceCoachResponse(text, history);
            
            const coachMsg: Message = {
                id: `coach_${Date.now()}`,
                role: 'coach',
                text: coachReply
            };

            if (isComponentMounted.current) {
                setMessages(prev => [...prev, coachMsg]);
                await playVoiceResponse(coachReply);
            }
        } catch (error) {
            console.error(error);
            if (isComponentMounted.current) setStatus('error');
        }
    };

    const handleSendText = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!typedInput.trim()) return;
        const msg = typedInput.trim();
        setTypedInput('');
        await handleUserMessage(msg);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-4 md:p-6 animate-fade-in" id="voice-coach-container">
            {/* Header */}
            <div className="w-full max-w-2xl flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold tracking-wider text-slate-300">PENDO COACH</span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                    id="close-coach-btn"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Conversation Area */}
            <div className="w-full max-w-2xl flex-1 overflow-y-auto my-4 space-y-4 px-2 pr-1 select-text scrollbar-thin scrollbar-thumb-white/10">
                {messages.map((m) => (
                    <div 
                        key={m.id}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                        <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-md ${
                            m.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800'
                        }`}>
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wider font-bold opacity-60">
                                {m.role === 'user' ? 'You' : 'Pendo Dating Coach'}
                            </div>
                            <p>{m.text}</p>
                        </div>
                    </div>
                ))}
                {status === 'processing' && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-900 text-slate-400 rounded-2xl p-4 text-sm border border-slate-850 rounded-tl-none">
                            <div className="flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-slate-400" />
                                <span>Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Coach Waveform and Main Control Bar */}
            <div className="w-full max-w-2xl bg-slate-900/40 rounded-3xl p-6 border border-white/5 space-y-6">
                
                {/* Visualizer and Status */}
                <div className="flex flex-col items-center justify-center py-2">
                    <div className="h-10 flex items-center justify-center gap-1">
                        {status === 'listening' ? (
                            <div className="flex items-center gap-1 h-8">
                                <span className="w-1 bg-red-500 rounded-full animate-bounce h-4" style={{ animationDelay: '0.1s' }} />
                                <span className="w-1 bg-red-400 rounded-full animate-bounce h-7" style={{ animationDelay: '0.2s' }} />
                                <span className="w-1 bg-red-500 rounded-full animate-bounce h-5" style={{ animationDelay: '0.3s' }} />
                                <span className="w-1 bg-red-600 rounded-full animate-bounce h-8" style={{ animationDelay: '0.4s' }} />
                                <span className="w-1 bg-red-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0.5s' }} />
                            </div>
                        ) : status === 'speaking' ? (
                            <div className="flex items-center gap-1 h-8">
                                <span className="w-1 bg-indigo-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0.1s' }} />
                                <span className="w-1 bg-indigo-400 rounded-full animate-bounce h-6" style={{ animationDelay: '0.2s' }} />
                                <span className="w-1 bg-indigo-500 rounded-full animate-bounce h-8" style={{ animationDelay: '0.3s' }} />
                                <span className="w-1 bg-indigo-300 rounded-full animate-bounce h-5" style={{ animationDelay: '0.4s' }} />
                                <span className="w-1 bg-indigo-500 rounded-full animate-bounce h-4" style={{ animationDelay: '0.5s' }} />
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
                                {status === 'idle' && "Ready to talk"}
                                {status === 'processing' && "Analyzing chemistry..."}
                                {status === 'error' && "Connection issue"}
                            </span>
                        )}
                    </div>
                </div>

                {/* Primary Voice Actions */}
                <div className="flex items-center justify-center gap-6">
                    {/* Toggle Voice Playback Mute */}
                    <button 
                        onClick={() => {
                            const newMuted = !isMuted;
                            setIsMuted(newMuted);
                            if (newMuted) stopAudio();
                        }}
                        className={`p-4 rounded-full transition-all border ${
                            isMuted 
                                ? 'bg-red-950/40 text-red-400 border-red-500/20 hover:bg-red-950/60' 
                                : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={isMuted ? "Unmute Voice" : "Mute Voice"}
                    >
                        <Volume2 size={20} className={isMuted ? 'text-red-400 opacity-60' : ''} />
                    </button>

                    {/* Speech Recognition Trigger */}
                    <button 
                        onClick={toggleListening}
                        className={`p-6 rounded-full transition-all duration-300 transform active:scale-95 ${
                            status === 'listening' 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105' 
                                : 'bg-gradient-to-tr from-indigo-500 to-rose-500 text-white shadow-lg hover:brightness-110'
                        }`}
                        id="mic-trigger-btn"
                        title={status === 'listening' ? "Stop recording" : "Tanscribe voice input"}
                    >
                        {status === 'listening' ? (
                            <MicOff size={28} className="animate-pulse" />
                        ) : (
                            <Mic size={28} />
                        )}
                    </button>

                    {/* Exit voice coach */}
                    <button 
                        onClick={onClose}
                        className="p-4 rounded-full bg-slate-800 text-slate-300 border border-white/5 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/20 transition-all"
                        title="End Practice"
                    >
                        <PhoneOff size={20} />
                    </button>
                </div>

                {/* Keyboard Input Fallback */}
                <form onSubmit={handleSendText} className="flex gap-2 bg-slate-950 border border-white/5 rounded-2xl p-1.5">
                    <input 
                        type="text"
                        value={typedInput}
                        onChange={(e) => setTypedInput(e.target.value)}
                        placeholder="Type a date response or text instead..."
                        className="flex-1 bg-transparent px-3 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                        id="typed-input"
                    />
                    <button 
                        type="submit"
                        disabled={!typedInput.trim()}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors"
                        id="send-text-btn"
                    >
                        <Send size={16} />
                    </button>
                </form>

            </div>
        </div>
    );
};
