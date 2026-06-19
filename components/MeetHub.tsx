import React, { useState, useEffect, useRef } from 'react';
import { getCachedAccessToken, signInForGoogleMeet } from '../services/firebase';
import { ChatSession } from '../types';
import { generateVidDateThemePlan, generateLiveIcebreakerQuestion } from '../services/geminiService';
import { 
  Video, Share2, Copy, Plus, Calendar, ArrowRight, Lock, Globe, Sparkles, 
  Clock, ExternalLink, Check, Loader2, ArrowLeft, Trash2, Camera, Mic, 
  MicOff, VideoOff, Heart, Smile, Compass, ShieldCheck, RefreshCw, Award
} from 'lucide-react';

interface MeetHubProps {
  chats: ChatSession[];
  onBack: () => void;
  onShareLinkInChat: (chatId: string, text: string) => void;
}

interface SavedMeet {
  id: string;
  meetingUri: string;
  createdAt: string;
  recipientName?: string;
}

interface ScheduledDate {
  id: string;
  matchId: string;
  matchName: string;
  dateTime: string;
  theme: string;
  notes?: string;
  meetingUri?: string;
}

// Curated Local Icebreaker Deck Cards
const CARDS_DECK: Record<string, string[]> = {
  chitChat: [
    "If you could only eat one Kenyan dish for the rest of your life, what would it be? 🍲",
    "What’s the funniest bio or picture you’ve ever seen on a dating app? 📱",
    "What was your absolute favorite cartoon or game growing up? 🎮",
    "Who is your favorite artist or go-to song when you need good energy? 🎵",
    "What's the best weekend getaway spot in Kenya according to your vibe? 🏔️"
  ],
  deepSparks: [
    "What does a perfect, deep, emotional connection look like to you? ❤️",
    "What is the most valuable life lesson you learned from a past experience?",
    "What are you most passionately working toward or dreaming about in your life right now? ✨",
    "If you could give your younger self one piece of advice, what would it be?",
    "What is something you are incredibly proud of, but rarely get to talk about?"
  ],
  wouldYouRather: [
    "Would you rather go on a road trip to Naivasha or a romantic rooftop dinner in Westlands? 🌅",
    "Would you rather find 10 million Ksh today or instantly find your soulmate? 💰",
    "Would you rather sing karaoke live in front of a crowd or show your worst dance moves to a partner? 💃",
    "Would you rather never eat roasted Nyama Choma again, or never drink Chai tea again? 🥩",
    "Would you rather have a partner who is incredibly funny but messy, or super neat but serious?"
  ],
  sillyFun: [
    "What is your absolute weirdest talent or habit? 🤪",
    "If you were a superhero based in Nairobi, what would your name and superpower be?",
    "What is the cheesiest or worst pickup line you've ever heard or received?",
    "If your current energy level was a Kenyan weather condition, what would it be? 🌦️",
    "What is your go-to karaoke anthem when you\'re feeling brave?"
  ]
};

const THEMES_LIST = [
  { name: "Nairobi Sunset Sip & Talk 🥂", desc: "Unpack a drink, relax, and share stories under virtual sunset backdrops." },
  { name: "Sheng & Slang Challenge 🗣️", desc: "A fun linguistic game comparing local dialects and trendy sheng." },
  { name: "Virtual Cooking Cook-off 🍳", desc: "Prep the same menu, cook side-by-side on camera, and judge each other's plating." },
  { name: "Deep Sparks Question Night 🕯️", desc: "Candlelight ambience with intensive icebreakers to look into each other's soul." },
  { name: "Retro Trivia & Pop Culture Showdown 🧠", desc: "Quiz each other on music, movies, and historical trivia." }
];

