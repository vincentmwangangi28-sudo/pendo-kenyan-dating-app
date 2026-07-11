import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, Flame, Clock, Sparkles, Navigation, Info, Compass, HelpCircle, ChevronRight, Activity } from 'lucide-react';
import { UserProfile } from '../types';

interface VibeHeatmapProps {
  userProfile: UserProfile;
}

interface HotspotData {
  id: string;
  name: string;
  city: string;
  area: string;
  latOffset: number; // For plotting relative to city center (-100 to 100)
  lngOffset: number; // For plotting relative to city center (-100 to 100)
  baseActiveCount: number;
  interests: string[];
  vibeType: 'chill' | 'sherehe' | 'foodie' | 'outdoor' | 'cultural';
  popularTime: 'morning' | 'afternoon' | 'evening' | 'night';
  description: string;
}

const CITY_CENTERS = [
  { id: 'nairobi', name: 'Nairobi 🏙️', desc: 'The heartbeat of Sherehe and corporate romance' },
  { id: 'mombasa', name: 'Mombasa 🏖️', desc: 'Chill beachside connections and coastal romance' },
  { id: 'kisumu', name: 'Kisumu 🌅', desc: 'Sunset lakeside dates and serene premium vibes' },
  { id: 'nakuru', name: 'Nakuru 🏔️', desc: 'Great rift exploration and young energetic crowds' }
];

