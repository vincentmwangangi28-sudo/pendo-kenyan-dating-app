import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MatchProfile, AppView, ChatSession, ChatMessage, GroupProfile, HangoutSpot } from './types';
import { ProfileSetup } from './components/ProfileSetup';
import { Discovery } from './components/Discovery';
import { ChatList, ChatRoom } from './components/ChatInterface';
import { GroupCreation } from './components/GroupCreation';
import { HangoutSpots } from './components/HangoutSpots';
import { VoiceCoach } from './components/VoiceCoach';
import { MeetHub } from './components/MeetHub';
import { Heart, MessageCircle, User as UserIcon, Flame, MapPin, Mic, Loader2, Video } from 'lucide-react';
import { findRealtimeEvents } from './services/geminiService';
import { auth, db, handleFirestoreError, OperationType, signInWithGoogle, signOut } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';

// --- UTILS ---
// Haversine formula to calculate distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d);
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const PUBLIC_EVENTS_GROUP_ID = 'public_events_group_ke';

// --- MOCK DATA ---
const MOCK_MATCHES: MatchProfile[] = [
  {
    id: '1',
    name: 'Wanjiku',
    age: 24,
    location: 'Nairobi',
    zodiacSign: 'Leo',
    bio: 'Love hiking in Karura Forest and exploring new coffee spots. Looking for someone adventurous!',
    interests: ['Hiking', 'Coffee', 'Travel'],
    languages: ['English', 'Swahili'],
    photoUrl: 'https://picsum.photos/seed/wanjiku/400/600',
    distance: 5,
    isVerified: true,
    badges: ['Verified', 'Top Pick'],
    coordinates: { latitude: -1.2921, longitude: 36.8219 } // Nairobi
  },
  {
    id: '2',
    name: 'Achieng',
    age: 26,
    location: 'Kisumu',
    zodiacSign: 'Taurus',
    bio: 'Techie by day, foodie by night. Let’s grab some fish by the lakeside.',
    interests: ['Tech', 'Cooking', 'Music'],
    languages: ['English', 'Luo', 'Swahili'],
    photoUrl: 'https://picsum.photos/seed/achieng/400/600',
    distance: 12,
    isVerified: false,
    badges: ['Newbie'],
    coordinates: { latitude: -0.0917, longitude: 34.7680 } // Kisumu
  },
  {
    id: '3',
    name: 'Zainab',
    age: 23,
    location: 'Mombasa',
    zodiacSign: 'Scorpio',
    bio: 'Ocean lover. Swahili vibes. I appreciate good conversation and sunset walks.',
    interests: ['Beach', 'Art', 'Reading'],
    languages: ['Swahili', 'English'],
    photoUrl: 'https://picsum.photos/seed/zainab/400/600',
    distance: 450,
    isVerified: true,
    badges: ['Verified'],
    coordinates: { latitude: -4.0435, longitude: 39.6682 } // Mombasa
  },
   {
    id: '4',
    name: 'Nimo',
    age: 25,
    location: 'Nairobi',
    zodiacSign: 'Libra',
    bio: 'Fashion designer. Always creating. Looking for my muse.',
    interests: ['Fashion', 'Art', 'Photography'],
    languages: ['English', 'Sheng'],
    photoUrl: 'https://picsum.photos/seed/nimo/400/600',
    distance: 8,
    isVerified: false,
    coordinates: { latitude: -1.28, longitude: 36.82 } // Nairobi approx
  }
];

