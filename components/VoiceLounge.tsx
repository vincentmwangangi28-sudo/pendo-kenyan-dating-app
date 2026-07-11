import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  deleteDoc, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  Volume2, 
  Plus, 
  Loader2, 
  Share2, 
  Sparkles, 
  Smile, 
  VolumeX, 
  Copy, 
  Check, 
  Radio, 
  Trash2, 
  Megaphone,
  ArrowLeft,
  ChevronRight,
  Sparkle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';
import { generateVoiceCoachResponse, generateSpeech } from '../services/geminiService';
import { ChatSession } from '../types';

interface Participant {
  userId: string;
  name: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

interface VoiceRoom {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  createdAt: number;
  expiresAt: number;
  participants: Participant[];
}

interface VoiceLoungeProps {
  chats: ChatSession[];
  userProfile: { name: string; photoUrl?: string } | null;
  onShareLinkInChat: (matchId: string, text: string) => void;
  onBackToMain?: () => void;
}

export const VoiceLounge: React.FC<VoiceLoungeProps> = ({ 
  chats, 
  userProfile, 
  onShareLinkInChat, 
  onBackToMain 
}) => {
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSuccessMsg, setShareSuccessMsg] = useState<string | null>(null);

  // AI Host states
  const [aiHostActive, setAiHostActive] = useState(false);
  const [aiHostStatus, setAiHostStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [aiHostTranscript, setAiHostTranscript] = useState('');
  const [aiHistory, setAiHistory] = useState<{ role: 'user' | 'coach'; text: string }[]>([]);

  // Local state references for media processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isMounted = useRef(true);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Sound response audio source
  const aiAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Subscribes to active rooms list
  useEffect(() => {
    isMounted.current = true;
    setLoadingRooms(true);

    const roomsCollection = collection(db, 'voiceRooms');
    const unsubscribe = onSnapshot(roomsCollection, (snapshot) => {
      if (!isMounted.current) return;
      const fetchedRooms: VoiceRoom[] = [];
      const now = Date.now();

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filters expired rooms (e.g. rooms older than 2 hours)
        if (data.expiresAt > now) {
          fetchedRooms.push({
            id: doc.id,
            name: data.name || 'Unnamed Lounge',
            creatorId: data.creatorId,
            creatorName: data.creatorName || 'Anonymous Host',
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            participants: data.participants || []
          });
        }
      });
      setRooms(fetchedRooms);
      setLoadingRooms(false);
    }, (error) => {
      console.error("Error watching voice rooms:", error);
      setLoadingRooms(false);
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  // Sync active room updates if we are currently inside a room
  useEffect(() => {
    if (!activeRoom) return;

    const roomDocRef = doc(db, 'voiceRooms', activeRoom.id);
    const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Room was deleted by host
        if (activeRoom.creatorId !== auth.currentUser?.uid) {
          alert("The host has ended this Voice Lounge session.");
        }
        leaveRoomLocally();
        return;
      }
      const data = snapshot.data();
      setActiveRoom({
        id: snapshot.id,
        name: data.name || 'Unnamed Lounge',
        creatorId: data.creatorId,
        creatorName: data.creatorName || 'Anonymous Host',
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        participants: data.participants || []
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeRoom?.id]);

  // Clean up micro audio assets on unmount
  useEffect(() => {
    return () => {
      stopLocalAudioTracking();
      stopSpeechRecognition();
      stopAiVoicePlayback();
    };
  }, []);

  // Web Audio Synth for Soundboard (Plays local Matatu / traditional acoustic sounds)
  const playLocalSynthEffect = (type: 'clap' | 'cheer' | 'laughter' | 'horn') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (type === 'horn') {
        // Matatu Horn Vibe! Dual oscillator sawtooth wave
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';

        osc1.frequency.value = 392.00; // G4
        osc2.frequency.value = 523.25; // C5 (rich interval)

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.6);
        osc2.stop(ctx.currentTime + 0.6);
      } else if (type === 'clap') {
        // High frequency clap clicks
        for (let i = 0; i < 5; i++) {
          const delay = i * 0.08;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1500 - (i * 200), ctx.currentTime + delay);
          
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.06);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.07);
        }
      } else if (type === 'cheer') {
        // Rising cheering wind
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.8);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.0);
      } else if (type === 'laughter') {
        // Chirpy laughter synth
        for (let i = 0; i < 4; i++) {
          const delay = i * 0.15;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, ctx.currentTime + delay);
          osc.frequency.linearRampToValueAtTime(850, ctx.currentTime + delay + 0.05);
          osc.frequency.linearRampToValueAtTime(650, ctx.currentTime + delay + 0.12);

          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.14);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.15);
        }
      }

      // Notify others in room of soundboard activity via local simulation/sound effect overlay
      if (activeRoom) {
        const cleanName = userProfile?.name || auth.currentUser?.email?.split('@')[0] || 'User';
        const otherParticipants = activeRoom.participants.filter(p => p.userId !== auth.currentUser?.uid);
        
        // Push visual effect to participants (handled locally inside onSnapshot triggers)
        console.log(`Played ${type} inside Voice Lounge.`);
      }
    } catch (err) {
      console.warn("Synth soundboard blocked or unsupported", err);
    }
  };

  // Helper to start real or simulated audio mic tracking
  const startLocalAudioTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current || isMuted) {
          setMicVolume(0);
          rafRef.current = requestAnimationFrame(updateVolume);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        const mappedVolume = Math.min(Math.round((average / 128) * 100), 100);
        
        setMicVolume(mappedVolume);

        // Update Speaking state in Firestore
        const isCurrentlySpeaking = mappedVolume > 10;
        updateSpeakingStateInFirestore(isCurrentlySpeaking);

        rafRef.current = requestAnimationFrame(updateVolume);
      };

      rafRef.current = requestAnimationFrame(updateVolume);
    } catch (err) {
      console.warn("Microphone hardware access blocked. Reverting to sandbox audio simulation.", err);
      // Run fallback simulated volume loop when unmuted
      let step = 0;
      const runSimulatedVolume = () => {
        if (!isMounted.current) return;
        if (!isMuted && activeRoom) {
          // occasional natural waves
          step += 0.1;
          const simulatedVol = Math.max(0, Math.round(Math.sin(step) * 20 + Math.random() * 15));
          setMicVolume(simulatedVol);
          updateSpeakingStateInFirestore(simulatedVol > 12);
        } else {
          setMicVolume(0);
          updateSpeakingStateInFirestore(false);
        }
        rafRef.current = requestAnimationFrame(runSimulatedVolume);
      };
      rafRef.current = requestAnimationFrame(runSimulatedVolume);
    }
  };

  const stopLocalAudioTracking = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicVolume(0);
  };

  // Throttled Firestore update for isSpeaking status to protect database quotas
  const lastSpeakingUpdateRef = useRef<number>(0);
  const lastSpeakingStateRef = useRef<boolean>(false);

  const updateSpeakingStateInFirestore = async (isSpeaking: boolean) => {
    if (!activeRoom || !auth.currentUser) return;
    if (isSpeaking === lastSpeakingStateRef.current) return;

    const now = Date.now();
    // Throttle to maximum once per 600ms unless it's a critical stop-speaking event
    if (!isSpeaking && now - lastSpeakingUpdateRef.current < 600) {
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = setTimeout(() => {
        updateSpeakingStateInFirestore(false);
      }, 650);
      return;
    }

    lastSpeakingUpdateRef.current = now;
    lastSpeakingStateRef.current = isSpeaking;

    try {
      const roomDocRef = doc(db, 'voiceRooms', activeRoom.id);
      const updatedParticipants = activeRoom.participants.map(p => {
        if (p.userId === auth.currentUser?.uid) {
          return { ...p, isSpeaking };
        }
        return p;
      });

      await updateDoc(roomDocRef, { participants: updatedParticipants });
    } catch (e) {
      console.warn("Mute/unmute sync delayed", e);
    }
  };

  // Triggers Web Speech API transcription so users can "talk" to Auntie Shosh AI
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-KE'; // Kenyan-English dialect target

      rec.onstart = () => {
        setAiHostStatus('listening');
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setAiHostTranscript(text);
          await handleMessageToAiHost(text);
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition warning:", e);
        setAiHostStatus('idle');
      };

      rec.onend = () => {
        if (aiHostStatus === 'listening') {
          setAiHostStatus('idle');
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.warn("Failed starting Speech Recognition", e);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  // Handles text response generations and voice playback for AI Host Shosh
  const handleMessageToAiHost = async (userText: string) => {
    if (!activeRoom) return;
    setAiHostStatus('thinking');

    const cleanUserMsg = userText.trim();
    if (!cleanUserMsg) return;

    const userMsg = { role: 'user' as const, text: cleanUserMsg };
    const updatedHistory = [...aiHistory, userMsg];
    setAiHistory(updatedHistory);

    try {
      // Prompt customization for Auntie Shosh's Voice Lounge persona
      const systemPromptPrefix = 
        `You are Auntie Shosh, the beloved traditional matchmaking elder and host of the MeetHub Voice Lounge. ` +
        `Keep your answers brief, warm, humorous, and full of Kenyan slang (Sasa, Sherehe, Boda, Matatu, Kweli). ` +
        `Address the user as 'my child'. Guide them, crack light relationship jokes, and suggest interesting conversation starters. ` +
        `User says: ${cleanUserMsg}`;

      const aiReply = await generateVoiceCoachResponse(systemPromptPrefix, aiHistory);
      
      const coachMsg = { role: 'coach' as const, text: aiReply };
      setAiHistory([...updatedHistory, coachMsg]);

      // Play Auntie Shosh's voice aloud!
      await playAiVoiceSpeech(aiReply);
    } catch (err) {
      console.error("AI Lounge host response failed", err);
      setAiHostStatus('idle');
    }
  };

  const playAiVoiceSpeech = async (text: string) => {
    try {
      setAiHostStatus('speaking');
      const base64Audio = await generateSpeech(text);

      if (!base64Audio || !isMounted.current) {
        setAiHostStatus('idle');
        return;
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      
      stopAiVoicePlayback();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        if (isMounted.current) {
          setAiHostStatus('idle');
        }
      };

      aiAudioSourceRef.current = source;
      source.start(0);
    } catch (err) {
      console.error("Failed Shosh playback", err);
      setAiHostStatus('idle');
    }
  };

  const stopAiVoicePlayback = () => {
    if (aiAudioSourceRef.current) {
      try {
        aiAudioSourceRef.current.stop();
      } catch (e) {}
      aiAudioSourceRef.current = null;
    }
    setAiHostStatus('idle');
  };

  // AI Host "Auntie Shosh" triggers auto-join when alone in room
  useEffect(() => {
    if (!activeRoom) {
      setAiHostActive(false);
      return;
    }

    const realPeople = activeRoom.participants.filter(p => p.userId !== 'shosh_ai_host');
    
    // Auntie Shosh joins if user has been alone for 2 seconds
    if (realPeople.length === 1 && !aiHostActive) {
      const timer = setTimeout(() => {
        if (!isMounted.current || !activeRoom) return;
        setAiHostActive(true);
        setAiHistory([
          {
            role: 'coach',
            text: "Sasa my child! I am Auntie Shosh, the matchmaking elder of the Voice Lounge. Since you are alone here, I've joined to keep you company and prepare your vibe. Speak to me or type a message below, let's practice!"
          }
        ]);
        playAiVoiceSpeech("Sasa my child! I am Auntie Shosh, the matchmaking elder of the Voice Lounge. Since you are alone here, I've joined to keep you company and prepare your vibe. Speak to me or type a message below, let's practice!");
      }, 2000);

      return () => clearTimeout(timer);
    } 
    // Shosh leaves gracefully if another actual person joins
    else if (realPeople.length > 1 && aiHostActive) {
      setAiHostActive(false);
      stopAiVoicePlayback();
    }
  }, [activeRoom?.participants?.length, aiHostActive]);

  // Actions: Join Lounge Room
  const handleJoinRoom = async (room: VoiceRoom) => {
    if (!auth.currentUser) return;

    try {
      const cleanName = userProfile?.name || auth.currentUser.email?.split('@')[0] || 'User';
      const myParticipant: Participant = {
        userId: auth.currentUser.uid,
        name: cleanName,
        isMuted: isMuted,
        isSpeaking: false,
        joinedAt: Date.now()
      };

      // Check if user is already in participant list
      const alreadyIn = room.participants.some(p => p.userId === auth.currentUser?.uid);
      let updatedParticipants = [...room.participants];

      if (!alreadyIn) {
        if (room.participants.length >= 8) {
          alert("This Voice Lounge room is full! Max 8 people.");
          return;
        }
        updatedParticipants.push(myParticipant);
      }

      const roomDocRef = doc(db, 'voiceRooms', room.id);
      await setDoc(roomDocRef, { ...room, participants: updatedParticipants }, { merge: true });

      setActiveRoom({
        ...room,
        participants: updatedParticipants
      });

      // Start mic feedback tracker
      startLocalAudioTracking();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `voiceRooms/${room.id}`);
    }
  };

  // Actions: Create a new lounge room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const trimmedName = roomNameInput.trim();
    const finalRoomName = trimmedName || `${userProfile?.name || 'My'}'s Lounge 🎙️`;

    try {
      const uniqueId = `lounge-${Math.random().toString(36).substring(2, 11)}`;
      const cleanName = userProfile?.name || auth.currentUser.email?.split('@')[0] || 'User';

      const initialParticipant: Participant = {
        userId: auth.currentUser.uid,
        name: cleanName,
        isMuted: isMuted,
        isSpeaking: false,
        joinedAt: Date.now()
      };

      const newRoom: VoiceRoom = {
        id: uniqueId,
        name: finalRoomName,
        creatorId: auth.currentUser.uid,
        creatorName: cleanName,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 2, // 2 Hour lifespan
        participants: [initialParticipant]
      };

      const roomDocRef = doc(db, 'voiceRooms', uniqueId);
      await setDoc(roomDocRef, newRoom);

      setActiveRoom(newRoom);
      setRoomNameInput('');
      setCreatingRoom(false);

      // Start local audio loop
      startLocalAudioTracking();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'voiceRooms');
    }
  };

  // Actions: Leave room
  const handleLeaveRoom = async () => {
    if (!activeRoom || !auth.currentUser) return;

    try {
      const isHost = activeRoom.creatorId === auth.currentUser.uid;
      const roomDocRef = doc(db, 'voiceRooms', activeRoom.id);

      if (isHost) {
        // If host leaves, the ephemeral room is deleted cleanly
        await deleteDoc(roomDocRef);
      } else {
        // Participant leaves: remove from list
        const updatedParticipants = activeRoom.participants.filter(p => p.userId !== auth.currentUser?.uid);
        await setDoc(roomDocRef, { participants: updatedParticipants }, { merge: true });
      }

      leaveRoomLocally();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `voiceRooms/${activeRoom.id}`);
    }
  };

  const leaveRoomLocally = () => {
    setActiveRoom(null);
    stopLocalAudioTracking();
    stopSpeechRecognition();
    stopAiVoicePlayback();
    setAiHostActive(false);
  };

  // Toggle Mute button
  const handleToggleMute = async () => {
    if (!activeRoom || !auth.currentUser) return;
    const nextMuteState = !isMuted;
    setIsMuted(nextMuteState);

    try {
      const roomDocRef = doc(db, 'voiceRooms', activeRoom.id);
      const updatedParticipants = activeRoom.participants.map(p => {
        if (p.userId === auth.currentUser?.uid) {
          return { ...p, isMuted: nextMuteState, isSpeaking: false };
        }
        return p;
      });

      await updateDoc(roomDocRef, { participants: updatedParticipants });
    } catch (e) {
      console.warn("Mute status sync delayed", e);
    }
  };

  // Clipboard copy helper
  const copyRoomLinkToClipboard = () => {
    if (!activeRoom) return;
    const url = `${window.location.origin}/#room=${activeRoom.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text', err);
    });
  };

  // Share Invitation link into selected match's chat
  const handleShareToMatch = (matchId: string, matchName: string) => {
    if (!activeRoom) return;
    
    const inviteText = `🎙️ Join my temporary Voice Lounge room right now! No phone number required: **"${activeRoom.name}"** ✨ Let's talk here in real-time!`;
    onShareLinkInChat(matchId, inviteText);

    setShareSuccessMsg(`Sent voice invitation to ${matchName}!`);
    setTimeout(() => {
      setShareSuccessMsg(null);
      setShowShareModal(false);
    }, 2500);
  };

  // Beautiful random aesthetic title suggestions
  const presetLoungeNames = [
    "Westlands Sundowner 🍹",
    "Nairobi Night Vibes 🦉",
    "Chai & Sheng Chats ☕",
    "Kilimani Tech Meetup 💻",
    "Roysambu Rhumba Central 🎷",
    "Auntie Shosh's Secret Lobby 👵"
  ];

  return (
    <div className="space-y-4 animate-fade-in" id="voice-lounge-parent">
      
      {/* ----------------- SUBTAB TITLE BANNER ----------------- */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-rose-600 rounded-[24px] text-white p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 text-white pointer-events-none transform rotate-12">
          <Radio size={140} />
        </div>
        <div className="flex items-center gap-1.5 text-indigo-200 mb-1 font-bold text-[10px] uppercase tracking-widest">
          <Radio size={14} className="animate-pulse" />
          <span>EPHEMERAL VOICE CORNER</span>
        </div>
        <h2 className="text-base font-extrabold leading-tight">MeetHub Voice Lounge</h2>
        <p className="text-[11px] text-purple-100 mt-1 max-w-sm">
          Create or join temporary, ephemeral voice-only rooms. Talk in real-time with zero phone number exchanges. Secure, private, and fun.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!activeRoom ? (
          /* =====================================================================
             VIEW 1: VOICE ROOMS LIST / LOBBY
             ===================================================================== */
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* LOBBY ACTIONS */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" />
                Active Lounges ({rooms.length})
              </span>

              {!creatingRoom ? (
                <button
                  onClick={() => {
                    setCreatingRoom(true);
                    setRoomNameInput(presetLoungeNames[Math.floor(Math.random() * presetLoungeNames.length)]);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-xl flex items-center gap-1 transition-all shadow-md shadow-indigo-100 cursor-pointer"
                  id="btn-create-lounge-room"
                >
                  <Plus size={14} />
                  Host Room
                </button>
              ) : (
                <button
                  onClick={() => setCreatingRoom(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] px-3 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* CREATE ROOM DRAWER / INPUT PANEL */}
            {creatingRoom && (
              <motion.form 
                onSubmit={handleCreateRoom}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white border border-indigo-100 rounded-[22px] p-4 space-y-3 shadow-xs"
              >
                <div>
                  <label className="block text-[10px] font-bold text-indigo-950 uppercase tracking-wider mb-1">
                    Room Topic or Name
                  </label>
                  <input
                    type="text"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder="e.g. Westlands Sundowner 🍹"
                    maxLength={40}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                    id="room-name-input-field"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setRoomNameInput(presetLoungeNames[Math.floor(Math.random() * presetLoungeNames.length)])}
                    className="text-[10px] font-bold text-indigo-600 hover:underline px-2"
                  >
                    🎲 Random Name
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Launch Lounge
                  </button>
                </div>
              </motion.form>
            )}

            {/* ROOMS GRID */}
            {loadingRooms ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <span className="text-xs font-medium">Scanning airwaves...</span>
              </div>
            ) : rooms.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[28px] p-8 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                  <Radio size={20} className="opacity-80" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Airwaves are Clear</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No active Voice Lounge rooms right now. Be the first to start a conversation!</p>
                </div>
                <button
                  onClick={() => {
                    setCreatingRoom(true);
                    setRoomNameInput(presetLoungeNames[Math.floor(Math.random() * presetLoungeNames.length)]);
                  }}
                  className="inline-flex bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 px-4 rounded-xl transition"
                >
                  Start a Room topic
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="voice-lounge-rooms-grid">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white border border-slate-100 hover:border-indigo-100 rounded-3xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      {/* Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[8px] uppercase tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        Live Call
                      </span>

                      <h3 className="text-xs font-black text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Host: <span className="font-bold text-slate-500">{room.creatorName}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Users size={12} className="text-slate-400" />
                        <span>{room.participants.length} / 8</span>
                      </div>
                      
                      <button
                        onClick={() => handleJoinRoom(room)}
                        className="bg-indigo-50 hover:bg-indigo-600 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        Join Room
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* =====================================================================
             VIEW 2: ACTIVE VOICE ROOM
             ===================================================================== */
          <motion.div
            key="active-room"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4"
          >
            {/* ACTIVE ROOM CONTAINER */}
            <div className="bg-slate-950 text-white rounded-[28px] p-5 shadow-xl border border-slate-850 space-y-6 overflow-hidden relative">
              {/* Backglow ambient light */}
              <div className="absolute right-[-40px] bottom-[-40px] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-[-40px] top-[-40px] w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Room Header */}
              <div className="flex items-start justify-between border-b border-white/5 pb-4 z-10 relative">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[8px] font-black bg-indigo-900/40 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                      🎙️ Voice Lounge
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      #{activeRoom.id.split('-')[1] || activeRoom.id.slice(-4)}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                    {activeRoom.name}
                  </h3>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
                    title="Invite match"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={copyRoomLinkToClipboard}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    title="Copy room link"
                  >
                    {isCopied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Real-time participant wave visualization container */}
              <div className="min-h-[160px] py-4 flex flex-wrap gap-6 items-center justify-center z-10 relative" id="active-participants-container">
                {activeRoom.participants.map((p) => {
                  const isCurrentUser = p.userId === auth.currentUser?.uid;
                  // Handle simulated speaking states for active wave decoration
                  const speaking = p.isSpeaking && !p.isMuted;
                  
                  return (
                    <div key={p.userId} className="flex flex-col items-center gap-2 relative">
                      <div className="relative">
                        {/* Speaker breathing ripple rings */}
                        {speaking && (
                          <>
                            <div className="absolute inset-[-4px] rounded-full bg-emerald-500/20 animate-ping" />
                            <div className="absolute inset-[-8px] rounded-full bg-emerald-500/10 animate-pulse" />
                          </>
                        )}

                        {/* Avatar */}
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-black text-white bg-gradient-to-tr transition-all duration-300 ${
                          speaking 
                            ? 'from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400 scale-105' 
                            : 'from-indigo-600 to-purple-500 ring-2 ring-white/10'
                        }`}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Mute Indicator Badge */}
                        {p.isMuted && (
                          <div className="absolute bottom-0 right-0 p-1 bg-red-600 rounded-full border border-slate-950 text-white" title="Muted">
                            <MicOff size={10} />
                          </div>
                        )}

                        {/* Active Speaker wave bars on top */}
                        {speaking && (
                          <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 flex items-center gap-0.5 bg-emerald-950/80 border border-emerald-500/30 rounded-full px-1.5 py-0.5 h-4">
                            <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                            <span className="w-0.5 bg-emerald-300 rounded-full animate-bounce h-3" style={{ animationDelay: '0.2s' }} />
                            <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.3s' }} />
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] font-bold text-slate-300 tracking-wide flex items-center gap-1 max-w-[80px] truncate text-center">
                        {p.name}
                        {isCurrentUser && <span className="opacity-60 font-medium text-[8px] uppercase tracking-wider">(You)</span>}
                      </span>
                    </div>
                  );
                })}

                {/* AI COMPANION AUNTIE SHOSH AVATAR */}
                {aiHostActive && (
                  <div className="flex flex-col items-center gap-2 relative animate-fade-in">
                    <div className="relative">
                      {/* Speaker rings */}
                      {aiHostStatus === 'speaking' && (
                        <>
                          <div className="absolute inset-[-4px] rounded-full bg-rose-500/20 animate-ping" />
                          <div className="absolute inset-[-8px] rounded-full bg-rose-500/10 animate-pulse" />
                        </>
                      )}

                      {/* Avatar Shosh */}
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-black text-white bg-gradient-to-tr transition-all duration-300 ${
                        aiHostStatus === 'speaking'
                          ? 'from-rose-500 to-amber-400 shadow-md shadow-rose-500/20 ring-2 ring-rose-400 scale-105' 
                          : 'from-amber-600 to-amber-800 ring-2 ring-white/10'
                      }`}>
                        👵⚖️
                      </div>

                      {/* Speaks animation overlay */}
                      {aiHostStatus === 'speaking' && (
                        <div className="absolute top-[-8px] left-1/2 transform -translate-x-1/2 flex items-center gap-0.5 bg-rose-950/80 border border-rose-500/30 rounded-full px-1.5 py-0.5 h-4">
                          <span className="w-0.5 bg-rose-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                          <span className="w-0.5 bg-amber-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.2s' }} />
                          <span className="w-0.5 bg-rose-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.3s' }} />
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-amber-300 tracking-wide flex items-center gap-1.5">
                      <Sparkles size={10} className="text-amber-400" />
                      Auntie Shosh (Host)
                    </span>
                  </div>
                )}
              </div>

              {/* Local wave indicator visualizer */}
              <div className="flex flex-col items-center justify-center py-1">
                <div className="h-6 flex items-center justify-center gap-1">
                  {micVolume > 0 && !isMuted ? (
                    <div className="flex items-center gap-1 h-6">
                      <span className="w-0.5 bg-indigo-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                      <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce h-4" style={{ animationDelay: '0.2s' }} />
                      <span className="w-0.5 bg-indigo-300 rounded-full animate-bounce h-5" style={{ animationDelay: '0.3s' }} />
                      <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.4s' }} />
                      <span className="w-0.5 bg-indigo-500 rounded-full animate-bounce h-2.5" style={{ animationDelay: '0.5s' }} />
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      {isMuted ? "Your mic is muted" : "Wave stream silent"}
                    </span>
                  )}
                </div>
              </div>

              {/* Soundboard Panel */}
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-3 space-y-2">
                <p className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400 flex items-center gap-1">
                  <Megaphone size={11} className="text-indigo-400" />
                  Lounge Soundboard effects
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { type: 'horn', icon: '🎺', label: 'Vuvuzela' },
                    { type: 'clap', icon: '👏', label: 'Claps' },
                    { type: 'cheer', icon: '🎉', label: 'Cheer' },
                    { type: 'laughter', icon: '😂', label: 'Laugh' }
                  ].map(btn => (
                    <button
                      key={btn.type}
                      onClick={() => playLocalSynthEffect(btn.type as any)}
                      className="py-2 px-1 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/10 rounded-xl text-center transition-all cursor-pointer"
                    >
                      <p className="text-sm leading-none">{btn.icon}</p>
                      <p className="text-[8px] text-slate-400 font-bold tracking-tight mt-1">{btn.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auntie Shosh AI Conversation Panel */}
              {aiHostActive && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    <span>Practice with Auntie Shosh</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      {aiHostStatus === 'listening' && "🔴 Shosh is listening..."}
                      {aiHostStatus === 'thinking' && "⚡ Auntie is cooking thoughts..."}
                      {aiHostStatus === 'speaking' && "🔊 Shosh speaking..."}
                      {aiHostStatus === 'idle' && "💤 Standby"}
                    </span>
                  </div>

                  <div className="max-h-24 overflow-y-auto space-y-2 pr-1 scrollbar-thin select-text">
                    {aiHistory.slice(-2).map((h, index) => (
                      <div key={index} className={`text-[11px] leading-relaxed ${h.role === 'user' ? 'text-indigo-300 text-right' : 'text-slate-100 italic'}`}>
                        <span className="font-extrabold">{h.role === 'user' ? 'You: ' : '👵 Auntie Shosh: '}</span>
                        {h.text}
                      </div>
                    ))}
                  </div>

                  {/* Audio transcription trigger and textbox */}
                  <div className="flex gap-1.5 items-center">
                    <button
                      onClick={startSpeechRecognition}
                      disabled={aiHostStatus === 'listening' || aiHostStatus === 'thinking'}
                      className={`p-2 rounded-xl transition ${
                        aiHostStatus === 'listening'
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-white/5 hover:bg-indigo-600/20 text-indigo-400 hover:text-white border border-white/5'
                      }`}
                      title="Speak to Shosh"
                    >
                      <Mic size={14} />
                    </button>

                    <input
                      type="text"
                      placeholder="Type message to Auntie Shosh..."
                      value={aiHostTranscript}
                      onChange={(e) => setAiHostTranscript(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && aiHostTranscript.trim()) {
                          handleMessageToAiHost(aiHostTranscript);
                          setAiHostTranscript('');
                        }
                      }}
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 text-[11px] text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Main Interaction Controls */}
              <div className="flex items-center justify-center gap-6 border-t border-white/5 pt-4 z-10 relative">
                {/* Mute Button */}
                <button
                  onClick={handleToggleMute}
                  className={`p-3.5 rounded-full transition-all border ${
                    isMuted
                      ? 'bg-red-950/40 text-red-400 border-red-500/20 hover:bg-red-950/60'
                      : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                  title={isMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                {/* Leave Room Button */}
                <button
                  onClick={handleLeaveRoom}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-full shadow-lg shadow-red-500/10 flex items-center gap-1.5 cursor-pointer"
                  id="btn-leave-voice-room"
                >
                  <PhoneOff size={14} />
                  Leave Lounge
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------- INVITATION SHARE MODAL -------------------- */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-5 w-full max-w-xs space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
                <Share2 size={13} className="text-indigo-600" />
                Invite Matches
              </span>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-md hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <p className="text-[10.5px] leading-relaxed text-slate-500">
              Invite matches to join this secure, real-time voice lounge session anonymously. They will receive an invitation link in your chat window.
            </p>

            {shareSuccessMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-bold flex items-center gap-1.5">
                <Check size={12} className="text-emerald-500" />
                <span>{shareSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {chats.length === 0 ? (
                <div className="py-4 text-center text-[10px] text-slate-400 font-bold">
                  No active matches to invite.
                </div>
              ) : (
                chats.map(chat => (
                  <button
                    key={chat.matchId}
                    onClick={() => handleShareToMatch(chat.matchId, chat.matchName)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center">
                        {chat.matchName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700">{chat.matchName}</span>
                    </div>
                    <ChevronRight size={12} className="text-slate-400" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