const HOTSPOT_DATASET: HotspotData[] = [
  // --- Nairobi Hotspots ---
  {
    id: 'nbo-westlands',
    name: 'The Alchemist Bar & Mercado',
    city: 'nairobi',
    area: 'Westlands',
    latOffset: 25,
    lngOffset: -30,
    baseActiveCount: 412,
    interests: ['Nightlife', 'Cocktails', 'Live Music', 'Dancing'],
    vibeType: 'sherehe',
    popularTime: 'night',
    description: 'Nairobi\'s prime entertainment block. Swarming with urban singles, art curators, and high-tempo weekend sherehe.'
  },
  {
    id: 'nbo-roysambu',
    name: 'Thika Road Mall & Java',
    city: 'nairobi',
    area: 'Roysambu',
    latOffset: -65,
    lngOffset: 60,
    baseActiveCount: 385,
    interests: ['Chill', 'Movie Night', 'Gaming', 'Fast Food'],
    vibeType: 'chill',
    popularTime: 'evening',
    description: 'Thriving student and young professional hub. High concentration of midnight active swipers and local coffee dates.'
  },
  {
    id: 'nbo-kilimani',
    name: 'CJ\'s Restaurant & Yaya Center',
    city: 'nairobi',
    area: 'Kilimani',
    latOffset: 5,
    lngOffset: -45,
    baseActiveCount: 298,
    interests: ['Fine Dining', 'Coffee', 'Travel', 'Networking'],
    vibeType: 'foodie',
    popularTime: 'afternoon',
    description: 'Affluent corporate elite hotspot. Famous for brunch dates, casual meetings, and high-integrity matching profiles.'
  },
  {
    id: 'nbo-langata',
    name: 'Brew Bistro & Galleria Mall',
    city: 'nairobi',
    area: 'Langata / Karen',
    latOffset: 50,
    lngOffset: 20,
    baseActiveCount: 245,
    interests: ['Outdoors', 'Road Trips', 'Craft Beer', 'Photography'],
    vibeType: 'outdoor',
    popularTime: 'evening',
    description: 'Scenic weekend meetup sites. Populated by weekend adventurers, scenic sunset lovers, and premium brunch groups.'
  },
  {
    id: 'nbo-cbd',
    name: 'IMAX Cinema & Kencom block',
    city: 'nairobi',
    area: 'CBD Town',
    latOffset: -10,
    lngOffset: 5,
    baseActiveCount: 310,
    interests: ['Movies', 'Networking', 'Street Food', 'Quick Chats'],
    vibeType: 'cultural',
    popularTime: 'afternoon',
    description: 'High traffic urban central point. Best for quick lunch-hour dates, movies, and central transit match check-ins.'
  },
  {
    id: 'nbo-ngong',
    name: 'The Junction Mall & Brew',
    city: 'nairobi',
    area: 'Ngong Road',
    latOffset: 40,
    lngOffset: -60,
    baseActiveCount: 195,
    interests: ['Tech', 'Fitness', 'Brunch', 'Crypto'],
    vibeType: 'chill',
    popularTime: 'morning',
    description: 'Co-working hub and tech-savvy crowd. Perfect for modern coffee shop chats and morning yoga-vibe profiles.'
  },

  // --- Mombasa Hotspots ---
  {
    id: 'mba-nyali',
    name: 'Nyali Centre & Tapas Bar',
    city: 'mombasa',
    area: 'Nyali Beachfront',
    latOffset: -30,
    lngOffset: 40,
    baseActiveCount: 280,
    interests: ['Beach Walks', 'Seafood', 'Sunsets', 'Wine Tasting'],
    vibeType: 'foodie',
    popularTime: 'evening',
    description: 'Upmarket coastal playground. Beachfront dining paired with sunset cocktails and relaxing coastal romance.'
  },
  {
    id: 'mba-bamburi',
    name: 'Bamburi Beach & Sheba Lounge',
    city: 'mombasa',
    area: 'Bamburi',
    latOffset: -60,
    lngOffset: 65,
    baseActiveCount: 320,
    interests: ['Swimming', 'Reggae', 'Nightlife', 'Seafood'],
    vibeType: 'sherehe',
    popularTime: 'night',
    description: 'High-energy seaside strip. Renowned for tropical beach parties, sand dancing, and weekend holiday-maker swipes.'
  },
  {
    id: 'mba-town',
    name: 'Fort Jesus & Mombasa Old Town',
    city: 'mombasa',
    area: 'Mombasa Town',
    latOffset: 20,
    lngOffset: -20,
    baseActiveCount: 150,
    interests: ['History', 'Culture', 'Photography', 'Local Coffee'],
    vibeType: 'cultural',
    popularTime: 'afternoon',
    description: 'Rich historical settings and spice-filled lanes. Beloved by local explorers, photographers, and coffee connoisseurs.'
  },

  // --- Kisumu Hotspots ---
  {
    id: 'kis-dunga',
    name: 'Dunga Hill Camp Sunset Point',
    city: 'kisumu',
    area: 'Lake Victoria Edge',
    latOffset: 30,
    lngOffset: -40,
    baseActiveCount: 220,
    interests: ['Sunsets', 'Fish Eating', 'Live Acoustic', 'Outdoors'],
    vibeType: 'outdoor',
    popularTime: 'evening',
    description: 'The ultimate lakeside sunset chillout spot. Perfect for sharing fresh lake fish, listening to guitarists, and cozy chats.'
  },
  {
    id: 'kis-milimani',
    name: 'Nyanza Club & Sovereign Hotel',
    city: 'kisumu',
    area: 'Milimani Estate',
    latOffset: -20,
    lngOffset: 10,
    baseActiveCount: 135,
    interests: ['Fine Dining', 'Swimming', 'Cocktails', 'Jazz'],
    vibeType: 'foodie',
    popularTime: 'night',
    description: 'Serene executive enclave. Attracts upscale local professionals, quiet evening jazz lovers, and high-quality profiles.'
  },

  // --- Nakuru Hotspots ---
  {
    id: 'nak-sarova',
    name: 'Sarova Woodlands & Crater View',
    city: 'nakuru',
    area: 'Milimani Nakuru',
    latOffset: -10,
    lngOffset: -30,
    baseActiveCount: 160,
    interests: ['Wine Tasting', 'Fine Dining', 'Nature Walks', 'High-Life'],
    vibeType: 'foodie',
    popularTime: 'afternoon',
    description: 'Exclusive gateway to Nakuru\'s pristine hills. Popular for quiet country lunches and elite weekend romance.'
  },
  {
    id: 'nak-town',
    name: 'Westside Mall & Chill Spots',
    city: 'nakuru',
    area: 'Nakuru CBD',
    latOffset: 20,
    lngOffset: 40,
    baseActiveCount: 190,
    interests: ['Shopping', 'Street Food', 'Gaming', 'Socializing'],
    vibeType: 'chill',
    popularTime: 'evening',
    description: 'Central youth gathering point. Vibrant hub of college students, weekend road-trippers, and lively local swiping.'
  }
];

