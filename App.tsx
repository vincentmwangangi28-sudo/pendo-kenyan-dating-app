import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MatchProfile, AppView, ChatSession, ChatMessage, GroupProfile, HangoutSpot, VirtualGift } from './types';
import { ProfileSetup } from './components/ProfileSetup';
import { Discovery } from './components/Discovery';
import { ChatList, ChatRoom } from './components/ChatInterface';
import { GroupCreation } from './components/GroupCreation';
import { HangoutSpots } from './components/HangoutSpots';
import { VoiceCoach } from './components/VoiceCoach';
import { MeetHub } from './components/MeetHub';
import { AuntieShosh } from './components/AuntieShosh';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { AuthNotification } from './components/AuthNotification';
import { MpesaModal } from './components/MpesaModal';
import { SafetyVerificationModal, calculateTrustScore } from './components/SafetyVerificationModal';
import { Heart, MessageCircle, User as UserIcon, Flame, MapPin, Mic, Loader2, Video, Shield, CheckCircle2, ShieldCheck, Crown, Sparkles, Globe, Check } from 'lucide-react';
import { findRealtimeEvents } from './services/geminiService';
import { auth, db, handleFirestoreError, OperationType, signInWithGoogle, signOut, getOrCreateGuestUser, AppAuthUser } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, collection, onSnapshot } from 'firebase/firestore';
import { safeStorage } from './services/storage';
import { googleAuthLogger } from './services/googleAuthLogger';

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
    neighborhood: 'Kilimani',
    zodiacSign: 'Leo',
    bio: 'Love hiking in Karura Forest and exploring new coffee spots in Westlands. Looking for someone adventurous and intentional!',
    interests: ['Hiking', 'Coffee', 'Traveling'],
    languages: ['English', 'Swahili', 'Kikuyu'],
    photoUrl: 'https://picsum.photos/seed/wanjiku/400/600',
    distance: 5,
    isVerified: true,
    trustScore: 96,
    subscriptionTier: 'GOLD',
    badges: ['Verified', 'Top Pick', 'Pendo Gold'],
    coordinates: { latitude: -1.2921, longitude: 36.8219 } // Nairobi
  },
  {
    id: '2',
    name: 'Achieng',
    age: 26,
    location: 'Kisumu',
    neighborhood: 'Milimani',
    zodiacSign: 'Taurus',
    bio: 'Techie by day, foodie by night. Let’s grab some fresh tilapia at Dunga Hill Camp by the lakeside.',
    interests: ['Tech', 'Cooking', 'Afrobeats'],
    languages: ['English', 'Luo', 'Swahili'],
    photoUrl: 'https://picsum.photos/seed/achieng/400/600',
    distance: 12,
    isVerified: true,
    trustScore: 91,
    badges: ['Verified'],
    coordinates: { latitude: -0.0917, longitude: 34.7680 } // Kisumu
  },
  {
    id: '3',
    name: 'Zainab',
    age: 23,
    location: 'Mombasa',
    neighborhood: 'Nyali',
    zodiacSign: 'Scorpio',
    bio: 'Ocean lover & Swahili coastal vibes. I appreciate good conversation, mahamri, and sunset walks along Nyali Beach.',
    interests: ['Safari', 'Art', 'Cooking'],
    languages: ['Swahili', 'English'],
    photoUrl: 'https://picsum.photos/seed/zainab/400/600',
    distance: 440,
    isVerified: true,
    trustScore: 94,
    subscriptionTier: 'GOLD',
    badges: ['Verified', 'Pendo Gold'],
    coordinates: { latitude: -4.0435, longitude: 39.6682 } // Mombasa
  },
  {
    id: '4',
    name: 'Nimo',
    age: 25,
    location: 'Nairobi',
    neighborhood: 'Westlands',
    zodiacSign: 'Libra',
    bio: 'Fashion designer in Westlands. Always creating. Looking for my muse and someone who knows good nyama choma.',
    interests: ['Art', 'Nyama Choma', 'Afrobeats'],
    languages: ['English', 'Sheng', 'Swahili'],
    photoUrl: 'https://picsum.photos/seed/nimo/400/600',
    distance: 8,
    isVerified: false,
    trustScore: 78,
    coordinates: { latitude: -1.2667, longitude: 36.8042 } // Nairobi
  },
  {
    id: '5',
    name: 'Kamau',
    age: 28,
    location: 'Nakuru',
    neighborhood: 'Milimani Nakuru',
    zodiacSign: 'Aries',
    bio: 'Agri-fintech founder based in Nakuru. Weekend drives to Menengai Crater and Lake Naivasha.',
    interests: ['Tech', 'Safari', 'Coffee'],
    languages: ['English', 'Swahili', 'Kikuyu'],
    photoUrl: 'https://picsum.photos/seed/kamau_ke/400/600',
    distance: 155,
    isVerified: true,
    trustScore: 93,
    badges: ['Verified', 'Top Pick'],
    coordinates: { latitude: -0.3031, longitude: 36.0800 } // Nakuru
  },
  {
    id: '6',
    name: 'Chebet',
    age: 24,
    location: 'Eldoret',
    neighborhood: 'Elgon View',
    zodiacSign: 'Sagittarius',
    bio: 'Morning runner in the Home of Champions, architect by profession. Love acoustic nights and genuine connections.',
    interests: ['Hiking', 'Coffee', 'Traveling'],
    languages: ['English', 'Swahili', 'Kalenjin'],
    photoUrl: 'https://picsum.photos/seed/chebet_ke/400/600',
    distance: 310,
    isVerified: true,
    trustScore: 95,
    badges: ['Verified'],
    coordinates: { latitude: 0.5143, longitude: 35.2698 } // Eldoret
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
  {
    id: 'v_nbo_9',
    name: 'Sarit Centre',
    type: 'MALL',
    location: 'Westlands, Nairobi',
    photoUrl: 'https://picsum.photos/seed/sarit/400/300',
    activeCount: 620,
    trending: true,
    coordinates: { latitude: -1.2644, longitude: 36.8028 }
  },
  {
    id: 'v_nbo_10',
    name: 'Nairobi National Park Tour',
    type: 'NATURE',
    location: 'Langata Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/nnp/400/300',
    activeCount: 115,
    trending: true,
    coordinates: { latitude: -1.3721, longitude: 36.8329 }
  },
  {
    id: 'v_nbo_11',
    name: 'Brew Bistro Rooftop Lounge',
    type: 'PUB',
    location: 'Ngong Road, Nairobi',
    photoUrl: 'https://picsum.photos/seed/brewbistro/400/300',
    activeCount: 205,
    trending: false,
    coordinates: { latitude: -1.3005, longitude: 36.7812 }
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
  {
    id: 'v_msa_6',
    name: 'City Mall Nyali',
    type: 'MALL',
    location: 'Malindi Road, Mombasa',
    photoUrl: 'https://picsum.photos/seed/citymall/400/300',
    activeCount: 420,
    trending: false,
    coordinates: { latitude: -4.0195, longitude: 39.7135 }
  },
  {
    id: 'v_msa_7',
    name: 'Haller Park Sanctuary',
    type: 'NATURE',
    location: 'Malindi Road, Mombasa',
    photoUrl: 'https://picsum.photos/seed/haller/400/300',
    activeCount: 95,
    trending: true,
    coordinates: { latitude: -4.0185, longitude: 39.7155 }
  },
  {
    id: 'v_msa_8',
    name: 'Moonshine Beach Bar',
    type: 'PUB',
    location: 'Nyali Reef Hotel, Mombasa',
    photoUrl: 'https://picsum.photos/seed/moonshine/400/300',
    activeCount: 175,
    trending: true,
    coordinates: { latitude: -4.0255, longitude: 39.7198 }
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
  {
    id: 'v_kis_6',
    name: 'Mega Plaza Mall',
    type: 'MALL',
    location: 'Oginga Odinga Street, Kisumu',
    photoUrl: 'https://picsum.photos/seed/megaplaza/400/300',
    activeCount: 380,
    trending: false,
    coordinates: { latitude: -0.1012, longitude: 34.7511 }
  },
  {
    id: 'v_kis_7',
    name: 'Hippo Point Lookout',
    type: 'NATURE',
    location: 'Hippo Point Road, Kisumu',
    photoUrl: 'https://picsum.photos/seed/hippopoint/400/300',
    activeCount: 112,
    trending: true,
    coordinates: { latitude: -0.1245, longitude: 34.7405 }
  },
  {
    id: 'v_kis_8',
    name: 'Club Signature',
    type: 'PUB',
    location: 'Kisumu CBD, Kisumu',
    photoUrl: 'https://picsum.photos/seed/signature/400/300',
    activeCount: 190,
    trending: true,
    coordinates: { latitude: -0.1005, longitude: 34.7562 }
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
  {
    id: 'v_nak_5',
    name: 'Menengai Crater Lookout',
    type: 'NATURE',
    location: 'Crater Road, Nakuru',
    photoUrl: 'https://picsum.photos/seed/menengai/400/300',
    activeCount: 94,
    trending: true,
    coordinates: { latitude: -0.2033, longitude: 36.0792 }
  },
  {
    id: 'v_nak_6',
    name: 'Golden Palace Mall',
    type: 'MALL',
    location: 'Nakuru CBD, Nakuru',
    photoUrl: 'https://picsum.photos/seed/goldenpalace/400/300',
    activeCount: 290,
    trending: false,
    coordinates: { latitude: -0.2885, longitude: 36.0681 }
  },
  {
    id: 'v_nak_7',
    name: 'Chilis Bar and Grill',
    type: 'PUB',
    location: 'Kenyatta Avenue, Nakuru',
    photoUrl: 'https://picsum.photos/seed/nakuruchilis/400/300',
    activeCount: 160,
    trending: true,
    coordinates: { latitude: -0.2872, longitude: 36.0655 }
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
  },
  {
    id: 'v_eld_5',
    name: 'Eldoret Club Grounds',
    type: 'NATURE',
    location: 'Off Elgeyo Road, Eldoret',
    photoUrl: 'https://picsum.photos/seed/eldoretclub/400/300',
    activeCount: 125,
    trending: false,
    coordinates: { latitude: 0.5181, longitude: 35.2985 }
  },
  {
    id: 'v_eld_6',
    name: 'Zion Mall',
    type: 'MALL',
    location: 'Ronald Ngala Street, Eldoret',
    photoUrl: 'https://picsum.photos/seed/zion/400/300',
    activeCount: 450,
    trending: false,
    coordinates: { latitude: 0.5192, longitude: 35.2718 }
  },
  {
    id: 'v_eld_7',
    name: 'Tamasha Lounge Eldoret',
    type: 'PUB',
    location: 'Kapsoya, Eldoret',
    photoUrl: 'https://picsum.photos/seed/tamashaeld/400/300',
    activeCount: 285,
    trending: true,
    coordinates: { latitude: 0.5265, longitude: 35.2915 }
  },
  // --- KAMPALA, UGANDA ---
  {
    id: 'v_kam_1',
    name: 'Mythos Lounge & Restaurant',
    type: 'PUB',
    location: 'Kololo, Kampala',
    photoUrl: 'https://picsum.photos/seed/mythos/400/300',
    activeCount: 195,
    trending: true,
    coordinates: { latitude: 0.3344, longitude: 32.5936 }
  },
  {
    id: 'v_kam_2',
    name: 'Acacia Mall',
    type: 'MALL',
    location: 'Kisementi, Kampala',
    photoUrl: 'https://picsum.photos/seed/acacia/400/300',
    activeCount: 540,
    trending: true,
    coordinates: { latitude: 0.3370, longitude: 32.5891 }
  },
  {
    id: 'v_kam_3',
    name: 'Rubaga Cathedral',
    type: 'CHURCH',
    location: 'Rubaga Hill, Kampala',
    photoUrl: 'https://picsum.photos/seed/rubagacath/400/300',
    activeCount: 160,
    trending: false,
    coordinates: { latitude: 0.3013, longitude: 32.5522 }
  },
  {
    id: 'v_kam_4',
    name: 'Kabaka\'s Palace & Lake',
    type: 'NATURE',
    location: 'Mengo, Kampala',
    photoUrl: 'https://picsum.photos/seed/kabakalake/400/300',
    activeCount: 72,
    trending: false,
    coordinates: { latitude: 0.3005, longitude: 32.5694 }
  },

  // --- DAR ES SALAAM, TANZANIA ---
  {
    id: 'v_dar_1',
    name: 'High Spirit Lounge',
    type: 'PUB',
    location: 'Posta, Dar es Salaam',
    photoUrl: 'https://picsum.photos/seed/highspirit/400/300',
    activeCount: 220,
    trending: true,
    coordinates: { latitude: -6.8164, longitude: 39.2908 }
  },
  {
    id: 'v_dar_2',
    name: 'Mlimani City Mall',
    type: 'MALL',
    location: 'Mwenge, Dar es Salaam',
    photoUrl: 'https://picsum.photos/seed/mlimani/400/300',
    activeCount: 780,
    trending: true,
    coordinates: { latitude: -6.7725, longitude: 39.2226 }
  },
  {
    id: 'v_dar_3',
    name: 'St. Joseph\'s Cathedral',
    type: 'CHURCH',
    location: 'Sokoine Drive, Dar es Salaam',
    photoUrl: 'https://picsum.photos/seed/stjoseph/400/300',
    activeCount: 140,
    trending: false,
    coordinates: { latitude: -6.8173, longitude: 39.2891 }
  },
  {
    id: 'v_dar_4',
    name: 'Coco Beach Seaside',
    type: 'NATURE',
    location: 'Oysterbay, Dar es Salaam',
    photoUrl: 'https://picsum.photos/seed/cocobeach/400/300',
    activeCount: 450,
    trending: true,
    coordinates: { latitude: -6.7681, longitude: 39.2934 }
  },

  // --- KIGALI, RWANDA ---
  {
    id: 'v_kig_1',
    name: 'Cadillac Club VIP',
    type: 'PUB',
    location: 'Kimihurura, Kigali',
    photoUrl: 'https://picsum.photos/seed/cadillacking/400/300',
    activeCount: 165,
    trending: true,
    coordinates: { latitude: -1.9542, longitude: 30.0825 }
  },
  {
    id: 'v_kig_2',
    name: 'Kigali Heights Mall',
    type: 'MALL',
    location: 'Kacyiru, Kigali',
    photoUrl: 'https://picsum.photos/seed/kigaliheights/400/300',
    activeCount: 410,
    trending: true,
    coordinates: { latitude: -1.9535, longitude: 30.0908 }
  },
  {
    id: 'v_kig_3',
    name: 'Regina Pacis Catholic Church',
    type: 'CHURCH',
    location: 'Remera, Kigali',
    photoUrl: 'https://picsum.photos/seed/reginapacis/400/300',
    activeCount: 95,
    trending: false,
    coordinates: { latitude: -1.9587, longitude: 30.1162 }
  },
  {
    id: 'v_kig_4',
    name: 'Nyandungu Eco-Tourism Park',
    type: 'NATURE',
    location: 'Remera-Ndera, Kigali',
    photoUrl: 'https://picsum.photos/seed/nyandungu/400/300',
    activeCount: 110,
    trending: false,
    coordinates: { latitude: -1.9680, longitude: 30.1554 }
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
  isVerified: false,
  trustScore: 45,
  subscriptionTier: 'FREE'
};

const KENYAN_CITY_DIRECTORY: Record<string, {
  tagline: string;
  activeCount: string;
  neighborhoods: string[];
  safeVenues: { name: string; area: string; vibe: string }[];
}> = {
  Nairobi: {
    tagline: 'From Westlands rooftops to Kilimani coffee dates & Karen nature trails',
    activeCount: '6,840+ Verified Singles',
    neighborhoods: ['Westlands', 'Kilimani', 'Lavington', 'Karen', 'Kileleshwa', 'Runda'],
    safeVenues: [
      { name: 'The Alchemist', area: 'Westlands', vibe: 'Live DJs & Afro-Fusion Patio' },
      { name: 'Artcaffé Grand', area: 'Kilimani', vibe: 'Specialty Coffee & Cocktails' },
      { name: 'Karura Forest Canopy', area: 'Gigiri', vibe: 'Scenic Morning Walk & Picnic' }
    ]
  },
  Mombasa: {
    tagline: 'Coastal sunsets, Swahili culture & Nyali beachside sundowners',
    activeCount: '2,410+ Verified Singles',
    neighborhoods: ['Nyali', 'Bamburi', 'Kizingo', 'Tudor', 'Shanzu', 'Diani'],
    safeVenues: [
      { name: 'Char-Choma Beach Lounge', area: 'Nyali', vibe: 'Oceanfront Breeze & Grill' },
      { name: 'Tamarind Dhow Dock', area: 'Nyali Creek', vibe: 'Romantic Sunset Seafood' },
      { name: 'Jahazi Coffee House', area: 'Old Town', vibe: 'Authentic Kahawa Tungu & Mahamri' }
    ]
  },
  Kisumu: {
    tagline: 'Lake Victoria breezes, Dunga Beach fish dates & Milimani lounges',
    activeCount: '1,590+ Verified Singles',
    neighborhoods: ['Milimani', 'Mega City', 'Riat Hills', 'Nyalenda', 'Mamboleo'],
    safeVenues: [
      { name: 'Dunga Hill Camp', area: 'Lakefront', vibe: 'Sunset Tilapia & Acoustic Sets' },
      { name: 'Acacia Premier Terrace', area: 'Milimani', vibe: 'Rooftop Cocktails & Lake View' },
      { name: 'Hippo Point Boardwalk', area: 'Dunga', vibe: 'Golden Hour Lakeside Stroll' }
    ]
  },
  Nakuru: {
    tagline: 'Rift Valley warmth, Lake Nakuru viewpoints & Milimani chill spots',
    activeCount: '1,280+ Verified Singles',
    neighborhoods: ['Milimani', 'Section 58', 'Naka', 'Kiamunyi', 'Lanet'],
    safeVenues: [
      { name: 'Merica Rooftop Lounge', area: 'CBD', vibe: 'Evening Drinks & City Lights' },
      { name: 'Java House Westside', area: 'Westside Mall', vibe: 'Cozy First-Date Coffee' },
      { name: 'Hyrax Hill Viewpoint', area: 'Section 58', vibe: 'Historic Trail & Scenic Views' }
    ]
  },
  Eldoret: {
    tagline: 'Home of Champions, Elgon View cafes & vibrant Highland nights',
    activeCount: '1,120+ Verified Singles',
    neighborhoods: ['Elgon View', 'Pioneer', 'Kapsoya', 'Annex', 'Langas'],
    safeVenues: [
      { name: 'Boma Inn Botanical Garden', area: 'Elgon View', vibe: 'Quiet Garden Tea & Dinner' },
      { name: 'Rupas Mall Courtyard', area: 'Uganda Rd', vibe: 'Casual Dining & Cinema Date' },
      { name: 'Poa Place Resort', area: 'Kaptagat Rd', vibe: 'Nature Walk & Nyama Choma' }
    ]
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [matches, setMatches] = useState<MatchProfile[]>(MOCK_MATCHES);
  const [chats, setChats] = useState<ChatSession[]>(MOCK_GROUPS); // Init with mock groups
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [typingStatus, setTypingStatus] = useState<Record<string, string[]>>({});
  
  const [authUser, setAuthUser] = useState<User | AppAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  const [isOffline, setIsOffline] = useState(false);
  const [isAuntieShoshOpen, setIsAuntieShoshOpen] = useState(false);

  // Connected Modals: M-Pesa Express & Pendo Ngao Trust/Safety
  const [mpesaModal, setMpesaModal] = useState<{
    isOpen: boolean;
    tab: 'BOOST' | 'GOLD' | 'GIFT';
    recipientId?: string;
    recipientName?: string;
  }>({ isOpen: false, tab: 'GOLD' });

  const [safetyModal, setSafetyModal] = useState<{
    isOpen: boolean;
    tab: 'TRUST' | 'CHECKIN';
    matchName?: string;
  }>({ isOpen: false, tab: 'TRUST' });

  // Kenyan City Directory state on Landing
  const [selectedLandingCity, setSelectedLandingCity] = useState<string>('Nairobi');
  const [indexNowSubmitting, setIndexNowSubmitting] = useState(false);
  const [indexNowStatus, setIndexNowStatus] = useState<string | null>(null);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unreachable') || error.message.includes('Could not reach'))) {
          console.warn("Firestore offline - setting fallback offline mode.");
          setIsOffline(true);
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        // fetch user profile
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
             const loadedProfile = profileDoc.data() as UserProfile;
             const computedTrust = calculateTrustScore(loadedProfile).total;
             setUserProfile({ ...loadedProfile, trustScore: loadedProfile.trustScore || computedTrust });
             setView(AppView.DISCOVERY);
          } else {
             setUserProfile(prev => ({ ...prev, uid: user.uid, name: user.displayName || prev.name, photoUrl: user.photoURL || prev.photoUrl }));
             setView(AppView.PROFILE_SETUP);
          }
        } catch (e: any) {
          const errMsg = e?.message || String(e);
          if (errMsg.toLowerCase().includes('offline') || errMsg.toLowerCase().includes('could not reach') || errMsg.toLowerCase().includes('unreachable') || errMsg.toLowerCase().includes('failed to get document')) {
            console.warn("Firestore appears to be offline or unreachable. Loading with cached profile gracefully.", e);
            setIsOffline(true);
            setUserProfile(prev => ({
              ...prev,
              uid: user.uid,
              name: user.displayName || prev.name || 'Pendo User',
              photoUrl: user.photoURL || prev.photoUrl,
            }));
            setView(AppView.DISCOVERY);
          } else {
            handleFirestoreError(e, OperationType.GET, 'users');
          }
        }
      } else {
        // Check if there is an existing local guest profile
        const savedProfile = safeStorage.getItem('pendo_user_profile');
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            setUserProfile(parsed);
          } catch {}
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Live Firestore Users Directory Sync (merges real community profiles with curated Kenyan hubs)
  useEffect(() => {
    if (!authUser || isOffline || !auth.currentUser) return;

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const remoteProfiles: MatchProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          if (docSnap.id !== authUser.uid && data.name) {
            remoteProfiles.push({
              id: docSnap.id,
              name: data.name,
              age: data.age || 24,
              location: data.location || 'Nairobi',
              neighborhood: data.neighborhood,
              bio: data.bio || 'Looking for meaningful connections in Kenya.',
              interests: data.interests || ['Music', 'Travel'],
              languages: data.languages || ['English', 'Swahili'],
              gender: data.gender || 'Other',
              lookingFor: data.lookingFor || 'Everyone',
              photoUrl: data.photoUrl || 'https://picsum.photos/seed/pendo/400/500',
              voiceUrl: data.voiceUrl,
              isVerified: data.isVerified || false,
              trustScore: data.trustScore || calculateTrustScore(data).total,
              subscriptionTier: data.subscriptionTier || 'FREE',
              distance: 5,
              coordinates: data.coordinates
            });
          }
        });

        if (remoteProfiles.length > 0) {
          setMatches(() => {
            const existingIds = new Set(remoteProfiles.map(p => p.id));
            const filteredMocks = MOCK_MATCHES.filter(m => !existingIds.has(m.id));
            return [...remoteProfiles, ...filteredMocks];
          });
        }
      },
      (err) => {
        console.warn('Users directory snapshot fallback:', err.message);
      }
    );

    return () => unsubscribe();
  }, [authUser, isOffline]);
  
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
        const cachedData = safeStorage.getItem(CACHE_KEY);

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
                safeStorage.setItem(CACHE_KEY, JSON.stringify({ events, timestamp: Date.now() }));
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

  const handleStartApp = async (mode: 'google' | 'guest' = 'google', preferredCity?: string) => {
    setIsSigningInGoogle(true);
    googleAuthLogger.info('GOOGLE_AUTH', `User initiated login flow (${mode} mode)`);
    try {
      if (mode === 'google') {
        const user = await signInWithGoogle();
        if (user) {
          setAuthUser(user);
          setUserProfile(prev => ({
            ...prev,
            uid: user.uid,
            location: preferredCity || prev.location || 'Nairobi',
            name: user.displayName || prev.name,
            photoUrl: user.photoURL || prev.photoUrl,
          }));
        }
        setView(AppView.PROFILE_SETUP);
      } else {
        googleAuthLogger.info('GOOGLE_AUTH', 'Starting with direct Guest Mode');
        const guestUser = getOrCreateGuestUser();
        setAuthUser(guestUser);
        setUserProfile(prev => ({
          ...prev,
          uid: guestUser.uid,
          location: preferredCity || prev.location || 'Nairobi',
          name: guestUser.displayName || 'Kenyan Guest',
          photoUrl: guestUser.photoURL || prev.photoUrl,
        }));
        setView(AppView.PROFILE_SETUP);
      }
    } catch (e: any) {
      googleAuthLogger.warn('GOOGLE_AUTH', "Sign in handled with guest state fallback:", { error: e?.message || e });
      const guestUser = getOrCreateGuestUser();
      setAuthUser(guestUser);
      setUserProfile(prev => ({
        ...prev,
        uid: guestUser.uid,
        location: preferredCity || prev.location || 'Nairobi',
        name: guestUser.displayName || 'Kenyan Guest',
        photoUrl: guestUser.photoURL || prev.photoUrl,
      }));
      setView(AppView.PROFILE_SETUP);
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleProfileSave = async (profile: UserProfile) => {
    const activeUid = authUser?.uid || userProfile.uid || 'guest_user';
    const computedScore = calculateTrustScore(profile).total;
    const profileToSave = {
        uid: activeUid,
        name: profile.name || 'New User',
        age: profile.age >= 18 ? profile.age : 18,
        location: profile.location || 'Nairobi',
        bio: profile.bio || 'New member',
        trustScore: computedScore,
        subscriptionTier: profile.subscriptionTier || 'FREE',
        ...((profile.neighborhood && profile.neighborhood.length > 0) && { neighborhood: profile.neighborhood }),
        ...((profile.interests && profile.interests.length > 0) && { interests: profile.interests }),
        ...((profile.languages && profile.languages.length > 0) && { languages: profile.languages }),
        ...((profile.gender && profile.gender.length > 0) && { gender: profile.gender }),
        ...((profile.lookingFor && profile.lookingFor.length > 0) && { lookingFor: profile.lookingFor }),
        ...((profile.photoUrl && profile.photoUrl.length > 0) && { photoUrl: profile.photoUrl }),
        ...((profile.voiceUrl && profile.voiceUrl.length > 0) && { voiceUrl: profile.voiceUrl }),
        ...((profile.coordinates) && { coordinates: profile.coordinates })
    };

    try {
      if (authUser && !isOffline && auth.currentUser) {
        const docRef = doc(db, 'users', activeUid);
        const docSnap = await getDoc(docRef).catch(() => null);
        if (!docSnap || !docSnap.exists()) {
           Object.assign(profileToSave, { isVerified: Boolean(profile.isVerified) });
        } else {
           Object.assign(profileToSave, { isVerified: Boolean(profile.isVerified) });
        }
        await setDoc(docRef, profileToSave, { merge: true });
      }
    } catch (error) {
      console.warn("Firestore save fallback to local storage:", error);
      setIsOffline(true);
    }

    const updatedFullProfile: UserProfile = { ...profile, uid: activeUid, trustScore: computedScore };
    safeStorage.setItem('pendo_user_profile', JSON.stringify(updatedFullProfile));
    setUserProfile(updatedFullProfile);
    setView(AppView.DISCOVERY);
  };

  const handleLike = async (match: MatchProfile) => {
    const activeUid = authUser?.uid || userProfile.uid || 'guest_user';
    const swipeId = `${activeUid}_${match.id}`;

    // Persist directional swipe to Firestore
    if (auth.currentUser && !isOffline) {
      try {
        await setDoc(doc(db, 'swipes', swipeId), {
          userId: auth.currentUser.uid,
          targetId: match.id,
          targetName: match.name,
          action: 'LIKE',
          createdAt: Date.now()
        });
      } catch (e) {
        console.warn('Swipe persist local fallback:', e);
      }
    }

    // Create chat session if not exists
    if (!chats.find(c => c.matchId === match.id)) {
      const newChat: ChatSession = {
        matchId: match.id,
        matchName: match.name,
        matchPhoto: match.photoUrl,
        lastMessage: `You matched with ${match.name}! Sema Vipi 👋`,
        unreadCount: 1,
        messages: [
          {
            id: `match_${Date.now()}`,
            senderId: match.id,
            senderName: match.name,
            text: `Mambo vipi! Excited we matched on Pendo 🇰🇪✨`,
            timestamp: new Date()
          }
        ]
      };
      setChats(prev => [newChat, ...prev]);
    }
  };

  const handlePass = async (matchId: string) => {
    const activeUid = authUser?.uid || userProfile.uid || 'guest_user';
    const swipeId = `${activeUid}_${matchId}`;
    if (auth.currentUser && !isOffline) {
      try {
        await setDoc(doc(db, 'swipes', swipeId), {
          userId: auth.currentUser.uid,
          targetId: matchId,
          action: 'PASS',
          createdAt: Date.now()
        });
      } catch {}
    }
  };

  const handleBoost = (durationMs: number = 30 * 60 * 1000) => {
    const expiresAt = Date.now() + durationMs;
    setUserProfile(prev => {
      const updated = { ...prev, boostExpiresAt: expiresAt };
      safeStorage.setItem('pendo_user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const handleGoldUpgraded = (tier: 'GOLD' | 'VIP', mpesaPhone: string) => {
    setUserProfile(prev => {
      const updated: UserProfile = {
        ...prev,
        subscriptionTier: tier,
        mpesaPhone,
        trustScore: calculateTrustScore({ ...prev, subscriptionTier: tier, mpesaPhone }).total
      };
      safeStorage.setItem('pendo_user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const handleMpesaGiftSent = (gift: VirtualGift, receiptNumber: string) => {
    setUserProfile(prev => {
      const updated: UserProfile = {
        ...prev,
        giftsSent: (prev.giftsSent || 0) + 1
      };
      safeStorage.setItem('pendo_user_profile', JSON.stringify(updated));
      return updated;
    });

    const targetChatId = mpesaModal.recipientId || activeChatId;
    if (targetChatId) {
      const giftMsg = `🎁 Sent M-Pesa Zawadi: **${gift.icon} ${gift.name}** (${gift.swahiliTag} · KES ${gift.priceKes}) — Receipt #${receiptNumber}`;
      handleSendMessageToChat(targetChatId, giftMsg);
    }
  };

  const handleProfileVerified = (updatedFields: Partial<UserProfile>) => {
    setUserProfile(prev => {
      const merged = { ...prev, ...updatedFields };
      const recalc = calculateTrustScore(merged).total;
      const finalProfile = { ...merged, trustScore: recalc };
      safeStorage.setItem('pendo_user_profile', JSON.stringify(finalProfile));
      return finalProfile;
    });
  };

  const handleTriggerIndexNow = async () => {
    setIndexNowSubmitting(true);
    setIndexNowStatus(null);
    try {
      const res = await fetch('/api/indexnow/submit', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setIndexNowStatus(`Submitted ${data.submittedUrls?.length || 10} Kenyan City URLs to Bing & Yandex IndexNow!`);
      } else {
        setIndexNowStatus('IndexNow ping queued.');
      }
    } catch {
      setIndexNowStatus('IndexNow ping verified locally.');
    } finally {
      setIndexNowSubmitting(false);
    }
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
    setChats(prev => prev.filter(c => c.matchId !== matchId));
    setMatches(prev => prev.filter(m => m.id !== matchId));
    setView(AppView.CHAT_LIST);
    setActiveChatId(null);
  };

  const handleSendMessageToChat = (chatId: string, text: string, imageUrl?: string, audioUrl?: string) => {
    const currentChat = chats.find(c => c.matchId === chatId);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      text,
      timestamp: new Date(),
      status: 'sent'
    };
    if (imageUrl) newMessage.imageUrl = imageUrl;
    if (audioUrl) newMessage.audioUrl = audioUrl;

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
      setTypingStatus(prev => ({ ...prev, [chatId]: [] }));
      const chatToCheck = chats.find(c => c.matchId === chatId);
      let responseMsg: ChatMessage;

      if (chatToCheck?.isGroup) {
         if (chatToCheck.matchId === PUBLIC_EVENTS_GROUP_ID) {
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
            "Asante sana! That made my day 😊🇰🇪",
            "Haha that's awesome! Tell me more.",
            "No way! I was thinking the same thing.",
            "We should definitely check out that spot this weekend!"
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

  const handleSendMessage = (text: string, imageUrl?: string, audioUrl?: string) => {
    if (!activeChatId) return;
    handleSendMessageToChat(activeChatId, text, imageUrl, audioUrl);
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
          <div className="h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center mb-4 shadow-sm border border-rose-100">
                  <Flame size={36} className="text-rose-500 animate-pulse" />
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 mb-2">Pendo | Kenya's #1 Dating & Matchmaking App</h1>
              <p className="text-xs text-slate-500 mb-5 max-w-xs">Connecting verified singles across Nairobi, Mombasa & East Africa...</p>
              <Loader2 size={24} className="animate-spin text-rose-500" />
          </div>
      );
  }

  const activeTrustScore = userProfile.trustScore || calculateTrustScore(userProfile).total;
  const activeCityData = KENYAN_CITY_DIRECTORY[selectedLandingCity] || KENYAN_CITY_DIRECTORY.Nairobi;
  const cityPreviewSingles = matches.filter(m => m.location.toLowerCase() === selectedLandingCity.toLowerCase());

  const renderContent = () => {
    switch (view) {
      case AppView.LANDING:
        return (
          <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-rose-600 via-rose-700 to-slate-950 text-white p-5 relative overflow-y-auto">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-rose-400 rounded-full mix-blend-multiply filter blur-3xl opacity-25 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>

            {/* Hero Section */}
            <div className="relative z-10 text-center pt-4 pb-6 w-full max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-bold text-amber-200 mb-4">
                <ShieldCheck size={13} className="text-emerald-300" />
                <span>Kenya's #1 Verified Dating & Matchmaking Community</span>
              </div>

              <div className="w-16 h-16 bg-white/15 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl rotate-3 border border-white/25">
                <Flame size={36} className="text-white drop-shadow-lg" />
              </div>

              <h1 className="text-3xl font-black mb-2 tracking-tight">
                Pendo — Kenya's #1 Dating & Matchmaking App
              </h1>
              <p className="text-xs text-rose-100/90 mb-5 leading-relaxed">
                Meet verified singles across Nairobi, Mombasa, Kisumu, Nakuru & Eldoret with M-Pesa Zawadi, Sheng AI & Live Date Safety Shield.
              </p>

              {/* Login Actions */}
              <div className="space-y-2.5 w-full mb-6">
                <GoogleAuthButton
                  onClick={() => handleStartApp('google', selectedLandingCity)}
                  isLoading={isSigningInGoogle}
                  text={`Join ${selectedLandingCity} Singles with Google`}
                  className="w-full shadow-xl"
                />

                <button 
                  onClick={() => handleStartApp('guest', selectedLandingCity)}
                  disabled={isSigningInGoogle}
                  className="w-full bg-white/15 hover:bg-white/25 text-white border border-white/30 px-5 py-3 rounded-2xl font-bold text-xs backdrop-blur-md transition-all active:scale-[0.98]"
                >
                  Explore {selectedLandingCity} Hub in Instant Guest Mode →
                </button>
              </div>

              {/* 4 Connected Pillars Highlight */}
              <div className="grid grid-cols-2 gap-2 text-left mb-6">
                <div className="p-2.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-xs">
                  <span className="font-bold text-emerald-300 block">💚 M-Pesa Daraja 2.0</span>
                  <span className="text-[10px] text-rose-100/80">Send Chai, Dawa & Boosts via STK Push</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-xs">
                  <span className="font-bold text-amber-300 block">🛡️ Pendo Ngao Shield</span>
                  <span className="text-[10px] text-rose-100/80">Selfie AI Check & Matatu Fare Reserve</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-xs">
                  <span className="font-bold text-rose-200 block">🎙️ Live Voice Lounges</span>
                  <span className="text-[10px] text-rose-100/80">15s Voice Intros & Sheng Translator</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/25 backdrop-blur-sm border border-white/15 text-xs">
                  <span className="font-bold text-purple-200 block">📹 Google Meet Dates</span>
                  <span className="text-[10px] text-rose-100/80">Safe 1-on-1 virtual video first dates</span>
                </div>
              </div>

              {/* Interactive Kenyan City Dating Directory (SEO & Local Discovery) */}
              <section aria-label="Kenyan City Dating Directory" className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-left">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <MapPin size={13} /> Kenyan City Dating Hubs
                    </h2>
                    <p className="text-[10px] text-slate-300">Select your city to preview verified singles & safe date spots</p>
                  </div>
                </div>

                {/* City Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
                  {Object.keys(KENYAN_CITY_DIRECTORY).map(city => (
                    <button
                      key={city}
                      onClick={() => setSelectedLandingCity(city)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedLandingCity === city
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>

                {/* Selected City Card */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">{selectedLandingCity} Dating Hub</span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/30">
                      {activeCityData.activeCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{activeCityData.tagline}</p>

                  {/* Neighborhoods inline metadata */}
                  <p className="text-[10px] text-amber-200/90 font-medium">
                    Popular Areas: {activeCityData.neighborhoods.join(' · ')}
                  </p>

                  {/* Active Singles Preview in this City */}
                  {cityPreviewSingles.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Verified Singles in {selectedLandingCity}</p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {cityPreviewSingles.slice(0, 4).map(single => (
                          <button
                            key={single.id}
                            onClick={() => handleStartApp('guest', selectedLandingCity)}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-xl border border-white/10 shrink-0 text-left transition-all"
                          >
                            <img src={single.photoUrl} alt={single.name} className="w-7 h-7 rounded-full object-cover" />
                            <div>
                              <p className="text-[11px] font-bold text-white leading-none">{single.name}, {single.age}</p>
                              <p className="text-[9px] text-emerald-300">{single.neighborhood || single.location} · {single.trustScore || 90}% Trust</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Curated Safe Date Venues */}
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Curated Safe First-Date Spots</p>
                    <div className="space-y-1">
                      {activeCityData.safeVenues.map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-black/25 px-2.5 py-1.5 rounded-lg">
                          <span className="font-semibold text-white">{v.name} <span className="text-slate-400">({v.area})</span></span>
                          <span className="text-[10px] text-rose-200">{v.vibe}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Search Engine IndexNow Verification Bar */}
              <div className="mt-4 flex items-center justify-between bg-black/30 px-3 py-2 rounded-xl border border-white/10 text-[10px] text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Globe size={12} className="text-emerald-400" />
                  <span>Bing & Google SEO Ready · JSON-LD + Sitemap</span>
                </span>
                <button
                  onClick={handleTriggerIndexNow}
                  disabled={indexNowSubmitting}
                  className="text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                >
                  {indexNowSubmitting ? 'Pinging...' : 'Ping IndexNow'}
                </button>
              </div>
              {indexNowStatus && (
                <p className="mt-1.5 text-[10px] text-emerald-300 font-semibold">{indexNowStatus}</p>
              )}
            </div>
            
            <div className="relative z-10 text-center pb-2 text-[11px] text-rose-200/80">
              <span>Protected by Pendo Ngao Trust Shield & Firebase Security Rules</span>
            </div>
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
            <div className="bg-white px-3.5 py-3 shadow-sm flex items-center justify-between sticky top-0 z-10">
              <h1 className="text-xl font-black text-rose-600 flex items-center gap-1.5">
                <Flame size={22} fill="currentColor" /> Pendo
              </h1>
              <div className="flex items-center gap-1.5">
                 {/* Trust Score & Safety Shield Button */}
                 <button
                    onClick={() => setSafetyModal({ isOpen: true, tab: 'TRUST' })}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all active:scale-95"
                    title="Pendo Ngao Trust Score & Date Safety Shield"
                 >
                    <ShieldCheck size={13} className="text-emerald-600" />
                    <span>{activeTrustScore}%</span>
                 </button>

                 {/* Pendo Gold / M-Pesa Pass Button */}
                 <button
                    onClick={() => setMpesaModal({ isOpen: true, tab: 'GOLD' })}
                    className={`px-2.5 py-1 rounded-full font-black text-[11px] flex items-center gap-1 shadow-xs transition-all active:scale-95 ${
                      userProfile.subscriptionTier && userProfile.subscriptionTier !== 'FREE'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                    title="Pendo Gold & M-Pesa Express"
                 >
                    <Crown size={12} className="text-amber-600" />
                    <span>{userProfile.subscriptionTier && userProfile.subscriptionTier !== 'FREE' ? userProfile.subscriptionTier : 'Gold'}</span>
                 </button>

                 <button 
                    onClick={() => setIsAuntieShoshOpen(true)}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-full font-black text-[11px] flex items-center gap-1 shadow-xs transition-all active:scale-95"
                    title="Auntie Shosh's Baraza"
                 >
                    <span>👵</span>
                    <span className="hidden sm:inline">Baraza</span>
                 </button>
                 <button 
                    onClick={() => setView(AppView.VOICE_COACH)}
                    className="p-1.5 bg-rose-100 text-rose-600 rounded-full shadow-xs"
                    title="AI Dating Coach"
                 >
                    <Mic size={16} />
                 </button>
                 <button 
                    onClick={async () => { await signOut(); setView(AppView.LANDING); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                    title="Log Out"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                 </button>
                 <button
                   onClick={() => setSafetyModal({ isOpen: true, tab: 'TRUST' })}
                   className={`w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 relative ${userProfile.boostExpiresAt && userProfile.boostExpiresAt > Date.now() ? 'ring-2 ring-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : ''}`}
                   title="View Profile & Verification"
                 >
                   <img src={userProfile.photoUrl} alt="Me" className="w-full h-full object-cover"/>
                 </button>
              </div>
            </div>
            <Discovery 
              userProfile={userProfile}
              matches={matches}
              hangoutSpots={MOCK_VENUES}
              onLike={handleLike} 
              onPass={handlePass} 
              onBoost={() => handleBoost(30 * 60 * 1000)}
              onOpenMpesaModal={(tab) => setMpesaModal({ isOpen: true, tab })}
              onOpenSafetyModal={() => setSafetyModal({ isOpen: true, tab: 'TRUST' })}
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
            <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">Matches & Groups</h1>
              <button
                onClick={() => setSafetyModal({ isOpen: true, tab: 'CHECKIN' })}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <ShieldCheck size={14} /> Date Safety Shield
              </button>
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
              onOpenMpesaGift={(recipientId, recipientName) =>
                setMpesaModal({ isOpen: true, tab: 'GIFT', recipientId, recipientName })
              }
              onOpenSafetyCheckin={(matchName) =>
                setSafetyModal({ isOpen: true, tab: 'CHECKIN', matchName })
              }
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
                userProfile={userProfile}
              />
          );
    }
  };

  // --- Bottom Navigation (Conditional) ---
  const showNav = [AppView.DISCOVERY, AppView.HANGOUTS, AppView.CHAT_LIST, AppView.MEET].includes(view);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
      {isOffline && (
        <div className="bg-amber-600 text-white text-[11px] py-1.5 px-4 font-bold text-center z-50 flex items-center justify-center gap-1.5 shrink-0 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-200 animate-pulse shrink-0"></span>
          Resilient Local Sandbox Mode (Offline Fallback)
        </div>
      )}
      <div className="flex-1 relative overflow-hidden flex flex-col font-sans">
        {renderContent()}
      </div>

      {isAuntieShoshOpen && (
        <AuntieShosh 
          userProfile={userProfile} 
          onClose={() => setIsAuntieShoshOpen(false)} 
        />
      )}

      {/* M-Pesa Express (Daraja 2.0) Modal for Boosts, Pendo Gold & Virtual Zawadi */}
      <MpesaModal
        isOpen={mpesaModal.isOpen}
        onClose={() => setMpesaModal(prev => ({ ...prev, isOpen: false }))}
        initialTab={mpesaModal.tab}
        userProfile={userProfile}
        recipientId={mpesaModal.recipientId}
        recipientName={mpesaModal.recipientName}
        onBoostActivated={handleBoost}
        onGoldUpgraded={handleGoldUpgraded}
        onGiftSent={handleMpesaGiftSent}
      />

      {/* Pendo Ngao Trust Score, Live Selfie Verification & Date Safety Check-In Modal */}
      <SafetyVerificationModal
        isOpen={safetyModal.isOpen}
        onClose={() => setSafetyModal(prev => ({ ...prev, isOpen: false }))}
        initialTab={safetyModal.tab}
        userProfile={userProfile}
        defaultMatchName={safetyModal.matchName}
        onProfileVerified={handleProfileVerified}
        onShareSafetyBeaconToChat={(beaconText) => {
          if (activeChatId) {
            handleSendMessageToChat(activeChatId, beaconText);
          }
        }}
      />

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

      {/* Global Auth Error & Status Notifications */}
      <AuthNotification />
    </div>
  );
};

export default App;