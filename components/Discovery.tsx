import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { MatchProfile, UserProfile, HangoutSpot } from '../types';
import { X, Heart, MapPin, Info, Sparkles, Loader2, SlidersHorizontal, Check, Mic, Volume2, Zap, ShieldCheck, MessageSquarePlus, Map as MapIcon, Users, Moon } from 'lucide-react';
import { analyzeCompatibility, generateSpeech, generateHoroscope } from '../services/geminiService';
import { INTERESTS_LIST } from './ProfileSetup';
import { Map as PigeonMap, Marker, Overlay } from 'pigeon-maps';

interface DiscoveryProps {
  userProfile: UserProfile;
  matches: MatchProfile[];
  hangoutSpots?: HangoutSpot[];
  onLike: (match: MatchProfile) => void;
  onPass: (matchId: string) => void;
  onBoost: () => void;
}

interface FilterState {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  interests: string[];
}

export const Discovery: React.FC<DiscoveryProps> = ({ userProfile, matches, hangoutSpots = [], onLike, onPass, onBoost }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [vibeCheck, setVibeCheck] = useState<string | null>(null);
  const [loadingVibe, setLoadingVibe] = useState(false);
  const [horoscope, setHoroscope] = useState<string | null>(null);
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  
  // TTS State
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [bioAudio, setBioAudio] = useState<HTMLAudioElement | null>(null);
  
  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    minAge: 18,
    maxAge: 50,
    maxDistance: 500, // Default to encompass most of Kenya to start
    interests: []
  });

  // Boost State
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Daily Spark State
  const [showDailySpark, setShowDailySpark] = useState(true);
  
  // Swipe State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  
  // Timer for Boost
  useEffect(() => {
    const interval = setInterval(() => {
      if (userProfile.boostExpiresAt && userProfile.boostExpiresAt > Date.now()) {
        const diff = userProfile.boostExpiresAt - Date.now();
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile.boostExpiresAt]);

  const isBoosted = !!timeRemaining;

  // Filtering Logic
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Age Filter
      if (match.age < filters.minAge || match.age > filters.maxAge) return false;
      
      // Distance Filter
      if (match.distance > filters.maxDistance) return false;
      
      // Interest Filter (if selected)
      if (filters.interests.length > 0) {
        // Show if match has at least one common interest
        const hasCommonInterest = match.interests.some(interest => 
          (filters.interests || []).includes(interest)
        );
        if (!hasCommonInterest) return false;
      }
      
      return true;
    });
  }, [matches, filters]);

  const currentMatch = filteredMatches[currentIndex];

  const sharedInterestsCount = useMemo(() => {
    if (!userProfile?.interests || !currentMatch?.interests) return 0;
    return currentMatch.interests.filter(i => userProfile.interests.includes(i)).length;
  }, [userProfile, currentMatch]);

  const isCompatible = sharedInterestsCount >= 3;

  useEffect(() => {
    // Reset state when card changes
    setVibeCheck(null);
    setLoadingVibe(false);
    setHoroscope(null);
    setLoadingHoroscope(false);
    setShowInfo(false);
    setDragX(0);
    setIsDragging(false);
    
    // Stop any playing audio
    if (bioAudio) {
        bioAudio.pause();
        setBioAudio(null);
    }
    setIsPlayingBio(false);
  }, [currentIndex, filteredMatches]); 

  // Reset index when filters change to avoid out of bounds
  useEffect(() => {
    setCurrentIndex(0);
  }, [filters]);

  const handleAction = (action: 'like' | 'pass') => {
    if (!currentMatch) return;
    
    const screenWidth = window.innerWidth;
    setDragX(action === 'like' ? screenWidth + 200 : -screenWidth - 200);
    
    setTimeout(() => {
      if (action === 'like') {
        onLike(currentMatch);
      } else {
        onPass(currentMatch.id);
      }
      setCurrentIndex(prev => prev + 1);
    }, 200); 
  };

  const handleVibeCheck = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (vibeCheck) return; 

    setLoadingVibe(true);
    const result = await analyzeCompatibility(userProfile, currentMatch);
    setVibeCheck(result);
    setLoadingVibe(false);
    setShowInfo(true);
  };
  
  const handleHoroscope = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (horoscope) return;

    setLoadingHoroscope(true);
    const result = await generateHoroscope(userProfile.zodiacSign, currentMatch.zodiacSign, currentMatch.name);
    setHoroscope(result);
    setLoadingHoroscope(false);
    setShowInfo(true);
  };
  
  const activateBoost = () => {
    onBoost();
    setShowBoostModal(false);
  };

  const handlePlayBio = async (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (isPlayingBio && bioAudio) {
          bioAudio.pause();
          setIsPlayingBio(false);
          return;
      }
      
      setIsPlayingBio(true);
      const base64 = await generateSpeech(currentMatch.bio);
      if (base64) {
          // Decode base64 to binary
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create Blob and Audio
            const blob = new Blob([bytes], { type: 'audio/mp3' }); // Gemini returns raw pcm usually but browser handles blob url often. Wait, docs say raw PCM.
            // Actually prompt instruction for TTS says: "The audio bytes returned by the API is raw PCM data. It is not a standard file format... contains no header"
            // So we need AudioContext to decode.
            
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                
                // Convert Uint8Array to ArrayBuffer
                const arrayBuffer = bytes.buffer;
                
                // Decode Raw PCM - Since it's raw, decodeAudioData might fail if it expects a header.
                // However, Gemini 2.5 TTS might return WAV with header if configured? 
                // The instruction says "raw PCM". We need to construct a WAV header or use AudioBuffer directly.
                // Let's manually create a Float32 buffer for simple playback if decode fails.
                
                // Simpler approach for React Component: Use the provided example code logic for decoding.
                
                const dataInt16 = new Int16Array(arrayBuffer);
                const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
                const channelData = buffer.getChannelData(0);
                for (let i = 0; i < dataInt16.length; i++) {
                   channelData[i] = dataInt16[i] / 32768.0;
                }
                
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start();
                
                source.onended = () => setIsPlayingBio(false);
                
                // We can't easily pause a BufferSource node and resume, so 'toggle' just stops it.
                setBioAudio({ pause: () => source.stop() } as any);

            } catch (err) {
                console.error("Audio playback error", err);
                setIsPlayingBio(false);
            }
      } else {
          setIsPlayingBio(false);
      }
  };

  // --- Drag Handlers ---

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.no-swipe')) return;
    if (showFilters || showBoostModal) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
  };

  const onDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - startXRef.current;
    setDragX(delta);
  };

  const onDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const SWIPE_THRESHOLD = 100;
    
    if (dragX > SWIPE_THRESHOLD) {
      handleAction('like');
    } else if (dragX < -SWIPE_THRESHOLD) {
      handleAction('pass');
    } else {
      setDragX(0); // Snap back
    }
  };

  const toggleInterestFilter = (interest: string) => {
    setFilters(prev => {
      if ((prev.interests || []).includes(interest)) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      }
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const renderCard = () => {
    if (!currentMatch) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <SlidersHorizontal size={32} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No matches found</h3>
          <p className="text-slate-500 mb-6">Try adjusting your filters to see more people.</p>
          <button 
            onClick={() => setShowFilters(true)}
            className="px-6 py-2 bg-rose-600 text-white rounded-full font-medium shadow-lg hover:bg-rose-700"
          >
            Adjust Filters
          </button>
        </div>
      );
    }

    const likeOpacity = Math.min(Math.max(dragX / 100, 0), 1);
    const nopeOpacity = Math.min(Math.max(-dragX / 100, 0), 1);

    return (
      <motion.div 
        key={currentMatch.id}
        className="relative flex-1 bg-white rounded-3xl shadow-2xl mb-6 group w-full touch-none select-none overflow-hidden"
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ 
          x: dragX, 
          rotate: dragX * 0.05,
          scale: isDragging ? 1.02 : 1.0,
          opacity: 1
        }}
        transition={isDragging 
          ? { type: 'tween', duration: 0 } 
          : { type: 'spring', stiffness: 300, damping: 20 }
        }
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <img 
            src={currentMatch.photoUrl} 
            alt={currentMatch.name}
            className="w-full h-full object-cover pointer-events-none" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
        </div>

        <div 
          className="absolute top-8 right-8 border-4 border-green-500 rounded-lg px-4 py-1 transform rotate-12 z-20"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-4xl font-bold text-green-500 tracking-wider">LIKE</span>
        </div>
        <div 
          className="absolute top-8 left-8 border-4 border-red-500 rounded-lg px-4 py-1 transform -rotate-12 z-20"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-4xl font-bold text-red-500 tracking-wider">NOPE</span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white no-swipe">
          <div className="flex items-end justify-between mb-2">
            <div>
              {((currentMatch.badges && currentMatch.badges.length > 0) || isCompatible) && (
                <div className="flex flex-wrap gap-1.5 mb-2 pointer-events-none">
                  {[...(currentMatch.badges || []), ...(isCompatible && !(currentMatch.badges || []).includes('Compatible') ? ['Compatible' as const] : [])].map(badge => {
                    let bgColor = "bg-rose-500/80";
                    if (badge === 'Verified') bgColor = "bg-blue-500/80";
                    else if (badge === 'Top Pick') bgColor = "bg-amber-500/80 text-amber-50";
                    else if (badge === 'Newbie') bgColor = "bg-emerald-500/80";
                    else if (badge === 'Compatible') bgColor = "bg-purple-500/80";

                    return (
                      <span key={badge} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${bgColor}`}>
                        {badge}
                      </span>
                    );
                  })}
                </div>
              )}
              <h2 className="text-3xl font-bold flex items-center gap-2 pointer-events-none">
                {currentMatch.name}, {currentMatch.age}
                {currentMatch.zodiacSign && (
                  <span className="text-xl ml-1 text-purple-200 opacity-90">{currentMatch.zodiacSign}</span>
                )}
                {currentMatch.isVerified && (
                  <ShieldCheck size={24} className="text-blue-400" fill="currentColor" stroke="white" title="Verified Profile" />
                )}
                {currentMatch.voiceUrl && (
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Voice Intro Available"></div>
                )}
              </h2>
              <div className="flex items-center text-rose-300 text-sm mt-1 pointer-events-none">
                <MapPin size={16} className="mr-1" />
                {currentMatch.location} • {currentMatch.distance}km away
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleHoroscope}
                className={`p-3 rounded-full backdrop-blur-md transition-all ${horoscope ? 'bg-purple-600 text-white' : 'bg-white/20 hover:bg-white/30'}`}
                title="Daily Horoscope"
              >
                {loadingHoroscope ? <Loader2 size={24} className="animate-spin" /> : <Moon size={24} />}
              </button>

              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleVibeCheck}
                className={`p-3 rounded-full backdrop-blur-md transition-all ${vibeCheck ? 'bg-indigo-600 text-white' : 'bg-white/20 hover:bg-white/30'}`}
                title="AI Vibe Check"
              >
                {loadingVibe ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
              </button>

              <button 
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setShowInfo(!showInfo)}
                className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors"
              >
                <Info size={24} />
              </button>
            </div>
          </div>
          
          {(showInfo || vibeCheck || horoscope) && (
             <div className="animate-fade-in pt-4 border-t border-white/20 mt-4 max-h-[35vh] overflow-y-auto no-scrollbar cursor-default"
                  onMouseDown={(e) => e.stopPropagation()} 
                  onTouchStart={(e) => e.stopPropagation()}
             >
               {horoscope && (
                 <div className="mb-4 bg-purple-900/60 backdrop-blur-sm p-3 rounded-xl border border-purple-400/30">
                   <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase mb-1">
                     <Moon size={12} /> Daily Horoscope
                   </div>
                   <p className="text-sm text-purple-50 leading-relaxed">{horoscope}</p>
                 </div>
               )}

               {vibeCheck && (
                 <div className="mb-4 bg-indigo-900/60 backdrop-blur-sm p-3 rounded-xl border border-indigo-400/30">
                   <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase mb-1">
                     <Sparkles size={12} /> AI Vibe Check
                   </div>
                   <p className="text-sm text-indigo-50 leading-relaxed">{vibeCheck}</p>
                 </div>
               )}

               <div className="mb-4">
                   <div className="flex items-center justify-between mb-1">
                       <h4 className="text-sm font-bold text-slate-300">Bio</h4>
                       <button 
                         onClick={handlePlayBio}
                         className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full ${isPlayingBio ? 'bg-rose-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                       >
                           {isPlayingBio ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                           {isPlayingBio ? 'Playing...' : 'Listen'}
                       </button>
                   </div>
                   <p className="text-base leading-relaxed text-slate-100">"{currentMatch.bio}"</p>
               </div>
               
               <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {currentMatch.interests.map(i => (
                      <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
                        {i}
                      </span>
                    ))}
                  </div>
                  
                  {currentMatch.languages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentMatch.languages.map(l => (
                        <span key={l} className="px-3 py-1 bg-slate-900/40 backdrop-blur-md rounded-full text-xs font-medium border border-white/10 text-slate-300">
                          🗣️ {l}
                        </span>
                      ))}
                    </div>
                  )}
               </div>
            </div>
         )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full max-w-md mx-auto relative p-4 flex flex-col select-none overflow-hidden">
      
      {!showFilters && !showBoostModal && (
         <div className="absolute top-6 left-6 z-30">
            <button 
              onClick={() => setShowBoostModal(true)}
              className={`p-3 rounded-full shadow-lg transition-all flex items-center gap-2 ${
                 isBoosted 
                  ? 'bg-purple-600 text-white animate-pulse shadow-purple-400/50' 
                  : 'bg-white/90 backdrop-blur text-slate-600 hover:text-purple-600 hover:scale-105'
              }`}
              title="Boost Profile"
            >
              <Zap size={20} fill={isBoosted ? "currentColor" : "none"} />
              {isBoosted && (
                <span className="text-xs font-bold tabular-nums">{timeRemaining}</span>
              )}
            </button>
         </div>
      )}

      {!showFilters && !showBoostModal && (
        <div className="absolute top-6 right-6 z-30">
          <button 
            onClick={() => setShowFilters(true)}
            className="p-3 bg-white/90 backdrop-blur rounded-full shadow-lg text-slate-600 hover:text-rose-600 hover:scale-105 transition-all"
            title="Filter Matches"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      )}
      
      {/* Daily Spark Notification */}
      {showDailySpark && !showFilters && !showBoostModal && (
        <div className="absolute top-24 left-6 right-6 z-30 animate-fade-in no-swipe">
          <div className="bg-gradient-to-r from-rose-500 to-indigo-600 rounded-2xl p-4 text-white shadow-xl flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <MessageSquarePlus size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">Daily Spark ✨</h4>
              <p className="text-xs text-white/90 mt-0.5">Check your chats! AI has generated new personalized icebreakers for your recent matches.</p>
            </div>
            <button 
              onClick={() => setShowDailySpark(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in no-swipe">
          <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full relative animate-scale-up shadow-2xl">
            <button 
              onClick={() => setShowBoostModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={24} />
            </button>
            
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
              <Zap size={32} fill="currentColor" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {isBoosted ? "Boost is Active!" : "Boost Your Profile"}
            </h3>
            
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              {isBoosted 
                ? "Your profile is currently being shown to more people. Enjoy the spotlight!" 
                : "Be the top profile in your area for 30 minutes. Get up to 10x more visibility."}
            </p>
            
            {isBoosted ? (
              <div className="bg-purple-50 text-purple-700 font-mono text-xl py-3 rounded-xl mb-6 font-bold border border-purple-100">
                {timeRemaining}
              </div>
            ) : (
              <button 
                onClick={activateBoost}
                className="w-full bg-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={18} fill="currentColor" /> Activate Boost
              </button>
            )}
            
            {isBoosted && (
               <button 
                 onClick={() => setShowBoostModal(false)}
                 className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-colors"
               >
                 Close
               </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilters && (
        <div className="absolute inset-0 z-40 bg-white/95 backdrop-blur-sm flex flex-col animate-fade-in no-swipe p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="text-rose-600" /> Filters
            </h2>
            <button 
              onClick={() => setShowFilters(false)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-20">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Age Range</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Min Age</label>
                  <input 
                    type="number" 
                    value={filters.minAge}
                    onChange={(e) => setFilters(prev => ({ ...prev, minAge: parseInt(e.target.value) }))}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-rose-500 outline-none font-medium"
                  />
                </div>
                <div className="text-slate-300">-</div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Max Age</label>
                  <input 
                    type="number" 
                    value={filters.maxAge}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxAge: parseInt(e.target.value) }))}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-rose-500 outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-900">Maximum Distance</h3>
                <span className="text-rose-600 font-bold">{filters.maxDistance} km</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="500" 
                step="5"
                value={filters.maxDistance}
                onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value) }))}
                className="w-full accent-rose-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>5 km</span>
                <span>500 km</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Interests (Optional)</h3>
              <p className="text-xs text-slate-500">Show people who have at least one of these interests.</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.map(interest => {
                  const isSelected = (filters.interests || []).includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterestFilter(interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
            >
              Apply Filters ({filteredMatches.length} Matches)
            </button>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      {!showFilters && !showBoostModal && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 no-swipe">
          <div className="bg-white/80 backdrop-blur-md rounded-full shadow-md flex p-1 border border-white/50">
            <button 
              onClick={() => setViewMode('cards')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${viewMode === 'cards' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Cards
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${viewMode === 'map' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <MapIcon size={14} /> Map
            </button>
          </div>
        </div>
      )}

      {!showFilters && !showBoostModal && viewMode === 'cards' && renderCard()}

      {!showFilters && !showBoostModal && viewMode === 'cards' && currentMatch && (
        <div className="flex justify-center items-center gap-8 mb-4">
          <button 
            onClick={() => handleAction('pass')}
            className="w-16 h-16 rounded-full bg-white shadow-lg text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-rose-500 transition-all active:scale-95 border border-slate-100 z-10"
          >
            <X size={32} />
          </button>
          
          <button 
            onClick={() => handleAction('like')}
            className="w-20 h-20 rounded-full bg-rose-600 shadow-xl shadow-rose-200 text-white flex items-center justify-center hover:bg-rose-700 transition-all active:scale-95 z-10"
          >
            <Heart size={40} fill="currentColor" />
          </button>
        </div>
      )}

      {!showFilters && !showBoostModal && viewMode === 'map' && (
        <div className="flex-1 rounded-3xl overflow-hidden shadow-xl mb-4 relative bg-slate-100 z-10 p-1 border-4 border-white">
          <PigeonMap 
            defaultCenter={[userProfile.coordinates?.latitude || -1.2921, userProfile.coordinates?.longitude || 36.8219]} 
            defaultZoom={11}
          >
            {/* User Location */}
            {userProfile.coordinates && (
              <Marker anchor={[userProfile.coordinates.latitude, userProfile.coordinates.longitude]} width={40} color="#e11d48">
                 <div className="w-4 h-4 bg-rose-600 rounded-full border-2 border-white shadow-[0_0_10px_rgba(225,29,72,0.6)] animate-pulse"></div>
              </Marker>
            )}
            
            {/* Hangout Spots */}
            {hangoutSpots.map(spot => spot.coordinates && (
              <Overlay key={'spot-'+spot.id} anchor={[spot.coordinates.latitude, spot.coordinates.longitude]} offset={[15, 30]}>
                <div className="relative group cursor-pointer" onClick={() => console.log('Clicked spot:', spot.name)}>
                   <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md">
                     <Users size={16} />
                   </div>
                   <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded shadow-lg text-xs font-bold text-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                     {spot.name}
                     <div className="text-[10px] text-blue-600 font-normal">🔥 {spot.activeCount} here</div>
                   </div>
                </div>
              </Overlay>
            ))}

            {/* Matches */}
            {filteredMatches.map(match => match.coordinates && (
              <Overlay key={'match-'+match.id} anchor={[match.coordinates.latitude, match.coordinates.longitude]} offset={[20, 40]}>
                <div 
                   className="relative group cursor-pointer" 
                   onClick={() => {
                     // Find index and flip to card view
                     const idx = filteredMatches.findIndex(m => m.id === match.id);
                     if (idx !== -1) {
                         setCurrentIndex(idx);
                         setViewMode('cards');
                     }
                   }}
                >
                   <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                     <img src={match.photoUrl} alt={match.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded shadow-lg text-xs font-bold text-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center gap-1">
                     {match.name}, {match.age} 
                     <Heart size={10} className="text-rose-500 fill-rose-500" />
                   </div>
                </div>
              </Overlay>
            ))}
          </PigeonMap>
          
          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-lg flex justify-start gap-4 text-xs font-medium border border-white">
            <div className="flex items-center gap-1.5 text-slate-700">
               <div className="w-3 h-3 bg-rose-600 rounded-full"></div> You
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
               <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                 <Users size={8} className="text-white" />
               </div> Hotspots
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
               <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-200 overflow-hidden">
                  <Heart size={8} className="m-auto mt-0.5 text-slate-400" />
               </div> Matches
            </div>
          </div>
        </div>
      )}
    </div>
  );
};