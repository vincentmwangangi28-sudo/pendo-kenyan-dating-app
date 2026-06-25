import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, ChatMessage, MatchProfile, UserProfile } from '../types';
import { generateIcebreaker, generateDateIdeas, explainMessage } from '../services/geminiService';
import { safeGetMediaStream, safeGetDisplayMedia, safeCopyToClipboard } from '../services/compat';
import { ChevronLeft, Send, Sparkles, MoreVertical, Calendar, Loader2, Video, Mic, MicOff, VideoOff, PhoneOff, RefreshCw, Monitor, Hand, MonitorOff, Globe, Trash2, Users, Users as UsersIcon, Plus as Plus, PlusCircle, User, Crown, X, SmilePlus, Camera, Gift } from 'lucide-react';

// --- Video Call Component ---
interface VideoCallProps {
  matchName: string;
  matchPhoto: string;
  onEndCall: () => void;
}

const VideoCallInterface: React.FC<VideoCallProps> = ({ matchName, matchPhoto, onEndCall }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number;
    let isMounted = true;

    const startCall = async () => {
      try {
        const mediaStream = await safeGetMediaStream({ 
            video: { facingMode: 'user' }, 
            audio: true 
        });
        
        if (!mediaStream) {
            throw new Error("Could not acquire video or audio channels inside the sandbox iframe.");
        }
        
        if (!isMounted) {
            // Cleanup if component unmounted during request
            mediaStream.getTracks().forEach(track => track.stop());
            return;
        }

        stream = mediaStream;
        setLocalStream(mediaStream);
        
        // Simulate connection sequence
        setTimeout(() => { if(isMounted) setCallStatus('Ringing...'); }, 1500);
        setTimeout(() => {
          if(isMounted) {
            setCallStatus('Connected');
            // Start duration timer
            timer = window.setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
        }, 3500);

      } catch (error) {
        console.error("Error accessing media devices:", error);
        if(isMounted) setCallStatus('Failed to access camera/mic');
      }
    };

    startCall();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
          track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
          track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share and revert to camera
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      try {
        const cameraStream = await safeGetMediaStream({ video: { facingMode: 'user' }, audio: true });
        if (cameraStream) {
          setLocalStream(cameraStream);
        }
        setIsScreenSharing(false);
        setIsVideoOff(false); // Ensure video is on when reverting
      } catch (error) {
        console.error("Error reverting to camera:", error);
      }
    } else {
      // Start screen share
      try {
        const displayMediaOptions = {
          video: true,
          audio: false // Usually don't want system audio for a chat app
        };
        const screenStream = await safeGetDisplayMedia(displayMediaOptions);
        if (!screenStream) {
          throw new Error("Screen share not available or cancelled.");
        }
        
        // Handle user stopping share via browser UI
        screenStream.getVideoTracks()[0].onended = async () => {
           try {
              const cameraStream = await safeGetMediaStream({ video: { facingMode: 'user' }, audio: true });
              if (cameraStream) {
                setLocalStream(cameraStream);
              }
              setIsScreenSharing(false);
           } catch(e) { console.error(e); }
        };

        setLocalStream(screenStream);
        setIsScreenSharing(true);
        setIsVideoOff(false); // Screen share counts as video on
      } catch (error) {
        console.error("Error starting screen share:", error);
      }
    }
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    // In a real app, you would emit a socket event here
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900 flex flex-col animate-fade-in">
      {/* Main Video Area (Remote) */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Simulated Remote Stream using Profile Photo */}
        <div className="absolute inset-0">
          <img src={matchPhoto} alt={matchName} className="w-full h-full object-cover opacity-50 blur-sm" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center animate-pulse-slow">
          <div className="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden mb-4 shadow-2xl relative">
            <img src={matchPhoto} alt={matchName} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{matchName}</h2>
          <p className="text-rose-200 font-medium">{callStatus}</p>
          {callStatus === 'Connected' && (
            <p className="text-white/60 text-sm mt-1">{formatDuration(callDuration)}</p>
          )}
        </div>
      </div>

      {/* Screen Share Notification */}
      {isScreenSharing && (
        <div className="absolute top-24 left-0 right-0 z-50 flex justify-center pointer-events-none">
           <div className="bg-slate-900/90 backdrop-blur-md border border-blue-500/30 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Monitor size={18} className="text-blue-400" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-100">You are sharing your screen</span>
              </div>
              <button 
                  onClick={toggleScreenShare}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
              >
                  Stop Sharing
              </button>
           </div>
        </div>
      )}

      {/* Local Video (PIP) */}
      <div 
        className={`absolute top-4 right-4 bg-black rounded-2xl overflow-hidden shadow-2xl border relative group transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isScreenSharing 
            ? 'w-32 h-20 border-blue-500/50' // Minimized landscape for screen
            : 'w-32 h-48 border-white/10'    // Standard portrait for camera
        }`}
      >
        {localStream && !isVideoOff ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            className={`w-full h-full object-cover ${!isScreenSharing ? 'mirror' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
             <VideoOff size={24} className="text-slate-500" />
          </div>
        )}
        
        {isHandRaised && (
          <div className="absolute top-2 left-2 bg-yellow-400 p-1.5 rounded-full shadow-lg animate-bounce">
            <Hand size={16} className="text-black" />
          </div>
        )}

        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
           <span className="text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
             {isScreenSharing ? 'You (Screen)' : 'You'}
           </span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-8 pt-4">
        <div className="flex items-center justify-center gap-4 px-4 overflow-x-auto no-scrollbar">
          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all flex-shrink-0 ${isVideoOff ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all flex-shrink-0 ${isMuted ? 'bg-white text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button 
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all flex-shrink-0 ${isScreenSharing ? 'bg-blue-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
          </button>

          <button 
            onClick={toggleHandRaise}
            className={`p-4 rounded-full transition-all flex-shrink-0 ${isHandRaised ? 'bg-yellow-400 text-slate-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
            title="Raise Hand"
          >
            <Hand size={24} />
          </button>

          <button 
            onClick={onEndCall}
            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/50 scale-110 active:scale-95 transition-all flex-shrink-0 ml-2"
            title="End Call"
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
      
      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
};

// --- Swipeable Message Component ---
interface SwipeableMessageProps {
  children: React.ReactNode;
  onTranslate?: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
  canTranslate: boolean;
  alignment: 'left' | 'right';
}

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({ 
  children, 
  onTranslate, 
  onDelete, 
  onLongPress,
  canTranslate, 
  alignment 
}) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const currentOffset = useRef(0);
  const isDragging = useRef(false);
  const longPressTimer = useRef<number | null>(null);

  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => {
        if (!isDragging.current && Math.abs(offset) < 5) {
            onLongPress?.();
        }
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handleDragMove = (clientX: number) => {
    const diff = clientX - startX.current;
    
    // Cancel long press if moved significantly
    if (Math.abs(diff) > 5) {
        cancelLongPress();
    }

    if (diff > 0 && offset === 0) return;
    
    const buttonWidth = 70;
    const buttonsCount = canTranslate ? 2 : 1;
    const maxSwipe = -(buttonWidth * buttonsCount);
    
    const newOffset = Math.min(0, Math.max(maxSwipe, currentOffset.current + diff));
    setOffset(newOffset);
  };

  const handleDragEnd = () => {
    cancelLongPress();
    isDragging.current = false;
    const buttonWidth = 70;
    const buttonsCount = canTranslate ? 2 : 1;
    const maxSwipe = -(buttonWidth * buttonsCount);
    const threshold = maxSwipe / 2;
    
    if (offset < threshold) {
      setOffset(maxSwipe);
    } else {
      setOffset(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentOffset.current = offset;
    isDragging.current = true;
    startLongPress();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    handleDragMove(e.touches[0].clientX);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    currentOffset.current = offset;
    isDragging.current = true;
    startLongPress();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault(); 
    handleDragMove(e.clientX);
  };

  const showActions = offset < -5 || isDragging.current;

  return (
    <div className="relative overflow-visible w-full py-1 group">
      {/* Actions Layer */}
      <div className={`absolute inset-y-1 right-0 flex items-center z-0 gap-2 pr-1 transition-all duration-300 ${showActions ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
         {canTranslate && (
             <button 
               onClick={(e) => { 
                   e.stopPropagation();
                   onTranslate?.(); 
                   setOffset(0); 
               }}
               className="h-[calc(100%-8px)] w-[60px] bg-indigo-50 text-indigo-600 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold shadow-sm border border-indigo-100 active:scale-95 transition-transform"
             >
                <Globe size={18} className="mb-0.5" />
                Translate
             </button>
         )}
         <button 
           onClick={(e) => { 
               e.stopPropagation();
               onDelete(); 
               setOffset(0); 
           }}
           className="h-[calc(100%-8px)] w-[60px] bg-red-50 text-red-600 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold shadow-sm border border-red-100 active:scale-95 transition-transform"
         >
            <Trash2 size={18} className="mb-0.5" />
            Delete
         </button>
      </div>
      
      {/* Content Layer */}
      <div 
        className={`relative z-10 transition-transform duration-300 ease-out touch-pan-y flex flex-col ${alignment === 'right' ? 'items-end' : 'items-start'}`}
        style={{ 
          transform: `translateX(${offset}px)`,
          cursor: isDragging.current ? 'grabbing' : 'auto' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {children}
      </div>
    </div>
  );
};

// --- Chat List Component ---
interface ChatListProps {
  chats: ChatSession[];
  onSelectChat: (matchId: string) => void;
  onCreateGroup: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({ chats, onSelectChat, onCreateGroup }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'groups'>('direct');

  const directChats = chats.filter(c => !c.isGroup);
  const groupChats = chats.filter(c => c.isGroup);

  const displayChats = activeTab === 'direct' ? directChats : groupChats;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pb-2 pt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Connections</h2>
          <button 
            onClick={onCreateGroup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold hover:bg-rose-100 transition-colors"
          >
            <PlusCircle size={16} />
            <span>New Group</span>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button 
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'direct' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={16} /> Direct
          </button>
          <button 
             onClick={() => setActiveTab('groups')}
             className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'groups' 
                ? 'bg-white text-rose-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UsersIcon size={16} /> Groups
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-20 no-scrollbar">
        {activeTab === 'groups' && (
          <button 
            onClick={onCreateGroup}
            className="w-full py-4 border-2 border-dashed border-rose-200 rounded-2xl flex items-center justify-center gap-2 text-rose-600 font-semibold hover:bg-rose-50 transition-colors"
          >
            <Plus size={20} /> Create New Group
          </button>
        )}

        {displayChats.length === 0 ? (
          <div className="p-8 text-center text-slate-500 mt-10">
            <p className="mb-4 text-4xl">
              {activeTab === 'direct' ? '📭' : '👥'}
            </p>
            <p>{activeTab === 'direct' ? 'No matches yet. Go swipe!' : 'No groups yet. Create one!'}</p>
          </div>
        ) : (
          displayChats.map(chat => (
            <div 
              key={chat.matchId}
              onClick={() => onSelectChat(chat.matchId)}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 cursor-pointer active:bg-slate-50 transition-colors relative"
            >
              <div className="relative">
                <img 
                  src={chat.matchPhoto} 
                  alt={chat.matchName} 
                  className={`object-cover ${chat.isGroup ? 'w-16 h-16 rounded-2xl' : 'w-16 h-16 rounded-full'}`} 
                />
                {chat.isGroup && (
                   <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full">
                     <div className="bg-rose-100 p-1 rounded-full">
                        <UsersIcon size={12} className="text-rose-600" />
                     </div>
                   </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-slate-900 truncate">{chat.matchName}</h3>
                  {chat.messages.length > 0 && (
                    <span className="text-xs text-slate-400">
                      {new Date(chat.messages[chat.messages.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                </div>
                <p className={`text-sm truncate ${chat.unreadCount > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                  {chat.messages.length > 0 ? (
                     <span>
                        {chat.isGroup && chat.messages[chat.messages.length - 1].senderName && (
                          <span className="text-slate-800 font-medium mr-1">
                            {chat.messages[chat.messages.length - 1].senderName}:
                          </span>
                        )}
                        {chat.messages[chat.messages.length - 1].text}
                     </span>
                  ) : "Start a conversation!"}
                </p>
              </div>
              {chat.unreadCount > 0 && (
                <div className="w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Chat Room Component ---
const MOCK_GROUP_MEMBERS = [
  { id: 'm1', name: 'Kevin', role: 'Admin', photo: 'https://picsum.photos/seed/kevin/100/100' },
  { id: 'm2', name: 'Sarah', role: 'Member', photo: 'https://picsum.photos/seed/sarah/100/100' },
  { id: 'm3', name: 'David', role: 'Member', photo: 'https://picsum.photos/seed/david/100/100' },
  { id: 'm4', name: 'Amina', role: 'Member', photo: 'https://picsum.photos/seed/amina/100/100' },
  { id: 'm5', name: 'Brian', role: 'Member', photo: 'https://picsum.photos/seed/brian/100/100' },
];

interface ChatRoomProps {
  session: ChatSession;
  userProfile: UserProfile; 
  matchProfile?: MatchProfile;
  onBack: () => void;
  onSendMessage: (text: string, imageUrl?: string, audioUrl?: string) => void;
  onDeleteMessage: (matchId: string, msgId: string) => void;
  onBlockUser?: (matchId: string) => void;
  typingUsers?: string[]; // New prop for typing indicators
}

export const KENYAN_GIFTS = [
  { id: 'tusker', name: 'Cold Tusker 🍻', price: '150 KES', desc: 'Buy them a legendary cold round of Kenya\'s finest brew.', color: 'from-amber-400 to-yellow-600', icon: '🍻' },
  { id: 'choma', name: 'Nyama Choma 🥩', price: '450 KES', desc: 'A succulent, hot plate of charcoal-roasted goat meat.', color: 'from-orange-500 to-red-700', icon: '🥩' },
  { id: 'rose', name: 'Nairobi Rose 🌹', price: '200 KES', desc: 'A premium, fresh red rose from the hills of Naivasha.', color: 'from-rose-400 to-pink-600', icon: '🌹' },
  { id: 'chai', name: 'Vikombe vya Chai ☕', price: '80 KES', desc: 'A rich pot of authentic hot milk tea with ginger.', color: 'from-amber-600 to-amber-700', icon: '☕' },
  { id: 'safari', name: 'Safari Voucher 🦁', price: '1,000 KES', desc: 'A virtual game drive pass to the beautiful Game Parks.', color: 'from-emerald-400 to-teal-700', icon: '🦁' },
];

export const ChatRoom: React.FC<ChatRoomProps> = ({ session, userProfile, matchProfile, onBack, onSendMessage, onDeleteMessage, onBlockUser, typingUsers }) => {
  const [inputText, setInputText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [dateIdeas, setDateIdeas] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);
  const [translationMap, setTranslationMap] = useState<Record<string, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<string | null>(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reaction State
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, ChatMessage['reactions']>>({}); 
  const [localUserReactions, setLocalUserReactions] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, aiSuggestion, translationMap, typingUsers]);

  // Click outside listener for closing reaction menu
  useEffect(() => {
    const handleClickOutside = () => setReactionMenuMsgId(null);
    if (reactionMenuMsgId) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [reactionMenuMsgId]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setAiSuggestion(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      onSendMessage('', imageUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await safeGetMediaStream({ audio: true });
      if (!stream) {
        throw new Error("Could not acquire microphone channel. Permissions blocked in sandboxed preview.");
      }
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
  };

  const sendAudioMessage = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      onSendMessage('', undefined, audioUrl);
      setAudioBlob(null);
    }
  };

  const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = time % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAskAI = async () => {
    if (!matchProfile) return;
    setLoadingAi(true);
    const suggestion = await generateIcebreaker(matchProfile, userProfile.interests);
    setAiSuggestion(suggestion);
    setLoadingAi(false);
  };
  
  const handleDateIdeas = async (forceRefresh = false) => {
    if (!matchProfile) return;
    setShowDateModal(true);
    if (dateIdeas && !forceRefresh) return;
    
    setLoadingDate(true);
    const ideas = await generateDateIdeas(matchProfile.location, userProfile.interests, matchProfile.interests);
    setDateIdeas(ideas);
    setLoadingDate(false);
  };

  const handleTranslate = async (msgId: string, text: string) => {
    if (translationMap[msgId]) return;
    setLoadingTranslation(msgId);
    const translation = await explainMessage(text);
    setTranslationMap(prev => ({ ...prev, [msgId]: translation }));
    setLoadingTranslation(null);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    // Optimistic update locally (In real app, this would sync with backend)
    setLocalReactions(prev => {
       const currentReactions = prev[msgId] || session.messages.find(m => m.id === msgId)?.reactions || {};
       const prevUserReaction = localUserReactions[msgId];
       
       let newReactions = { ...currentReactions };
       
       // Remove previous reaction if exists
       if (prevUserReaction) {
          newReactions[prevUserReaction] = Math.max(0, (newReactions[prevUserReaction] || 1) - 1);
          if (newReactions[prevUserReaction] === 0) delete newReactions[prevUserReaction];
       }
       
       // Add new reaction (toggle off if clicking same)
       if (prevUserReaction !== emoji) {
          newReactions[emoji] = (newReactions[emoji] || 0) + 1;
       }

       return { ...prev, [msgId]: newReactions };
    });

    setLocalUserReactions(prev => {
        if (prev[msgId] === emoji) {
            const next = { ...prev };
            delete next[msgId];
            return next;
        }
        return { ...prev, [msgId]: emoji };
    });
    
    setReactionMenuMsgId(null);
  };

  const useSuggestion = () => {
    if (aiSuggestion) {
      setInputText(aiSuggestion);
      setAiSuggestion(null);
    }
  };

  const isGroup = session.isGroup;

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {isInCall && !isGroup && (
        <VideoCallInterface 
          matchName={session.matchName}
          matchPhoto={session.matchPhoto}
          onEndCall={() => setIsInCall(false)}
        />
      )}

      {showGroupMembers && isGroup && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative animate-slide-up max-h-[80vh] flex flex-col">
            <button onClick={() => setShowGroupMembers(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-rose-100 p-3 rounded-full text-rose-600"><UsersIcon size={24} /></div>
              <div><h3 className="text-xl font-bold text-slate-900 leading-none">Group Members</h3><p className="text-sm text-slate-500 mt-1">{MOCK_GROUP_MEMBERS.length} people</p></div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {MOCK_GROUP_MEMBERS.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="relative">
                    <img src={member.photo} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                    {member.role === 'Admin' && <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-0.5 rounded-full border-2 border-white"><Crown size={10} fill="currentColor" /></div>}
                  </div>
                  <div className="flex-1"><h4 className="font-bold text-slate-900 text-sm">{member.name}</h4><span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${member.role === 'Admin' ? 'bg-amber-100 text-amber-700 font-medium' : 'bg-slate-100 text-slate-500'}`}>{member.role}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100"><button onClick={() => setShowGroupMembers(false)} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Close</button></div>
          </div>
        </div>
      )}

      {showGiftModal && matchProfile && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative animate-slide-up max-h-[85vh] flex flex-col">
            <button onClick={() => setShowGiftModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-100 p-2.5 rounded-full text-rose-600"><Gift size={22} /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-none">Zawadi Courtship Kit</h3>
                <p className="text-xs text-slate-500 mt-1">Send a charming traditional gift to express interest!</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 no-scrollbar">
              {KENYAN_GIFTS.map(gift => (
                <button
                  key={gift.id}
                  onClick={() => {
                    onSendMessage(`🎁 [gift:${gift.id}] Sent you a ${gift.name}!`);
                    setShowGiftModal(false);
                  }}
                  className="w-full flex items-center gap-4 p-3 bg-slate-50 hover:bg-rose-50 rounded-2xl border border-slate-100 hover:border-rose-100 transition-all text-left group active:scale-[0.98]"
                >
                  <span className="text-4xl filter drop-shadow group-hover:scale-110 transition-transform">{gift.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-800 text-sm">{gift.name}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 group-hover:bg-rose-100 group-hover:text-rose-700 font-extrabold px-2 py-0.5 rounded-md transition-colors">{gift.price}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{gift.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => setShowGiftModal(false)} className="w-full bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-200 transition-colors text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDateModal && matchProfile && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-slide-up">
            <button onClick={() => setShowDateModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400"><MoreVertical size={20} className="rotate-90" /></button>
            <div className="flex items-center justify-between mb-4 pr-10">
              <div className="flex items-center gap-3 text-rose-600"><Calendar size={28} /><h3 className="text-xl font-bold leading-none">Date Ideas<br/><span className="text-sm font-normal text-slate-500">in {matchProfile.location}</span></h3></div>
              <button onClick={() => handleDateIdeas(true)} disabled={loadingDate} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 hover:text-rose-600 transition-colors"><RefreshCw size={18} className={loadingDate ? "animate-spin" : ""} /></button>
            </div>
            <div className="min-h-[150px]">
              {loadingDate ? <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400"><Loader2 size={32} className="animate-spin text-rose-500" /><p className="text-sm">Consulting Cupid AI...</p></div> : <div className="prose prose-sm prose-rose text-slate-600 whitespace-pre-wrap leading-relaxed bg-rose-50 p-4 rounded-xl border border-rose-100 max-h-[40vh] overflow-y-auto">{dateIdeas}</div>}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => { if (dateIdeas) { onSendMessage(`Hey, check out these date ideas I found: \n\n${dateIdeas}`); setShowDateModal(false); } }} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-rose-200 active:scale-95 transition-transform">Send to {matchProfile.name}</button>
              <button onClick={() => setShowDateModal(false)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={24} className="text-slate-600" /></button>
          <div onClick={() => isGroup && setShowGroupMembers(true)} className={`flex items-center gap-3 ${isGroup ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}>
            <img src={session.matchPhoto} alt="" className={`object-cover border border-slate-200 ${isGroup ? 'w-10 h-10 rounded-lg' : 'w-10 h-10 rounded-full'}`} />
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1">{session.matchName}{isGroup && <UsersIcon size={12} className="text-slate-400" />}</h3>
              <span className="text-xs text-rose-500 font-medium">{isGroup ? `${MOCK_GROUP_MEMBERS.length} members` : 'Online'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          {!isGroup && <><button onClick={() => setIsInCall(true)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors"><Video size={20} /></button><button onClick={() => handleDateIdeas(false)} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"><Calendar size={20} /></button></>}
          {isGroup && <button onClick={() => setShowGroupMembers(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><UsersIcon size={20} /></button>}
          <button onClick={() => setShowOptionsMenu(!showOptionsMenu)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full"><MoreVertical size={20} /></button>
          
          {/* Options Dropdown */}
          {showOptionsMenu && !isGroup && (
            <div className="absolute top-12 right-0 w-48 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
               <button 
                  onClick={() => { setShowOptionsMenu(false); if(matchProfile && onBlockUser) onBlockUser(matchProfile.id); }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
               >
                  <Hand size={16} /> Block & Report
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 overflow-x-hidden">
        {session.messages.length === 0 && <div className="text-center mt-8"><div className={`w-24 h-24 bg-rose-100 mx-auto flex items-center justify-center mb-4 ${isGroup ? 'rounded-3xl' : 'rounded-full'}`}><span className="text-4xl">{isGroup ? '👥' : '👋'}</span></div><p className="text-slate-500 text-sm">{isGroup ? `Welcome to the ${session.matchName} group!` : `You matched with ${session.matchName}!`}</p><p className="text-slate-400 text-xs mt-1">Break the ice.</p></div>}
        {session.messages.map((msg) => {
          const activeReactions = localReactions[msg.id] || msg.reactions || {};
          const userReaction = localUserReactions[msg.id] || msg.userReaction;
          const showReactions = Object.keys(activeReactions).length > 0;

          return (
            <SwipeableMessage 
                key={msg.id} 
                alignment={msg.senderId === 'me' ? 'right' : 'left'} 
                canTranslate={msg.senderId !== 'me' && !translationMap[msg.id]} 
                onTranslate={() => handleTranslate(msg.id, msg.text)} 
                onDelete={() => onDeleteMessage(session.matchId, msg.id)}
                onLongPress={() => setReactionMenuMsgId(msg.id)}
            >
              <div className={`flex items-end gap-2 max-w-[90%] ${msg.senderId === 'me' ? 'flex-row-reverse' : 'flex-row'} group relative`}>
                
                {/* Reaction Menu */}
                {reactionMenuMsgId === msg.id && (
                  <div className={`absolute bottom-full mb-2 z-50 bg-white shadow-xl rounded-full px-2 py-1.5 flex gap-1 animate-scale-up ${msg.senderId === 'me' ? 'right-0' : 'left-0'}`}>
                     {REACTION_EMOJIS.map(emoji => (
                       <button 
                         key={emoji}
                         onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                         className={`w-8 h-8 flex items-center justify-center text-lg rounded-full transition-transform hover:scale-125 active:scale-95 ${userReaction === emoji ? 'bg-blue-100' : 'hover:bg-slate-100'}`}
                       >
                         {emoji}
                       </button>
                     ))}
                  </div>
                )}
                
                {/* Desktop Hover Trigger (Invisible but adds group-hover support) */}
                <div className="absolute inset-0 z-0 pointer-events-none group-hover:pointer-events-auto" />

                <div className="flex flex-col relative">
                  {isGroup && msg.senderId !== 'me' && msg.senderName && <span className="text-[10px] text-slate-500 mb-1 ml-1 font-semibold">{msg.senderName}</span>}
                  
                  {/* Message Bubble */}
                  <div 
                    onClick={() => { if (msg.senderId !== 'me' && !msg.text?.startsWith('🎁 [gift:') && !translationMap[msg.id]) { handleTranslate(msg.id, msg.text); } }} 
                    className={`flex flex-col shadow-sm rounded-2xl overflow-hidden transition-all duration-300 relative ${
                      msg.text && msg.text.startsWith('🎁 [gift:')
                        ? 'p-0 text-white rounded-2xl'
                        : msg.senderId === 'me' 
                          ? 'bg-rose-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none cursor-pointer hover:bg-slate-50 active:scale-95'
                    }`}
                  >
                      {msg.imageUrl && (
                        <div className="w-full max-w-[240px] max-h-[300px] overflow-hidden bg-slate-100 rounded-t-2xl">
                          <img src={msg.imageUrl} alt="Uploaded photo" className="w-full h-full object-cover rounded-t-2xl" />
                        </div>
                      )}
                      {msg.audioUrl && (
                        <div className="px-3 py-2 w-[220px]">
                          <audio controls src={msg.audioUrl} className="w-full h-10" />
                        </div>
                      )}
                      {msg.text && msg.text.startsWith('🎁 [gift:') ? (
                        (() => {
                          const giftId = msg.text.match(/\[gift:([a-z]+)\]/)?.[1] || 'tusker';
                          const gift = KENYAN_GIFTS.find(g => g.id === giftId) || KENYAN_GIFTS[0];
                          return (
                            <div className={`p-4 bg-gradient-to-br ${gift.color} text-white rounded-2xl shadow-xl min-w-[240px] max-w-[280px] border border-white/20`}>
                              <div className="flex items-center gap-3">
                                <span className="text-4xl filter drop-shadow animate-bounce">{gift.icon}</span>
                                <div className="text-left">
                                  <span className="text-[9px] font-black tracking-widest uppercase text-white/75 bg-black/20 px-1.5 py-0.5 rounded-md inline-block mb-1">Courtship Zawadi</span>
                                  <h4 className="font-extrabold text-sm leading-tight text-white mb-0.5">{gift.name}</h4>
                                  <span className="text-[10px] text-white/90 font-medium">Value: {gift.price}</span>
                                </div>
                              </div>
                              <p className="text-xs text-white/90 mt-3 border-t border-white/20 pt-2 italic text-left leading-normal">
                                "{gift.desc}"
                              </p>
                              <div className="flex items-center justify-between text-[9px] font-semibold tracking-wider uppercase text-white/65 mt-2.5 pt-1.5 border-t border-white/10">
                                <span>Sent via Pendo</span>
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">Unlocked ❤️</span>
                              </div>
                            </div>
                          );
                        })()
                      ) : msg.text && (
                        <div className={`px-4 py-3 text-sm leading-relaxed ${msg.text.includes('\n') ? 'whitespace-pre-wrap' : ''}`}>{msg.text}{loadingTranslation === msg.id && <span className="inline-block ml-2 align-middle"><Loader2 size={12} className="animate-spin text-rose-500" /></span>}</div>
                      )}
                      
                      {translationMap[msg.id] && (
                        <div className="bg-slate-50 border-t border-slate-100 px-3 py-2.5 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 bg-indigo-100 p-1 rounded-md flex-shrink-0"><Sparkles size={12} className="text-indigo-600" /></div>
                            <div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-wide flex items-center gap-1">AI Explanation</p><p className="text-sm text-slate-700 leading-snug">{translationMap[msg.id]}</p></div>
                          </div>
                        </div>
                      )}
                  </div>

                  <div className={`flex items-center gap-2 mt-1 ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                     <span className="text-[10px] text-slate-400">
                       {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                     {msg.senderId === 'me' && msg.status && (
                       <span className="text-[10px] text-slate-400">
                         {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                       </span>
                     )}
                  </div>
                  
                  {/* Reactions Display */}
                  {showReactions && (
                    <div className={`flex gap-1 mt-1 ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(activeReactions).map(([emoji, count]) => (
                        <span key={emoji} className="bg-white border border-slate-100 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm text-slate-600 flex items-center gap-0.5">
                          {emoji} <span className="font-bold">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Hidden Hover Button for Desktop easy access */}
                  <button 
                     onClick={(e) => { e.stopPropagation(); setReactionMenuMsgId(msg.id); }}
                     className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 hover:text-slate-600 ${msg.senderId === 'me' ? '-left-8' : '-right-8'}`}
                  >
                     <SmilePlus size={14} />
                  </button>

                </div>
              </div>
            </SwipeableMessage>
          );
        })}

        {/* Typing Indicator Bubble */}
        {typingUsers && typingUsers.length > 0 && (
            <div className="flex items-end gap-2 mb-2 ml-1 animate-fade-in">
                {/* Simplified avatar for typing */}
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-bold overflow-hidden">
                   {typingUsers.length > 1 ? '...' : typingUsers[0].charAt(0)}
                </div>
                
                <div className="flex flex-col">
                    <div className="bg-white border border-slate-200 px-3 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 w-14">
                        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"></span>
                    </div>
                    {isGroup && (
                        <span className="text-[10px] text-slate-400 font-medium ml-1 mt-1">
                            {typingUsers.length > 2 
                                ? 'Several people are typing...' 
                                : `${typingUsers.join(', ')} is typing...`
                            }
                        </span>
                    )}
                </div>
            </div>
        )}

        {aiSuggestion && !isGroup && <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl mx-4 mb-2 animate-pulse"><p className="text-rose-800 text-sm mb-2 font-medium italic">" {aiSuggestion} "</p><div className="flex gap-2"><button onClick={useSuggestion} className="text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700">Use this</button><button onClick={() => setAiSuggestion(null)} className="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">Dismiss</button></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 min-h-[72px] flex items-center">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-red-50 rounded-full px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-medium text-sm">{formatTime(recordingTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={cancelRecording} className="p-2 text-slate-500 hover:text-slate-700 bg-white rounded-full">
                <Trash2 size={16} />
              </button>
              <button onClick={sendAudioMessage} className="p-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transform hover:scale-105 transition-all shadow-md shadow-rose-200">
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {!isGroup && session.messages.length === 0 && <button onClick={handleAskAI} disabled={loadingAi} className="p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex-shrink-0">{loadingAi ? <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" /> : <Sparkles size={20} />}</button>}
            
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handlePhotoSelect} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="p-3 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
              title="Camera"
            >
              <Camera size={20} />
            </button>

            {!isGroup && (
              <button 
                onClick={() => setShowGiftModal(true)} 
                className="p-3 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex-shrink-0"
                title="Send Zawadi Gift"
              >
                <Gift size={20} />
              </button>
            )}

            <div className="flex-1 relative">
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="w-full pl-4 pr-10 py-3 bg-slate-100 rounded-full border-transparent focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm transition-all" />
              <button 
                 onClick={startRecording}
                 className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
              >
                 <Mic size={18} />
              </button>
            </div>
            
            {inputText.trim() ? (
                <button onClick={handleSend} className="p-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-all shadow-md shadow-rose-200 animate-in zoom-in spin-in-12"><Send size={20} /></button>
            ) : (
                <button onClick={startRecording} className="p-3 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-all"><Mic size={20} /></button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};