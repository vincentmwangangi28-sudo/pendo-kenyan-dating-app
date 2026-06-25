import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, ChatMessage, MatchProfile, UserProfile } from '../types';
import { generateIcebreaker, generateDateIdeas, explainMessage } from '../services/geminiService';
import { signInForGoogleMeet, getCachedAccessToken } from '../services/firebase';
import { safeCopyToClipboard, safeGetMediaStream, safeGetDisplayMedia } from '../services/compat';
import { ChevronLeft, Send, Sparkles, MoreVertical, Calendar, Loader2, Video, Mic, MicOff, VideoOff, PhoneOff, RefreshCw, Monitor, Hand, MonitorOff, Globe, Trash2, Users, X, Crown, Shield, SmilePlus, Share } from 'lucide-react';

// --- Mock Data for Group Members ---
const MOCK_GROUP_MEMBERS = [
  { id: 'm1', name: 'Kevin', role: 'Admin', photo: 'https://picsum.photos/seed/kevin/100/100' },
  { id: 'm2', name: 'Sarah', role: 'Member', photo: 'https://picsum.photos/seed/sarah/100/100' },
  { id: 'm3', name: 'David', role: 'Member', photo: 'https://picsum.photos/seed/david/100/100' },
  { id: 'm4', name: 'Amina', role: 'Member', photo: 'https://picsum.photos/seed/amina/100/100' },
  { id: 'm5', name: 'Brian', role: 'Member', photo: 'https://picsum.photos/seed/brian/100/100' },
  { id: 'm6', name: 'Wanjiku', role: 'Member', photo: 'https://picsum.photos/seed/wanjiku/100/100' },
  { id: 'm7', name: 'Otieno', role: 'Member', photo: 'https://picsum.photos/seed/otieno/100/100' },
];

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
            throw new Error("Could not access camera/microphone channels. Hardware endpoints are blocked or disabled in this iframe context.");
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

        {/* Remote Hand Raised Indicator (Simulated) */}
        {/* In a real app, this would be triggered by a socket event from the peer */}
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
        
        {/* Hand Raised Indicator (Self) */}
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