const MOCK_GROUPS: ChatSession[] = [
  {
    matchId: PUBLIC_EVENTS_GROUP_ID,
    isGroup: true,
    matchName: 'Nairobi Pulse 🇰🇪',
    matchPhoto: 'https://images.unsplash.com/photo-1489440543286-a69330151c0b?q=80&w=1000&auto=format&fit=crop',
    lastMessage: 'Updating latest events...',
    unreadCount: 5,
    messages: [
      { 
        id: 'sys_welcome', 
        senderId: 'system', 
        text: 'Welcome to Nairobi Pulse! 🇰🇪\nThis group posts real-time events happening around you. Stay tuned!', 
        timestamp: new Date(Date.now() - 36000000) 
      }
    ]
  },
  {
    matchId: 'g1',
    isGroup: true,
    matchName: 'Nairobi Hikers',
    matchPhoto: 'https://picsum.photos/seed/hikers/400/300',
    lastMessage: 'Anyone going to Ngong Hills this weekend?',
    unreadCount: 2,
    messages: [
      { id: '1', senderId: 'u2', senderName: 'Kevin', text: 'Hey guys!', timestamp: new Date(Date.now() - 3600000) },
      { id: '2', senderId: 'u3', senderName: 'Sarah', text: 'Anyone going to Ngong Hills this weekend?', timestamp: new Date(Date.now() - 1800000) }
    ]
  },
  {
    matchId: 'g2',
    isGroup: true,
    matchName: 'Afrobeats & Vibes',
    matchPhoto: 'https://picsum.photos/seed/afro/400/300',
    lastMessage: 'That new Burna Boy track is fire 🔥',
    unreadCount: 0,
    messages: [
      { id: '1', senderId: 'u5', senderName: 'DJ Mo', text: 'That new Burna Boy track is fire 🔥', timestamp: new Date(Date.now() - 86400000) }
    ]
  }
];

