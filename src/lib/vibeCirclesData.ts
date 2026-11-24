import { VibeMeetupEvent } from '../../types';

export interface VibeCircleRule {
  name: string;
  tagline: string;
  description: string;
  minAge: number;
  minTrustScore: number;
  recommendedTier: 'FREE';
  groupChatId: string;
  routePath: string;
}

export const VIBE_CIRCLE_RULES: Record<string, VibeCircleRule> = {
  'Kilimani Mums': {
    name: 'Kilimani Mums',
    tagline: 'Independent Nairobi queens · Brunch & genuine company',
    description: 'Verified, self-made Kilimani, Kileleshwa & Lavington women seeking drama-free loyalty, brunch dates, and vibrant weekend company.',
    minAge: 21,
    minTrustScore: 70,
    recommendedTier: 'FREE',
    groupChatId: 'g_kilimani_mums',
    routePath: '/kilimani-mums'
  },
  'Mama wa Harrier': {
    name: 'Mama wa Harrier',
    tagline: 'Boss ladies · Naivasha road trips & Westlands fine dining',
    description: 'Confident Kenyan boss ladies who enjoy spontaneous Rift Valley drives, rooftop dinners, and attentive younger or peer companions.',
    minAge: 21,
    minTrustScore: 70,
    recommendedTier: 'FREE',
    groupChatId: 'g_mama_harrier',
    routePath: '/mama-wa-harrier'
  },
  'Ben 10': {
    name: 'Ben 10',
    tagline: 'Charming young kings (21+) · Fitness, style & loyalty',
    description: 'Energetic, respectful Kenyan gentlemen ready to match queens with great energy, gym-fit discipline, and attentive companionship.',
    minAge: 21,
    minTrustScore: 70,
    recommendedTier: 'FREE',
    groupChatId: 'g_ben10',
    routePath: '/ben10-dating-kenya'
  },
  'Wababa': {
    name: 'Wababa',
    tagline: 'Runda & Karen gentlemen · Soft Life & Free Zawadi',
    description: 'Established Nairobi & Mombasa executives offering fine dining, Diani weekend flights, and complimentary Virtual Zawadi pampering.',
    minAge: 21,
    minTrustScore: 75,
    recommendedTier: 'FREE',
    groupChatId: 'g_wababa',
    routePath: '/wababa-soft-life-kenya'
  },
  'Soft Life': {
    name: 'Soft Life',
    tagline: 'Curated aesthetic, coastal getaways & zero-stress dates',
    description: 'Curated luxury dinners, spa sundowners, and aesthetic lifestyle dates across Westlands, Karen, and Diani Beach.',
    minAge: 18,
    minTrustScore: 60,
    recommendedTier: 'FREE',
    groupChatId: 'g_wababa',
    routePath: '/wababa-soft-life-kenya'
  },
  'Sherehe Crew': {
    name: 'Sherehe Crew',
    tagline: 'Live DJs, Westlands rooftops & Ngong Hills concerts',
    description: 'High-energy Nairobi and coastal nightlife lovers organizing table link-ups, festival convoys, and Sunday plot.',
    minAge: 18,
    minTrustScore: 40,
    recommendedTier: 'FREE',
    groupChatId: 'g_sherehe',
    routePath: '/nairobi-dating'
  },
  'Serious & Marriage': {
    name: 'Serious & Marriage',
    tagline: 'Intentional courtship · ID-verified Kenyan professionals',
    description: 'Values-first matchmaking for Kenyan singles at home and in the diaspora looking for committed relationships and marriage.',
    minAge: 21,
    minTrustScore: 70,
    recommendedTier: 'FREE',
    groupChatId: 'g_serious',
    routePath: '/serious-relationships-kenya'
  }
};

export interface VibeQuizQuestion {
  id: string;
  prompt: string;
  options: {
    id: string;
    label: string;
    circleScores: Record<string, number>;
  }[];
}

