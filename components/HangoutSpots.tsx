import React, { useState } from 'react';
import { HangoutSpot } from '../types';
import { 
  MapPin, Users, Music, ShoppingBag, Church, TreePalm, Sparkles, 
  Loader2, MessageCircle, Copy, Check, Search, ExternalLink, Calendar, Info
} from 'lucide-react';
import { generateVenueVibe, findHangoutSpots, findRealtimeEvents, geocodeCity } from '../services/geminiService';
import { safeCopyToClipboard } from '../services/compat';
import { Map as PigeonMap, Overlay } from 'pigeon-maps';

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

const DEFAULT_CITIES = ['Nairobi', 'Mombasa', 'Kampala', 'Dar es Salaam', 'Kigali', 'Kisumu', 'Nakuru', 'Eldoret', 'Johannesburg', 'London', 'Tokyo', 'New York'];

const DEFAULT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Nairobi': { lat: -1.2921, lng: 36.8219 },
  'Mombasa': { lat: -4.0435, lng: 39.6682 },
  'Kampala': { lat: 0.3476, lng: 32.5825 },
  'Dar es Salaam': { lat: -6.7924, lng: 39.2083 },
  'Kigali': { lat: -1.9441, lng: 30.0619 },
  'Kisumu': { lat: -0.0917, lng: 34.7680 },
  'Nakuru': { lat: -0.3031, lng: 36.0800 },
  'Eldoret': { lat: 0.5143, lng: 35.2698 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Johannesburg': { lat: -26.2041, lng: 28.0473 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 }
};

