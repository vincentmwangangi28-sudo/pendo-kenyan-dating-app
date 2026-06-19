export interface UserProfile {
  name: string;
  age: number;
  location: string;
  neighborhood?: string;
  zodiacSign?: string;
  bio: string;
  interests: string[];
  languages: string[];
  gender: string;
  lookingFor: string;
  photoUrl: string;
  voiceUrl?: string; // New field for audio intro
  boostExpiresAt?: number; // Timestamp for when profile boost expires
  isVerified?: boolean; // Profile verification status
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface MatchProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  neighborhood?: string;
  zodiacSign?: string;
  bio: string;
  interests: string[];
  languages: string[];
  photoUrl: string;
  voiceUrl?: string; // New field for audio intro
  distance: number; // in km
  isVerified?: boolean; // Profile verification status
  badges?: ('Verified' | 'Top Pick' | 'Newbie' | 'Compatible')[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface GroupProfile {
  id: string;
  name: string;
  description: string;
  interest: string;
  photoUrl: string;
  membersCount: number;
}

export interface HangoutSpot {
  id: string;
  name: string;
  type: 'PUB' | 'MALL' | 'CHURCH' | 'NATURE' | 'EVENT';
  location: string;
  photoUrl: string;
  activeCount: number; // How many people are there now
  trending: boolean;
  mapsUri?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ChatMessage {
  id: string;
  senderId: 'me' | string;
  senderName?: string; // Added for groups
  text: string;
  imageUrl?: string;
  audioUrl?: string; // Voice note
  timestamp: Date;
  isSystem?: boolean; 
  status?: 'sent' | 'delivered' | 'read'; // Read receipt
  translation?: string; // To store AI explanation of the message
  reactions?: { [emoji: string]: number }; // Map of emoji to count
  userReaction?: string; // The emoji reaction of the current user
}

export interface ChatSession {
  matchId: string; // Used as groupId for groups
  isGroup?: boolean;
  isVenue?: boolean; // New flag for location-based groups
  matchName: string; // or Group Name
  matchPhoto: string; // or Group Photo
  lastMessage: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export enum AppView {
  LANDING = 'LANDING',
  PROFILE_SETUP = 'PROFILE_SETUP',
  DISCOVERY = 'DISCOVERY',
  HANGOUTS = 'HANGOUTS',
  CHAT_LIST = 'CHAT_LIST',
  CHAT_ROOM = 'CHAT_ROOM',
  GROUP_CREATION = 'GROUP_CREATION',
  VOICE_COACH = 'VOICE_COACH',
  MEET = 'MEET',
}