export const VIBE_COMPATIBILITY_QUIZ: VibeQuizQuestion[] = [
  {
    id: 'weekend_plan',
    prompt: 'What does your ideal Kenyan Sunday look like?',
    options: [
      {
        id: 'brunch',
        label: 'Prosecco brunch in Kilimani with close friends',
        circleScores: { 'Kilimani Mums': 3, 'Soft Life': 2 }
      },
      {
        id: 'roadtrip',
        label: 'A scenic road trip to Naivasha or Nanyuki',
        circleScores: { 'Mama wa Harrier': 3, 'Ben 10': 2 }
      },
      {
        id: 'diani',
        label: 'Diani sundowners, fine dining, or coastal lounge',
        circleScores: { 'Wababa': 3, 'Soft Life': 2 }
      },
      {
        id: 'coffee_intentional',
        label: 'Quiet Karen coffee date & deep life conversation',
        circleScores: { 'Serious & Marriage': 3, 'Kilimani Mums': 1 }
      }
    ]
  },
  {
    id: 'energy_role',
    prompt: 'What energy do you bring to a Pendo match?',
    options: [
      {
        id: 'queen_boss',
        label: 'Self-made boss energy seeking loyal, attentive company',
        circleScores: { 'Mama wa Harrier': 3, 'Kilimani Mums': 2 }
      },
      {
        id: 'young_king',
        label: 'Fit, charming & ready to spoil with attention and vibes',
        circleScores: { 'Ben 10': 3, 'Sherehe Crew': 1 }
      },
      {
        id: 'provider',
        label: 'Established gentleman ready for Virtual Zawadi & getaways',
        circleScores: { 'Wababa': 3, 'Serious & Marriage': 1 }
      },
      {
        id: 'party_starter',
        label: 'Always know the best Westlands DJ & weekend plot',
        circleScores: { 'Sherehe Crew': 3, 'Soft Life': 1 }
      }
    ]
  },
  {
    id: 'first_date_style',
    prompt: 'Pick your ideal first date via Pendo Safe Check-In:',
    options: [
      {
        id: 'rooftop',
        label: 'Inti or Hero rooftop dinner in Westlands',
        circleScores: { 'Soft Life': 2, 'Wababa': 2, 'Kilimani Mums': 1 }
      },
      {
        id: 'alchemist',
        label: 'Drinks, Afrobeats & live crowd at The Alchemist',
        circleScores: { 'Sherehe Crew': 3, 'Ben 10': 2 }
      },
      {
        id: 'nyama_drive',
        label: 'Kikopey or Kamakis Mbuzi Choma afternoon drive',
        circleScores: { 'Mama wa Harrier': 2, 'Ben 10': 2 }
      },
      {
        id: 'artcaffe',
        label: 'Daytime Java or Artcaffe courtyard meet',
        circleScores: { 'Serious & Marriage': 3, 'Kilimani Mums': 1 }
      }
    ]
  },
  {
    id: 'priority_value',
    prompt: 'What matters most after matching?',
    options: [
      {
        id: 'discretion_loyalty',
        label: 'Mutual respect, discretion & loyal vibes',
        circleScores: { 'Kilimani Mums': 2, 'Wababa': 2, 'Mama wa Harrier': 2 }
      },
      {
        id: 'generosity',
        label: 'Soft life aesthetics, Virtual Zawadi & pampering',
        circleScores: { 'Soft Life': 3, 'Wababa': 2 }
      },
      {
        id: 'chemistry',
        label: 'High attraction, fitness & effortless banter',
        circleScores: { 'Ben 10': 3, 'Sherehe Crew': 2 }
      },
      {
        id: 'future',
        label: 'Long-term alignment & future marriage goals',
        circleScores: { 'Serious & Marriage': 4 }
      }
    ]
  }
];

export function scoreVibeCompatibilityQuiz(answers: Record<string, string>): {
  recommendedCircle: string;
  compatibilityPercent: number;
  runnerUpCircle: string;
  sheshSummary: string;
} {
  const tally: Record<string, number> = {
    'Kilimani Mums': 0,
    'Mama wa Harrier': 0,
    'Ben 10': 0,
    'Wababa': 0,
    'Soft Life': 0,
    'Sherehe Crew': 0,
    'Serious & Marriage': 0
  };

  for (const question of VIBE_COMPATIBILITY_QUIZ) {
    const selectedOptionId = answers[question.id];
    const option = question.options.find(o => o.id === selectedOptionId);
    if (option) {
      for (const [circle, pts] of Object.entries(option.circleScores)) {
        tally[circle] = (tally[circle] || 0) + pts;
      }
    }
  }

  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const topCircle = ranked[0]?.[0] || 'Kilimani Mums';
  const topScore = ranked[0]?.[1] || 4;
  const runnerUpCircle = ranked[1]?.[0] || 'Soft Life';
  const compatibilityPercent = Math.min(98, Math.max(76, 68 + topScore * 3));

  const summaries: Record<string, string> = {
    'Kilimani Mums': 'Classy, loyal, and drama-free — Kilimani brunches and refined companionship suit your rhythm.',
    'Mama wa Harrier': 'Bold boss energy — spontaneous Naivasha drives and confident company are your sweet spot.',
    'Ben 10': 'Sharp style and high energy — queens in Westlands and Nyali will love your attentive vibe.',
    'Wababa': 'Executive generosity — rooftop dinners, Diani getaways, and free Virtual Zawadi match your lifestyle.',
    'Soft Life': 'Aesthetic, calm, and curated — fine dining, rooftop sundowners, and zero stress.',
    'Sherehe Crew': 'Pure weekend plot — live DJs, Westlands tables, and unforgettable Nairobi nights.',
    'Serious & Marriage': 'Intentional and grounded — Ngao-verified courtship built for lasting commitment.'
  };

  return {
    recommendedCircle: topCircle,
    compatibilityPercent,
    runnerUpCircle,
    sheshSummary: summaries[topCircle] || summaries['Kilimani Mums']
  };
}