export const HangoutSpots: React.FC<HangoutSpotsProps> = ({ venues: initialVenues, onCheckIn }) => {
  const [venues, setVenues] = useState<HangoutSpot[]>(initialVenues);
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
  const [cityCoordinates, setCityCoordinates] = useState<Record<string, { lat: number; lng: number }>>(DEFAULT_COORDINATES);
  const [selectedCity, setSelectedCity] = useState<string>('Nairobi');
  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [searchCityError, setSearchCityError] = useState<string | null>(null);
  
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [analyzingVenue, setAnalyzingVenue] = useState<string | null>(null);
  const [venueVibes, setVenueVibes] = useState<Record<string, string>>({});
  const [copiedVibeId, setCopiedVibeId] = useState<string | null>(null);
  const [isSearchingMaps, setIsSearchingMaps] = useState(false);

  // Dynamic geocoder to add global hub locations
  const handleAddGlobalCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchCityQuery.trim();
    if (!queryStr) return;

    setIsSearchingCity(true);
    setSearchCityError(null);

    try {
      const res = await geocodeCity(queryStr);
      if (res) {
        // Update states
        setCityCoordinates(prev => ({
          ...prev,
          [res.name]: { lat: res.lat, lng: res.lng }
        }));

        if (!cities.includes(res.name)) {
          setCities(prev => [...prev, res.name]);
        }

        setSelectedCity(res.name);
        setSearchCityQuery('');

        // Fetch spot recommendations inside our newly added location on the fly
        setIsSearchingMaps(true);
        const searchKeywords = "popular nightclubs, nice bars, trendy lounges, shopping malls, scenic parks";
        const newSpots = await findHangoutSpots(res.lat, res.lng, searchKeywords);
        
        if (newSpots && newSpots.length > 0) {
          const mappedNewSpots = newSpots.map((spot, idx) => ({
            ...spot,
            id: `global_${res.name}_${idx}_${Date.now()}`,
            location: spot.location === 'View on Map' ? res.name : `${spot.location}, ${res.name}`,
            city: res.name
          }));

          setVenues(prev => {
            const existingNames = new Set(prev.map(v => v.name.toLowerCase()));
            const uniqueNew = mappedNewSpots.filter(spot => !existingNames.has(spot.name.toLowerCase()));
            return [...uniqueNew, ...prev];
          });
        }
      } else {
        setSearchCityError("Could not locate city. Check spelling!");
      }
    } catch (err) {
      console.error("Geocoding action failed", err);
      setSearchCityError("Error finding city details. Try again!");
    } finally {
      setIsSearchingCity(false);
      setIsSearchingMaps(false);
    }
  };

  // Helper helper to filter correct county or global city name
  const getCityOfVenue = (venue: HangoutSpot): string => {
    if ((venue as any).city) {
      return (venue as any).city;
    }
    const loc = venue.location.toLowerCase();
    const name = venue.name.toLowerCase();

    for (const city of cities) {
      const cityLower = city.toLowerCase();
      if (loc.includes(cityLower) || name.includes(cityLower)) {
        return city;
      }
    }
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
    safeCopyToClipboard(text);
    setCopiedVibeId(id);
    setTimeout(() => setCopiedVibeId(null), 2000);
  };
  
  const handleDiscoverLocal = () => {
      const activeCoords = cityCoordinates[selectedCity] || DEFAULT_COORDINATES['Nairobi'];
      setIsSearchingMaps(true);
      
      const fetchSpots = async (latitude: number, longitude: number) => {
          let newSpots: HangoutSpot[] = [];

          if (activeCategory === 'EVENT') {
              newSpots = await findRealtimeEvents(latitude, longitude);
          } else {
              let query = "popular hangouts";
              switch (activeCategory) {
                  case 'PUB': query = "nightclubs, bars, pubs, lounge"; break;
                  case 'MALL': query = "shopping malls, supermarkets"; break;
                  case 'CHURCH': query = "cathedral, churches"; break;
                  case 'NATURE': query = "parks, forests, garden, beach"; break;
                  default: query = "popular hangouts and tourist attractions"; break;
              }
              newSpots = await findHangoutSpots(latitude, longitude, query);
              
              if (activeCategory !== 'ALL' && newSpots.length > 0) {
                 newSpots = newSpots.map(s => ({ ...s, type: activeCategory as any }));
              }
          }
          
          if (newSpots.length > 0) {
              setVenues(prev => {
                  const existingNames = new Set(prev.map(v => v.name.toLowerCase()));
                  const uniqueNewSpots = newSpots.filter(spot => !existingNames.has(spot.name.toLowerCase()));
                  const mappedNewSpots = uniqueNewSpots.map(spot => ({
                    ...spot,
                    location: spot.location === 'View on Map' ? selectedCity : `${spot.location}, ${selectedCity}`,
                    city: selectedCity
                  }));
                  return [...mappedNewSpots, ...prev];
              });
          } else {
              setVenueVibes(p => ({ ...p, 'loc-warn': `No new ${activeCategory === 'ALL' ? 'spots' : activeCategory.toLowerCase()} markers near this zoom radius.` }));
              setTimeout(() => {
                setVenueVibes(p => {
                  const copy = { ...p };
                  delete copy['loc-warn'];
                  return copy;
                });
              }, 4000);
          }
          setIsSearchingMaps(false);
      };

      // Try browser GPS first if selectedCity is the user's immediate vicinity, or directly query current selectedCity coords which is much cleaner!
      if (typeof navigator !== 'undefined' && navigator.geolocation && (selectedCity === 'Nairobi' || selectedCity === 'Mombasa')) {
          navigator.geolocation.getCurrentPosition(
              (pos) => {
                  fetchSpots(pos.coords.latitude, pos.coords.longitude);
              },
              (err) => {
                  console.warn("Using preset coordinates instead of GPS", err);
                  fetchSpots(activeCoords.lat, activeCoords.lng);
              },
              { timeout: 7000 }
          );
      } else {
          fetchSpots(activeCoords.lat, activeCoords.lng);
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50" id="hangout-spots-root">
      {/* Sticky Header Selector */}
      <div className="bg-white p-4 shadow-xs sticky top-0 z-20 border-b border-rose-50" id="hangout-spots-header">
        <h2 className="text-xl font-extrabold text-slate-800 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 leading-none">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping shrink-0"></span>
            Global Hangouts
          </span>
          <span className="text-[10px] bg-rose-50 text-rose-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Everywhere Mode 🌍
          </span>
        </h2>
        
        {/* Search Bar for Any Global City */}
        <form onSubmit={handleAddGlobalCity} className="mt-2.5 mb-2.5 flex gap-1.5">
          <div className="relative flex-1">
            <input 
              type="text" 
              value={searchCityQuery}
              onChange={(e) => setSearchCityQuery(e.target.value)}
              placeholder="🔍 Search & Add any global city..."
              className="w-full text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white pl-3 pr-8 py-2 border border-slate-200 rounded-xl focus:border-rose-400 focus:ring-1 focus:ring-rose-400 outline-none transition text-slate-850 font-semibold"
              disabled={isSearchingCity}
            />
            {isSearchingCity && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                <Loader2 size={13} className="animate-spin text-rose-500" />
              </div>
            )}
          </div>
          <button 
            type="submit"
            disabled={isSearchingCity || !searchCityQuery.trim()}
            className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-xl transition duration-150 cursor-pointer text-center whitespace-nowrap shrink-0 flex items-center justify-center gap-1"
          >
            Add City
          </button>
        </form>
        {searchCityError && (
          <p className="text-[10px] text-rose-500 font-bold px-1 mb-2.5 animate-fade-in">{searchCityError}</p>
        )}

        {/* Dynamic Location Picker in 5 Kenyan Counties */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Active:</label>
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {cities.map(city => (
              <button
                key={city}
                onClick={() => {
                  setSelectedCity(city);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCity === city
                    ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
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
            {activeCategory === 'EVENT' ? 'Real-time ground events.' : `Currently displaying spots in ${selectedCity}.`}
          </p>
          <button 
            onClick={handleDiscoverLocal}
            disabled={isSearchingMaps}
            className="bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-rose-100 transition shadow-xs cursor-pointer"
          >
            {isSearchingMaps ? <Loader2 size={12} className="animate-spin text-rose-600" /> : <Search size={12} />}
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
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            <span>Free Pigeon Map View ({selectedCity})</span>
            <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">● Active (No API Key Required)</span>
          </div>
          <div className="w-full h-56 bg-slate-100 rounded-[24px] overflow-hidden shadow-inner relative border border-slate-200 z-10" style={{ minHeight: '224px' }}>
            <PigeonMap 
              center={[cityCoordinates[selectedCity]?.lat ?? DEFAULT_COORDINATES['Nairobi'].lat, cityCoordinates[selectedCity]?.lng ?? DEFAULT_COORDINATES['Nairobi'].lng]} 
              zoom={12}
            >
              {filteredVenues.map(spot => {
                const lat = spot.coordinates?.latitude ?? (cityCoordinates[selectedCity]?.lat ?? DEFAULT_COORDINATES['Nairobi'].lat);
                const lng = spot.coordinates?.longitude ?? (cityCoordinates[selectedCity]?.lng ?? DEFAULT_COORDINATES['Nairobi'].lng);
                return (
                  <Overlay key={spot.id} anchor={[lat, lng]} offset={[14, 28]}>
                    <div 
                      className="relative group cursor-pointer" 
                      onClick={() => {
                        const elem = document.getElementById(`venue-card-${spot.id}`);
                        if (elem) {
                          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white border-2 border-white shadow-md ${spot.trending ? 'bg-amber-600 animate-pulse' : 'bg-rose-600 hover:bg-rose-700'}`}>
                        <MapPin size={14} className="text-white" />
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-white/95 backdrop-blur-xs border border-slate-150 px-2 py-0.5 rounded shadow-lg text-[9px] font-extrabold text-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                        {spot.name}
                      </div>
                    </div>
                  </Overlay>
                );
              })}
            </PigeonMap>
          </div>
        </div>
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
