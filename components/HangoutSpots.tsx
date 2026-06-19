import React, { useState } from 'react';
import { HangoutSpot } from '../types';
import { 
  MapPin, Users, Music, ShoppingBag, Church, TreePalm, Sparkles, 
  Loader2, MessageCircle, Copy, Check, Search, ExternalLink, Calendar, Info
} from 'lucide-react';
import { generateVenueVibe, findHangoutSpots, findRealtimeEvents } from '../services/geminiService';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface HangoutSpotsProps {
  venues: HangoutSpot[];
  onCheckIn: (venue: HangoutSpot) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All', icon: <MapPin size={16} /> },
  { id: 'PUB', label: 'Clubs & Pubs', icon: <Music size={16} /> },
  { id: 'MALL', label: 'Malls', icon: <ShoppingBag size={16} /> },
  { id: 'CHURCH', label: 'Churches', icon: <Church size={16} /> },
  { id: 'NATURE', label: 'Nature', icon: <TreePalm size={16} /> },
  { id: 'EVENT', label: 'Events', icon: <Calendar size={16} /> },
];

const CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'];

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Nairobi': { lat: -1.2921, lng: 36.8219 },
  'Mombasa': { lat: -4.0435, lng: 39.6682 },
  'Kisumu': { lat: -0.0917, lng: 34.7680 },
  'Nakuru': { lat: -0.3031, lng: 36.0800 },
  'Eldoret': { lat: 0.5143, lng: 35.2698 }
};

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export const HangoutSpots: React.FC<HangoutSpotsProps> = ({ venues: initialVenues, onCheckIn }) => {
  const [venues, setVenues] = useState<HangoutSpot[]>(initialVenues);
  const [selectedCity, setSelectedCity] = useState<string>('Nairobi');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [analyzingVenue, setAnalyzingVenue] = useState<string | null>(null);
  const [venueVibes, setVenueVibes] = useState<Record<string, string>>({});
  const [copiedVibeId, setCopiedVibeId] = useState<string | null>(null);
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Helper helper to filter correct county name
  const getCityOfVenue = (venue: HangoutSpot): string => {
    const loc = venue.location.toLowerCase();
    const name = venue.name.toLowerCase();
    if (loc.includes('mombasa') || name.includes('mombasa')) return 'Mombasa';
    if (loc.includes('kisumu') || name.includes('kisumu')) return 'Kisumu';
    if (loc.includes('nakuru') || name.includes('nakuru')) return 'Nakuru';
    if (loc.includes('eldoret') || name.includes('eldoret')) return 'Eldoret';
    return 'Nairobi';
  };

  // 1. Filter by current city
  const cityFilteredVenues = venues.filter(v => getCityOfVenue(v) === selectedCity);

  // 2. Filter by category
  const filteredVenues = activeCategory === 'ALL' 
    ? cityFilteredVenues 
    : cityFilteredVenues.filter(v => v.type === activeCategory);

  const handleGetVibe = async (e: React.MouseEvent, venue: HangoutSpot) => {
    e.stopPropagation();
    if (venueVibes[venue.id]) return;

    setAnalyzingVenue(venue.id);
    const vibe = await generateVenueVibe(venue.name, venue.type, venue.location);
    setVenueVibes(prev => ({ ...prev, [venue.id]: vibe }));
    setAnalyzingVenue(null);
  };

  const handleCopyVibe = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedVibeId(id);
    setTimeout(() => setCopiedVibeId(null), 2000);
  };
  
  const handleDiscoverLocal = () => {
      if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser.");
          return;
      }
      setIsSearchingMaps(true);
      navigator.geolocation.getCurrentPosition(async (pos) => {
          let newSpots: HangoutSpot[] = [];

          if (activeCategory === 'EVENT') {
              newSpots = await findRealtimeEvents(pos.coords.latitude, pos.coords.longitude);
          } else {
              let query = "popular hangouts";
              switch (activeCategory) {
                  case 'PUB': query = "nightclubs, bars, pubs, lounge"; break;
                  case 'MALL': query = "shopping malls, supermarkets"; break;
                  case 'CHURCH': query = "cathedral, churches"; break;
                  case 'NATURE': query = "parks, forests, garden, beach"; break;
                  default: query = "popular hangouts and tourist attractions"; break;
              }
              newSpots = await findHangoutSpots(pos.coords.latitude, pos.coords.longitude, query);
              
              if (activeCategory !== 'ALL' && newSpots.length > 0) {
                 newSpots = newSpots.map(s => ({ ...s, type: activeCategory as any }));
              }
          }
          
          if (newSpots.length > 0) {
              setVenues(prev => {
                  const existingNames = new Set(prev.map(v => v.name.toLowerCase()));
                  const uniqueNewSpots = newSpots.filter(spot => !existingNames.has(spot.name.toLowerCase()));
                  // Map brand new spots to current selected city if they were fetched just now
                  const mappedNewSpots = uniqueNewSpots.map(spot => ({
                    ...spot,
                    location: `${spot.location}, ${selectedCity}`
                  }));
                  return [...mappedNewSpots, ...prev];
              });
          } else {
              // Custom inline warning
              setVenueVibes(p => ({ ...p, 'loc-warn': `We didn't find any direct new ${activeCategory === 'ALL' ? 'spots' : activeCategory.toLowerCase()} markers near this coordinate radius. Double check your browser filters!` }));
              setTimeout(() => {
                setVenueVibes(p => {
                  const copy = { ...p };
                  delete copy['loc-warn'];
                  return copy;
                });
              }, 4000);
          }
          setIsSearchingMaps(false);
      }, (err) => {
          console.error("Maps location error", err);
          setIsSearchingMaps(false);
      }, {
          timeout: 20000,
          enableHighAccuracy: false,
          maximumAge: Infinity
      });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50" id="hangout-spots-root">
      {/* Sticky Header Selector */}
      <div className="bg-white p-4 shadow-xs sticky top-0 z-20 border-b border-rose-50" id="hangout-spots-header">
        <h2 className="text-xl font-extrabold text-slate-800 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 leading-none">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping shrink-0"></span>
            Hangout Spots
          </span>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            GPS Verified
          </span>
        </h2>
        
        {/* Dynamic Location Picker in 5 Kenyan Counties */}
        <div className="flex items-center gap-2 mt-3 mb-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Region:</label>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {CITIES.map(city => (
              <button
                key={city}
                onClick={() => {
                  setSelectedCity(city);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCity === city
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mb-3">
          <p className="text-[11px] text-slate-400 font-bold leading-normal">
            {activeCategory === 'EVENT' ? 'Real-time ground events.' : `Currently displaying spots in ${selectedCity} county.`}
          </p>
          <button 
            onClick={handleDiscoverLocal}
            disabled={isSearchingMaps}
            className="bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-indigo-100 transition shadow-xs cursor-pointer"
          >
            {isSearchingMaps ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : <Search size={12} />}
            {activeCategory === 'EVENT' ? 'Find Events' : 'Scan Nearby GPS'}
          </button>
        </div>
        
        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                activeCategory === cat.id 
                  ? 'bg-rose-600 border-rose-600 text-white shadow-sm' 
                  : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Map Block */}
      <div className="p-4 bg-slate-50 border-b border-slate-100" id="google-map-panel">
        {hasValidKey ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              <span>Interactive Google Map View ({selectedCity})</span>
              <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">● Live</span>
            </div>
            <div className="w-full h-56 bg-slate-100 rounded-[24px] overflow-hidden shadow-inner relative border border-slate-200" style={{ minHeight: '224px' }}>
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  center={CITY_COORDINATES[selectedCity]}
                  zoom={12}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  {filteredVenues.map(spot => {
                    const lat = spot.coordinates?.latitude ?? CITY_COORDINATES[selectedCity].lat;
                    const lng = spot.coordinates?.longitude ?? CITY_COORDINATES[selectedCity].lng;
                    return (
                      <AdvancedMarker 
                        key={spot.id} 
                        position={{ lat, lng }} 
                        title={spot.name}
                        onClick={() => {
                          const elem = document.getElementById(`venue-card-${spot.id}`);
                          if (elem) {
                            elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                      >
                        <Pin 
                          background={spot.trending ? "#ea580c" : "#e11d48"} 
                          borderColor="#fff" 
                          glyphColor="#fff" 
                        />
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-dashed border-indigo-200 rounded-[24px] p-5 text-center shadow-xs space-y-4">
            <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <MapPin className="text-indigo-600 animate-pulse" size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest leading-none">Activate Google Map Stream</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto font-medium">
                Unlock high-fidelity Live Maps pinning all Mombasa, Nairobi, and Kisumu hangouts in real-time.
              </p>
            </div>

            {showConfigHelp ? (
              <div className="bg-white p-3.5 rounded-2xl text-left border border-indigo-100 space-y-2 animate-fade-in">
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">Real-time setup tutorial:</p>
                <div className="space-y-1.5 text-[11px] text-slate-600 font-semibold leading-relaxed">
                  <div className="flex gap-1.5">
                    <span className="text-indigo-600 bg-indigo-50 w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 font-extrabold text-[9px]">1</span>
                    <span>Get an API Key from Google Maps.</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-indigo-600 bg-indigo-50 w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 font-extrabold text-[9px]">2</span>
                    <span>Click <strong>Settings</strong> (⚙️ gear icon, top-right).</span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-indigo-600 bg-indigo-50 w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 font-extrabold text-[9px]">3</span>
                    <span>Select <strong>Secrets</strong>, add <code>GOOGLE_MAPS_PLATFORM_KEY</code> as key, and paste your API key.</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfigHelp(false)}
                  className="w-full bg-slate-100 text-slate-600 font-bold text-[10px] py-1.5 rounded-xl text-center"
                >
                  Hide Steps
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowConfigHelp(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Info size={12} />
                Map Setup Instructions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Venues Render List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 no-scrollbar">
        
        {/* Dynamic Warning notification */}
        {venueVibes['loc-warn'] && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-850 font-bold leading-relaxed mb-1 animate-fade-in">
            {venueVibes['loc-warn']}
          </div>
        )}

        {filteredVenues.map(venue => (
          <div 
            id={`venue-card-${venue.id}`}
            key={venue.id}
            className="bg-white rounded-[24px] overflow-hidden shadow-xs border border-slate-100 group relative transition-transform duration-300 hover:scale-[1.01]"
          >
            <div className="h-32 relative overflow-hidden">
               <img 
                 src={venue.photoUrl} 
                 alt={venue.name} 
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent"></div>
               
               <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                 <Users size={12} className="text-green-400" />
                 {venue.activeCount} active dating now
               </div>

               {venue.trending && (
                 <div className="absolute top-3 left-3 bg-rose-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse">
                   <Sparkles size={11} fill="currentColor" /> Trending Spot
                 </div>
               )}
               
               <div className="absolute bottom-3 left-3 right-3 text-white">
                 <h3 className="font-extrabold text-base leading-tight flex items-center gap-1.5">
                     {venue.name}
                     {venue.mapsUri && (
                         <a href={venue.mapsUri} target="_blank" rel="noreferrer" className="bg-white/20 p-1 rounded-full hover:bg-white/40 inline-flex transition" onClick={e => e.stopPropagation()}>
                             <ExternalLink size={11} />
                         </a>
                     )}
                 </h3>
                 <p className="text-[11px] opacity-90 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {venue.location}</p>
               </div>
            </div>

            <div className="p-4 space-y-3">
              {venueVibes[venue.id] ? (
                 <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-2xl animate-fade-in space-y-2">
                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} fill="currentColor" /> Gemini Vibe Check
                    </p>
                    <p className="text-xs text-indigo-950 leading-relaxed font-semibold">{venueVibes[venue.id]}</p>
                    <button 
                      onClick={(e) => handleCopyVibe(e, venueVibes[venue.id], venue.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-white border border-indigo-100 rounded-xl text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition"
                    >
                      {copiedVibeId === venue.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      {copiedVibeId === venue.id ? "Vibe copied!" : "Copy to Chat"}
                    </button>
                 </div>
              ) : (
                <button 
                  onClick={(e) => handleGetVibe(e, venue)}
                  disabled={analyzingVenue === venue.id}
                  className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline outline-none cursor-pointer"
                >
                  {analyzingVenue === venue.id ? <Loader2 size={12} className="animate-spin text-indigo-600" /> : <Sparkles size={12} />}
                  Check Vibes & Dress Code with Gemini AI
                </button>
              )}

              <button 
                onClick={() => onCheckIn(venue)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition active:scale-98 cursor-pointer"
              >
                <MessageCircle size={15} /> Check In & Join Local Dating Chat
              </button>
            </div>
          </div>
        ))}
        
        {filteredVenues.length === 0 && !isSearchingMaps && (
             <div className="p-10 text-center bg-white border border-slate-100 rounded-[24px] text-slate-400 space-y-2">
                 <p className="font-bold text-xs">No local {activeCategory === 'ALL' ? 'spots' : activeCategory.toLowerCase()} markers found in {selectedCity}.</p>
                 <p className="text-[10px] leading-relaxed">Try looking for alternative category filters above or clicking 'Scan Nearby GPS'!</p>
             </div>
        )}
        
        <div className="p-4 text-center text-slate-400 text-[11px] font-bold">
           <p>Don't see your favorite spot? <br/> More verified markers added weekly!</p>
        </div>
      </div>
    </div>
  );
};
