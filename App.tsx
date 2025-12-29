import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MatchProfile, AppView, ChatSession, ChatMessage, GroupProfile, HangoutSpot } from './types';
import { ProfileSetup } from './components/ProfileSetup';
import { Discovery } from './components/Discovery';
import { ChatList, ChatRoom } from './components/ChatInterface';
import { GroupCreation } from './components/GroupCreation';
import { HangoutSpots } from './components/HangoutSpots';
import { VoiceCoach } from './components/VoiceCoach';
import { Heart, MessageCircle, User as UserIcon, Flame, MapPin, Mic } from 'lucide-react';
import { findRealtimeEvents } from './services/geminiService';

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
    bio: 'Love hiking in Karura Forest and exploring new coffee spots. Looking for someone adventurous!',
    interests: ['Hiking', 'Coffee', 'Travel'],
    languages: ['English', 'Swahili'],
    photoUrl: 'https://picsum.photos/seed/wanjiku/400/600',
    distance: 5,
    isVerified: true,
    coordinates: { latitude: -1.2921, longitude: 36.8219 } // Nairobi
  },
  {
    id: '2',
    name: 'Achieng',
    age: 26,
    location: 'Kisumu',
    bio: 'Techie by day, foodie by night. Let’s grab some fish by the lakeside.',
    interests: ['Tech', 'Cooking', 'Music'],
    languages: ['English', 'Luo', 'Swahili'],
    photoUrl: 'https://picsum.photos/seed/achieng/400/600',
    distance: 12,
    isVerified: false,
    coordinates: { latitude: -0.0917, longitude: 34.7680 } // Kisumu
  },
  {
    id: '3',
    name: 'Zainab',
    age: 23,
    location: 'Mombasa',
    bio: 'Ocean lover. Swahili vibes. I appreciate good conversation and sunset walks.',
    interests: ['Beach', 'Art', 'Reading'],
    languages: ['Swahili', 'English'],
    photoUrl: 'https://picsum.photos/seed/zainab/400/600',
    distance: 450,
    isVerified: true,
    coordinates: { latitude: -4.0435, longitude: 39.6682 } // Mombasa
  },
   {
    id: '4',
    name: 'Nimo',
    age: 25,
    location: 'Nairobi',
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
  {
    id: 'v1',
    name: 'The Alchemist',
    type: 'PUB',
    location: 'Westlands, Nairobi',
    photoUrl: 'https://picsum.photos/seed/alchemist/400/300',
    activeCount: 245,
    trending: true
  },
  {
    id: 'v2',
    name: 'Quiver Lounge',
    type: 'PUB',
    location: 'Thika Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/quiver/400/300',
    activeCount: 312,
    trending: true
  },
  {
    id: 'v3',
    name: 'Garden City Mall',
    type: 'MALL',
    location: 'Thika Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/garden/400/300',
    activeCount: 850,
    trending: false
  },
  {
    id: 'v4',
    name: 'CITAM Valley Road',
    type: 'CHURCH',
    location: 'Valley Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/citam/400/300',
    activeCount: 120,
    trending: false
  },
  {
    id: 'v5',
    name: 'Karura Forest',
    type: 'NATURE',
    location: 'Limuru Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/karura/400/300',
    activeCount: 56,
    trending: false
  },
  {
    id: 'v6',
    name: 'Two Rivers Mall',
    type: 'MALL',
    location: 'Ruaka, Nairobi',
    photoUrl: 'https://picsum.photos/seed/tworivers/400/300',
    activeCount: 1200,
    trending: true
  },
  {
    id: 'v7',
    name: 'Mavuno Church',
    type: 'CHURCH',
    location: 'Mlolongo',
    photoUrl: 'https://picsum.photos/seed/mavuno/400/300',
    activeCount: 45,
    trending: false
  },
  {
    id: 'v8',
    name: 'K1 Klubhouse',
    type: 'PUB',
    location: 'Parklands, Nairobi',
    photoUrl: 'https://picsum.photos/seed/k1/400/300',
    activeCount: 180,
    trending: false
  }
];

const INITIAL_PROFILE: UserProfile = {
  name: '',
  age: 0,
  location: 'Nairobi',
  bio: '',
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
  
  // Ref to prevent double fetching
  const hasFetchedEvents = useRef(false);

  // Auto-fetch real events for the public group
  useEffect(() => {
    if (hasFetchedEvents.current) return;

    const fetchEvents = async () => {
        // Use user location if available, else default to Nairobi Central
        const lat = userProfile.coordinates?.latitude || -1.2921;
        const lng = userProfile.coordinates?.longitude || 36.8219;
        
        hasFetchedEvents.current = true;
        console.log("Fetching events for Public Group...");
        
        const events = await findRealtimeEvents(lat, lng);
        
        if (events && events.length > 0) {
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
        }
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

  const handleStartApp = () => {
    setView(AppView.PROFILE_SETUP);
  };

  const handleProfileSave = (profile: UserProfile) => {
    setUserProfile(profile);
    setView(AppView.DISCOVERY);
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

  const handleSendMessage = (text: string) => {
    if (!activeChatId) return;
    
    const chatId = activeChatId;
    const currentChat = chats.find(c => c.matchId === chatId);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date()
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

  // --- Render Components ---

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
              typingUsers={typingStatus[activeSession.matchId]}
            />
          </div>
        );

      case AppView.VOICE_COACH:
          return (
              <VoiceCoach onClose={() => setView(AppView.DISCOVERY)} />
          );
    }
  };

  // --- Bottom Navigation (Conditional) ---
  const showNav = [AppView.DISCOVERY, AppView.HANGOUTS, AppView.CHAT_LIST].includes(view);

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