const MOCK_VENUES: HangoutSpot[] = [
  // --- NAIROBI ---
  {
    id: 'v1',
    name: 'The Alchemist',
    type: 'PUB',
    location: 'Westlands, Nairobi',
    photoUrl: 'https://picsum.photos/seed/alchemist/400/300',
    activeCount: 245,
    trending: true,
    coordinates: { latitude: -1.2667, longitude: 36.8042 }
  },
  {
    id: 'v2',
    name: 'Quiver Lounge',
    type: 'PUB',
    location: 'Thika Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/quiver/400/300',
    activeCount: 312,
    trending: true,
    coordinates: { latitude: -1.2333, longitude: 36.8667 }
  },
  {
    id: 'v3',
    name: 'Garden City Mall',
    type: 'MALL',
    location: 'Thika Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/garden/400/300',
    activeCount: 850,
    trending: false,
    coordinates: { latitude: -1.2361, longitude: 36.8789 }
  },
  {
    id: 'v4',
    name: 'CITAM Valley Road',
    type: 'CHURCH',
    location: 'Valley Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/citam/400/300',
    activeCount: 120,
    trending: false,
    coordinates: { latitude: -1.2921, longitude: 36.8150 }
  },
  {
    id: 'v5',
    name: 'Karura Forest',
    type: 'NATURE',
    location: 'Limuru Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/karura/400/300',
    activeCount: 56,
    trending: false,
    coordinates: { latitude: -1.2389, longitude: 36.8244 }
  },
  {
    id: 'v6',
    name: 'Two Rivers Mall',
    type: 'MALL',
    location: 'Ruaka, Nairobi',
    photoUrl: 'https://picsum.photos/seed/tworivers/400/300',
    activeCount: 1200,
    trending: true,
    coordinates: { latitude: -1.2069, longitude: 36.7900 }
  },
  {
    id: 'v7',
    name: 'Mavuno Church',
    type: 'CHURCH',
    location: 'Mlolongo, Nairobi',
    photoUrl: 'https://picsum.photos/seed/mavuno/400/300',
    activeCount: 45,
    trending: false,
    coordinates: { latitude: -1.3967, longitude: 36.9378 }
  },
  {
    id: 'v8',
    name: 'K1 Klubhouse',
    type: 'PUB',
    location: 'Parklands, Nairobi',
    photoUrl: 'https://picsum.photos/seed/k1/400/300',
    activeCount: 180,
    trending: false,
    coordinates: { latitude: -1.2721, longitude: 36.8143 }
  },

  // --- MOMBASA ---
  {
    id: 'v_msa_1',
    name: 'Char-Choma Beach Restaurant',
    type: 'PUB',
    location: 'Nyali Beach, Mombasa',
    photoUrl: 'https://picsum.photos/seed/charchoma/400/300',
    activeCount: 198,
    trending: true,
    coordinates: { latitude: -4.0298, longitude: 39.7145 }
  },
  {
    id: 'v_msa_2',
    name: 'Nyali Centre',
    type: 'MALL',
    location: 'Links Road, Mombasa',
    photoUrl: 'https://picsum.photos/seed/nyalicentre/400/300',
    activeCount: 650,
    trending: false,
    coordinates: { latitude: -4.0180, longitude: 39.7118 }
  },
  {
    id: 'v_msa_3',
    name: 'Fort Jesus Historical Grounds',
    type: 'NATURE',
    location: 'Old Town, Mombasa',
    photoUrl: 'https://picsum.photos/seed/fortjesus/400/300',
    activeCount: 88,
    trending: false,
    coordinates: { latitude: -4.0628, longitude: 39.6783 }
  },
  {
    id: 'v_msa_4',
    name: 'Mombasa Memorial Cathedral',
    type: 'CHURCH',
    location: 'Nkrumah Road, Mombasa',
    photoUrl: 'https://picsum.photos/seed/memorialcath/400/300',
    activeCount: 54,
    trending: false,
    coordinates: { latitude: -4.0610, longitude: 39.6745 }
  },
  {
    id: 'v_msa_5',
    name: 'Tapas Cielo Club',
    type: 'PUB',
    location: 'Nyali, Mombasa',
    photoUrl: 'https://picsum.photos/seed/tapascielo/400/300',
    activeCount: 154,
    trending: true,
    coordinates: { latitude: -4.0210, longitude: 39.7122 }
  },

  // --- KISUMU ---
  {
    id: 'v_kis_1',
    name: 'Dunga Hill Camp',
    type: 'NATURE',
    location: 'Lakeside Road, Kisumu',
    photoUrl: 'https://picsum.photos/seed/dungahill/400/300',
    activeCount: 220,
    trending: true,
    coordinates: { latitude: -0.1384, longitude: 34.7394 }
  },
  {
    id: 'v_kis_2',
    name: 'West End Shopping Mall',
    type: 'MALL',
    location: 'Got Alila, Kisumu',
    photoUrl: 'https://picsum.photos/seed/westend/400/300',
    activeCount: 420,
    trending: false,
    coordinates: { latitude: -0.1035, longitude: 34.7578 }
  },
  {
    id: 'v_kis_3',
    name: 'Kisumu Impala Sanctuary',
    type: 'NATURE',
    location: 'Seme Road, Kisumu',
    photoUrl: 'https://picsum.photos/seed/impala/400/300',
    activeCount: 75,
    trending: false,
    coordinates: { latitude: -0.1215, longitude: 34.7490 }
  },
  {
    id: 'v_kis_4',
    name: 'Kibuye Catholic Cathedral',
    type: 'CHURCH',
    location: 'Jomo Kenyatta Highway, Kisumu',
    photoUrl: 'https://picsum.photos/seed/kibuyecath/400/300',
    activeCount: 110,
    trending: false,
    coordinates: { latitude: -0.0905, longitude: 34.7675 }
  },
  {
    id: 'v_kis_5',
    name: 'Kiboko Bay Resort Lounge',
    type: 'PUB',
    location: 'Dunga Road, Kisumu',
    photoUrl: 'https://picsum.photos/seed/kibokobay/400/300',
    activeCount: 135,
    trending: false,
    coordinates: { latitude: -0.1288, longitude: 34.7431 }
  },

  // --- NAKURU ---
  {
    id: 'v_nak_1',
    name: 'Lake Nakuru National Park',
    type: 'NATURE',
    location: 'Lake Road, Nakuru',
    photoUrl: 'https://picsum.photos/seed/lakenakuru/400/300',
    activeCount: 185,
    trending: true,
    coordinates: { latitude: -0.3601, longitude: 36.0822 }
  },
  {
    id: 'v_nak_2',
    name: 'Westside Mall Nakuru',
    type: 'MALL',
    location: 'Kenyatta Avenue, Nakuru',
    photoUrl: 'https://picsum.photos/seed/westsidenak/400/300',
    activeCount: 510,
    trending: false,
    coordinates: { latitude: -0.2855, longitude: 36.0620 }
  },
  {
    id: 'v_nak_3',
    name: 'Christ The King Cathedral',
    type: 'CHURCH',
    location: 'Cathedral Way, Nakuru',
    photoUrl: 'https://picsum.photos/seed/nakurucathedral/400/300',
    activeCount: 125,
    trending: false,
    coordinates: { latitude: -0.2882, longitude: 36.0718 }
  },
  {
    id: 'v_nak_4',
    name: 'Tausi Grill & Lounge',
    type: 'PUB',
    location: 'Court Road, Nakuru',
    photoUrl: 'https://picsum.photos/seed/tausigrill/400/300',
    activeCount: 145,
    trending: true,
    coordinates: { latitude: -0.2911, longitude: 36.0705 }
  },

  // --- ELDORET ---
  {
    id: 'v_eld_1',
    name: 'Poa Place Resort',
    type: 'NATURE',
    location: 'Kaptagat Road, Eldoret',
    photoUrl: 'https://picsum.photos/seed/poaplace/400/300',
    activeCount: 310,
    trending: true,
    coordinates: { latitude: 0.5188, longitude: 35.2922 }
  },
  {
    id: 'v_eld_2',
    name: 'Rupais Mall',
    type: 'MALL',
    location: 'Malaba Road, Eldoret',
    photoUrl: 'https://picsum.photos/seed/rupasmall/400/300',
    activeCount: 780,
    trending: true,
    coordinates: { latitude: 0.5218, longitude: 35.2862 }
  },
  {
    id: 'v_eld_3',
    name: 'Sacred Heart Cathedral Eldoret',
    type: 'CHURCH',
    location: 'Cathedral Road, Eldoret',
    photoUrl: 'https://picsum.photos/seed/eldoretcath/400/300',
    activeCount: 142,
    trending: false,
    coordinates: { latitude: 0.5105, longitude: 35.2750 }
  },
  {
    id: 'v_eld_4',
    name: 'The Blackwood Club Lounge',
    type: 'PUB',
    location: 'Nandi Road, Eldoret',
    photoUrl: 'https://picsum.photos/seed/blackwood/400/300',
    activeCount: 220,
    trending: true,
    coordinates: { latitude: 0.5135, longitude: 35.2738 }
  }
];