export const VibeHeatmap: React.FC<VibeHeatmapProps> = ({ userProfile }) => {
  const [selectedCity, setSelectedCity] = useState<string>('nairobi');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('evening');
  const [vibeFilter, setVibeFilter] = useState<string>('all');
  const [hoveredSpot, setHoveredSpot] = useState<HotspotData | null>(null);
  const [userCheckedIn, setUserCheckedIn] = useState<boolean>(false);
  const [localBoostAmount, setLocalBoostAmount] = useState<number>(0);
  const [liveActivityLog, setLiveActivityLog] = useState<string[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time multipliers to dynamically shift density values depending on Sherehe / Morning hours
  const TIME_MULTIPLIERS = {
    morning: { chill: 1.1, sherehe: 0.1, foodie: 0.7, outdoor: 1.3, cultural: 0.5 },
    afternoon: { chill: 0.8, sherehe: 0.3, foodie: 1.4, outdoor: 0.9, cultural: 1.2 },
    evening: { chill: 1.3, sherehe: 1.2, foodie: 1.3, outdoor: 1.4, cultural: 0.8 },
    night: { chill: 0.6, sherehe: 1.9, foodie: 0.8, outdoor: 0.1, cultural: 0.3 }
  };

  // Generate mock user matching events live in the ticker
  useEffect(() => {
    const areas = {
      nairobi: ['Westlands', 'Roysambu', 'Kilimani', 'Langata', 'Ngong Road', 'CBD'],
      mombasa: ['Nyali Beachfront', 'Bamburi Beach', 'Mombasa Town'],
      kisumu: ['Lake Victoria Edge', 'Milimani Estate'],
      nakuru: ['Milimani Nakuru', 'Nakuru CBD']
    };

    const phrases = [
      "New match formed! 💖",
      "Swiping speed surge! ⚡",
      "Pendo voice session launched! 🎙️",
      "Date covenant signed by two lovers! 📜",
      "Double spark activated! ✨",
      "High activity detected! 🔥"
    ];

    const interval = setInterval(() => {
      const cityList = Object.keys(areas) as Array<keyof typeof areas>;
      const randCity = cityList[Math.floor(Math.random() * cityList.length)];
      const randAreaList = areas[randCity];
      const randArea = randAreaList[Math.floor(Math.random() * randAreaList.length)];
      const randPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const logMsg = `[${timeStr}] ${randArea} (${randCity.toUpperCase()}): ${randPhrase}`;

      setLiveActivityLog(prev => [logMsg, ...prev.slice(0, 4)]);
    }, 5000);

    // Initial logs
    setLiveActivityLog([
      `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Westlands (NAIROBI): Live swipe density peaks! 📈`,
      `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Nyali (MOMBASA): Beach picnic planning surge! 🏖️`,
      `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Dunga Hill (KISUMU): Active sunset chat counts rising. 🌅`
    ]);

    return () => clearInterval(interval);
  }, []);

  // Filter and calculate hotspot coordinates and dynamic density
  const calculatedHotspots = useMemo(() => {
    const citySpots = HOTSPOT_DATASET.filter(spot => spot.city === selectedCity);
    
    return citySpots.map(spot => {
      // Apply filters
      const isFilteredOut = vibeFilter !== 'all' && spot.vibeType !== vibeFilter;
      
      // Calculate active count based on current time multiplier
      const multipliers = TIME_MULTIPLIERS[timeOfDay];
      const multiplier = multipliers[spot.vibeType] || 1.0;
      let activeCount = Math.round(spot.baseActiveCount * multiplier);

      // Apply checkout / local boost if matching spot
      if (userCheckedIn && spot.id === 'nbo-westlands' && selectedCity === 'nairobi') {
        activeCount += 45 + localBoostAmount;
      } else if (userCheckedIn && spot.id === 'mba-nyali' && selectedCity === 'mombasa') {
        activeCount += 35 + localBoostAmount;
      } else if (userCheckedIn && spot.id === 'kis-dunga' && selectedCity === 'kisumu') {
        activeCount += 25 + localBoostAmount;
      } else if (userCheckedIn && spot.id === 'nak-town' && selectedCity === 'nakuru') {
        activeCount += 20 + localBoostAmount;
      }

      return {
        ...spot,
        activeCount,
        isFilteredOut
      };
    });
  }, [selectedCity, timeOfDay, vibeFilter, userCheckedIn, localBoostAmount]);

  // Main D3 Drawing Engine
  useEffect(() => {
    if (!svgRef.current) return;

    // Set responsive dimensions
    const width = 500;
    const height = 380;

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', '100%');

    // Clear previous drawing elements
    svg.selectAll('*').remove();

    // Create defs for grid background and beautiful radial gradient glowing spheres
    const defs = svg.append('defs');

    // Grid pattern for futuristic neon-dating radar aesthetic
    const gridPattern = defs.append('pattern')
      .attr('id', 'map-grid')
      .attr('width', 20)
      .attr('height', 20)
      .attr('patternUnits', 'userSpaceOnUse');

    gridPattern.append('path')
      .attr('d', 'M 20 0 L 0 0 0 20')
      .attr('fill', 'none')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', '0.5')
      .attr('stroke-opacity', '0.4');

    // Create unique radial gradients for vibes
    const vibeGradients = [
      { id: 'grad-sherehe', color: '#f43f5e' }, // Pink-red
      { id: 'grad-chill', color: '#a855f7' },   // Purple
      { id: 'grad-foodie', color: '#f59e0b' },  // Sunset Amber
      { id: 'grad-outdoor', color: '#10b981' }, // Sea Green
      { id: 'grad-cultural', color: '#3b82f6' } // Electric Blue
    ];

    vibeGradients.forEach(g => {
      const radialGrad = defs.append('radialGradient')
        .attr('id', g.id)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%');

      radialGrad.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', g.color)
        .attr('stop-opacity', '0.75');

      radialGrad.append('stop')
        .attr('offset', '40%')
        .attr('stop-color', g.color)
        .attr('stop-opacity', '0.35');

      radialGrad.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', g.color)
        .attr('stop-opacity', '0');
    });

    // Outer glow blur filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow-blur')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'blur');

    // Draw background grid layer
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#map-grid)')
      .attr('rx', 20);

    // Draw coordinate axis concentric rings
    const centers = { x: width / 2, y: height / 2 };
    const rings = [60, 120, 180, 240];

    rings.forEach(radius => {
      svg.append('circle')
        .attr('cx', centers.x)
        .attr('cy', centers.y)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', '1')
        .attr('stroke-dasharray', '3 3')
        .attr('stroke-opacity', '0.6');
    });

    // Draw Crosshair lines
    svg.append('line')
      .attr('x1', 20)
      .attr('y1', centers.y)
      .attr('x2', width - 20)
      .attr('y2', centers.y)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', '0.5')
      .attr('stroke-opacity', '0.5');

    svg.append('line')
      .attr('x1', centers.x)
      .attr('y1', 20)
      .attr('x2', centers.x)
      .attr('y2', height - 20)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', '0.5')
      .attr('stroke-opacity', '0.5');

    // Scale mapping offsets to visual positions on svg canvas
    const xScale = d3.scaleLinear()
      .domain([-100, 100])
      .range([50, width - 50]);

    const yScale = d3.scaleLinear()
      .domain([-100, 100])
      .range([height - 50, 50]);

    // Density Scale for glow bubble sizes (representing user count)
    const densityScale = d3.scaleSqrt()
      .domain([0, 500])
      .range([10, 75]);

    // Draw user location marker center reference (home indicator)
    svg.append('circle')
      .attr('cx', centers.x)
      .attr('cy', centers.y)
      .attr('r', 6)
      .attr('fill', '#e11d48')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('class', 'user-center-pulse');

    svg.append('circle')
      .attr('cx', centers.x)
      .attr('cy', centers.y)
      .attr('r', 24)
      .attr('fill', 'none')
      .attr('stroke', '#e11d48')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5)
      .attr('class', 'ping-ring')
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', '6;30')
      .attr('dur', '3s')
      .attr('repeatCount', 'indefinite');

    // Plot Glow Heatmap overlays
    const heatmapGroup = svg.append('g').attr('id', 'heatmap-overlay-group');

    calculatedHotspots.forEach(spot => {
      if (spot.isFilteredOut) return;

      const spotX = xScale(spot.lngOffset);
      const spotY = yScale(spot.latOffset);
      const heatRadius = densityScale(spot.activeCount);
      const gradientId = `grad-${spot.vibeType}`;

      // Heat glow circle with SVG gradient
      heatmapGroup.append('circle')
        .attr('cx', spotX)
        .attr('cy', spotY)
        .attr('r', heatRadius)
        .attr('fill', `url(#${gradientId})`)
        .attr('filter', 'url(#glow-blur)')
        .attr('class', 'heat-blob')
        .style('pointer-events', 'none')
        .style('mix-blend-mode', 'multiply');
    });

    // Plot Hotspot Node Markers on top of the heatmap glows
    const nodesGroup = svg.append('g').attr('id', 'nodes-group');

    calculatedHotspots.forEach(spot => {
      const spotX = xScale(spot.lngOffset);
      const spotY = yScale(spot.latOffset);
      const baseColor = 
        spot.vibeType === 'sherehe' ? '#f43f5e' :
        spot.vibeType === 'chill' ? '#a855f7' :
        spot.vibeType === 'foodie' ? '#f59e0b' :
        spot.vibeType === 'outdoor' ? '#10b981' : '#3b82f6';

      const isCurrentHovered = hoveredSpot?.id === spot.id;

      // Group container for interactivity
      const nodeNode = nodesGroup.append('g')
        .attr('class', `node-group cursor-pointer transition-all ${spot.isFilteredOut ? 'opacity-30' : 'opacity-100'}`)
        .on('mouseenter', () => setHoveredSpot(spot))
        .on('mouseleave', () => setHoveredSpot(null))
        .on('click', () => {
          setHoveredSpot(spot);
          // Highlight check-in event
          setLiveActivityLog(prev => [
            `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Checked details for: "${spot.name}"! 🔎`,
            ...prev.slice(0, 4)
          ]);
        });

      // Interactive hover outer ring helper
      if (isCurrentHovered) {
        nodeNode.append('circle')
          .attr('cx', spotX)
          .attr('cy', spotY)
          .attr('r', 20)
          .attr('fill', 'none')
          .attr('stroke', baseColor)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '2 2')
          .attr('class', 'spinning-hover-ring')
          .style('animation', 'spin 6s linear infinite');
      }

      // Outer pulsing rings for highly active nodes
      if (spot.activeCount > 250 && !spot.isFilteredOut) {
        nodeNode.append('circle')
          .attr('cx', spotX)
          .attr('cy', spotY)
          .attr('r', 14)
          .attr('fill', 'none')
          .attr('stroke', baseColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '6;18')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');
      }

      // Solid central core node point
      nodeNode.append('circle')
        .attr('cx', spotX)
        .attr('cy', spotY)
        .attr('r', isCurrentHovered ? 8 : 5.5)
        .attr('fill', baseColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('shadow', '0 2px 4px rgba(0,0,0,0.1)');

      // Micro Label above nodes
      nodeNode.append('text')
        .attr('x', spotX)
        .attr('y', spotY - (isCurrentHovered ? 14 : 10))
        .attr('text-anchor', 'middle')
        .attr('font-size', isCurrentHovered ? '9.5px' : '8px')
        .attr('font-weight', 'extrabold')
        .attr('fill', isCurrentHovered ? '#1e293b' : '#64748b')
        .text(spot.area);
    });

  }, [calculatedHotspots, hoveredSpot, selectedCity, timeOfDay, vibeFilter]);

  // Handle local user check-in / status broadcasting to the local heatmap area
  const handleUserCheckIn = () => {
    setUserCheckedIn(true);
    setLocalBoostAmount(prev => prev + 50); // Grow heatmap locally on each broadcast!
    
    const activeHotspotName = 
      selectedCity === 'nairobi' ? 'The Alchemist Bar & Mercado' :
      selectedCity === 'mombasa' ? 'Nyali Centre & Tapas Bar' :
      selectedCity === 'kisumu' ? 'Dunga Hill Camp Sunset Point' : 'Westside Mall & Chill Spots';

    setLiveActivityLog(prev => [
      `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] 📡 BROADCASTING: You checked in to ${activeHotspotName}! Your profile is now visible in the local vibe cluster.`,
      ...prev.slice(0, 4)
    ]);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col md:flex-row gap-4 p-1 pb-6 w-full max-w-5xl mx-auto" id="pendo-heatmap-dashboard">
      {/* ----------------- LEFT PANEL: MAP VIEWPORT ----------------- */}
      <div className="flex-1 flex flex-col gap-3">
        {/* City Selectors Header */}
        <div className="bg-white border border-slate-150 rounded-2xl p-2.5 shadow-sm flex flex-wrap gap-1.5 items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-black text-rose-600 pl-2">City Focus:</span>
          <div className="flex flex-wrap gap-1">
            {CITY_CENTERS.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCity(c.id);
                  setHoveredSpot(null);
                  setLiveActivityLog(prev => [
                    `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Switched view to ${c.name.split(' ')[0]} cluster 🗺️`,
                    ...prev.slice(0, 4)
                  ]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${selectedCity === c.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* The D3 Canvas Box */}
        <div className="bg-white border border-slate-150 rounded-[32px] p-4 shadow-md relative overflow-hidden flex-1 min-h-[360px] flex flex-col">
          {/* Legend Details Top-Left Overlay */}
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-150 shadow-xs max-w-[200px]">
            <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Current Vibe Cluster</p>
            <h4 className="text-xs font-black text-slate-800">
              {CITY_CENTERS.find(c => c.id === selectedCity)?.name}
            </h4>
            <p className="text-[9.5px] text-slate-500 font-medium leading-tight mt-0.5">
              {CITY_CENTERS.find(c => c.id === selectedCity)?.desc}
            </p>
          </div>

          {/* User Location Radar Marker Top-Right Overlay */}
          <div className="absolute top-4 right-4 z-10 bg-rose-50 border border-rose-100 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-xs">
            <span className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping shrink-0"></span>
            <span className="text-[10px] font-black text-rose-700">Broadcasting GPS Live</span>
          </div>

          {/* D3 Canvas Wrapper */}
          <div className="relative flex-1 flex items-center justify-center" ref={containerRef}>
            <svg
              ref={svgRef}
              className="w-full h-full max-h-[380px] drop-shadow-sm select-none"
            />

            {/* Hover Tooltip Overlay inside SVG Container */}
            <AnimatePresence>
              {hoveredSpot && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-lg border border-slate-800 text-white rounded-2xl p-3.5 shadow-xl flex gap-3.5 items-start z-10 text-left"
                >
                  <div className="bg-white/10 p-2.5 rounded-xl shrink-0 text-yellow-400 flex items-center justify-center">
                    <Flame size={20} className="animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        📍 {hoveredSpot.area}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        ⚡ {hoveredSpot.activeCount} online now
                      </span>
                    </div>
                    <h5 className="font-extrabold text-sm tracking-tight text-white">{hoveredSpot.name}</h5>
                    <p className="text-[10px] text-slate-300 leading-normal font-medium">{hoveredSpot.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/5">
                      {hoveredSpot.interests.slice(0, 3).map((interest, idx) => (
                        <span key={idx} className="bg-white/5 border border-white/5 text-[9px] text-slate-300 font-bold px-1.5 py-0.5 rounded">
                          #{interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Custom Time of Day Slider */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 mt-2">
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" /> Hourly Density Forecast
              </span>
              <span className="text-[10px] font-black text-rose-600 uppercase">
                {timeOfDay === 'morning' ? '🌅 Morning Rush (07:00 - 12:00)' :
                 timeOfDay === 'afternoon' ? '☀️ Afternoon Coffee (12:00 - 17:00)' :
                 timeOfDay === 'evening' ? '🌆 Sunset Cocktails (17:00 - 21:00)' : '🌌 Sherehe peak (21:00 - 03:00)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { key: 'morning', label: 'Morning 🌅', desc: '07:00 - 12:00' },
                { key: 'afternoon', label: 'Afternoon ☀️', desc: '12:00 - 17:00' },
                { key: 'evening', label: 'Evening 🌆', desc: '17:00 - 21:00' },
                { key: 'night', label: 'Night 🌌', desc: '21:00 - 03:00' }
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTimeOfDay(t.key as any);
                    setLiveActivityLog(prev => [
                      `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Projected matching forecast for: ${t.key.toUpperCase()} hours ⏰`,
                      ...prev.slice(0, 4)
                    ]);
                  }}
                  className={`py-1.5 px-0.5 rounded-xl text-center border transition-all ${timeOfDay === t.key ? 'bg-rose-500 border-rose-600 text-white font-extrabold shadow-sm' : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-100 font-semibold'}`}
                >
                  <p className="text-[10px] leading-tight">{t.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- RIGHT PANEL: STATUS & LIVE CONTROLS ----------------- */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        {/* Layer Filters Card */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <div className="bg-rose-50 text-rose-600 p-2 rounded-xl">
              <Compass size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-slate-800">Match Vibe Filtering</h3>
              <p className="text-[9px] text-slate-400">Overlay specific match crowd interests</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'all', label: 'All Active Crowds', desc: 'Display global swiper populations', color: 'bg-rose-500' },
              { id: 'sherehe', label: 'Party / Sherehe 🔥', desc: 'Clubs, lounges, and late-night social spots', color: 'bg-rose-500' },
              { id: 'chill', label: 'Coffee & Chills ☕', desc: 'Cafes, board game meetups, study spots', color: 'bg-purple-500' },
              { id: 'foodie', label: 'Premium Foodies 🥩', desc: 'Fine dining and signature cocktail bars', color: 'bg-amber-500' },
              { id: 'outdoor', label: 'Scenic / Outdoors 🏕️', desc: 'Lake view camps, beach gardens, walking trails', color: 'bg-emerald-500' },
              { id: 'cultural', label: 'Arts & Cultural 🎨', desc: 'Cinemas, local heritage markets, art spaces', color: 'bg-blue-500' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setVibeFilter(f.id)}
                className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${vibeFilter === f.id ? 'bg-slate-50 border-slate-300 font-extrabold' : 'bg-white border-transparent hover:bg-slate-50 font-semibold'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
                  <div>
                    <p className="text-[10.5px] text-slate-800 leading-tight">{f.label}</p>
                    <p className="text-[8px] text-slate-400 font-medium leading-none mt-0.5">{f.desc}</p>
                  </div>
                </div>
                {vibeFilter === f.id && (
                  <span className="text-[9px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded-full">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Live Broadcast / Active Signal check-in */}
        <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-purple-950 text-white rounded-[24px] p-4.5 shadow-md space-y-3.5 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-600/15 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="space-y-1">
            <span className="bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[8px] uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full inline-block">
              Radar Check-in
            </span>
            <h4 className="font-extrabold text-xs">Broadcast Your Current Vibe</h4>
            <p className="text-[10px] text-slate-300 leading-normal">
              Broadcasting lets other swiping users in this city spot see you instantly on their radars. Increases views by 4x.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-300 font-semibold">
              <span>Broadcasting To:</span>
              <span className="text-white font-bold uppercase">{selectedCity} Cluster</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-300 font-semibold">
              <span>Your Broadcast Boost:</span>
              <span className="text-emerald-400 font-bold">+{userCheckedIn ? 45 + localBoostAmount : 0} density points</span>
            </div>
          </div>

          <button
            onClick={handleUserCheckIn}
            className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
          >
            <Navigation size={13} className="transform rotate-45" />
            {userCheckedIn ? 'Boost Active Broadcast 🔥' : 'Broadcast My Vibe Now'}
          </button>
        </div>

        {/* Real-time Match Activity Ticker */}
        <div className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex-1 flex flex-col min-h-[160px]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2.5">
            <Activity size={14} className="text-rose-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Live Match Signal Ticker</span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar max-h-[140px] text-left">
            {liveActivityLog.map((log, index) => (
              <div
                key={index}
                className="text-[9.5px] leading-relaxed text-slate-600 border-l-2 border-rose-200 pl-2 font-medium transition-all"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