// --- Chat Room Component ---
interface ChatRoomProps {
  session: ChatSession;
  userProfile: UserProfile; // Need user interests for AI
  matchProfile?: MatchProfile; // Need match details for AI (Optional for groups)
  onBack: () => void;
  onSendMessage: (text: string) => void;
  onDeleteMessage: (matchId: string, msgId: string) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ session, userProfile, matchProfile, onBack, onSendMessage, onDeleteMessage }) => {
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
  const [showVideoOptionsModal, setShowVideoOptionsModal] = useState(false);
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);
  const [meetError, setMeetError] = useState<string | null>(null);
  const [createdMeetUrl, setCreatedMeetUrl] = useState<string | null>(null);
  const hasRequestedIcebreaker = useRef(false);

  // Error boundary state for API requests
  const [apiError, setApiError] = useState<{message: string; action: () => void} | null>(null);

  // Reaction State
  const [reactionMenuMsgId, setReactionMenuMsgId] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, ChatMessage['reactions']>>({}); 
  const [localUserReactions, setLocalUserReactions] = useState<Record<string, string>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, aiSuggestion, translationMap]);

  // Handle Session Change
  useEffect(() => {
    setAiSuggestion(null);
    hasRequestedIcebreaker.current = false;
  }, [session.matchId]);

  // Handle Auto-Icebreaker
  const isGroup = session.isGroup;
  
  const handleAskAI = async () => {
    if (!matchProfile) return; // Only for 1-1 matches
    setLoadingAi(true);
    setApiError(null);
    try {
        const suggestion = await generateIcebreaker(matchProfile, userProfile.interests);
        if (!suggestion) throw new Error("Could not generate icebreaker at this time. Please try again.");
        setAiSuggestion(suggestion);
    } catch (error) {
        console.error("Icebreaker Error:", error);
        setApiError({ 
            message: "Failed to load icebreaker. The AI engine might be busy.", 
            action: handleAskAI 
        });
    } finally {
        setLoadingAi(false);
    }
  };

  useEffect(() => {
    const shouldFetch = !isGroup && 
                        session.messages.length === 0 && 
                        matchProfile && 
                        !aiSuggestion && 
                        !loadingAi && 
                        !apiError &&
                        !hasRequestedIcebreaker.current;

    if (shouldFetch) {
      hasRequestedIcebreaker.current = true;
      handleAskAI();
    }
  }, [session.messages.length, isGroup, matchProfile, session.matchId]);

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
    setApiError(null);
  };
  
  const handleDateIdeas = async (forceRefresh = false) => {
    if (!matchProfile) return; // Only for 1-1 matches
    setShowDateModal(true);
    if (dateIdeas && !forceRefresh) return;
    
    setLoadingDate(true);
    setApiError(null);
    try {
        const ideas = await generateDateIdeas(matchProfile.location, userProfile.interests, matchProfile.interests);
        if (!ideas || ideas.length === 0) throw new Error("Could not generate ideas.");
        setDateIdeas(ideas);
    } catch (error) {
        console.error("Date Ideas Error:", error);
        setApiError({ 
            message: "Failed to generate date ideas. The AI engine might be busy.", 
            action: () => handleDateIdeas(true) 
        });
        setShowDateModal(false); // Close modal on error to show error message
    } finally {
        setLoadingDate(false);
    }
  };

  const handleTranslate = async (msgId: string, text: string) => {
    if (translationMap[msgId]) return; // Already translated
    setLoadingTranslation(msgId);
    try {
        const translation = await explainMessage(text);
        if (!translation) throw new Error("Translation failed.");
        setTranslationMap(prev => ({ ...prev, [msgId]: translation }));
    } catch (error) {
        console.error("Translation Error:", error);
        setApiError({ 
            message: "Failed to translate message. The AI engine might be busy.", 
            action: () => handleTranslate(msgId, text)
        });
    } finally {
        setLoadingTranslation(null);
    }
  };

  const handleShareProfile = () => {
    const url = `${window.location.origin}/profile/${session.matchId}`;
    if (navigator.share) {
      navigator.share({
        title: `Check out ${session.matchName}'s profile!`,
        text: `I matched with ${session.matchName} on Pendo, check out their profile here:`,
        url: url
      }).catch(err => console.log('Error sharing:', err));
    } else {
      safeCopyToClipboard(`Check out ${session.matchName}'s profile on Pendo! ${url}`).then(ok => {
         if (ok) {
           alert("Profile link copied to clipboard!");
         } else {
           console.warn("Could not copy link automatically.");
         }
      });
    }
  };

  const handleReaction = (msgId: string, emoji: string) => {
    // Optimistic update locally
    setLocalReactions(prev => {
       const currentReactions = prev[msgId] || session.messages.find(m => m.id === msgId)?.reactions || {};
       const prevUserReaction = localUserReactions[msgId];
       
       let newReactions = { ...currentReactions };
       
       if (prevUserReaction) {
          newReactions[prevUserReaction] = Math.max(0, (newReactions[prevUserReaction] || 1) - 1);
          if (newReactions[prevUserReaction] === 0) delete newReactions[prevUserReaction];
       }
       
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

  const handleCreateGoogleMeet = async () => {
    setMeetError(null);
    setCreatedMeetUrl(null);
    setIsCreatingMeet(true);
    try {
      let token = getCachedAccessToken();
      if (!token) {
        token = await signInForGoogleMeet();
      }

      if (!token) {
        throw new Error("Unable to obtain Google Meet authorization token.");
      }

      const resSpace = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
      });

      if (!resSpace.ok) {
        const errorData = await resSpace.json().catch(() => ({}));
        console.error("Google Meet API Error:", errorData);
        throw new Error(errorData.error?.message || `Google Meet creation failed with code ${resSpace.status}`);
      }

      const data = await resSpace.json();
      const meetUrl = data.meetingUri;
      if (!meetUrl) {
        throw new Error("Google Meet API response did not contain a valid meeting URI.");
      }

      setCreatedMeetUrl(meetUrl);
      
      // Post the Google Meet Link to the chat automatically
      const greeting = matchProfile ? `Hey ${matchProfile.name}, let's meet on Google Meet! 🎥✨` : "Let's meet on Google Meet! 🎥✨";
      onSendMessage(`${greeting} Join our virtual date room here:\n\n${meetUrl}`);
    } catch (err: any) {
      console.error("Error creating Google Meet space:", err);
      setMeetError(err.message || "Failed to create Google Meet room. Please make sure Google Meet integration permissions are authorized.");
    } finally {
      setIsCreatingMeet(false);
    }
  };

  const useSuggestion = () => {
    if (aiSuggestion) {
      setInputText(aiSuggestion);
      setAiSuggestion(null);
    }
  };

  // --- Long Press Handlers ---
  const startLongPress = (id: string) => {
    longPressTimer.current = window.setTimeout(() => {
        setReactionMenuMsgId(id);
        if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      
      {/* Video Call Interface Overlay */}
      {isInCall && !isGroup && (
        <VideoCallInterface 
          matchName={session.matchName}
          matchPhoto={session.matchPhoto}
          onEndCall={() => setIsInCall(false)}
        />
      )}

      {/* Group Members Modal */}
      {showGroupMembers && isGroup && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative animate-slide-up max-h-[80vh] flex flex-col">
            <button 
              onClick={() => setShowGroupMembers(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-rose-100 p-3 rounded-full text-rose-600">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-none">Group Members</h3>
                <p className="text-sm text-slate-500 mt-1">{MOCK_GROUP_MEMBERS.length} people</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {MOCK_GROUP_MEMBERS.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="relative">
                    <img src={member.photo} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                    {member.role === 'Admin' && (
                       <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-0.5 rounded-full border-2 border-white" title="Admin">
                          <Crown size={10} fill="currentColor" />
                       </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm">{member.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      member.role === 'Admin' 
                        ? 'bg-amber-100 text-amber-700 font-medium' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                  <button className="text-rose-600 text-xs font-semibold px-3 py-1.5 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                    Message
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
               <button 
                 onClick={() => setShowGroupMembers(false)}
                 className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Date Options Modal */}
      {showVideoOptionsModal && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl relative animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
            <button 
              onClick={() => {
                setShowVideoOptionsModal(false);
                setMeetError(null);
                setCreatedMeetUrl(null);
              }}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-rose-100 p-3 rounded-full text-rose-600">
                <Video size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-none">Choose Video Date</h3>
                <p className="text-xs text-slate-500 mt-1">Select how you'd like to connect on video</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Option A: Google Meet (Real API integration) */}
              <div className="border border-purple-100 rounded-2xl p-4 bg-gradient-to-b from-purple-50/50 to-white hover:border-purple-200 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 font-bold text-[9px] px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  Official
                </div>
                
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 text-purple-900">
                  <Globe size={16} className="text-purple-600" />
                  Google Meet Video Date
                </h4>
                <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                  Start a real, live video call room using Google Meet. Perfect for scheduling actual remote date sessions.
                </p>

                {meetError && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs flex items-start gap-1.5">
                    <span className="font-bold text-red-800">Error:</span>
                    <span className="flex-1 text-[11px] leading-tight text-red-700">{meetError}</span>
                  </div>
                )}

                {createdMeetUrl ? (
                  <div className="space-y-2">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-medium flex items-center justify-between">
                      <span className="truncate mr-2">Link shared in chat!</span>
                      <span className="text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-center">Shared</span>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={createdMeetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-center text-white py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
                      >
                        Join Workspace Room <Share size={12} />
                      </a>
                      <button 
                        onClick={() => {
                          safeCopyToClipboard(createdMeetUrl).then(ok => {
                            if (ok) {
                              alert("Meeting link copied to clipboard!");
                            }
                          });
                        }}
                        className="px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateGoogleMeet}
                    disabled={isCreatingMeet}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-purple-200 flex items-center justify-center gap-1.5 transition-all outline-none"
                  >
                    {isCreatingMeet ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-purple-200" />
                        Setting up room...
                      </>
                    ) : (
                      <>
                        <Globe size={14} />
                        {getCachedAccessToken() ? "Create & Share Meet Space" : "Authorize & Create Meet Space"}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Option B: Simulated Video Call */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Video size={16} className="text-rose-500" />
                  Pendo Quick Chat Video
                </h4>
                <p className="text-xs text-slate-600 mt-1 mb-3 leading-relaxed">
                  Try out a quick mock calling room straight inside the app. Includes screen share and mic controls.
                </p>
                
                <button
                  onClick={() => {
                    setShowVideoOptionsModal(false);
                    setIsInCall(true);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-rose-200 flex items-center justify-center gap-1.5 transition-all outline-none"
                >
                  <Video size={14} />
                  Start In-App Video Call
                </button>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowVideoOptionsModal(false);
                setMeetError(null);
                setCreatedMeetUrl(null);
              }}
              className="w-full mt-4 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold py-3 rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Date Ideas Modal */}
      {showDateModal && matchProfile && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-slide-up">
            <button 
              onClick={() => setShowDateModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400"
            >
              <MoreVertical size={20} className="rotate-90" />
            </button>
            
            <div className="flex items-center justify-between mb-4 pr-10">
              <div className="flex items-center gap-3 text-rose-600">
                <Calendar size={28} />
                <h3 className="text-xl font-bold leading-none">Date Ideas<br/><span className="text-sm font-normal text-slate-500">in {matchProfile.location}</span></h3>
              </div>
              <button 
                onClick={() => handleDateIdeas(true)}
                disabled={loadingDate}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 hover:text-rose-600 transition-colors"
                title="Regenerate ideas"
              >
                <RefreshCw size={18} className={loadingDate ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="min-h-[150px]">
              {loadingDate ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-rose-500" />
                  <p className="text-sm">Consulting Cupid AI...</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-rose text-slate-600 whitespace-pre-wrap leading-relaxed bg-rose-50 p-4 rounded-xl border border-rose-100 max-h-[40vh] overflow-y-auto">
                  {dateIdeas}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => {
                   if (dateIdeas) {
                     onSendMessage(`Hey, check out these date ideas I found: \n\n${dateIdeas}`);
                     setShowDateModal(false);
                   }
                }}
                className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-rose-200 active:scale-95 transition-transform"
              >
                Send to {matchProfile.name}
              </button>
              <button 
                onClick={() => setShowDateModal(false)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          
          <div 
             onClick={() => isGroup && setShowGroupMembers(true)}
             className={`flex items-center gap-3 ${isGroup ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
          >
            <img 
              src={session.matchPhoto} 
              alt="" 
              className={`object-cover border border-slate-200 ${isGroup ? 'w-10 h-10 rounded-lg' : 'w-10 h-10 rounded-full'}`} 
            />
            <div>
              <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1">
                {session.matchName}
                {isGroup && <Users size={12} className="text-slate-400" />}
              </h3>
              <span className="text-xs text-rose-500 font-medium">
                {isGroup ? `${MOCK_GROUP_MEMBERS.length} members` : 'Online'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {!isGroup && (
            <>
              <button 
                onClick={handleShareProfile}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Share Profile"
              >
                <Share size={20} />
              </button>
              <button 
                onClick={() => setShowVideoOptionsModal(true)}
                className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full transition-colors"
                title="Video Date"
              >
                <Video size={20} />
              </button>
              <button 
                onClick={() => handleDateIdeas(false)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Plan a Date"
              >
                <Calendar size={20} />
              </button>
            </>
          )}
          {isGroup && (
             <button 
               onClick={() => setShowGroupMembers(true)}
               className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
             >
               <Users size={20} />
             </button>
          )}
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 overflow-x-hidden">
        
        {/* API Error Message */}
        {apiError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-sm animate-fade-in">
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Oops!</span>
                    <span>{apiError.message}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={apiError.action}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg font-medium transition-colors"
                    >
                        Retry
                    </button>
                    <button 
                        onClick={() => setApiError(null)}
                        className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        )}

        {session.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-8 px-6 animate-fade-in">
             {/* Avatar/Icon */}
             <div className={`w-24 h-24 bg-rose-100 flex items-center justify-center mb-4 shadow-sm ${isGroup ? 'rounded-3xl' : 'rounded-full'}`}>
               <span className="text-4xl">{isGroup ? '👥' : '👋'}</span>
             </div>
             
             <h3 className="text-slate-900 font-bold text-lg mb-1">
               {isGroup ? `Welcome to ${session.matchName}!` : `It's a match with ${session.matchName}!`}
             </h3>
             <p className="text-slate-500 text-sm mb-6 text-center max-w-[250px]">
               {isGroup ? "Start the conversation with the group." : "Don't be shy, say hello!"}
             </p>

             {/* AI Starter Section */}
             {!isGroup && (
               <div className="w-full max-w-xs">
                 {loadingAi ? (
                    <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2">
                       <Loader2 size={24} className="animate-spin text-rose-500" />
                       <p className="text-xs text-rose-400 font-medium">Cooking up an icebreaker...</p>
                    </div>
                 ) : aiSuggestion ? (
                    <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-2xl p-4 shadow-md relative group transition-all hover:shadow-lg">
                       <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-bold border border-rose-200 flex items-center gap-1 whitespace-nowrap">
                          <Sparkles size={10} /> AI Conversation Starter
                       </div>
                       
                       <p className="text-slate-800 font-medium text-center text-sm leading-relaxed mt-2 mb-4">
                         "{aiSuggestion}"
                       </p>
                       
                       <div className="flex gap-2">
                          <button 
                            onClick={useSuggestion}
                            className="flex-1 bg-rose-600 text-white py-2 rounded-xl text-xs font-bold shadow-md shadow-rose-200 hover:bg-rose-700 active:scale-95 transition-all"
                          >
                            Send Message
                          </button>
                          <button 
                             onClick={() => {
                               setAiSuggestion(null);
                               hasRequestedIcebreaker.current = false;
                               handleAskAI();
                             }}
                             className="p-2 bg-white text-slate-400 border border-slate-200 rounded-xl hover:text-rose-600 hover:border-rose-200 transition-colors"
                             title="Try another"
                          >
                             <RefreshCw size={16} />
                          </button>
                       </div>
                    </div>
                 ) : (
                   <button 
                     onClick={() => { hasRequestedIcebreaker.current = false; handleAskAI(); }}
                     className="text-xs text-rose-600 font-medium flex items-center justify-center gap-1 hover:underline w-full py-2"
                   >
                     <Sparkles size={12} /> Need an icebreaker?
                   </button>
                 )}
               </div>
             )}
          </div>
        )}

        {session.messages.map((msg) => {
          const activeReactions = localReactions[msg.id] || msg.reactions || {};
          const userReaction = localUserReactions[msg.id] || msg.userReaction;
          const showReactions = Object.keys(activeReactions).length > 0;
          const canTranslate = msg.senderId !== 'me' && !translationMap[msg.id];

          return (
            <div 
                key={msg.id} 
                className={`flex items-end gap-2 max-w-[90%] ${msg.senderId === 'me' ? 'flex-row-reverse' : 'flex-row'} group relative`}
            >
                
                {/* Actions Overlay (Translate/Delete) - Appears on hover or long press */}
                <div className={`absolute top-0 bottom-0 flex items-center gap-2 px-2 transition-all duration-200 z-10 ${
                    msg.senderId === 'me' ? 'right-full' : 'left-full'
                } ${
                    reactionMenuMsgId === msg.id 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none group-hover:pointer-events-auto'
                }`}>
                    {canTranslate && (
                       <button 
                         onClick={() => handleTranslate(msg.id, msg.text)}
                         className="p-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-full shadow-sm border border-indigo-100 hover:bg-indigo-50 hover:scale-110 transition-all"
                         title="Translate"
                       >
                         <Globe size={14} />
                       </button>
                    )}
                    <button 
                       onClick={() => onDeleteMessage(session.matchId, msg.id)}
                       className="p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-full shadow-sm border border-red-100 hover:bg-red-50 hover:scale-110 transition-all"
                       title="Delete"
                    >
                       <Trash2 size={14} />
                    </button>
                </div>

                {/* Reaction Menu Bubble */}
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

                <div className="flex flex-col relative max-w-full">
                  {isGroup && msg.senderId !== 'me' && msg.senderName && (
                    <span className="text-[10px] text-slate-500 mb-1 ml-1 font-semibold">{msg.senderName}</span>
                  )}
                  
                  {/* Message Bubble Container */}
                  <div 
                    onTouchStart={() => startLongPress(msg.id)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onMouseDown={() => startLongPress(msg.id)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    className={`flex flex-col shadow-sm rounded-2xl overflow-hidden transition-all duration-300 relative ${
                      msg.senderId === 'me' 
                        ? 'bg-rose-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none cursor-pointer hover:bg-slate-50 active:scale-95'
                    }`}
                  >
                      <div className={`px-4 py-3 text-sm leading-relaxed ${msg.text.includes('\n') ? 'whitespace-pre-wrap' : ''}`}>
                        {msg.text}
                        {loadingTranslation === msg.id && (
                          <span className="inline-block ml-2 align-middle">
                            <Loader2 size={12} className="animate-spin text-rose-500" />
                          </span>
                        )}
                      </div>

                      {translationMap[msg.id] && (
                        <div className="bg-slate-50 border-t border-slate-100 px-3 py-2.5 animate-in slide-in-from-top-2 duration-300">
                           <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 bg-indigo-100 p-1 rounded-md flex-shrink-0">
                                 <Sparkles size={12} className="text-indigo-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-wide flex items-center gap-1">
                                  AI Explanation
                                </p>
                                <p className="text-sm text-slate-700 leading-snug">{translationMap[msg.id]}</p>
                              </div>
                           </div>
                        </div>
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

                  {/* Hidden Hover Button for Desktop easy access to Reaction Menu */}
                  <button 
                     onClick={(e) => { e.stopPropagation(); setReactionMenuMsgId(msg.id); }}
                     className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200 hover:text-slate-600 ${msg.senderId === 'me' ? '-left-8' : '-right-8'}`}
                  >
                     <SmilePlus size={14} />
                  </button>
                </div>
            </div>
          );
        })}
        
        {/* AI Suggestion Box */}
        {aiSuggestion && !isGroup && session.messages.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl mx-4 mb-2 animate-pulse">
            <p className="text-rose-800 text-sm mb-2 font-medium italic">" {aiSuggestion} "</p>
            <div className="flex gap-2">
              <button 
                onClick={useSuggestion}
                className="text-xs bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700"
              >
                Use this
              </button>
              <button 
                onClick={() => setAiSuggestion(null)}
                className="text-xs bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2">
          {!isGroup && session.messages.length === 0 && !aiSuggestion && (
             <button 
               onClick={() => { hasRequestedIcebreaker.current = false; handleAskAI(); }}
               disabled={loadingAi}
               className="p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex-shrink-0"
               title="Get AI Icebreaker"
             >
               {loadingAi ? <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" /> : <Sparkles size={20} />}
             </button>
          )}
          
          <div className="flex-1 relative">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="w-full pl-4 pr-4 py-3 bg-slate-100 rounded-full border-transparent focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm transition-all"
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-3 bg-rose-600 text-white rounded-full hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-rose-200"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};