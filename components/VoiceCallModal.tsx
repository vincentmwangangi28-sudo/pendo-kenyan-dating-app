import React, { useState, useEffect, useRef } from 'react';
import { MatchProfile, UserProfile } from '../types';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, ShieldCheck, Heart, MessageSquare } from 'lucide-react';

interface VoiceCallModalProps {
  isOpen: boolean;
  isIncoming: boolean;
  match: MatchProfile | null;
  currentUser: UserProfile;
  onClose: () => void;
  onCallAccepted?: () => void;
}

const KENYAN_ICEBREAKERS = [
  "Ask: What's your go-to weekend vibe: Karura nature walk or Westlands nightlife?",
  "Ask: If we grabbed street food right now: Smokies na pasua or Mahamri na mbaazi?",
  "Ask: Best road trip destination in Kenya: Naivasha, Nanyuki, or Diani Beach?",
  "Ask: What song immediately gets you on your feet whenever the DJ plays it?",
  "Ask: What's one green flag you always look for on a first date?"
];

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  isIncoming,
  match,
  currentUser,
  onClose,
  onCallAccepted
}) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>(isIncoming ? 'ringing' : 'connected');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [currentIcebreakerIdx, setCurrentIcebreakerIdx] = useState(0);
  const [audioWaveAmplitudes, setAudioWaveAmplitudes] = useState<number[]>([15, 25, 45, 80, 60, 95, 70, 50, 85, 40, 20, 10]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<{ osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or stop ringtone
  useEffect(() => {
    if (!isOpen) {
      stopRingtone();
      return;
    }

    if (callState === 'ringing') {
      startRingtone();
    } else {
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [isOpen, callState]);

  // Duration timer when connected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Animated sound waves simulation when connected
  useEffect(() => {
    let waveInterval: NodeJS.Timeout;
    if (callState === 'connected' && !isMuted) {
      waveInterval = setInterval(() => {
        setAudioWaveAmplitudes([
          Math.floor(Math.random() * 60) + 10,
          Math.floor(Math.random() * 85) + 15,
          Math.floor(Math.random() * 95) + 20,
          Math.floor(Math.random() * 100) + 30,
          Math.floor(Math.random() * 80) + 25,
          Math.floor(Math.random() * 90) + 20,
          Math.floor(Math.random() * 70) + 15,
          Math.floor(Math.random() * 95) + 25,
          Math.floor(Math.random() * 60) + 10,
          Math.floor(Math.random() * 40) + 10,
          Math.floor(Math.random() * 30) + 10,
          Math.floor(Math.random() * 20) + 5,
        ]);
      }, 180);
    }
    return () => {
      if (waveInterval) clearInterval(waveInterval);
    };
  }, [callState, isMuted]);

  // Web Audio Ringtone Synthesis (400Hz + 450Hz European/East African cadence)
  const startRingtone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const playBurst = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
        const now = audioCtxRef.current.currentTime;

        const osc1 = audioCtxRef.current.createOscillator();
        const osc2 = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc1.frequency.setValueAtTime(400, now);
        osc2.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      };

      playBurst();
      ringIntervalRef.current = setInterval(playBurst, 2500);
    } catch (e) {
      console.warn('Web Audio ringtone not permitted until user gesture:', e);
    }
  };

  const stopRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // no-op
      }
      audioCtxRef.current = null;
    }
  };

  const handleAnswer = () => {
    stopRingtone();
    setCallState('connected');
    if (onCallAccepted) onCallAccepted();

    // Voice welcome utterance (Sheng greeting)
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("Sasa! Nimefurahi kuongea na wewe kwenye Pendo.");
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch {
        // speech synthesis optional
      }
    }
  };

  const handleDeclineOrHangup = () => {
    stopRingtone();
    setCallState('ended');
    setTimeout(() => {
      onClose();
      setCallState(isIncoming ? 'ringing' : 'connected');
      setCallDuration(0);
    }, 600);
  };

  if (!isOpen || !match) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 text-white text-center shadow-2xl border border-slate-800 flex flex-col items-center">
        
        {/* Top Trust & Status Bar */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 text-[11px] font-bold text-emerald-300">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Pendo Ngao Encrypted</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {callState === 'connected' ? formatDuration(callDuration) : (isIncoming ? 'Incoming Voice Call' : 'Connecting...')}
          </span>
        </div>

        {/* Caller Avatar with Animated Rings */}
        <div className="relative mb-4">
          {callState === 'ringing' && (
            <>
              <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping"></div>
              <div className="absolute -inset-2 rounded-full border-2 border-rose-500/40 animate-pulse"></div>
            </>
          )}
          {callState === 'connected' && (
            <div className="absolute -inset-2.5 rounded-full border-2 border-emerald-400/50 animate-pulse"></div>
          )}
          <img
            src={match.photoUrl}
            alt={match.name}
            className="relative h-28 w-28 rounded-full object-cover border-4 border-white/20 shadow-xl"
          />
        </div>

        {/* Caller Identity */}
        <div className="mb-2">
          <h2 className="text-xl font-black text-white flex items-center justify-center gap-1.5">
            {match.name}, {match.age}
            {match.isVerified && <ShieldCheck size={16} className="text-emerald-400 inline" />}
          </h2>
          <p className="text-xs text-rose-300 font-medium">
            {match.neighborhood || match.location} · {match.trustScore || 90}% Trust Score
          </p>
        </div>

        {/* Live Audio Visualizer (Waveform) */}
        {callState === 'connected' && (
          <div className="w-full bg-white/5 rounded-2xl p-3 my-3 border border-white/10">
            <div className="flex items-center justify-center gap-1 h-10 px-2">
              {audioWaveAmplitudes.map((amp, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isMuted ? 'bg-slate-600 h-2' : 'bg-gradient-to-t from-rose-500 to-amber-300'
                  }`}
                  style={{ height: `${isMuted ? 6 : Math.max(8, (amp / 100) * 36)}px` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isMuted ? 'Microphone muted' : 'Voice connected · Live 1-on-1 audio'}
            </p>
          </div>
        )}

        {/* Icebreaker Card for Live Calls */}
        {callState === 'connected' && (
          <div className="w-full bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 my-2 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles size={11} /> Auntie Shosh Topic
              </span>
              <button
                onClick={() => setCurrentIcebreakerIdx((prev) => (prev + 1) % KENYAN_ICEBREAKERS.length)}
                className="text-[10px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                Next Idea
              </button>
            </div>
            <p className="text-xs text-amber-100 font-medium leading-relaxed">
              {KENYAN_ICEBREAKERS[currentIcebreakerIdx]}
            </p>
          </div>
        )}

        {/* Status Text when Ringing */}
        {callState === 'ringing' && (
          <p className="text-xs text-slate-300 my-4 animate-pulse">
            Calling you from {match.location}...
          </p>
        )}

        {callState === 'ended' && (
          <p className="text-xs text-rose-400 my-4 font-bold">
            Call ended.
          </p>
        )}

        {/* Action Controls */}
        <div className="w-full mt-4 flex items-center justify-center gap-6">
          {callState === 'ringing' ? (
            <>
              {/* Decline Button */}
              <button
                onClick={handleDeclineOrHangup}
                className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition active:scale-95 cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff size={26} />
              </button>

              {/* Accept Button */}
              <button
                onClick={handleAnswer}
                className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 transition active:scale-95 animate-bounce cursor-pointer"
                title="Answer Call"
              >
                <Phone size={26} />
              </button>
            </>
          ) : (
            <>
              {/* Mute Toggle */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95 cursor-pointer ${
                  isMuted ? 'bg-amber-500 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleDeclineOrHangup}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg transition active:scale-95 cursor-pointer"
                title="Hang Up"
              >
                <PhoneOff size={24} />
              </button>

              {/* Speaker Toggle */}
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition active:scale-95 cursor-pointer ${
                  isSpeakerOn ? 'bg-white/20 text-emerald-300' : 'bg-white/10 text-slate-400'
                }`}
                title="Speaker Mode"
              >
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
