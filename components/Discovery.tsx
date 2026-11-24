import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { MatchProfile, UserProfile, HangoutSpot } from '../types';
import { X, Heart, MapPin, Info, Sparkles, Loader2, SlidersHorizontal, Check, Volume2, Zap, ShieldCheck, MessageSquarePlus, Map as MapIcon, Users, Moon, Flame, Share2, RotateCcw } from 'lucide-react';
import { analyzeCompatibility, generateSpeech, generateHoroscope } from '../services/geminiService';
import { INTERESTS_LIST } from './ProfileSetup';
import { KENYAN_VIBE_CIRCLES } from '../src/lib/seoRoutes';
import { Map as PigeonMap, Marker, Overlay } from 'pigeon-maps';
import { VibeHeatmap } from './VibeHeatmap';

interface DiscoveryProps {
  userProfile: UserProfile;
  matches: MatchProfile[];
  hangoutSpots?: HangoutSpot[];
  initialCity?: string;
  initialVibe?: string;
  onLike: (match: MatchProfile) => void;
  onPass: (matchId: string) => void;
  onBoost: () => void;
  onOpenSafetyModal?: () => void;
  onOpenAlikaModal?: () => void;
}

export type GenderPreference = 'ALL' | 'Female' | 'Male' | 'Non-binary';

interface FilterState {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  genderPreference: GenderPreference;
  interests: string[];
}

const MIN_AGE_BOUND = 18;
const MAX_AGE_BOUND = 80;
const DEFAULT_MIN_AGE = 18;
const DEFAULT_MAX_AGE = 60;
const DEFAULT_MAX_DISTANCE = 500;

const GENDER_PREFERENCE_OPTIONS: { id: GenderPreference; label: string }[] = [
  { id: 'ALL', label: 'Everyone' },
  { id: 'Female', label: 'Women' },
  { id: 'Male', label: 'Men' },
  { id: 'Non-binary', label: 'Non-binary' },
];

const mapLookingForToGenderPreference = (lookingFor?: string): GenderPreference => {
  const normalized = (lookingFor || '').trim().toLowerCase();
  if (['women', 'woman', 'female', 'f'].includes(normalized)) return 'Female';
  if (['men', 'man', 'male', 'm'].includes(normalized)) return 'Male';
  if (['non-binary', 'nonbinary', 'nb'].includes(normalized)) return 'Non-binary';
  return 'ALL';
};

const normalizeProfileGender = (gender?: string): 'Female' | 'Male' | 'Non-binary' | 'Other' => {
  const normalized = (gender || '').trim().toLowerCase();
  if (['female', 'woman', 'women', 'f'].includes(normalized)) return 'Female';
  if (['male', 'man', 'men', 'm'].includes(normalized)) return 'Male';
  if (['non-binary', 'nonbinary', 'nb', 'enby'].includes(normalized)) return 'Non-binary';
  return 'Other';
};

