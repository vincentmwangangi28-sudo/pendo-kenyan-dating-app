import React, { useState } from 'react';
import { HangoutSpot } from '../types';
import { MapPin, Users, Music, ShoppingBag, Church, TreePalm, Sparkles, Loader2, MessageCircle, Copy, Check, Search, ExternalLink, Calendar } from 'lucide-react';
import { generateVenueVibe, findHangoutSpots, findRealtimeEvents } from '../services/geminiService';

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

export const HangoutSpots: React.FC<HangoutSpotsProps> = ({ venues: initialVenues, onCheckIn }) => {
  const [venues, setVenues] = useState<HangoutSpot[]>(initialVenues);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [analyzingVenue, setAnalyzingVenue] = useState<string | null>(null);
  const [venueVibes, setVenueVibes] = useState<Record<string, string>>({});
  const [copiedVibeId, setCopiedVibeId] = useState<string | null>(null);
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);

  const filteredVenues = activeCategory === 'ALL' 
    ? venues 
    : venues.filter(v => v.type === activeCategory);

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
          alert("Geolocation not supported.");
          return;
      }
      setIsSearchingMaps(true);
      navigator.geolocation.getCurrentPosition(async (pos) => {
          let newSpots: HangoutSpot[] = [];

          if (activeCategory === 'EVENT') {
              // Use Search Grounding for real-time events
              newSpots = await findRealtimeEvents(pos.coords.latitude, pos.coords.longitude);
          } else {
              // Construct specific query for Maps
              let query = "popular hangouts";
              switch (activeCategory) {
                  case 'PUB': query = "nightclubs, bars, and pubs"; break;
                  case 'MALL': query = "shopping malls"; break;
                  case 'CHURCH': query = "churches"; break;
                  case 'NATURE': query = "parks, forests, and nature trails"; break;
                  default: query = "popular hangouts and tourist attractions"; break;
              }
              newSpots = await findHangoutSpots(pos.coords.latitude, pos.coords.longitude, query);
              
              // Map correct type to results if we searched for a specific category
              if (activeCategory !== 'ALL' && newSpots.length > 0) {
                 newSpots = newSpots.map(s => ({ ...s, type: activeCategory as any }));
              }
          }
          
          if (newSpots.length > 0) {
              setVenues(prev => {
                  // Filter out duplicates based on name
                  const existingNames = new Set(prev.map(v => v.name.toLowerCase()));
                  const uniqueNewSpots = newSpots.filter(spot => !existingNames.has(spot.name.toLowerCase()));
                  return [...uniqueNewSpots, ...prev];
              });
          } else {
              alert(`No new ${activeCategory === 'ALL' ? 'spots' : activeCategory.toLowerCase()} found nearby.`);
          }
          setIsSearchingMaps(false);
      }, (err) => {
          console.error("Maps location error", err);
          alert("Couldn't get location. Please allow location access.");
          setIsSearchingMaps(false);
      }, {
          timeout: 30000,
          enableHighAccuracy: false,
          maximumAge: Infinity
      });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <MapPin className="text-rose-600" /> Hangout Spots
        </h2>
        <div className="flex justify-between items-center mb-4">
             <p className="text-xs text-slate-500">
               {activeCategory === 'EVENT' ? 'Real-time events near you.' : 'Discover popular places.'}
             </p>
             <button 
                onClick={handleDiscoverLocal}
                disabled={isSearchingMaps}
                className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
             >
                 {isSearchingMaps ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                 {activeCategory === 'EVENT' ? 'Find Events' : 'Discover Nearby'}
             </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.id 
                  ? 'bg-rose-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 no-scrollbar">
        {filteredVenues.map(venue => (
          <div 
            key={venue.id}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group relative"
          >
            <div className="h-32 relative overflow-hidden">
               <img 
                 src={venue.photoUrl} 
                 alt={venue.name} 
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
               
               <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                 <Users size={12} className="text-green-400" />
                 {venue.activeCount} active
               </div>

               {venue.trending && (
                 <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 animate-pulse">
                   <Sparkles size={12} /> Trending
                 </div>
               )}
               
               <div className="absolute bottom-3 left-3 right-3 text-white">
                 <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                     {venue.name}
                     {/* @ts-ignore */}
                     {venue.mapsUri && (
                         <a href={venue.mapsUri} target="_blank" rel="noreferrer" className="bg-white/20 p-1 rounded-full hover:bg-white/40" onClick={e => e.stopPropagation()}>
                             <ExternalLink size={12} />
                         </a>
                     )}
                 </h3>
                 <p className="text-xs opacity-80 flex items-center gap-1"><MapPin size={10} /> {venue.location}</p>
               </div>
            </div>

            <div className="p-4">
              {venueVibes[venue.id] ? (
                 <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-3 animate-fade-in">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase mb-2 flex items-center gap-1">
                      <Sparkles size={10} /> Gemini Vibe Check
                    </p>
                    <p className="text-sm text-indigo-900 leading-snug font-medium mb-3">{venueVibes[venue.id]}</p>
                    <button 
                      onClick={(e) => handleCopyVibe(e, venueVibes[venue.id], venue.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-colors"
                    >
                      {copiedVibeId === venue.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedVibeId === venue.id ? "Copied!" : "Copy to Chat"}
                    </button>
                 </div>
              ) : (
                <button 
                  onClick={(e) => handleGetVibe(e, venue)}
                  disabled={analyzingVenue === venue.id}
                  className="mb-3 text-xs font-medium text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  {analyzingVenue === venue.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Get AI Vibe Check
                </button>
              )}

              <button 
                onClick={() => onCheckIn(venue)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors active:scale-95"
              >
                <MessageCircle size={16} /> Check In & Join Chat
              </button>
            </div>
          </div>
        ))}
        
        {venues.length === 0 && !isSearchingMaps && (
             <div className="p-8 text-center text-slate-400">
                 <p>No spots found yet. Click 'Discover Nearby' to find places!</p>
             </div>
        )}
        
        <div className="p-4 text-center text-slate-400 text-xs">
           <p>Don't see your spot? <br/> More locations added weekly!</p>
        </div>
      </div>
    </div>
  );
};