export const INITIAL_VIBE_MEETUPS: VibeMeetupEvent[] = [
  {
    id: 'evt_kilimani_brunch',
    title: 'Kilimani Mums Sunday Prosecco Brunch',
    vibeCircle: 'Kilimani Mums',
    city: 'Nairobi',
    venueName: 'Sierra Brasserie, Yaya Centre',
    dateLabel: 'Sun · 1:00 PM EAT',
    coverKes: 0,
    minAge: 21,
    minTrustScore: 70,
    maxCapacity: 30,
    rsvpCount: 19,
    description: 'Verified Kilimani & Kileleshwa members table with live acoustic soul and free community RSVP.',
    safeHostName: 'Wangari M. (Verified Host)'
  },
  {
    id: 'evt_naivasha_harrier',
    title: 'Mama wa Harrier Naivasha Lake Convoy',
    vibeCircle: 'Mama wa Harrier',
    city: 'Naivasha',
    venueName: 'Enashipai Resort Lounge, Moi South Lake',
    dateLabel: 'Sat · 11:30 AM EAT',
    coverKes: 0,
    minAge: 21,
    minTrustScore: 70,
    maxCapacity: 24,
    rsvpCount: 15,
    description: 'Saturday morning self-drive meetup from Westlands to Naivasha for lakeside nyama choma and sundowners.',
    safeHostName: 'Shiro K. (Boss Circle)'
  },
  {
    id: 'evt_ben10_mixer',
    title: 'Ben 10 & Queens Westlands Rooftop Mixer',
    vibeCircle: 'Ben 10',
    city: 'Nairobi',
    venueName: 'Hero Bar, Trademark Hotel',
    dateLabel: 'Fri · 7:30 PM EAT',
    coverKes: 0,
    minAge: 21,
    minTrustScore: 70,
    maxCapacity: 40,
    rsvpCount: 28,
    description: 'Verified young gentlemen (21+) meet established Nairobi & Coast queens in a Ngao-monitored rooftop lounge.',
    safeHostName: 'Brayo O. (Circle Captain)'
  },
  {
    id: 'evt_wababa_diani',
    title: 'Wababa & Soft Life Diani Sunset Yacht',
    vibeCircle: 'Wababa',
    city: 'Diani',
    venueName: 'Ali Barbour’s & Forty Thieves, Diani',
    dateLabel: 'Sat · 5:00 PM EAT',
    coverKes: 0,
    minAge: 21,
    minTrustScore: 75,
    maxCapacity: 20,
    rsvpCount: 12,
    description: 'Executive coastal evening featuring oceanfront cocktails, free Virtual Zawadi gifting, and curated table hospitality.',
    safeHostName: 'Hon. Omondi (Circle Host)'
  },
  {
    id: 'evt_sherehe_alchemist',
    title: 'Sherehe Crew Afrobeats & Amapiano Night',
    vibeCircle: 'Sherehe Crew',
    city: 'Nairobi',
    venueName: 'The Alchemist Bar, Westlands',
    dateLabel: 'Fri · 9:00 PM EAT',
    coverKes: 0,
    minAge: 18,
    minTrustScore: 40,
    maxCapacity: 60,
    rsvpCount: 44,
    description: 'Link up at the reserved Pendo group booth before midnight sets—Ngao Date Safety Shield enabled.',
    safeHostName: 'Kevoh D. (Sherehe Host)'
  },
  {
    id: 'evt_serious_karen',
    title: 'Intentional & Marriage Coffee Courtyard',
    vibeCircle: 'Serious & Marriage',
    city: 'Nairobi',
    venueName: 'Talisman Garden, Karen',
    dateLabel: 'Sun · 4:00 PM EAT',
    coverKes: 0,
    minAge: 21,
    minTrustScore: 70,
    maxCapacity: 25,
    rsvpCount: 18,
    description: 'Guided small-table conversations for verified, marriage-minded Kenyan & diaspora professionals.',
    safeHostName: 'Ngao Verified Concierge'
  }
];
