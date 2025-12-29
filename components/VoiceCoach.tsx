import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, PhoneOff, Volume2, Loader2, Sparkles, X } from 'lucide-react';

interface VoiceCoachProps {
    onClose: () => void;
}

export const VoiceCoach: React.FC<VoiceCoachProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState<string[]>([]);
    
    // Refs for audio handling
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);

    const initializeSession = async () => {
        setStatus('connecting');
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Setup Audio Contexts
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            // Get Mic Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("Session Opened");
                        setStatus('connected');
                        
                        // Setup Audio Input Processing
                        if (inputAudioContextRef.current) {
                            sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
                            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                            
                            scriptProcessorRef.current.onaudioprocess = (event) => {
                                if (isMuted) return;
                                
                                const inputData = event.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                
                                sessionPromise.then(session => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            };
                            
                            sourceRef.current.connect(scriptProcessorRef.current);
                            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const ctx = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            
                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination); // Direct to speakers
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        
                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(src => src.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        // Basic logging for debug/transcription (optional UI update)
                        if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                            // This part usually won't come with audio modality effectively unless text modality also requested
                        }
                    },
                    onerror: (err) => {
                        console.error("Live Error", err);
                        setStatus('error');
                    },
                    onclose: () => {
                        console.log("Live Closed");
                        setStatus('idle');
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                    },
                    systemInstruction: "You are a friendly and helpful dating coach named Pendo. Help the user practice their conversation skills. Be encouraging, casual, and fun. Keep responses concise.",
                }
            });
            
            sessionPromiseRef.current = sessionPromise;

        } catch (error) {
            console.error("Initialization Failed", error);
            setStatus('error');
        }
    };

    useEffect(() => {
        initializeSession();
        return () => {
            // Cleanup
            if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => session.close());
            }
            streamRef.current?.getTracks().forEach(track => track.stop());
            inputAudioContextRef.current?.close();
            outputAudioContextRef.current?.close();
        };
    }, []);

    // --- Helpers ---
    function createBlob(data: Float32Array) {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        let binary = '';
        const bytes = new Uint8Array(int16.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return {
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000',
        };
    }

    function decode(base64: string) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in">
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
            >
                <X size={24} />
            </button>
            
            <div className="relative mb-12">
                <div className="w-40 h-40 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse-slow">
                     <Sparkles size={64} className="text-white" />
                </div>
                {status === 'connected' && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-slate-900">
                        LIVE
                    </div>
                )}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">Pendo Coach</h2>
            <p className="text-slate-400 mb-12 text-center max-w-xs">
                Practice your dating conversation skills in real-time with our AI coach.
            </p>
            
            <div className="flex items-center gap-6">
                 <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-6 rounded-full transition-all ${isMuted ? 'bg-slate-700 text-slate-400' : 'bg-white text-slate-900'}`}
                 >
                     {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
                 </button>
                 
                 <button 
                    onClick={onClose}
                    className="p-6 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-900/50"
                 >
                     <PhoneOff size={32} />
                 </button>
            </div>
            
            <div className="mt-8 h-6 flex items-center justify-center gap-1">
                {status === 'connecting' && (
                    <>
                        <Loader2 size={16} className="text-slate-500 animate-spin" />
                        <span className="text-slate-500 text-sm">Connecting...</span>
                    </>
                )}
                {status === 'error' && (
                    <span className="text-red-400 text-sm">Connection failed. Please try again.</span>
                )}
            </div>
        </div>
    );
};