export const Discovery: React.FC<DiscoveryProps> = ({ userProfile, matches, hangoutSpots = [], initialCity, initialVibe, onLike, onPass, onBoost, onOpenAlikaModal }) => {
  const [viewMode, setViewMode] = useState<'cards' | 'map' | 'heatmap'>('cards');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'All Kenya');
  const [selectedVibe, setSelectedVibe] = useState<string>(initialVibe || 'All Vibes');
  const [showInfo, setShowInfo] = useState(false);
  const [vibeCheck, setVibeCheck] = useState<string | null>(null);
  const [loadingVibe, setLoadingVibe] = useState(false);
  const [horoscope, setHoroscope] = useState<string | null>(null);
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  
  // TTS State
  const [isPlayingBio, setIsPlayingBio] = useState(false);
  const [bioAudio, setBioAudio] = useState<HTMLAudioElement | null>(null);
  
  // Sidebar & Filter State
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [filters, setFilters] = useState<FilterState>(() => ({
    minAge: DEFAULT_MIN_AGE,
    maxAge: DEFAULT_MAX_AGE,
    maxDistance: DEFAULT_MAX_DISTANCE,
    genderPreference: mapLookingForToGenderPreference(userProfile.lookingFor),
    interests: []
  }));
  const [minAgeDraft, setMinAgeDraft] = useState<string>(String(DEFAULT_MIN_AGE));
  const [maxAgeDraft, setMaxAgeDraft] = useState<string>(String(DEFAULT_MAX_AGE));

  // Boost State
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // Daily Spark State
  const [showDailySpark, setShowDailySpark] = useState(true);
  
  // Swipe State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  // Sync when deep-linked city, vibe, or userProfile.lookingFor changes
  useEffect(() => {
    if (initialCity) {
      setSelectedCity(initialCity);
    }
  }, [initialCity]);

  useEffect(() => {
    if (initialVibe) {
      setSelectedVibe(initialVibe);
    }
  }, [initialVibe]);

  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      genderPreference: mapLookingForToGenderPreference(userProfile.lookingFor),
    }));
  }, [userProfile.lookingFor]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!showMobileSidebar) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMobileSidebar(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMobileSidebar]);

  // Reset index when city or vibe filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCity, selectedVibe]);
  
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.genderPreference !== 'ALL') count += 1;
    if (filters.minAge !== DEFAULT_MIN_AGE || filters.maxAge !== DEFAULT_MAX_AGE) count += 1;
    if (filters.maxDistance !== DEFAULT_MAX_DISTANCE) count += 1;
    if (filters.interests.length > 0) count += 1;
    return count;
  }, [filters]);

  // Filtering Logic
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // City Filter
      if (selectedCity !== 'All Kenya') {
        const matchLocation = (match.location || '').toLowerCase();
        const targetCity = selectedCity.toLowerCase();
        if (!matchLocation.includes(targetCity)) return false;
      }

      // Kenyan Vibe Circle Filter
      if (selectedVibe !== 'All Vibes') {
        if ((match.vibeCircle || '').toLowerCase() !== selectedVibe.toLowerCase()) {
          return false;
        }
      }

      // Gender Preference Filter
      if (filters.genderPreference !== 'ALL') {
        if (normalizeProfileGender(match.gender) !== filters.genderPreference) {
          return false;
        }
      }

      // Age Filter
      if (match.age < filters.minAge || match.age > filters.maxAge) return false;
      
      // Distance Filter
      if (match.distance > filters.maxDistance) return false;
      
      // Interest Filter (if selected)
      if (filters.interests.length > 0) {
        const hasCommonInterest = match.interests.some(interest => 
          (filters.interests || []).includes(interest)
        );
        if (!hasCommonInterest) return false;
      }
      
      return true;
    });
  }, [matches, filters, selectedCity, selectedVibe]);

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

  const updateMinAge = (nextMin: number) => {
    const clamped = Math.max(MIN_AGE_BOUND, Math.min(nextMin, filters.maxAge));
    setFilters(prev => ({ ...prev, minAge: clamped }));
    setMinAgeDraft(String(clamped));
  };

  const updateMaxAge = (nextMax: number) => {
    const clamped = Math.min(MAX_AGE_BOUND, Math.max(nextMax, filters.minAge));
    setFilters(prev => ({ ...prev, maxAge: clamped }));
    setMaxAgeDraft(String(clamped));
  };

  const handleMinAgeInputChange = (raw: string) => {
    setMinAgeDraft(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= MIN_AGE_BOUND && parsed <= MAX_AGE_BOUND) {
      if (parsed <= filters.maxAge) {
        setFilters(prev => ({ ...prev, minAge: parsed }));
      } else {
        setFilters(prev => ({ ...prev, minAge: parsed, maxAge: parsed }));
        setMaxAgeDraft(String(parsed));
      }
    }
  };

  const handleMaxAgeInputChange = (raw: string) => {
    setMaxAgeDraft(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= MIN_AGE_BOUND && parsed <= MAX_AGE_BOUND) {
      if (parsed >= filters.minAge) {
        setFilters(prev => ({ ...prev, maxAge: parsed }));
      } else {
        setFilters(prev => ({ ...prev, minAge: parsed, maxAge: parsed }));
        setMinAgeDraft(String(parsed));
      }
    }
  };

  const commitMinAgeBlur = () => {
    const parsed = parseInt(minAgeDraft, 10);
    if (Number.isNaN(parsed)) {
      setMinAgeDraft(String(filters.minAge));
      return;
    }
    updateMinAge(parsed);
  };

  const commitMaxAgeBlur = () => {
    const parsed = parseInt(maxAgeDraft, 10);
    if (Number.isNaN(parsed)) {
      setMaxAgeDraft(String(filters.maxAge));
      return;
    }
    updateMaxAge(parsed);
  };

  const resetFilters = () => {
    setFilters({
      minAge: DEFAULT_MIN_AGE,
      maxAge: DEFAULT_MAX_AGE,
      maxDistance: DEFAULT_MAX_DISTANCE,
      genderPreference: 'ALL',
      interests: [],
    });
    setMinAgeDraft(String(DEFAULT_MIN_AGE));
    setMaxAgeDraft(String(DEFAULT_MAX_AGE));
    setSelectedCity('All Kenya');
    setSelectedVibe('All Vibes');
  };

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
    if (showMobileSidebar || showBoostModal) return;

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

  const ageMinPct = ((filters.minAge - MIN_AGE_BOUND) / (MAX_AGE_BOUND - MIN_AGE_BOUND)) * 100;
  const ageMaxPct = ((filters.maxAge - MIN_AGE_BOUND) / (MAX_AGE_BOUND - MIN_AGE_BOUND)) * 100;

  const renderFilterSidebarContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-rose-600" />
            Discovery Filters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Showing <span className="font-semibold text-slate-800">{filteredMatches.length}</span> of {matches.length} profiles
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {(activeFilterCount > 0 || selectedCity !== 'All Kenya' || selectedVibe !== 'All Vibes') && (
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Reset all filters"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          )}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setShowMobileSidebar(false)}
              aria-label="Close Filter Sidebar"
              className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Filter Sections */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Gender Preferences */}
        <section aria-labelledby={isDrawer ? 'drawer-gender-heading' : 'sidebar-gender-heading'} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 id={isDrawer ? 'drawer-gender-heading' : 'sidebar-gender-heading'} className="text-sm font-bold text-slate-900">
              Gender Preference
            </h3>
            <span className="text-xs font-semibold text-rose-600">
              {GENDER_PREFERENCE_OPTIONS.find(o => o.id === filters.genderPreference)?.label || 'Everyone'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Gender Preference">
            {GENDER_PREFERENCE_OPTIONS.map((option) => {
              const isSelected = filters.genderPreference === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setFilters(prev => ({ ...prev, genderPreference: option.id }))}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {isSelected && <Check size={14} />}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Age Range */}
        <section aria-labelledby={isDrawer ? 'drawer-age-heading' : 'sidebar-age-heading'} className="pt-5 border-t border-slate-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 id={isDrawer ? 'drawer-age-heading' : 'sidebar-age-heading'} className="text-sm font-bold text-slate-900">
              Age Range
            </h3>
            <span className="text-xs font-bold text-rose-600 tabular-nums">
              {filters.minAge} – {filters.maxAge} yrs
            </span>
          </div>

          {/* Visual Range Span Indicator */}
          <div className="relative h-2 w-full rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
            <div
              className="absolute top-0 bottom-0 bg-rose-600 rounded-full transition-all duration-150"
              style={{
                left: `${Math.max(0, Math.min(100, ageMinPct))}%`,
                right: `${Math.max(0, Math.min(100, 100 - ageMaxPct))}%`,
              }}
            />
          </div>

          {/* Independent Accessible Sliders */}
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                <label htmlFor={isDrawer ? 'drawer-min-age-slider' : 'sidebar-min-age-slider'}>Minimum Age</label>
                <span className="tabular-nums font-semibold text-slate-800">{filters.minAge}</span>
              </div>
              <input
                id={isDrawer ? 'drawer-min-age-slider' : 'sidebar-min-age-slider'}
                aria-label="Minimum age slider"
                type="range"
                min={MIN_AGE_BOUND}
                max={MAX_AGE_BOUND}
                value={filters.minAge}
                onChange={(e) => updateMinAge(parseInt(e.target.value, 10))}
                className="w-full accent-rose-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                <label htmlFor={isDrawer ? 'drawer-max-age-slider' : 'sidebar-max-age-slider'}>Maximum Age</label>
                <span className="tabular-nums font-semibold text-slate-800">{filters.maxAge}</span>
              </div>
              <input
                id={isDrawer ? 'drawer-max-age-slider' : 'sidebar-max-age-slider'}
                aria-label="Maximum age slider"
                type="range"
                min={MIN_AGE_BOUND}
                max={MAX_AGE_BOUND}
                value={filters.maxAge}
                onChange={(e) => updateMaxAge(parseInt(e.target.value, 10))}
                className="w-full accent-rose-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Numeric Inputs */}
          <div className="flex items-center gap-2.5 pt-1">
            <div className="flex-1">
              <label htmlFor={isDrawer ? 'drawer-min-age-input' : 'sidebar-min-age-input'} className="text-[11px] font-medium text-slate-500 mb-1 block">
                Min Age
              </label>
              <input
                id={isDrawer ? 'drawer-min-age-input' : 'sidebar-min-age-input'}
                type="number"
                min={MIN_AGE_BOUND}
                max={MAX_AGE_BOUND}
                value={minAgeDraft}
                onChange={(e) => handleMinAgeInputChange(e.target.value)}
                onBlur={commitMinAgeBlur}
                className="w-full min-h-[40px] px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-900 tabular-nums"
              />
            </div>
            <span className="text-slate-400 pt-5 font-medium" aria-hidden="true">–</span>
            <div className="flex-1">
              <label htmlFor={isDrawer ? 'drawer-max-age-input' : 'sidebar-max-age-input'} className="text-[11px] font-medium text-slate-500 mb-1 block">
                Max Age
              </label>
              <input
                id={isDrawer ? 'drawer-max-age-input' : 'sidebar-max-age-input'}
                type="number"
                min={MIN_AGE_BOUND}
                max={MAX_AGE_BOUND}
                value={maxAgeDraft}
                onChange={(e) => handleMaxAgeInputChange(e.target.value)}
                onBlur={commitMaxAgeBlur}
                className="w-full min-h-[40px] px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm font-semibold text-slate-900 tabular-nums"
              />
            </div>
          </div>
        </section>

        {/* Maximum Distance */}
        <section aria-labelledby={isDrawer ? 'drawer-dist-heading' : 'sidebar-dist-heading'} className="pt-5 border-t border-slate-100 space-y-2.5">
          <div className="flex justify-between items-center">
            <h3 id={isDrawer ? 'drawer-dist-heading' : 'sidebar-dist-heading'} className="text-sm font-bold text-slate-900">
              Maximum Distance
            </h3>
            <span className="text-xs font-bold text-rose-600 tabular-nums">{filters.maxDistance} km</span>
          </div>
          <input
            aria-label="Maximum distance in kilometers"
            type="range"
            min={5}
            max={500}
            step={5}
            value={filters.maxDistance}
            onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: parseInt(e.target.value, 10) }))}
            className="w-full accent-rose-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 tabular-nums">
            <span>5 km</span>
            <span>500 km</span>
          </div>
        </section>

        {/* Interests */}
        <section aria-labelledby={isDrawer ? 'drawer-interests-heading' : 'sidebar-interests-heading'} className="pt-5 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 id={isDrawer ? 'drawer-interests-heading' : 'sidebar-interests-heading'} className="text-sm font-bold text-slate-900">
              Interests
            </h3>
            {filters.interests.length > 0 && (
              <span className="text-[11px] font-semibold text-rose-600 tabular-nums">
                {filters.interests.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Match profiles with at least one selected interest.</p>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS_LIST.map(interest => {
              const isSelected = (filters.interests || []).includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleInterestFilter(interest)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  <span>{interest}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer CTA (Sticky on Mobile Drawer, Summary on Desktop Sidebar) */}
      {isDrawer && (
        <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setShowMobileSidebar(false)}
            className="flex-1 min-h-[44px] bg-slate-900 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer tabular-nums whitespace-nowrap"
          >
            Show {filteredMatches.length} {filteredMatches.length === 1 ? 'Match' : 'Matches'}
          </button>
        </div>
      )}
    </div>
  );

  const renderCard = () => {
    if (!currentMatch) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <SlidersHorizontal size={28} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No matches found</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs">
            Try widening your age range, gender preference, or distance in the filter sidebar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button 
              type="button"
              onClick={resetFilters}
              className="min-h-[44px] px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
            <button 
              type="button"
              onClick={() => {
                setShowMobileSidebar(true);
                setShowDesktopSidebar(true);
              }}
              className="min-h-[44px] px-5 py-2.5 bg-rose-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-rose-700 transition-colors cursor-pointer lg:hidden"
            >
              Adjust Filters
            </button>
          </div>
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
            src={
              userProfile.dataSaverEnabled && currentMatch.photoUrl.includes('picsum.photos')
                ? currentMatch.photoUrl.replace('/400/600', '/240/360')
                : currentMatch.photoUrl
            } 
            alt={currentMatch.name}
            loading={userProfile.dataSaverEnabled ? 'lazy' : 'eager'}
            decoding="async"
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
              <div className="flex items-center gap-2 mb-1.5 pointer-events-none">
                {currentMatch.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-sm">
                    <ShieldCheck size={11} /> Verified · {currentMatch.trustScore || 92}% Trust
                  </span>
                )}
                {!currentMatch.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/70 text-slate-200 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                    {currentMatch.trustScore || 74}% Trust Score
                  </span>
                )}
                {isCompatible && (
                  <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-sm">
                    High Vibe Match
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-bold flex items-center gap-2 pointer-events-none">
                {currentMatch.name}, {currentMatch.age}
                {currentMatch.isVerified && (
                  <span title="Verified Kenyan Profile" className="inline-flex items-center">
                    <ShieldCheck size={24} className="text-emerald-400" fill="currentColor" stroke="white" />
                  </span>
                )}
                {currentMatch.voiceUrl && (
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Voice Intro Available"></div>
                )}
              </h2>
              {/* Zero-Pill Metadata Discipline: Clean inline text separated by middle dots */}
              <div className="flex flex-wrap items-center text-rose-100/95 text-xs font-medium mt-1 pointer-events-none gap-1.5">
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <MapPin size={13} className="text-rose-400" />
                  {currentMatch.location}
                </span>
                <span className="text-white/50">·</span>
                <span>{currentMatch.distance} km away</span>
                {currentMatch.gender && (
                  <>
                    <span className="text-white/50">·</span>
                    <span>{currentMatch.gender}</span>
                  </>
                )}
                {currentMatch.vibeCircle && (
                  <>
                    <span className="text-white/50">·</span>
                    <span className="font-bold text-amber-300">{currentMatch.vibeCircle}</span>
                  </>
                )}
                {currentMatch.zodiacSign && (
                  <>
                    <span className="text-white/50">·</span>
                    <span>{currentMatch.zodiacSign}</span>
                  </>
                )}
                {currentMatch.languages && currentMatch.languages.length > 0 && (
                  <>
                    <span className="text-white/50">·</span>
                    <span>Speaks {currentMatch.languages.join(', ')}</span>
                  </>
                )}
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

               <div className="mb-3">
                   <div className="flex items-center justify-between mb-1">
                       <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">About {currentMatch.name}</h4>
                       <button 
                         onClick={handlePlayBio}
                         className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg ${isPlayingBio ? 'bg-rose-600 text-white' : 'bg-white/15 hover:bg-white/25'}`}
                       >
                           {isPlayingBio ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
                           {isPlayingBio ? 'Playing...' : 'Listen'}
                       </button>
                   </div>
                   <p className="text-sm leading-relaxed text-slate-100">"{currentMatch.bio}"</p>
               </div>
               
               <div className="pt-2 border-t border-white/10 text-xs text-slate-200">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-1">Shared Interests & Passions</span>
                  <p className="font-medium text-white/95">
                    {currentMatch.interests.join(' · ')}
                  </p>
               </div>
            </div>
         )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-[calc(100vh-132px)] min-h-[540px] w-full flex overflow-hidden relative bg-slate-100/60 select-none">
      {/* Desktop Persistent Filter Sidebar */}
      {showDesktopSidebar && (
        <aside
          aria-label="Discovery Filter Sidebar"
          className="hidden lg:flex lg:w-80 lg:shrink-0 flex-col bg-white border-r border-slate-200 h-full overflow-hidden no-swipe"
        >
          {renderFilterSidebarContent(false)}
        </aside>
      )}

      {/* Mobile / Tablet Slide-In Filter Sidebar Drawer */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-swipe">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setShowMobileSidebar(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Discovery Filter Sidebar"
            className="relative z-10 w-[86vw] max-w-[340px] h-full bg-white shadow-2xl border-r border-slate-200 flex flex-col"
          >
            {renderFilterSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Discovery Feed Stage */}
      <div className={`flex-1 min-w-0 h-full relative p-3 sm:p-4 flex flex-col ${viewMode === 'heatmap' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {/* Top Controls Row (Zero Overlap Across Mobile & Desktop) */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between gap-2 z-30 shrink-0 mb-2 no-swipe">
          <div className="flex items-center gap-1.5">
            <button 
              type="button"
              onClick={() => setShowBoostModal(true)}
              className={`min-h-[40px] px-2.5 py-2 rounded-full shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                 isBoosted 
                  ? 'bg-purple-600 text-white animate-pulse shadow-purple-400/50' 
                  : 'bg-white text-slate-700 hover:text-purple-600 border border-slate-200/80'
              }`}
              title="Boost Profile (Free)"
            >
              <Zap size={18} fill={isBoosted ? "currentColor" : "none"} />
              {isBoosted && (
                <span className="text-xs font-bold tabular-nums">{timeRemaining}</span>
              )}
            </button>

            {onOpenAlikaModal && (
              <button
                type="button"
                onClick={onOpenAlikaModal}
                className="min-h-[40px] min-w-[40px] p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md transition-all flex items-center justify-center cursor-pointer"
                title="Alika Rafiki (Invite on WhatsApp)"
              >
                <Share2 size={17} />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="bg-white rounded-full shadow-md flex p-1 border border-slate-200/80">
            <button 
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Cards
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${viewMode === 'map' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <MapIcon size={13} /> Map
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1 cursor-pointer ${viewMode === 'heatmap' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Flame size={13} /> Heatmap
            </button>
          </div>

          {/* Filter Sidebar Toggle (Opens drawer on mobile, toggles sidebar on desktop) */}
          <div>
            <button
              type="button"
              onClick={() => setShowMobileSidebar(true)}
              aria-label="Open Filter Sidebar"
              title="Filter Matches"
              className="lg:hidden relative min-h-[40px] min-w-[40px] p-2 bg-white rounded-full shadow-md border border-slate-200/80 text-slate-700 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer"
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDesktopSidebar(prev => !prev)}
              aria-expanded={showDesktopSidebar}
              aria-label={showDesktopSidebar ? 'Hide Filter Sidebar' : 'Show Filter Sidebar'}
              title={showDesktopSidebar ? 'Hide Filter Sidebar' : 'Show Filter Sidebar'}
              className={`hidden lg:flex relative min-h-[40px] min-w-[40px] p-2 rounded-full shadow-md border transition-colors items-center justify-center cursor-pointer ${
                showDesktopSidebar
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-slate-200/80 text-slate-700 hover:text-rose-600'
              }`}
            >
              <SlidersHorizontal size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Kenyan City & Vibe Circle Quick Filter Bars */}
        {!showBoostModal && viewMode === 'cards' && (
          <div className="w-full max-w-md mx-auto mb-2 z-20 space-y-1.5 shrink-0 no-swipe">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar px-0.5">
              {['All Kenya', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Diani', 'Diaspora'].map(city => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
                    selectedCity === city
                      ? 'bg-rose-600 text-white shadow-rose-200'
                      : 'bg-white/95 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar px-0.5">
              {KENYAN_VIBE_CIRCLES.map(vibe => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => setSelectedVibe(vibe)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
                    selectedVibe === vibe
                      ? 'bg-amber-400 text-slate-950 border border-amber-500'
                      : 'bg-slate-900/85 text-amber-100 hover:bg-slate-900 border border-slate-700'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Daily Spark Notification */}
        {showDailySpark && !showBoostModal && viewMode === 'cards' && currentMatch && (
          <div className="w-full max-w-md mx-auto mb-2 z-30 animate-fade-in shrink-0 no-swipe">
            <div className="bg-gradient-to-r from-rose-500 to-indigo-600 rounded-2xl px-3.5 py-2.5 text-white shadow-lg flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-xl backdrop-blur-sm shrink-0">
                <MessageSquarePlus size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs">Daily Spark ✨</h4>
                <p className="text-[11px] text-white/90 truncate">AI generated fresh icebreakers in your chats.</p>
              </div>
              <button 
                type="button"
                aria-label="Dismiss Daily Spark"
                onClick={() => setShowDailySpark(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors shrink-0 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Boost Modal */}
        {showBoostModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in no-swipe">
            <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full relative animate-scale-up shadow-2xl">
              <button 
                type="button"
                onClick={() => setShowBoostModal(false)}
                aria-label="Close Boost Modal"
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={24} />
              </button>
              
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                <Zap size={32} fill="currentColor" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {isBoosted ? "Boost is Active!" : "Boost Your Profile (100% Free)"}
              </h3>
              
              <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                {isBoosted 
                  ? "Your profile is currently being shown to more people. Enjoy the spotlight!" 
                  : "Be the top profile in your area for 30 minutes completely free. Get up to 10x more visibility."}
              </p>
              
              {isBoosted ? (
                <div className="bg-purple-50 text-purple-700 font-mono text-xl py-3 rounded-xl mb-6 font-bold border border-purple-100 tabular-nums">
                  {timeRemaining}
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={activateBoost}
                  className="w-full bg-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap size={18} fill="currentColor" /> Activate Boost
                </button>
              )}
              
              {isBoosted && (
                 <button 
                   type="button"
                   onClick={() => setShowBoostModal(false)}
                   className="w-full bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                 >
                   Close
                 </button>
              )}
            </div>
          </div>
        )}

        {/* Cards View */}
        {!showBoostModal && viewMode === 'cards' && (
          <div className="flex-1 w-full max-w-md mx-auto flex flex-col min-h-0">
            {renderCard()}

            {currentMatch && (
              <div className="flex justify-center items-center gap-8 pb-2 shrink-0">
                <button 
                  type="button"
                  aria-label="Pass Match"
                  onClick={() => handleAction('pass')}
                  className="w-16 h-16 rounded-full bg-white shadow-lg text-slate-400 flex items-center justify-center hover:bg-slate-50 hover:text-rose-500 transition-all active:scale-95 border border-slate-100 z-10 cursor-pointer"
                >
                  <X size={32} />
                </button>
                
                <button 
                  type="button"
                  aria-label="Like Match"
                  onClick={() => handleAction('like')}
                  className="w-20 h-20 rounded-full bg-rose-600 shadow-xl shadow-rose-200 text-white flex items-center justify-center hover:bg-rose-700 transition-all active:scale-95 z-10 cursor-pointer"
                >
                  <Heart size={40} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Map View */}
        {!showBoostModal && viewMode === 'map' && (
          <div className="flex-1 w-full rounded-3xl overflow-hidden shadow-xl mb-2 relative bg-slate-100 z-10 p-1 border-4 border-white">
            <PigeonMap 
              defaultCenter={[userProfile.coordinates?.latitude || -1.2921, userProfile.coordinates?.longitude || 36.8219]} 
              defaultZoom={11}
            >
              {/* User Location */}
              {userProfile.coordinates && (
                <Marker anchor={[userProfile.coordinates.latitude, userProfile.coordinates.longitude]} width={40} color="#e11d48">
                   <div className="w-4 h-4 bg-rose-600 rounded-full border-2 border-white shadow-[0_0_10px_rgba(225,29,72,0.6)]"></div>
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

        {/* Dynamic D3 Heatmap View */}
        {!showBoostModal && viewMode === 'heatmap' && (
          <div className="flex-1 w-full max-w-4xl mx-auto animate-fade-in flex flex-col">
            <VibeHeatmap userProfile={userProfile} />
          </div>
        )}
      </div>
    </div>
  );
};