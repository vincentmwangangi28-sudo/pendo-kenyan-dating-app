export interface SeoRouteConfig {
  path: string;
  city: string;
  label: string;
  title: string;
  description: string;
  badge: string;
  openModal?: 'ALIKA' | 'AUNTIE_SHOSH';
}

export const SEO_ROUTES: SeoRouteConfig[] = [
  {
    path: '/nairobi-dating',
    city: 'Nairobi',
    label: 'Nairobi Singles',
    title: 'Nairobi Dating App | Meet Verified Singles in Westlands, Kilimani & Karen — Pendo',
    description: 'Connect with 6,840+ verified Nairobi singles in Westlands, Kilimani, Lavington, and Karen. Safe coffee dates, voice lounges, and M-Pesa Zawadi on Pendo.',
    badge: '6,840+ Active in Nairobi'
  },
  {
    path: '/mombasa-dating',
    city: 'Mombasa',
    label: 'Mombasa Singles',
    title: 'Mombasa Dating & Coastal Matchmaking | Nyali, Bamburi & Old Town — Pendo',
    description: 'Meet 2,410+ verified coastal singles in Mombasa, Nyali, Bamburi, and Kizingo. Experience authentic Swahili romance and safe beachside dates on Pendo.',
    badge: '2,410+ Active in Mombasa'
  },
  {
    path: '/kisumu-dating',
    city: 'Kisumu',
    label: 'Kisumu Singles',
    title: 'Kisumu Dating App | Meet Lakeside Singles in Milimani & Dunga — Pendo',
    description: 'Discover 1,590+ verified singles in Kisumu, Milimani, and Dunga Hill. Connect for lakeside tilapia dates, voice lounges, and real relationships on Pendo.',
    badge: '1,590+ Active in Kisumu'
  },
  {
    path: '/nakuru-dating',
    city: 'Nakuru',
    label: 'Nakuru Singles',
    title: 'Nakuru Dating App | Meet Rift Valley Singles in Milimani & Section 58 — Pendo',
    description: 'Join 1,280+ verified singles in Nakuru, Section 58, and Milimani. Find authentic Rift Valley relationships and curated first-date lounges on Pendo.',
    badge: '1,280+ Active in Nakuru'
  },
  {
    path: '/eldoret-dating',
    city: 'Eldoret',
    label: 'Eldoret Singles',
    title: 'Eldoret Dating App | Meet Singles in Elgon View & Home of Champions — Pendo',
    description: 'Connect with 1,120+ verified singles in Eldoret, Elgon View, and Pioneer. Real highland matchmaking, voice lounges, and safe video dates on Pendo.',
    badge: '1,120+ Active in Eldoret'
  },
  {
    path: '/thika-dating',
    city: 'Thika',
    label: 'Thika & Kiambu',
    title: 'Thika & Kiambu Road Dating | Meet Verified Singles Near You — Pendo',
    description: 'Meet 980+ verified singles across Thika, Ruiru, Juja, and Kiambu Road. Discover safe date spots and authentic relationships on Pendo.',
    badge: '980+ Active in Thika'
  },
  {
    path: '/diani-dating',
    city: 'Diani',
    label: 'Diani & South Coast',
    title: 'Diani Beach & Ukunda Dating | South Coast Singles & Matchmaking — Pendo',
    description: 'Connect with 840+ verified singles in Diani Beach, Ukunda, and Kwale. Coastal sundowners, beach lounges, and verified matchmaking on Pendo.',
    badge: '840+ Active in Diani'
  },
  {
    path: '/naivasha-dating',
    city: 'Naivasha',
    label: 'Naivasha Singles',
    title: 'Naivasha Dating & Weekend Hangouts | Meet Lakeside Singles — Pendo',
    description: 'Meet 760+ verified singles in Naivasha, Moi South Lake Road, and Karagita. Connect for weekend safaris, boat rides, and real relationships on Pendo.',
    badge: '760+ Active in Naivasha'
  },
  {
    path: '/nanyuki-dating',
    city: 'Nanyuki',
    label: 'Nanyuki & Mt Kenya',
    title: 'Nanyuki & Mount Kenya Dating | Meet Laikipia Singles — Pendo',
    description: 'Discover 690+ verified singles in Nanyuki, Timau, and Laikipia. Connect over scenic Mount Kenya views and safe cozy first-date venues on Pendo.',
    badge: '690+ Active in Nanyuki'
  },
  {
    path: '/nyeri-dating',
    city: 'Nyeri',
    label: 'Nyeri Singles',
    title: 'Nyeri & Central Highlands Dating | Verified Kenyan Singles — Pendo',
    description: 'Meet 720+ verified singles in Nyeri, Karatina, and Othaya. Build meaningful relationships with Pendo Ngao Trust Shield verification.',
    badge: '720+ Active in Nyeri'
  },
  {
    path: '/machakos-dating',
    city: 'Machakos',
    label: 'Machakos & Syokimau',
    title: 'Machakos, Syokimau & Kitengela Dating App | Verified Singles — Pendo',
    description: 'Connect with 890+ verified singles in Machakos, Syokimau, Athi River, and Kitengela. Safe dates, voice lounges, and intentional matchmaking.',
    badge: '890+ Active in Machakos'
  },
  {
    path: '/kenyan-diaspora',
    city: 'Diaspora',
    label: 'Kenyan Diaspora',
    title: 'Kenyan Diaspora Dating | Connect with Kenyans in UK, USA, UAE & Canada — Pendo',
    description: 'Meet 3,450+ verified Kenyan diaspora singles in London, Dallas, Dubai, Toronto, and Nairobi. Bridge the distance with video dates and M-Pesa Zawadi.',
    badge: '3,450+ Diaspora Singles'
  },
  {
    path: '/serious-relationships-kenya',
    city: 'Nairobi',
    label: 'Marriage & Serious',
    title: 'Serious Relationships & Marriage Matchmaking in Kenya — Pendo',
    description: 'Looking for a serious relationship or marriage partner in Kenya? Connect with ID-verified, intentional Kenyan professionals on Pendo.',
    badge: '95%+ Trust Verified'
  },
  {
    path: '/christian-dating-kenya',
    city: 'Nairobi',
    label: 'Christian Singles KE',
    title: 'Christian Dating Kenya | Faith-First Kenyan Singles & Church Hangouts — Pendo',
    description: 'Meet verified Christian singles across CITAM, Mavuno, Nairobi Chapel, and churches across Kenya for faith-centered courtship and marriage.',
    badge: 'Faith-Centered Singles'
  },
  {
    path: '/muslim-dating-kenya',
    city: 'Mombasa',
    label: 'Muslim Singles KE',
    title: 'Muslim Dating & Halal Matchmaking in Kenya | Nairobi & Mombasa — Pendo',
    description: 'Connect with respectful, verified Kenyan Muslim singles in Mombasa, Nairobi, and the Coast for intentional Halal courtship and Nikah.',
    badge: 'Halal & Verified'
  },
  {
    path: '/voice-lounge',
    city: 'Nairobi',
    label: 'Live Voice Baraza',
    title: 'Live Kenyan Voice Lounges & Auntie Shosh Matchmaking Baraza — Pendo',
    description: 'Join live audio dating lounges and speak with Auntie Shosh AI for Sheng icebreakers, relationship advice, and real-time voice speed dating.',
    badge: 'Live Audio Baraza',
    openModal: 'AUNTIE_SHOSH'
  },
  {
    path: '/alika-rafiki',
    city: 'Nairobi',
    label: 'Invite & Free Boost',
    title: 'Alika Rafiki | Invite Friends on WhatsApp & Unlock Free Pendo Boost',
    description: 'Share Pendo with your squad on WhatsApp to earn instant +10% Ngao Trust Score and a free 30-minute VIP Profile Boost.',
    badge: 'Free 30-Min Boost',
    openModal: 'ALIKA'
  }
];

export const CANONICAL_URLS: string[] = [
  'https://www.pendo.website/',
  ...SEO_ROUTES.map(r => `https://www.pendo.website${r.path}`)
];

export function findSeoRouteByPathOrHash(pathname: string, hash: string): SeoRouteConfig | null {
  const cleanPath = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  const directMatch = SEO_ROUTES.find(r => r.path.toLowerCase() === cleanPath);
  if (directMatch) return directMatch;

  const combined = `${cleanPath} ${(hash || '').toLowerCase()}`;
  for (const route of SEO_ROUTES) {
    const slug = route.path.replace('/', '').replace('-dating', '');
    if (combined.includes(slug) || combined.includes(route.city.toLowerCase())) {
      return route;
    }
  }
  return null;
}