export const MeetHub: React.FC<MeetHubProps> = ({ chats, onBack, onShareLinkInChat }) => {
  // General auth & Meet creation states
  const [token, setToken] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedMeets, setSavedMeets] = useState<SavedMeet[]>([]);
  const [activeMeetUrl, setActiveMeetUrl] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Dynamic Navigation tab state inside MeetHub
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'schedule' | 'icebreakers' | 'hardware'>('create');

  // --- 1. Scheduling Feature States ---
  const [scheduledDates, setScheduledDates] = useState<ScheduledDate[]>([]);
  const [schedMatchId, setSchedMatchId] = useState<string>('');
  const [schedDateTime, setSchedDateTime] = useState<string>('');
  const [schedTheme, setSchedTheme] = useState<string>(THEMES_LIST[0].name);
  const [schedNotes, setSchedNotes] = useState<string>('');
  const [schedCreatedUrl, setSchedCreatedUrl] = useState<string | null>(null);
  const [schedSuccess, setSchedSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // --- 2. Icebreaker State Machine ---
  const [currentCategory, setCurrentCategory] = useState<string>('chitChat');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [isAIQuestionLoading, setIsAIQuestionLoading] = useState<boolean>(false);
  const [aiCustomQuestion, setAiCustomQuestion] = useState<string | null>(null);

  // --- 3. Interactive Agenda State ---
  const [selectedAgendaTheme, setSelectedAgendaTheme] = useState<string>(THEMES_LIST[0].name);
  const [selectedAgendaMatch, setSelectedAgendaMatch] = useState<string>('');
  const [agendaOutput, setAgendaOutput] = useState<string | null>(null);
  const [isGeneratingAgenda, setIsGeneratingAgenda] = useState<boolean>(false);

  // --- 4. Pre-flight Hardware Verification State ---
  const [isHardTesting, setIsHardTesting] = useState<boolean>(false);
  const [testVideoBlocked, setTestVideoBlocked] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [testStatusMsg, setTestStatusMsg] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Synchronous ticking clock for scheduler countdowns
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  // Load configuration and cached parameters
  useEffect(() => {
    const t = getCachedAccessToken();
    if (t) setToken(t);

    const localSaved = localStorage.getItem('pendo_saved_meet_rooms');
    if (localSaved) {
      try {
        setSavedMeets(JSON.parse(localSaved));
      } catch (e) {
        console.error("Error reading saved meetings", e);
      }
    }

    const localScheduled = localStorage.getItem('pendo_scheduled_video_dates');
    if (localScheduled) {
      try {
        setScheduledDates(JSON.parse(localScheduled));
      } catch (e) {
        console.error("Error reading scheduled dates", e);
      }
    }

    // Auto-select first chat match for quick fields
    if (chats.length > 0) {
      const firstChat = chats[0].matchId;
      setSelectedChatId(firstChat);
      setSchedMatchId(firstChat);
      setSelectedAgendaMatch(firstChat);
    }
  }, [chats]);

  // Clean up media streams if testing is turned off or on unmount
  useEffect(() => {
    return () => {
      stopHardwareVerification();
    };
  }, []);

  const handleAuthorize = async () => {
    setError(null);
    setIsAuthorizing(true);
    try {
      const accessToken = await signInForGoogleMeet();
      setToken(accessToken);
    } catch (err: any) {
      console.error("Authorization error", err);
      setError(err.message || "Could not authorize Google Meet. Please try again.");
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleCreateMeetSpace = async () => {
    setError(null);
    setIsCreating(true);
    setShareSuccess(null);
    try {
      let activeToken = token;
      if (!activeToken) {
        activeToken = await signInForGoogleMeet();
        setToken(activeToken);
      }

      if (!activeToken) {
        throw new Error("No active Google authorization token found.");
      }

      const response = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `Google Meet creation failed with code ${response.status}`);
      }

      const data = await response.json();
      const meetUrl = data.meetingUri;
      if (!meetUrl) {
         throw new Error("API response did not contain a valid meetingUri.");
      }

      setActiveMeetUrl(meetUrl);

      // Save to history
      const newMeet: SavedMeet = {
        id: Date.now().toString(),
        meetingUri: meetUrl,
        createdAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      const updatedMeets = [newMeet, ...savedMeets].slice(0, 15);
      setSavedMeets(updatedMeets);
      localStorage.setItem('pendo_saved_meet_rooms', JSON.stringify(updatedMeets));

    } catch (err: any) {
      console.error("Meeting creation failed", err);
      setError(err.message || "Failed to create Google Meet room. Ensure your Google account is verified with Meet workspace features.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareWithChat = (meetUrl: string, meetId: string) => {
    if (!selectedChatId) {
      setError("Please select a match or group chat to share with.");
      return;
    }

    const tChat = chats.find(c => c.matchId === selectedChatId);
    const destinationName = tChat ? tChat.matchName : "your match";

    const inviteMsg = `Hey! I scheduled a Google Meet video date for us 🎥🍿\nJoin here: ${meetUrl}`;
    onShareLinkInChat(selectedChatId, inviteMsg);

    // Update history
    const updatedMeets = savedMeets.map(item => {
      if (item.id === meetId) {
        return { ...item, recipientName: destinationName };
      }
      return item;
    });
    setSavedMeets(updatedMeets);
    localStorage.setItem('pendo_saved_meet_rooms', JSON.stringify(updatedMeets));

    setShareSuccess(`Successfully shared with ${destinationName}!`);
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('pendo_saved_meet_rooms');
    setSavedMeets([]);
    setActiveMeetUrl(null);
  };

  // --- 1. Scheduling Handlers ---
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSchedSuccess(null);

    if (!schedMatchId) {
      setError("Please choose a match to schedule your video date.");
      return;
    }
    if (!schedDateTime) {
      setError("Please select a date and time to meet.");
      return;
    }

    const selectedChat = chats.find(c => c.matchId === schedMatchId);
    const mName = selectedChat ? selectedChat.matchName : "your match";

    const newSched: ScheduledDate = {
      id: Date.now().toString(),
      matchId: schedMatchId,
      matchName: mName,
      dateTime: schedDateTime,
      theme: schedTheme,
      notes: schedNotes,
      meetingUri: schedCreatedUrl || undefined
    };

    const newScheduleList = [newSched, ...scheduledDates];
    setScheduledDates(newScheduleList);
    localStorage.setItem('pendo_scheduled_video_dates', JSON.stringify(newScheduleList));

    // Clear inputs
    setSchedNotes('');
    setSchedCreatedUrl(null);
    setSchedSuccess(`Virtual date with ${mName} scheduled! Dynamic room tracker is running.`);
    
    // Auto post scheduling invite text to chat
    const formattedTime = new Date(schedDateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const invitationText = `✨ Sched Date alert! I booked an upcoming virtual date for us on ${formattedTime}!\nTheme: ${schedTheme}${schedCreatedUrl ? `\nLink to enter: ${schedCreatedUrl}` : ""}`;
    onShareLinkInChat(schedMatchId, invitationText);

    setTimeout(() => setSchedSuccess(null), 4000);
  };

  const handleDeleteSchedule = (id: string) => {
    const filtered = scheduledDates.filter(s => s.id !== id);
    setScheduledDates(filtered);
    localStorage.setItem('pendo_scheduled_video_dates', JSON.stringify(filtered));
  };

  // Countdown formatter
  const getCountdownValue = (targetDateStr: string) => {
    const diff = new Date(targetDateStr).getTime() - currentTime;
    if (diff <= 0) return "Happening Now! 💖";
    
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${mins % 60}m`;
    if (hours > 0) return `${hours}h ${mins % 60}m ${secs % 60}s`;
    return `${mins}m ${secs % 60}s`;
  };

  // --- 2. Icebreaker Core Handlers ---
  const handleNextLocalCard = () => {
    setIsCardFlipped(false);
    setAiCustomQuestion(null);
    const categoryCards = CARDS_DECK[currentCategory] || CARDS_DECK.chitChat;
    const nextIndex = (currentCardIndex + 1) % categoryCards.length;
    setTimeout(() => {
      setCurrentCardIndex(nextIndex);
    }, 150);
  };

  const handleFetchAICustomQuestion = async () => {
    setError(null);
    setIsAIQuestionLoading(true);
    setIsCardFlipped(false);
    try {
      const q = await generateLiveIcebreakerQuestion(currentCategory);
      setAiCustomQuestion(q);
    } catch (err: any) {
      console.error(err);
      setError("Cloud request failed. Using normal cards.");
    } finally {
      setIsAIQuestionLoading(false);
    }
  };

  // --- 3. Gemini Date Planner Handlers ---
  const handleGenerateDateAgenda = async () => {
    setError(null);
    setAgendaOutput(null);
    setIsGeneratingAgenda(true);

    const partnerChat = chats.find(c => c.matchId === selectedAgendaMatch);
    const partnerName = partnerChat ? partnerChat.matchName : "your match";

    try {
      const planText = await generateVidDateThemePlan(selectedAgendaTheme, partnerName);
      setAgendaOutput(planText);
    } catch (err: any) {
      console.error(err);
      setError("AI was unable to coordinate the thematic planner. Please choose another theme.");
    } finally {
      setIsGeneratingAgenda(false);
    }
  };

  // --- 4. Pre-flight Hardware Verification Test ---
  const startHardwareVerification = async () => {
    setError(null);
    setTestVideoBlocked(false);
    setMicVolume(0);
    setIsHardTesting(true);
    setTestStatusMsg("Launching hardware channels...");

    try {
      const userMediaConstraints = { audio: true, video: { width: 320, height: 240 } };
      const stream = await navigator.mediaDevices.getUserMedia(userMediaConstraints);
      streamRef.current = stream;

      // Assign to video element if standard rendering
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Mic analysis setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setTestStatusMsg("Standard stream linked. Please speak to test mic.");

      const checkVolume = () => {
        if (!streamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let valuesSum = 0;
        for (let i = 0; i < bufferLength; i++) {
          valuesSum += dataArray[i];
        }
        const avg = valuesSum / bufferLength;
        // Map average volume from 0-128 range to 0-100 percentage bar
        setMicVolume(Math.min(100, Math.floor((avg / 64) * 100)));
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();

    } catch (err: any) {
      console.warn("Hardware media permissions restricted:", err);
      setTestVideoBlocked(true);
      setTestStatusMsg("Simulating device: Testing your custom avatar & status.");
      
      // Simulate fake audio rhythm
      let increment = 1;
      let mockVol = 12;
      const interval = setInterval(() => {
        if (streamRef.current === null && isHardTesting) {
          mockVol += (Math.random() * 20 - 10) * increment;
          if (mockVol < 10) mockVol = 15;
          if (mockVol > 90) mockVol = 80;
          setMicVolume(Math.floor(mockVol));
        } else {
          clearInterval(interval);
        }
      }, 350);
    }
  };

  const stopHardwareVerification = () => {
    setIsHardTesting(false);
    setMicVolume(0);
    setTestStatusMsg('');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (videoRef.current) {
       videoRef.current.srcObject = null;
    }
  };

  // Helper getters
  const currentLocalDeck = CARDS_DECK[currentCategory] || CARDS_DECK.chitChat;
  const currentCardQuestion = aiCustomQuestion || currentLocalDeck[currentCardIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24" id="meet-hub-root">
      {/* Page Header */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-20 border-b border-rose-50 animate-fade-in" id="meet-hub-header">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
            id="btn-back-from-meethub"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="leading-none">
            <h1 className="text-lg font-extrabold text-slate-800 flex items-center gap-1.5">
              <Video className="text-purple-600 w-5 h-5 fill-purple-100" />
              VidDate Hub
            </h1>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">Ultimate Video Lounge</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {token ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Google Active
            </div>
          ) : (
            <div className="text-[10px] font-extrabold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Suite
            </div>
          )}
        </div>
      </div>

      {/* Sub-Navigation Inner Tabs */}
      <div className="bg-white border-b border-slate-100 flex items-center p-1 px-3 gap-1 sticky top-[53px] z-10" id="meethub-inner-tabs">
        <button
          onClick={() => { stopHardwareVerification(); setActiveSubTab('create'); }}
          className={`flex-1 text-center py-2.5 text-xs font-bold transition-all border-b-2 rounded-t-lg ${activeSubTab === 'create' ? 'border-purple-600 text-purple-600 bg-purple-50/40' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Generate URL
        </button>
        <button
          onClick={() => { stopHardwareVerification(); setActiveSubTab('schedule'); }}
          className={`flex-1 text-center py-2.5 text-xs font-bold transition-all border-b-2 rounded-t-lg ${activeSubTab === 'schedule' ? 'border-purple-600 text-purple-600 bg-purple-50/40' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Calendar Dates
        </button>
        <button
          onClick={() => { stopHardwareVerification(); setActiveSubTab('icebreakers'); }}
          className={`flex-1 text-center py-2.5 text-xs font-bold transition-all border-b-2 rounded-t-lg ${activeSubTab === 'icebreakers' ? 'border-purple-600 text-purple-600 bg-purple-50/40' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Icebreaker Play
        </button>
        <button
          onClick={() => { setActiveSubTab('hardware'); }}
          className={`flex-1 text-center py-2.5 text-xs font-bold transition-all border-b-2 rounded-t-lg ${activeSubTab === 'hardware' ? 'border-purple-600 text-purple-600 bg-purple-50/40' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Hardware Test
        </button>
      </div>

      {/* Main Container */}
      <div className="p-4 space-y-5 flex-1 max-w-sm mx-auto w-full overflow-y-auto no-scrollbar" id="meet-hub-subcontent">
        
        {/* Error Alert Display */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium leading-relaxed flex items-start gap-2 animate-fade-in">
            <span className="font-bold uppercase bg-red-200 text-red-800 text-[9px] px-1.5 py-0.5 rounded shrink-0">FAIL</span>
            <span className="text-[11px] font-semibold">{error}</span>
          </div>
        )}

        {/* -------------------- VIEW A: CREATE URL -------------------- */}
        {activeSubTab === 'create' && (
          <div className="space-y-4 animate-fade-in" id="panel-create">
            {/* Visual Header Banner */}
            <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-600 rounded-[24px] text-white p-5 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none"></div>
              <p className="text-[9px] text-purple-200 font-bold tracking-widest uppercase mb-1">Google Meet API Setup</p>
              <h2 className="text-base font-extrabold leading-tight">Create workspace conference spaces in one tap</h2>
              <p className="text-[11px] text-purple-100 mt-1 lines-relaxed">
                Connect and schedule true Google Meet dates. These rooms do not expire and include built-in whiteboards, chat, and HD visual layouts.
              </p>
            </div>

            {/* Meet Link Generator Box */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 text-purple-700 p-2 text-center rounded-xl shrink-0">
                  <Globe size={18} />
                </div>
                <div className="leading-tight">
                  <h3 className="font-bold text-slate-800 text-xs">Dynamic Room Generator</h3>
                  <p className="text-[10px] text-slate-400">Produce official conferences directly integrated below.</p>
                </div>
              </div>

              {shareSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-bold flex items-center gap-2">
                  <Check size={14} className="text-emerald-500" />
                  <span>{shareSuccess}</span>
                </div>
              )}

              {!token ? (
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Authorize Google access to unlock full automated conferencing. This lets you schedule and push calendar items straight to dates!
                  </p>
                  <button
                    onClick={handleAuthorize}
                    disabled={isAuthorizing}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-purple-200"
                    id="btn-auth-subcreate"
                  >
                    {isAuthorizing ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-purple-200" />
                        Connecting Secure API...
                      </>
                    ) : (
                      <>
                        <Lock size={13} />
                        Sync Google API Access
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleCreateMeetSpace}
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 disabled:from-purple-300 disabled:to-rose-300 text-white py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    id="btn-create-subcreate"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-purple-100" />
                        Setting up Room on Google...
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        Generate Official Meet Room
                      </>
                    )}
                  </button>

                  {activeMeetUrl && (
                    <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-3.5 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between text-xs text-purple-950 font-bold">
                        <span>Lobby URL</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase">Active</span>
                      </div>

                      <div className="flex items-center gap-2 bg-white border border-purple-100 p-2 rounded-xl">
                        <input 
                          type="text" 
                          readOnly 
                          value={activeMeetUrl} 
                          className="text-xs text-slate-700 flex-1 truncate outline-none font-mono"
                        />
                        <button
                          onClick={() => handleCopyLink(activeMeetUrl, 'sub-create-link')}
                          className="p-1 hover:bg-slate-50 border border-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
                          title="Copy Link"
                        >
                          {copiedId === 'sub-create-link' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>

                      {chats.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quick Share Destination</label>
                          <div className="flex gap-2">
                            <select 
                              value={selectedChatId} 
                              onChange={(e) => setSelectedChatId(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs text-slate-700 outline-none"
                            >
                              {chats.map(chat => (
                                <option key={chat.matchId} value={chat.matchId}>{chat.matchName}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleShareWithChat(activeMeetUrl, 'sub-create-link')}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-1 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center"
                            >
                              Share
                            </button>
                          </div>
                        </div>
                      )}

                      <a 
                        href={activeMeetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl text-center flex items-center justify-center gap-1 shadow-sm"
                      >
                        Enter Meeting Room <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History of generated links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">History ({savedMeets.length})</span>
                {savedMeets.length > 0 && (
                  <button onClick={handleClearHistory} className="text-[9px] font-bold text-rose-500 uppercase hover:underline">Clear List</button>
                )}
              </div>

              {savedMeets.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[20px] p-5 text-center text-slate-400 text-xs font-bold">
                  No conference links in history.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                  {savedMeets.map(meet => (
                    <div key={meet.id} className="bg-white border border-slate-100 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {meet.recipientName ? `Date with ${meet.recipientName}` : "General Meet Session"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{meet.createdAt}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopyLink(meet.meetingUri, meet.id)}
                          className="p-1.5 hover:bg-slate-50 rounded"
                          title="Copy link"
                        >
                          {copiedId === meet.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                        <a 
                          href={meet.meetingUri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- VIEW B: CALENDAR COORDINATION -------------------- */}
        {activeSubTab === 'schedule' && (
          <div className="space-y-4 animate-fade-in" id="panel-schedule">
            {/* Visual Head */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-xs">
              <div className="flex items-center gap-2 text-rose-600 mb-2 font-bold text-xs" id="sched-section-head">
                <Calendar size={15} />
                <span>Scheduler Console</span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 leading-none">Schedule & Book Video Dates</h3>
              <p className="text-[11px] text-slate-400 mt-1">Select a match, set your theme environment, save calendars, and coordinate invitations inside Kenya.</p>
            </div>

            {/* Schedule Input Form */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs">
              <h4 className="text-xs font-extrabold text-slate-700 mb-3 flex items-center gap-1">
                <Plus size={14} className="text-purple-600" />
                Schedule Upcoming Virtual Date
              </h4>

              {schedSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-bold flex items-center gap-1.5">
                  <Check size={13} className="text-emerald-500" />
                  <span>{schedSuccess}</span>
                </div>
              )}

              <form onSubmit={handleScheduleSubmit} className="space-y-3" id="frm-sched-meet">
                {/* 1. Partner Selection */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Match Chat</label>
                  <select
                    value={schedMatchId}
                    onChange={(e) => {
                      setSchedMatchId(e.target.value);
                      setSelectedAgendaMatch(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 outline-none focus:border-purple-300"
                    required
                  >
                    <option value="">-- Choose Partner --</option>
                    {chats.map(chat => (
                      <option key={chat.matchId} value={chat.matchId}>
                        {chat.matchName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Date & Time Picker */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Date & Time Selection</label>
                  <input
                    type="datetime-local"
                    value={schedDateTime}
                    onChange={(e) => setSchedDateTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 outline-none focus:border-purple-300"
                    required
                  />
                </div>

                {/* 3. Theme Preset Select */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Choose Date Theme Activity</label>
                  <select
                    value={schedTheme}
                    onChange={(e) => {
                      setSchedTheme(e.target.value);
                      setSelectedAgendaTheme(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 outline-none focus:border-purple-300"
                  >
                    {THEMES_LIST.map(theme => (
                      <option key={theme.name} value={theme.name}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Optional Meet Link Sync */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1 flex items-center justify-between">
                    <span>Google Meet URI Link (Optional)</span>
                    {activeMeetUrl && !schedCreatedUrl && (
                      <button 
                        type="button" 
                        onClick={() => setSchedCreatedUrl(activeMeetUrl)}
                        className="text-[10px] text-purple-600 hover:underline font-bold"
                      >
                        Insert generated link
                      </button>
                    )}
                  </label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={schedCreatedUrl || ''}
                    onChange={(e) => setSchedCreatedUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-700 outline-none focus:border-purple-300"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md shadow-purple-50 flex items-center justify-center gap-1"
                >
                  <Calendar size={14} />
                  Schedule Video Date
                </button>
              </form>
            </div>

            {/* List of active schedules */}
            <div className="space-y-3" id="active-schedules-list">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Dynamic Sched Counters ({scheduledDates.length})</span>

              {scheduledDates.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[20px] p-5 text-center text-slate-400 text-xs font-bold leading-normal">
                  No upcoming virtual dates configured inside Pendo. Use the scheduler inputs above!
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledDates.map((sched) => {
                    const timeRemainingStr = getCountdownValue(sched.dateTime);
                    return (
                      <div key={sched.id} className="bg-white border border-purple-50 p-4 rounded-3xl space-y-2 shadow-xs relative">
                        <button
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Delete Appointment"
                        >
                          <Trash2 size={15} />
                        </button>

                        <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 bg-purple-50/50 p-1 rounded-lg shrink-0 inline-flex px-2 text-purple-800">
                          <Clock size={12} />
                          <span>Lobby Count:</span>
                          <span className="text-purple-600 tracking-tight ml-0.5">{timeRemainingStr}</span>
                        </div>

                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1 leading-snug">
                            <Heart size={12} className="text-rose-500" />
                            Virtual Date with {sched.matchName}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                            Theme: {sched.theme}
                          </p>
                        </div>

                        <div className="text-[11px] font-semibold text-slate-600 mt-1 block">
                          📅 Scheduled: {new Date(sched.dateTime).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>

                        {sched.meetingUri && (
                          <a
                            href={sched.meetingUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 transition mt-2 w-full shadow-sm"
                          >
                            Join Saved Meet Session
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* -------------------- DYNAMIC GEMINI ACTIVITY PLANNERS -------------------- */}
            <div className="bg-purple-50/30 border border-purple-100 rounded-[24px] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-500 fill-yellow-500" />
                <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-widest leading-none">Themed Date Plan Generator</h4>
              </div>
              <p className="text-[10px] text-purple-800 leading-snug">
                Pick your match and click below to allow Gemini to generate customized agendas and warm instruction starters, optimized specifically for Kenyan daters over video!
              </p>

              <div className="space-y-2">
                <select
                  value={selectedAgendaMatch}
                  onChange={(e) => setSelectedAgendaMatch(e.target.value)}
                  className="w-full bg-white border border-purple-100 p-2 rounded-xl text-xs text-slate-700 outline-none"
                >
                  {chats.map(chat => (
                    <option key={chat.matchId} value={chat.matchId}>{chat.matchName}</option>
                  ))}
                </select>

                <select
                  value={selectedAgendaTheme}
                  onChange={(e) => setSelectedAgendaTheme(e.target.value)}
                  className="w-full bg-white border border-purple-100 p-2 rounded-xl text-xs text-slate-700 outline-none"
                >
                  {THEMES_LIST.map(theme => (
                    <option key={theme.name} value={theme.name}>{theme.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleGenerateDateAgenda}
                  disabled={isGeneratingAgenda || !selectedAgendaMatch}
                  className="w-full bg-gradient-to-tr from-purple-700 to-rose-600 hover:from-purple-800 hover:to-rose-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 outline-none cursor-pointer"
                >
                  {isGeneratingAgenda ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-purple-200" />
                      Weaving Romantic Agenda...
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      Generate Custom Date Plan
                    </>
                  )}
                </button>
              </div>

              {agendaOutput && (
                <div className="bg-white border border-purple-100 rounded-2xl p-4 space-y-3 animate-fade-in max-h-60 overflow-y-auto" id="agenda-result">
                  <div className="flex items-center justify-between text-xs text-purple-900 font-bold">
                    <span>Generated Agenda Plan</span>
                    <Award size={14} className="text-purple-600" />
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 font-semibold whitespace-pre-wrap">
                    {agendaOutput}
                  </p>
                  <button
                    onClick={() => {
                      const matchPrompt = chats.find(c => c.matchId === selectedAgendaMatch);
                      const planHeader = `🎁 Custom Curated Date Plan for us!\n${agendaOutput}`;
                      if (matchPrompt) {
                        onShareLinkInChat(selectedAgendaMatch, planHeader);
                        setShareSuccess("Shared custom agenda with match chat!");
                        setTimeout(() => setShareSuccess(null), 3000);
                      }
                    }}
                    className="w-full bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold py-1.5 rounded-lg text-center flex items-center justify-center gap-1"
                  >
                    Share plan with partner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- VIEW C: INTERACTIVE DECK GAME -------------------- */}
        {activeSubTab === 'icebreakers' && (
          <div className="space-y-4 animate-fade-in animate-duration-300" id="panel-icebreakers">
            <div className="bg-white border border-slate-100 rounded-[24px] p-4 text-center space-y-1 shadow-xs">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-purple-600 block">Date Conversation Starter</span>
              <h3 className="text-sm font-extrabold text-slate-800">Video Date Icebreaker Deck</h3>
              <p className="text-[11px] text-slate-400">Play cards or load Gemini prompts directly inside your Google Meet stream. No awkward silences!</p>
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-2 gap-1.5" id="deck-categories">
              {[
                { id: 'chitChat', label: 'Chit-Chat 🧊' },
                { id: 'deepSparks', label: 'Deep Sparks 🔥' },
                { id: 'wouldYouRather', label: 'Would Rather? 🤔' },
                { id: 'sillyFun', label: 'Silly & Fun 🤪' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCurrentCategory(cat.id);
                    setCurrentCardIndex(0);
                    setAiCustomQuestion(null);
                    setIsCardFlipped(false);
                  }}
                  className={`py-2 text-[11px] font-bold rounded-2xl border text-center transition-all cursor-pointer ${currentCategory === cat.id ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-100' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Main Interactive Card */}
            <div 
              className={`bg-white border border-purple-100 rounded-[30px] p-6 shadow-sm min-h-[190px] flex flex-col justify-between text-center relative overflow-hidden transition-all duration-300 ${isCardFlipped ? 'scale-98 rotate-1' : ''}`}
              id="icebreaker-card-wrapper"
              onClick={() => setIsCardFlipped(!isCardFlipped)}
            >
              <div className="absolute right-3.5 top-3.5 bg-purple-50 text-purple-700 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest">
                {currentCategory === 'chitChat' && "CHIT CHAT"}
                {currentCategory === 'deepSparks' && "DEEP SPARKS"}
                {currentCategory === 'wouldYouRather' && "WOULD YOU RATHER"}
                {currentCategory === 'sillyFun' && "SILLY & FUN"}
              </div>

              <div className="my-auto pt-4 flex flex-col items-center">
                <Smile className="text-purple-300 w-7 h-7 mb-3 fill-purple-50" />
                
                {isCardFlipped ? (
                  <div className="space-y-2 animate-fade-in">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Turn & Answer Prompt</p>
                    <p className="text-xs text-slate-500 italic">One partner answers first, then flip to compare vibes!</p>
                  </div>
                ) : (
                  <p className="text-sm font-extrabold text-slate-800 leading-relaxed max-w-[250px] transition-all" id="lbl-question-display">
                    {isAIQuestionLoading ? (
                      <span className="flex items-center gap-1.5 justify-center text-xs text-purple-600 animate-pulse">
                        <Loader2 className="animate-spin text-purple-500" size={14} /> Retrieving custom starter...
                      </span>
                    ) : (
                      currentCardQuestion
                    )}
                  </p>
                )}
              </div>

              <p className="text-[9px] text-slate-400 mt-4 uppercase tracking-widest font-bold">
                {isCardFlipped ? "Tap card to read prompt" : "Tap card for turn guidance"}
              </p>
            </div>

            {/* Slider Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNextLocalCard}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 py-3 rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                id="btn-next-card"
              >
                <RefreshCw size={13} />
                Next Card
              </button>

              <button
                type="button"
                onClick={handleFetchAICustomQuestion}
                disabled={isAIQuestionLoading}
                className="flex-[1.2] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-2xl text-xs shadow-md shadow-purple-50 flex items-center justify-center gap-1.5 cursor-pointer outline-none"
                id="btn-ask-gemini-q"
              >
                <Sparkles size={13} className="text-yellow-200 fill-yellow-200" />
                Gemini Spark Q
              </button>
            </div>

            {/* Copy button */}
            {currentCardQuestion && !isAIQuestionLoading && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentCardQuestion);
                  setShareSuccess("Copied prompt to clipboard!");
                  setTimeout(() => setShareSuccess(null), 3500);
                }}
                className="w-full text-center text-[11px] text-purple-700 hover:underline font-bold"
              >
                Copy current prompt question
              </button>
            )}
          </div>
        )}

        {/* -------------------- VIEW D: HARDWARE TEST -------------------- */}
        {activeSubTab === 'hardware' && (
          <div className="space-y-4 animate-fade-in" id="panel-hardware">
            <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-purple-700 mb-1.5 font-bold text-xs" id="hw-section-head">
                <ShieldCheck size={16} />
                <span>Pre-Flight Media Verification</span>
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 leading-none">Test Webcam & Microphone</h3>
              <p className="text-[11px] text-slate-400 mt-1">Check your appearance, audio levels, and lighting configuration before clicking Join Room.</p>
            </div>

            {/* Media Stream Window */}
            <div className="bg-slate-900 rounded-[28px] p-4 shadow-lg min-h-[220px] relative overflow-hidden flex flex-col justify-between text-white border border-slate-800">
              {/* Overlay Top header */}
              <div className="flex items-center justify-between z-10">
                <span className="flex items-center gap-1 text-[9px] font-extrabold bg-black/60 px-2 py-0.5 rounded-full text-slate-200 uppercase tracking-widest">
                  Live Preview Channel
                </span>
                <span className={`w-2 h-2 rounded-full ${isHardTesting ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
              </div>

              {/* Renders Actual Streams or Avatar Fallbacks */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isHardTesting ? (
                  testVideoBlocked ? (
                    // Sandbox avatar fallback state
                    <div className="text-center space-y-2 z-10 flex flex-col items-center max-w-[200px]" id="sandbox-avatar-display">
                      <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-rose-400 rounded-full flex items-center justify-center shadow-lg animate-bounce animate-duration-1000">
                        <Smile size={32} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold font-sans">Avatar Tester Mode</p>
                        <p className="text-[10px] text-purple-200 mt-0.5">Camera running secure sandbox.</p>
                      </div>
                    </div>
                  ) : (
                    // Real HTML5 stream video display
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  )
                ) : (
                  <div className="text-center space-y-2 text-slate-500" id="tester-standby">
                    <Camera size={42} className="mx-auto text-slate-700 mb-1" />
                    <p className="text-xs font-bold">Cam & Mic Channels Standby</p>
                    <p className="text-[10px] text-slate-600">Click button below to enable validation</p>
                  </div>
                )}
              </div>

              {/* Volume indication overlay */}
              <div className="z-10 w-full bg-black/50 backdrop-blur-xs p-2.5 rounded-2xl block space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Mic size={11} className={micVolume > 20 ? 'text-emerald-400' : 'text-slate-400'} />
                    Input Meter
                  </span>
                  <span>{micVolume}%</span>
                </div>
                
                {/* Visualizer volume bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Test Status Logs Message */}
            {testStatusMsg && (
              <div className="text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest select-none">
                ⚙️ {testStatusMsg}
              </div>
            )}

            {/* Control Click Trigger */}
            <div className="w-full" id="ctrl-test-trigger">
              {isHardTesting ? (
                <button
                  type="button"
                  onClick={stopHardwareVerification}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer"
                  id="btn-stop-hw"
                >
                  Turn Off Hardware Test
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startHardwareVerification}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md shadow-purple-50 transition cursor-pointer"
                  id="btn-start-hw"
                >
                  Run Web Cam & Mic Test
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
