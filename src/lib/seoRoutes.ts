export interface SeoRouteConfig {
  path: string;
  city: string;
  label: string;
  h1: string;
  heroSubtitle: string;
  title: string;
  description: string;
  keywords: string;
  badge: string;
  priority: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly';
  openModal?: 'ALIKA' | 'AUNTIE_SHOSH';
}

export const SITE_ORIGIN = 'https://www.pendo.website';
export const SITEMAP_LASTMOD = '2026-11-19';

export const SEO_ROUTES: SeoRouteConfig[] = [
  {
    path: '/nairobi-dating',
    city: 'Nairobi',
    label: 'Nairobi Singles',
    h1: 'Nairobi Dating — Meet 6,840+ Verified Singles',
    heroSubtitle: 'Connect with verified singles in Westlands, Kilimani, Lavington, and Karen with M-Pesa Zawadi, Voice Lounges & Live Date Safety Shield.',
    title: 'Nairobi Dating App | Verified Nairobi Singles — Pendo',
    description: 'Meet 6,840+ verified Nairobi singles in Westlands, Kilimani, and Karen. Enjoy safe coffee dates, voice lounges, and M-Pesa Zawadi on Pendo.',
    keywords: 'Nairobi dating app, Nairobi singles, Westlands dating, Kilimani singles, Pendo Nairobi',
    badge: '6,840+ Active in Nairobi',
    priority: '0.95',
    changefreq: 'daily'
  },
  {
    path: '/mombasa-dating',
    city: 'Mombasa',
    label: 'Mombasa Singles',
    h1: 'Mombasa Dating — Meet 2,410+ Coastal Singles',
    heroSubtitle: 'Discover authentic coastal romance in Nyali, Bamburi, Kizingo, and Old Town with verified profiles and safe beachside date spots.',
    title: 'Mombasa Dating App | Verified Coastal Singles — Pendo',
    description: 'Connect with 2,410+ verified singles in Mombasa, Nyali, Bamburi, and Kizingo. Experience Swahili romance and safe coastal dates on Pendo.',
    keywords: 'Mombasa dating app, Mombasa singles, Nyali dating, Coast Kenya dating, Pendo Mombasa',
    badge: '2,410+ Active in Mombasa',
    priority: '0.95',
    changefreq: 'daily'
  },
  {
    path: '/kisumu-dating',
    city: 'Kisumu',
    label: 'Kisumu Singles',
    h1: 'Kisumu Dating — Meet 1,590+ Lakeside Singles',
    heroSubtitle: 'Connect with verified singles in Milimani, Mega City, and Dunga Hill for lakeside sunset dates, voice lounges, and serious relationships.',
    title: 'Kisumu Dating App | Lakeside Singles in Kenya — Pendo',
    description: 'Discover 1,590+ verified singles in Kisumu, Milimani, and Dunga Hill. Connect for lakeside dates, voice lounges, and real relationships on Pendo.',
    keywords: 'Kisumu dating app, Kisumu singles, Dunga Beach dating, Nyanza singles, Pendo Kisumu',
    badge: '1,590+ Active in Kisumu',
    priority: '0.9',
    changefreq: 'daily'
  },
  {
    path: '/nakuru-dating',
    city: 'Nakuru',
    label: 'Nakuru Singles',
    h1: 'Nakuru Dating — Meet 1,280+ Rift Valley Singles',
    heroSubtitle: 'Meet verified singles across Milimani, Section 58, Naka, and Kiamunyi with curated Rift Valley first-date venues and Ngao Trust Shield.',
    title: 'Nakuru Dating App | Rift Valley Singles — Pendo',
    description: 'Join 1,280+ verified singles in Nakuru, Section 58, and Milimani. Find authentic Rift Valley relationships and safe date spots on Pendo.',
    keywords: 'Nakuru dating app, Nakuru singles, Rift Valley dating, Section 58 singles, Pendo Nakuru',
    badge: '1,280+ Active in Nakuru',
    priority: '0.9',
    changefreq: 'daily'
  },
  {
    path: '/eldoret-dating',
    city: 'Eldoret',
    label: 'Eldoret Singles',
    h1: 'Eldoret Dating — Meet 1,120+ Highland Singles',
    heroSubtitle: 'Connect with verified singles in Elgon View, Pioneer, and Kapsoya for intentional matchmaking, voice lounges, and safe video dates.',
    title: 'Eldoret Dating App | Elgon View & Uasin Gishu — Pendo',
    description: 'Meet 1,120+ verified singles in Eldoret, Elgon View, and Pioneer. Enjoy Highland matchmaking, voice lounges, and safe video dates on Pendo.',
    keywords: 'Eldoret dating app, Eldoret singles, Elgon View dating, Uasin Gishu singles, Pendo Eldoret',
    badge: '1,120+ Active in Eldoret',
    priority: '0.9',
    changefreq: 'daily'
  },
  {
    path: '/thika-dating',
    city: 'Thika',
    label: 'Thika & Kiambu',
    h1: 'Thika & Kiambu Dating — 980+ Verified Singles',
    heroSubtitle: 'Meet verified singles across Thika, Ruiru, Juja, and Kiambu Road with safe waterfall & mall first-date spots and M-Pesa Zawadi.',
    title: 'Thika & Kiambu Road Dating | Verified Singles — Pendo',
    description: 'Connect with 980+ verified singles across Thika, Ruiru, Juja, and Kiambu Road. Discover safe date spots and authentic relationships on Pendo.',
    keywords: 'Thika dating, Kiambu Road singles, Ruiru dating, Juja singles, Pendo Thika',
    badge: '980+ Active in Thika',
    priority: '0.85',
    changefreq: 'daily'
  },
  {
    path: '/diani-dating',
    city: 'Diani',
    label: 'Diani & South Coast',
    h1: 'Diani & South Coast Dating — 840+ Singles',
    heroSubtitle: 'Meet verified coastal singles in Diani Beach, Ukunda, and Galu Kinondo for oceanfront sundowners and authentic South Coast connections.',
    title: 'Diani Beach & Ukunda Dating | South Coast — Pendo',
    description: 'Meet 840+ verified singles in Diani Beach, Ukunda, and Kwale. Enjoy coastal sundowners, beach lounges, and verified matchmaking on Pendo.',
    keywords: 'Diani dating, Ukunda singles, South Coast Kenya dating, Kwale singles, Pendo Diani',
    badge: '840+ Active in Diani',
    priority: '0.85',
    changefreq: 'daily'
  },
  {
    path: '/naivasha-dating',
    city: 'Naivasha',
    label: 'Naivasha Singles',
    h1: 'Naivasha Dating — Meet 760+ Lakeside Singles',
    heroSubtitle: 'Connect with verified singles in Naivasha and Moi South Lake Road for lakeside coffee, weekend safaris, and meaningful relationships.',
    title: 'Naivasha Dating App | Lakeside Singles Kenya — Pendo',
    description: 'Meet 760+ verified singles in Naivasha, Moi South Lake Road, and Karagita. Connect for weekend safaris, lakeside dates, and romance on Pendo.',
    keywords: 'Naivasha dating, Naivasha singles, Moi South Lake dating, Nakuru County singles, Pendo Naivasha',
    badge: '760+ Active in Naivasha',
    priority: '0.85',
    changefreq: 'daily'
  },
  {
    path: '/nanyuki-dating',
    city: 'Nanyuki',
    label: 'Nanyuki & Mt Kenya',
    h1: 'Nanyuki & Mt Kenya Dating — 690+ Singles',
    heroSubtitle: 'Meet verified singles across Nanyuki, Timau, and Laikipia with scenic Mount Kenya first-date venues and Ngao Trust Score safety.',
    title: 'Nanyuki & Mt Kenya Dating | Laikipia Singles — Pendo',
    description: 'Discover 690+ verified singles in Nanyuki, Timau, and Laikipia. Connect over scenic Mount Kenya dates and verified matchmaking on Pendo.',
    keywords: 'Nanyuki dating, Laikipia singles, Mount Kenya dating, Timau singles, Pendo Nanyuki',
    badge: '690+ Active in Nanyuki',
    priority: '0.85',
    changefreq: 'daily'
  },
  {
    path: '/nyeri-dating',
    city: 'Nyeri',
    label: 'Nyeri Singles',
    h1: 'Nyeri & Central Kenya Dating — 720+ Singles',
    heroSubtitle: 'Connect with verified singles in Nyeri, Karatina, and Othaya for intentional courtship backed by Pendo Ngao Trust Shield verification.',
    title: 'Nyeri & Central Kenya Dating | Verified Singles — Pendo',
    description: 'Meet 720+ verified singles in Nyeri, Karatina, and Othaya. Build meaningful relationships with Pendo Ngao Trust Shield verification today.',
    keywords: 'Nyeri dating, Karatina singles, Central Kenya dating, Othaya singles, Pendo Nyeri',
    badge: '720+ Active in Nyeri',
    priority: '0.85',
    changefreq: 'daily'
  },
  {
    path: '/machakos-dating',
    city: 'Machakos',
    label: 'Machakos & Syokimau',
    h1: 'Machakos & Syokimau Dating — 890+ Singles',
    heroSubtitle: 'Meet verified singles across Machakos, Syokimau, Athi River, and Kitengela for safe dates, voice lounges, and genuine connections.',
    title: 'Machakos & Syokimau Dating | Verified Singles — Pendo',
    description: 'Connect with 890+ verified singles in Machakos, Syokimau, Athi River, and Kitengela. Enjoy safe dates and intentional matchmaking on Pendo.',
    keywords: 'Machakos dating, Syokimau singles, Kitengela dating, Athi River singles, Pendo Machakos',
    badge: '890+ Active in Machakos',
    priority: '0.85',
    changefreq: 'daily'
  },
  {
    path: '/kenyan-diaspora',
    city: 'Diaspora',
    label: 'Kenyan Diaspora',
    h1: 'Kenyan Diaspora Dating — 3,450+ Global Singles',
    heroSubtitle: 'Bridge the distance between London, Dallas, Dubai, Toronto, and Nairobi with verified Google Meet dates and M-Pesa Zawadi.',
    title: 'Kenyan Diaspora Dating | UK, USA, UAE & Kenya — Pendo',
    description: 'Meet 3,450+ verified Kenyan diaspora singles in London, Dallas, Dubai, Toronto, and Nairobi. Enjoy video dates and M-Pesa Zawadi on Pendo.',
    keywords: 'Kenyan diaspora dating, Kenyans in UK dating, Kenyans in USA dating, Kenyans in Dubai singles, Pendo Diaspora',
    badge: '3,450+ Diaspora Singles',
    priority: '0.95',
    changefreq: 'daily'
  },
  {
    path: '/serious-relationships-kenya',
    city: 'Nairobi',
    label: 'Marriage & Serious',
    h1: 'Serious Relationships & Marriage in Kenya',
    heroSubtitle: 'Meet ID-verified, marriage-minded Kenyan professionals looking for committed courtship with Pendo Ngao 95%+ Trust verification.',
    title: 'Serious Relationships & Marriage in Kenya — Pendo',
    description: 'Looking for a serious relationship or marriage partner in Kenya? Connect with ID-verified, intentional Kenyan professionals on Pendo.',
    keywords: 'serious dating Kenya, Kenyan marriage matchmaking, intentional dating Nairobi, verified Kenyan singles',
    badge: '95%+ Trust Verified',
    priority: '0.9',
    changefreq: 'daily'
  },
  {
    path: '/christian-dating-kenya',
    city: 'Nairobi',
    label: 'Christian Singles KE',
    h1: 'Christian Dating Kenya — Faith-First Singles',
    heroSubtitle: 'Connect with verified Kenyan Christian singles from Nairobi, Mombasa, Nakuru & Eldoret for faith-centered courtship and marriage.',
    title: 'Christian Dating Kenya | Faith-First Singles — Pendo',
    description: 'Meet verified Christian singles across Kenya for faith-centered courtship, church hangouts, and marriage-minded connections on Pendo.',
    keywords: 'Christian dating Kenya, Kenyan Christian singles, Christian marriage Kenya, church singles Nairobi',
    badge: 'Faith-Centered Singles',
    priority: '0.9',
    changefreq: 'daily'
  },
  {
    path: '/muslim-dating-kenya',
    city: 'Mombasa',
    label: 'Muslim Singles KE',
    h1: 'Muslim Dating & Halal Nikah in Kenya',
    heroSubtitle: 'Meet respectful, verified Kenyan Muslim singles across Mombasa, Nairobi, and the Coast for intentional Halal courtship and Nikah.',
    title: 'Muslim Dating & Halal Nikah Kenya — Pendo',
    description: 'Connect with respectful, verified Kenyan Muslim singles in Mombasa, Nairobi, and the Coast for intentional Halal courtship and Nikah.',
    keywords: 'Muslim dating Kenya, Halal matchmaking Kenya, Kenyan Muslim singles, Mombasa Nikah, Nairobi Muslim singles',
    badge: 'Halal & Verified',
    priority: '0.9',
    changefreq: 'daily'
  },
  {
    path: '/voice-lounge',
    city: 'Nairobi',
    label: 'Live Voice Baraza',
    h1: 'Live Kenyan Voice Lounges & Auntie Shosh',
    heroSubtitle: 'Join real-time Kenyan audio speed dating and get witty Sheng & Swahili relationship coaching from Auntie Shosh AI.',
    title: 'Live Kenyan Voice Lounges & Speed Dating — Pendo',
    description: 'Join live audio dating lounges and speak with Auntie Shosh AI for Sheng icebreakers, dating advice, and voice speed dating on Pendo.',
    keywords: 'Kenya voice lounge dating, Auntie Shosh AI, Kenyan speed dating, Sheng dating coach, Pendo voice baraza',
    badge: 'Live Audio Baraza',
    priority: '0.9',
    changefreq: 'always',
    openModal: 'AUNTIE_SHOSH'
  },
  {
    path: '/alika-rafiki',
    city: 'Nairobi',
    label: 'Invite & Free Boost',
    h1: 'Alika Rafiki — Free Pendo Boost & Trust Score',
    heroSubtitle: 'Invite trusted Kenyan friends on WhatsApp to unlock +10% Pendo Ngao Trust Score and a free 30-minute VIP Profile Boost.',
    title: 'Alika Rafiki | Invite Friends & Free Boost — Pendo',
    description: 'Share Pendo with your friends on WhatsApp to earn +10% Ngao Trust Score and unlock a free 30-minute VIP Profile Boost in Kenya.',
    keywords: 'Alika Rafiki Pendo, Kenyan dating referral, free Pendo boost, WhatsApp dating invite Kenya',
    badge: 'Free 30-Min Boost',
    priority: '0.85',
    changefreq: 'daily',
    openModal: 'ALIKA'
  }
];

export const CANONICAL_URLS: string[] = [
  `${SITE_ORIGIN}/`,
  ...SEO_ROUTES.map(r => `${SITE_ORIGIN}${r.path}`)
];

export function generateSitemapXml(lastmod: string = SITEMAP_LASTMOD): string {
  const rootEntry = `  <url>
    <loc>${SITE_ORIGIN}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en-KE" href="${SITE_ORIGIN}/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />
    <image:image>
      <image:loc>${SITE_ORIGIN}/pwa-512x512.png</image:loc>
      <image:title>Pendo — Kenya's #1 Dating &amp; Matchmaking App</image:title>
      <image:caption>Verified Kenyan singles across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret &amp; Diaspora</image:caption>
    </image:image>
  </url>`;

  const routeEntries = SEO_ROUTES.map(route => {
    const url = `${SITE_ORIGIN}${route.path}`;
    const safeTitle = route.h1
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const safeCaption = route.description
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en-KE" href="${url}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${url}" />
    <image:image>
      <image:loc>${SITE_ORIGIN}/pwa-512x512.png</image:loc>
      <image:title>${safeTitle}</image:title>
      <image:caption>${safeCaption}</image:caption>
    </image:image>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rootEntry}
${routeEntries}
</urlset>
`;
}

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