const INITIAL_PROFILE: UserProfile = {
  name: '',
  age: 18,
  zodiacSign: '',
  location: 'Nairobi',
  bio: 'Just looking for meaningful connections.',
  interests: [],
  languages: [],
  gender: '',
  lookingFor: '',
  photoUrl: 'https://picsum.photos/seed/user/400/400',
  isVerified: false
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [matches, setMatches] = useState<MatchProfile[]>(MOCK_MATCHES);
  const [chats, setChats] = useState<ChatSession[]>(MOCK_GROUPS); // Init with mock groups
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>({});
  
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user) {
        // fetch user profile
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
             setUserProfile(profileDoc.data() as UserProfile);
             setView(AppView.DISCOVERY);
          } else {
             setUserProfile(prev => ({ ...prev, name: user.displayName || '', photoUrl: user.photoURL || prev.photoUrl }));
             setView(AppView.PROFILE_SETUP);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, 'users');
        }
      } else {
        setView(AppView.LANDING);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  
  // Ref to prevent double fetching
  const hasFetchedEvents = useRef(false);

  // Auto-fetch real events for the public group with caching and retry logic
  useEffect(() => {
    if (hasFetchedEvents.current) return;

    const fetchEvents = async (retryCount = 0) => {
        // Use user location if available, else default to Nairobi Central
        const lat = userProfile.coordinates?.latitude || -1.2921;
        const lng = userProfile.coordinates?.longitude || 36.8219;
        
        hasFetchedEvents.current = true;
        console.log(`Fetching events for Public Group... (Attempt ${retryCount + 1})`);
        
        const CACHE_KEY = `cachedEvents_${lat}_${lng}`;
        const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour
        const cachedData = localStorage.getItem(CACHE_KEY);

        if (cachedData) {
            try {
                const { events, timestamp } = JSON.parse(cachedData);
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    console.log("Using cached events");
                    handleFetchedEvents(events);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse cached events", e);
            }
        }

        try {
            const events = await findRealtimeEvents(lat, lng);
            if (events && events.length > 0) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ events, timestamp: Date.now() }));
                handleFetchedEvents(events);
            } else if (retryCount < 2) {
                console.log("No events found, retrying...");
                hasFetchedEvents.current = false;
                setTimeout(() => fetchEvents(retryCount + 1), 2000);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
            if (retryCount < 2) {
                 hasFetchedEvents.current = false;
                 setTimeout(() => fetchEvents(retryCount + 1), 2000);
            }
        }
    };

    const handleFetchedEvents = (events: any[]) => {
         const newMessages: ChatMessage[] = events.map((event, idx) => ({
             id: `event_bot_${Date.now()}_${idx}`,
             senderId: 'bot',
             senderName: 'Nairobi Bot 🤖',
             text: `📅 **${event.name}**\n\n📍 ${event.location}\n⏰ ${event.date || 'Check link for time'}\n\nℹ️ ${event.description}\n\n🔗 ${event.mapsUri || 'No link available'}`,
             timestamp: new Date()
         }));

         setChats(prev => prev.map(chat => {
             if (chat.matchId === PUBLIC_EVENTS_GROUP_ID) {
                 return {
                     ...chat,
                     messages: [...chat.messages, ...newMessages],
                     lastMessage: `Latest: ${events[0].name}`,
                     unreadCount: newMessages.length
                 };
             }
             return chat;
         }));
    };

    fetchEvents();
  }, [userProfile.coordinates]);

  // Recalculate distances if user coordinates are set
  useEffect(() => {
    if (userProfile.coordinates) {
      setMatches(prevMatches => 
        prevMatches.map(match => {
          if (match.coordinates && userProfile.coordinates) {
            const dist = getDistanceFromLatLonInKm(
              userProfile.coordinates.latitude,
              userProfile.coordinates.longitude,
              match.coordinates.latitude,
              match.coordinates.longitude
            );
            return { ...match, distance: dist };
          }
          return match;
        })
      );
    }
  }, [userProfile.coordinates]);

  // --- Handlers ---

  const handleStartApp = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        // We will fetch from Firestore in useEffect or after login
        setView(AppView.PROFILE_SETUP);
      }
    } catch (e) {
      console.error(e);
      alert('Login failed');
    }
  };

  const handleProfileSave = async (profile: UserProfile) => {
    if (!authUser) return;
    try {
      const profileToSave = {
          uid: authUser.uid,
          name: profile.name || 'New User',
          age: profile.age >= 18 ? profile.age : 18,
          location: profile.location || 'Nairobi',
          bio: profile.bio || 'New member',
          ...((profile.neighborhood && profile.neighborhood.length > 0) && { neighborhood: profile.neighborhood }),
          ...((profile.interests && profile.interests.length > 0) && { interests: profile.interests }),
          ...((profile.languages && profile.languages.length > 0) && { languages: profile.languages }),
          ...((profile.gender && profile.gender.length > 0) && { gender: profile.gender }),
          ...((profile.lookingFor && profile.lookingFor.length > 0) && { lookingFor: profile.lookingFor }),
          ...((profile.photoUrl && profile.photoUrl.length > 0) && { photoUrl: profile.photoUrl }),
          ...((profile.voiceUrl && profile.voiceUrl.length > 0) && { voiceUrl: profile.voiceUrl }),
          ...((profile.coordinates) && { coordinates: profile.coordinates })
      };
      // explicitly define isVerified per our rules requirement during create
      const docRef = doc(db, 'users', authUser.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
         Object.assign(profileToSave, { isVerified: false });
      } else {
         Object.assign(profileToSave, { isVerified: profile.isVerified });
      }

      await setDoc(docRef, profileToSave, { merge: true });
      setUserProfile(profile);
      setView(AppView.DISCOVERY);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleLike = (match: MatchProfile) => {
    // Determine if it's a match (Mocking a 50% chance or auto-match for demo)
    const isMatch = true; 

    if (isMatch) {
      // Create chat session if not exists
      if (!chats.find(c => c.matchId === match.id)) {
        const newChat: ChatSession = {
          matchId: match.id,
          matchName: match.name,
          matchPhoto: match.photoUrl,
          lastMessage: '',
          unreadCount: 0,
          messages: []
        };
        setChats(prev => [...prev, newChat]);
      }
    }
  };

  const handlePass = (matchId: string) => {
    // In a real app, send to backend
    console.log(`Passed on ${matchId}`);
  };

  const handleBoost = () => {
    // Activate boost for 30 minutes (1800000 ms)
    const BOOST_DURATION = 30 * 60 * 1000;
    setUserProfile(prev => ({
      ...prev,
      boostExpiresAt: Date.now() + BOOST_DURATION
    }));
  };

  const handleSelectChat = (matchId: string) => {
    setActiveChatId(matchId);
    setView(AppView.CHAT_ROOM);
  };

  const handleGroupCreate = (group: GroupProfile) => {
    const newChatSession: ChatSession = {
      matchId: group.id,
      isGroup: true,
      matchName: group.name,
      matchPhoto: group.photoUrl,
      lastMessage: group.description,
      unreadCount: 0,
      messages: [{
        id: 'sys1',
        senderId: 'system',
        text: `Welcome to ${group.name}! ${group.description}`,
        timestamp: new Date()
      }]
    };
    
    setChats(prev => [newChatSession, ...prev]);
    setActiveChatId(group.id);
    setView(AppView.CHAT_ROOM);
  };

  const handleCheckInVenue = (venue: HangoutSpot) => {
    // Check if chat already exists
    const existingChat = chats.find(c => c.matchId === venue.id);
    
    if (existingChat) {
      setActiveChatId(venue.id);
      setView(AppView.CHAT_ROOM);
      return;
    }

    const newVenueChat: ChatSession = {
      matchId: venue.id,
      isGroup: true,
      isVenue: true,
      matchName: venue.name,
      matchPhoto: venue.photoUrl,
      lastMessage: `Checked in at ${venue.name}`,
      unreadCount: 0,
      messages: [{
        id: 'sys1',
        senderId: 'system',
        text: `You have checked in to ${venue.name}. Say hi to the ${venue.activeCount} people here!`,
        timestamp: new Date()
      }]
    };

    setChats(prev => [newVenueChat, ...prev]);
    setActiveChatId(venue.id);
    setView(AppView.CHAT_ROOM);
  };

  const handleBlockUser = (matchId: string) => {
    // Remove the chat
    setChats(prev => prev.filter(c => c.matchId !== matchId));
    // Remove from matches
    setMatches(prev => prev.filter(m => m.id !== matchId));
    // Return to chat list
    setView(AppView.CHAT_LIST);
    setActiveChatId(null);
  };

  const handleSendMessage = (text: string, imageUrl?: string, audioUrl?: string) => {
    if (!activeChatId) return;
    
    const chatId = activeChatId;
    const currentChat = chats.find(c => c.matchId === chatId);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date(),
      status: 'sent'
    };
    if (imageUrl) {
      newMessage.imageUrl = imageUrl;
    }
    if (audioUrl) {
      newMessage.audioUrl = audioUrl;
    }

    setChats(prev => prev.map(chat => {
      if (chat.matchId === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: text ? text : (imageUrl ? 'Sent a photo' : 'Sent a voice note')
        };
      }
      return chat;
    }));

    // Simulate "Delivered" and "Read"
    setTimeout(() => {
       setChats(prev => prev.map(chat => {
          if (chat.matchId === chatId) {
            return {
              ...chat,
              messages: chat.messages.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m)
            };
          }
          return chat;
       }));
       
       setTimeout(() => {
         setChats(prev => prev.map(chat => {
            if (chat.matchId === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(m => m.id === newMessage.id ? { ...m, status: 'read' } : m)
              };
            }
            return chat;
         }));
       }, 1500);

    }, 500);

    // Simulate Typing
    setTimeout(() => {
        let typerName = 'Someone';
        if (currentChat && !currentChat.isGroup) {
            typerName = currentChat.matchName;
        } else {
            // Pick random name for group effect
            const groupMembers = ['Alex', 'Brian', 'Stacy', 'Maureen', 'Ken', 'Njeri'];
            typerName = groupMembers[Math.floor(Math.random() * groupMembers.length)];
        }
        
        setTypingStatus(prev => ({
            ...prev,
            [chatId]: [typerName]
        }));
    }, 1000);

    // Mock response after 3 seconds
    setTimeout(() => {
      // Clear typing
      setTypingStatus(prev => ({ ...prev, [chatId]: [] }));

      // Determine if this is a group chat or 1-1
      const chatToCheck = chats.find(c => c.matchId === chatId);
      let responseMsg: ChatMessage;

      if (chatToCheck?.isGroup) {
         if (chatToCheck.matchId === PUBLIC_EVENTS_GROUP_ID) {
             // Bot response for public events group
             responseMsg = {
                 id: (Date.now() + 1).toString(),
                 senderId: 'bot',
                 senderName: 'Nairobi Bot 🤖',
                 text: "I'll keep looking for more events! Check back later.",
                 timestamp: new Date()
             };
         } else {
             const groupResponses = [
               "Totally agree!",
               "When is the next meetup?",
               "Has anyone been there before?",
               "😂😂😂",
               "That sounds awesome.",
               "Drinks on me tonight!",
               "Who is closest to the DJ?",
               "This place is packed!"
             ];
             // Note: In real app, we'd use the same name as the typer
             responseMsg = {
                id: (Date.now() + 1).toString(),
                senderId: 'other',
                senderName: 'Group Member', 
                text: groupResponses[Math.floor(Math.random() * groupResponses.length)],
                timestamp: new Date()
             };
         }
      } else {
          const responses = [
            "Haha that's interesting! Tell me more.",
            "No way! I was thinking the same thing.",
            "We should definitely check that out sometime.",
            "lol"
          ];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          
          responseMsg = {
            id: (Date.now() + 1).toString(),
            senderId: chatId,
            text: randomResponse,
            timestamp: new Date()
          };
      }
      
      setChats(prev => prev.map(chat => {
        if (chat.matchId === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, responseMsg],
            lastMessage: responseMsg.text
          };
        }
        return chat;
      }));
    }, 3000);
  };
  
  const handleDeleteMessage = (matchId: string, messageId: string) => {
    setChats(prev => prev.map(chat => {
        if (chat.matchId === matchId) {
            const updatedMessages = chat.messages.filter(m => m.id !== messageId);
            const lastMsg = updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1].text : '';
            return {
                ...chat,
                messages: updatedMessages,
                lastMessage: lastMsg
            };
        }
        return chat;
    }));
  };

  const handleShareMeetLinkInChat = (chatId: string, text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date(),
      status: 'sent'
    };
    setChats(prev => prev.map(chat => {
      if (chat.matchId === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: text
        };
      }
      return chat;
    }));
  };

  // --- Render Components ---

  if (isAuthLoading) {
      return (
          <div className="h-screen flex items-center justify-center bg-white">
              <Loader2 size={48} className="animate-spin text-rose-500" />
          </div>
      );
  }

  const renderContent = () => {
    switch (view) {
      case AppView.LANDING:
        return (
          <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-500 to-rose-700 text-white p-6 relative overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-64 h-64 bg-rose-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
             <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

            <div className="relative z-10 text-center">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3">
                <Flame size={48} className="text-white drop-shadow-lg" />
              </div>
              <h1 className="text-5xl font-extrabold mb-4 tracking-tight">Pendo</h1>
              <p className="text-xl text-rose-100 mb-10 max-w-xs mx-auto leading-relaxed">
                Connect with genuine people across Kenya. Find your perfect match today.
              </p>
              <button 
                onClick={handleStartApp}
                className="bg-white text-rose-600 px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                Get Started
              </button>
            </div>
            
            <p className="absolute bottom-8 text-rose-200 text-sm">Made with ❤️ in Nairobi</p>
          </div>
        );

      case AppView.PROFILE_SETUP:
        return (
          <div className="min-h-screen bg-slate-50 pt-8">
            <ProfileSetup initialProfile={userProfile} onSave={handleProfileSave} />
          </div>
        );

      case AppView.DISCOVERY:
        return (
          <div className="min-h-screen bg-slate-100 pb-20">
            <div className="bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
              <h1 className="text-2xl font-bold text-rose-600 flex items-center gap-2">
                <Flame size={24} fill="currentColor" /> Pendo
              </h1>
              <div className="flex items-center gap-3">
                 <button 
                    onClick={async () => { await signOut(); setView(AppView.LANDING); }}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                    title="Log Out"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                 </button>
                 <button 
                    onClick={() => setView(AppView.VOICE_COACH)}
                    className="p-2 bg-rose-100 text-rose-600 rounded-full animate-pulse-slow shadow-sm"
                    title="AI Coach"
                 >
                    <Mic size={20} />
                 </button>
                 <div className={`w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 ${userProfile.boostExpiresAt && userProfile.boostExpiresAt > Date.now() ? 'ring-2 ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : ''}`}>
                   <img src={userProfile.photoUrl} alt="Me" className="w-full h-full object-cover"/>
                 </div>
              </div>
            </div>
            <Discovery 
              userProfile={userProfile}
              matches={matches}
              hangoutSpots={MOCK_VENUES}
              onLike={handleLike} 
              onPass={handlePass} 
              onBoost={handleBoost}
            />
          </div>
        );

      case AppView.HANGOUTS:
        return (
           <div className="min-h-screen bg-slate-50 pb-20">
             <HangoutSpots venues={MOCK_VENUES} onCheckIn={handleCheckInVenue} />
           </div>
        );

      case AppView.CHAT_LIST:
        return (
          <div className="min-h-screen bg-slate-50 pb-20">
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10">
              <h1 className="text-2xl font-bold text-slate-900">Matches & Groups</h1>
            </div>
            <ChatList 
              chats={chats} 
              onSelectChat={handleSelectChat} 
              onCreateGroup={() => setView(AppView.GROUP_CREATION)}
            />
          </div>
        );

      case AppView.GROUP_CREATION:
        return (
          <GroupCreation 
            onSave={handleGroupCreate} 
            onCancel={() => setView(AppView.CHAT_LIST)} 
          />
        );

      case AppView.CHAT_ROOM:
        const activeSession = chats.find(c => c.matchId === activeChatId);
        // Fallback or find match profile if exists (might not exist for groups, which is fine)
        const activeMatch = matches.find(m => m.id === activeChatId);
        
        if (!activeSession) return <div>Error loading chat</div>;
        
        return (
          <div className="h-screen relative z-50">
            <ChatRoom 
              session={activeSession}
              userProfile={userProfile}
              matchProfile={activeMatch}
              onBack={() => setView(AppView.CHAT_LIST)}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              onBlockUser={handleBlockUser}
              typingUsers={typingStatus[activeSession.matchId]}
            />
          </div>
        );

      case AppView.VOICE_COACH:
          return (
              <VoiceCoach onClose={() => setView(AppView.DISCOVERY)} />
          );

      case AppView.MEET:
          return (
              <MeetHub 
                chats={chats}
                onBack={() => setView(AppView.DISCOVERY)}
                onShareLinkInChat={handleShareMeetLinkInChat}
              />
          );
    }
  };

  // --- Bottom Navigation (Conditional) ---
  const showNav = [AppView.DISCOVERY, AppView.HANGOUTS, AppView.CHAT_LIST, AppView.MEET].includes(view);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden">
      {renderContent()}

      {showNav && (
        <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 flex justify-around items-center py-4 px-2 z-40 pb-6">
          <button 
            onClick={() => setView(AppView.DISCOVERY)}
            className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.DISCOVERY ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Heart size={24} fill={view === AppView.DISCOVERY ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Discover</span>
          </button>

          <button 
            onClick={() => setView(AppView.HANGOUTS)}
            className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.HANGOUTS ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MapPin size={24} fill={view === AppView.HANGOUTS ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Hangouts</span>
          </button>

          <button 
            onClick={() => setView(AppView.MEET)}
            className={`flex flex-col items-center gap-1 transition-colors ${view === AppView.MEET ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Video Date Hub (Google Meet)"
          >
            <Video size={24} fill={view === AppView.MEET ? "currentColor" : "none"} className={view === AppView.MEET ? 'text-purple-600' : 'text-purple-400'} />
            <span className={`text-[10px] font-bold ${view === AppView.MEET ? 'text-purple-600' : 'text-slate-400'}`}>VidDate</span>
          </button>
          
          <button 
            onClick={() => setView(AppView.CHAT_LIST)}
            className={`relative flex flex-col items-center gap-1 transition-colors ${view === AppView.CHAT_LIST ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MessageCircle size={24} fill={view === AppView.CHAT_LIST ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Chats</span>
            {chats.some(c => c.unreadCount > 0) && (
              <span className="absolute top-0 right-2 w-2 h-2 bg-rose-600 rounded-full"></span>
            )}
          </button>
          
          <button 
            onClick={() => setView(AppView.PROFILE_SETUP)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
          >
            <UserIcon size={24} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;