import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Globe,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  ArrowLeft,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { safeStorage } from '../services/storage';
import { ADMIN_DISPLAY_NAME, ADMIN_EMAIL, AuthLikeUser, isVincentAdminUser } from '../src/lib/adminAuth';
import { CANONICAL_URLS, SITE_ORIGIN, generateSitemapIndexXml, generateSitemapXml } from '../src/lib/seoRoutes';

interface AdminDashboardProps {
  authUser: AuthLikeUser | null;
  onBackToApp: () => void;
  onSignOut: () => void;
}

type AdminTab = 'GOOGLE_SEO' | 'APP_STORES' | 'CHECKLIST';
type StoreFeeFilter = 'ALL' | 'FREE' | 'PAID';

interface SeoAuditCheck {
  id: string;
  label: string;
  ok: boolean;
  url: string;
}

interface StoreTarget {
  id: string;
  name: string;
  feeLabel: string;
  isFree: boolean;
  packageFormat: string;
  portalUrl: string;
  summary: string;
  steps: string[];
  copyPayload: string;
}

const SHORT_DESC = '100% free verified Kenyan dating in Nairobi, Mombasa, Kisumu & Diaspora.';
const LONG_DESC = `Pendo is Kenya's 100% free verified dating, matchmaking, and social discovery app connecting real Kenyan singles across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Thika, Diani, Naivasha, Nanyuki, Nyeri, Machakos, and the Kenyan Diaspora (UK, USA, UAE, Canada & Australia).

WHY SINGLES CHOOSE PENDO KENYA:
• 100% Free Forever — Unlimited swipes, free Profile Boosts, free Virtual Zawadi gifts (Chai, Dawa, Nyama Choma), Vibe Circles, and live Voice Lounges with zero subscriptions or paywalls.
• Pendo Ngao Trust Shield (0–100% Score) — Live pose selfie checks, voice intros, and Google verification to stop catfishing.
• Kenyan Vibe Circles — Filter and connect with Kilimani Mums, Mama wa Harrier, Ben 10, Wababa, Soft Life, Sherehe Crew, Christian & Muslim singles, or Serious & Marriage matches.
• Live Date Safety Check-In — Share your curated public date venue and timed check-in beacon with a trusted emergency contact.
• Sheng AI Coach & Auntie Shosh Baraza — Fun Kenyan icebreakers, Swahili translations, and voice speed-dating lounges.
• Mobile Data Saver Mode — Fast, lightweight PWA built for Safaricom, Airtel & Telkom mobile networks.

Strictly 18+ adults only. Protected by community verification and real-time safety tools.`;

const STORE_KEYWORDS = 'Kenya dating, Nairobi singles, Mombasa dating, Kisumu singles, Kenyan diaspora, free dating app, African matchmaking, Kilimani singles, Eldoret singles, Nakuru dating';

const GOOGLE_SCHEMA_JSONLD = `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "Pendo Dating Kenya",
      "url": "https://www.pendo.website/",
      "applicationCategory": "SocialNetworkingApplication",
      "operatingSystem": "All",
      "inLanguage": ["en-KE", "sw-KE"],
      "areaServed": { "@type": "Country", "name": "Kenya" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KES" }
    },
    {
      "@type": "Organization",
      "name": "Pendo Kenya",
      "url": "https://www.pendo.website/",
      "logo": "https://www.pendo.website/pwa-512x512.png"
    }
  ]
}`;

const CLEAN_ROBOTS_TXT = `User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin

User-agent: Googlebot-Image
Allow: /

User-agent: Google-InspectionTool
Allow: /
Disallow: /api/
Disallow: /admin

User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /admin

User-agent: AhrefsBot
Allow: /
Disallow: /admin

User-agent: AhrefsSiteAudit
Allow: /
Disallow: /admin

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin

Sitemap: https://www.pendo.website/sitemap.xml
Sitemap: https://www.pendo.website/sitemap_index.xml`;

const INDEXNOW_PAYLOAD_JSON = JSON.stringify(
  {
    host: 'www.pendo.website',
    key: '8zvbpmffgtwz251x44qqw5h5ugnvyyva',
    keyLocation: 'https://www.pendo.website/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt',
    urlList: CANONICAL_URLS,
  },
  null,
  2
);

const CHECKLIST_ITEMS = [
  { id: 'gsc_verify', group: 'Google Search & Indexing', label: 'Verify pendo.website / https://www.pendo.website/ in Google Search Console' },
  { id: 'gsc_sitemap', group: 'Google Search & Indexing', label: 'Submit https://www.pendo.website/sitemap.xml & sitemap_index.xml in Search Console' },
  { id: 'gsc_inspect', group: 'Google Search & Indexing', label: 'Request indexing on top priority URLs (/, /nairobi-dating, /mombasa-dating, /vibe-circles)' },
  { id: 'bing_verify', group: 'Google Search & Indexing', label: 'Verify Bing Webmaster Tools & confirm IndexNow ping returns HTTP 200/202' },
  { id: 'ms_store', group: 'Free App Stores', label: 'Package PWA on pwabuilder.com & submit to Microsoft Store (Windows)' },
  { id: 'samsung_store', group: 'Free App Stores', label: 'Submit signed Android APK to Samsung Galaxy Store (Free developer account)' },
  { id: 'huawei_store', group: 'Free App Stores', label: 'Submit Android APK / Quick App to Huawei AppGallery (Free developer account)' },
  { id: 'amazon_store', group: 'Free App Stores', label: 'Submit Android APK / Web App to Amazon Appstore (Free developer account)' },
  { id: 'indie_stores', group: 'Free App Stores', label: 'Submit to Free Android & PWA Directories (APKPure, Uptodown, Aptoide, Appscope)' },
  { id: 'google_play', group: 'Major Paid Stores', label: 'Generate Play App Signing SHA-256 -> assetlinks.json & upload .aab to Google Play' },
  { id: 'apple_store', group: 'Major Paid Stores', label: 'Build iOS Capacitor/PWABuilder package & submit to Apple App Store Connect' },
];

const LOCAL_ADMIN_STORAGE_KEY = 'pendo_vincent_admin_state_v1';

interface CopyFieldCardProps {
  id: string;
  label: string;
  hint?: string;
  value: string;
  multiline?: boolean;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}

const CopyFieldCard: React.FC<CopyFieldCardProps> = ({
  id,
  label,
  hint,
  value,
  multiline = false,
  copiedId,
  onCopy,
}) => {
  const isCopied = copiedId === id;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-900">{label}</p>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={() => onCopy(id, value)}
          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 border transition-colors cursor-pointer ${
            isCopied
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          {isCopied ? <Check size={14} /> : <ClipboardCopy size={14} />}
          <span>{isCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      {multiline ? (
        <pre className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] font-mono text-slate-800 whitespace-pre-wrap break-all max-h-48 overflow-y-auto select-all">
          {value}
        </pre>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-mono text-slate-800 break-all select-all">
          {value}
        </div>
      )}
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  authUser,
  onBackToApp,
  onSignOut,
}) => {
  const isAuthorized = isVincentAdminUser(authUser);

  const [activeTab, setActiveTab] = useState<AdminTab>('GOOGLE_SEO');
  const [storeFilter, setStoreFilter] = useState<StoreFeeFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [androidSha256, setAndroidSha256] = useState(
    'REPLACE_WITH_YOUR_ANDROID_SIGNING_SHA256_FINGERPRINT'
  );
  const [appleTeamId, setAppleTeamId] = useState('TEAMID');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [savingChecklist, setSavingChecklist] = useState(false);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditChecks, setAuditChecks] = useState<SeoAuditCheck[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [indexNowStatus, setIndexNowStatus] = useState<string | null>(null);
  const [indexNowLoading, setIndexNowLoading] = useState(false);

  const sitemapXml = useMemo(() => generateSitemapXml(), []);
  const sitemapIndexXml = useMemo(() => generateSitemapIndexXml(), []);

  const assetLinksJson = useMemo(
    () =>
      JSON.stringify(
        [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: 'com.pendo.kenyandating',
              sha256_cert_fingerprints: [androidSha256.trim() || 'REPLACE_WITH_YOUR_ANDROID_SIGNING_SHA256_FINGERPRINT'],
            },
          },
        ],
        null,
        2
      ),
    [androidSha256]
  );

  const appleAssocJson = useMemo(
    () =>
      JSON.stringify(
        {
          applinks: {
            apps: [],
            details: [
              {
                appID: `${appleTeamId.trim() || 'TEAMID'}.com.pendo.kenyandating`,
                paths: ['/', '/nairobi-dating', '/mombasa-dating', '/kisumu-dating', '/kenyan-diaspora', '/vibe-circles', '/*'],
              },
            ],
          },
          webcredentials: {
            apps: [`${appleTeamId.trim() || 'TEAMID'}.com.pendo.kenyandating`],
          },
        },
        null,
        2
      ),
    [appleTeamId]
  );

  useEffect(() => {
    if (!isAuthorized) return;
    let mounted = true;

    const loadState = async () => {
      const localRaw = safeStorage.getItem(LOCAL_ADMIN_STORAGE_KEY);
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (mounted) {
            if (parsed.completedSteps) setCompletedSteps(parsed.completedSteps);
            if (parsed.androidSha256) setAndroidSha256(parsed.androidSha256);
            if (parsed.appleTeamId) setAppleTeamId(parsed.appleTeamId);
            if (typeof parsed.notes === 'string') setNotes(parsed.notes);
          }
        } catch {}
      }

      if (auth.currentUser) {
        try {
          const snap = await getDoc(doc(db, 'adminSettings', 'launchState'));
          if (snap.exists() && mounted) {
            const data = snap.data() as any;
            if (data.completedSteps) setCompletedSteps(data.completedSteps);
            if (data.androidSha256) setAndroidSha256(data.androidSha256);
            if (data.appleTeamId) setAppleTeamId(data.appleTeamId);
            if (typeof data.notes === 'string') setNotes(data.notes);
          }
        } catch {
          // Offline / emulator fallback silently preserves local state
        }
      }
    };

    loadState();
    return () => {
      mounted = false;
    };
  }, [isAuthorized]);

  const persistAdminState = async (
    nextSteps: Record<string, boolean>,
    nextSha: string,
    nextTeam: string,
    nextNotes: string
  ) => {
    const payload = {
      ownerEmail: ADMIN_EMAIL,
      updatedAt: Date.now(),
      completedSteps: nextSteps,
      androidSha256: nextSha.slice(0, 128),
      appleTeamId: nextTeam.slice(0, 32),
      notes: nextNotes.slice(0, 2000),
    };
    safeStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, JSON.stringify(payload));
    if (auth.currentUser) {
      setSavingChecklist(true);
      try {
        await setDoc(doc(db, 'adminSettings', 'launchState'), payload);
      } catch {
        // Silent local storage fallback
      } finally {
        setSavingChecklist(false);
      }
    }
  };

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId((prev) => (prev === id ? null : prev));
        }, 2200);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const runLiveSeoAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/admin/seo-audit', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setAuditChecks(data.checks || []);
    } catch (err: any) {
      setAuditError(err?.message || 'Unable to run live server audit.');
    } finally {
      setAuditLoading(false);
    }
  };

  const triggerAdminIndexNow = async () => {
    setIndexNowLoading(true);
    setIndexNowStatus(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/admin/indexnow', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setIndexNowStatus(data.message || 'IndexNow ping sent cleanly.');
    } catch (err: any) {
      setIndexNowStatus(`IndexNow error: ${err?.message || 'Failed to ping'}`);
    } finally {
      setIndexNowLoading(false);
    }
  };

  const allStores: StoreTarget[] = useMemo(
    () => [
      {
        id: 'ms_store',
        name: 'Microsoft Store (Windows PWA)',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'PWA / .msixbundle via PWABuilder',
        portalUrl: 'https://www.pwabuilder.com/?url=https://www.pendo.website',
        summary: 'Zero developer fee option via PWABuilder Individual registration for Windows 10 & 11 Store.',
        steps: [
          'Open PWABuilder with https://www.pendo.website/',
          'Choose Windows Package -> Package for Store',
          'Paste Store Listing fields below into Partner Center',
        ],
        copyPayload: `App Name: Pendo - Kenyan Dating\nPackage ID: com.pendo.kenyandating\nStart URL: https://www.pendo.website/\nManifest URL: https://www.pendo.website/manifest.webmanifest\nCategory: Social\nAge Rating: 18+\nPricing: Free (KES 0 / $0)\nShort Description: ${SHORT_DESC}\n\nFull Description:\n${LONG_DESC}\n\nKeywords: ${STORE_KEYWORDS}\nPrivacy URL: https://www.pendo.website/serious-relationships-kenya\nSupport Email: ${ADMIN_EMAIL}`,
      },
      {
        id: 'samsung_galaxy',
        name: 'Samsung Galaxy Store',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Signed Android .apk / .aab',
        portalUrl: 'https://seller.samsungapps.com/',
        summary: '100% free developer registration with massive reach on Samsung Galaxy phones across Kenya.',
        steps: [
          'Run npm run android:sync and export signed APK/AAB',
          'Register free Samsung Seller Portal account',
          'Paste title, descriptions, 512x512 icon URL, and Kenya + Global countries',
        ],
        copyPayload: `App Title: Pendo - Kenyan Dating\nPackage Name: com.pendo.kenyandating\nDefault Language: English\nCategory: Social Networking\nAge Restriction: 18+\nPrice: Free\nShort Description (<=80): ${SHORT_DESC}\n\nDescription:\n${LONG_DESC}\n\nApp Icon (512x512): https://www.pendo.website/pwa-512x512.png\nWebsite: https://www.pendo.website/\nSupport Email: ${ADMIN_EMAIL}\nPrivacy Policy URL: https://www.pendo.website/serious-relationships-kenya`,
      },
      {
        id: 'huawei_appgallery',
        name: 'Huawei AppGallery',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Android .apk / Quick App',
        portalUrl: 'https://developer.huawei.com/consumer/en/console',
        summary: '100% free registration reaching millions of Huawei & HarmonyOS Android users in East Africa.',
        steps: [
          'Create free HUAWEI ID Developer account',
          'Create App -> App Type: APK or Quick App (HTML5 URL: https://www.pendo.website/)',
          'Paste Store Listing & Privacy declaration below',
        ],
        copyPayload: `App Name: Pendo - Kenyan Dating\nPackage Name: com.pendo.kenyandating\nQuick App URL: https://www.pendo.website/\nCategory: Social -> Dating\nRelease Countries: Kenya, Uganda, Tanzania, UK, USA, UAE, Global\nAge Rating: 18+\nOne-line Intro: ${SHORT_DESC}\n\nFull Introduction:\n${LONG_DESC}\n\nPrivacy Statement URL: https://www.pendo.website/serious-relationships-kenya\nCustomer Service Email: ${ADMIN_EMAIL}`,
      },
      {
        id: 'amazon_appstore',
        name: 'Amazon Appstore',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Android .apk or Hosted Web App URL',
        portalUrl: 'https://developer.amazon.com/apps-and-games/console/apps/list.html',
        summary: 'Free developer account supporting both Android APK and Hosted HTML5 Web App submission.',
        steps: [
          'Sign into Amazon Developer Console (Free)',
          'Choose Add New App -> Android or Mobile Web',
          'Paste App URL https://www.pendo.website/ & copy metadata',
        ],
        copyPayload: `App Title: Pendo - Kenyan Dating\nApp SKU: com.pendo.kenyandating\nCategory: Social Networking\nWeb App URL: https://www.pendo.website/\nPricing: Base List Price Free ($0.00)\nShort Description: ${SHORT_DESC}\nLong Description:\n${LONG_DESC}\n\nKeywords: ${STORE_KEYWORDS}\nProduct Support Email: ${ADMIN_EMAIL}\nPrivacy Policy URL: https://www.pendo.website/serious-relationships-kenya`,
      },
      {
        id: 'pwa_directories',
        name: 'PWA Store / Appscope / Store.app',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Direct Manifest URL (Zero Build Needed)',
        portalUrl: 'https://store.app/',
        summary: 'Instant 100% free indexing on web app & PWA stores directly from your manifest.webmanifest.',
        steps: [
          'Open Store.app / PWA Directories',
          'Paste https://www.pendo.website/ or https://www.pendo.website/manifest.webmanifest',
          'Submit with no APK packaging needed',
        ],
        copyPayload: `PWA URL: https://www.pendo.website/\nManifest URL: https://www.pendo.website/manifest.webmanifest\nApp Name: Pendo - Kenyan Dating\nTagline: ${SHORT_DESC}\nCategory: Dating & Social\nIcon URL: https://www.pendo.website/pwa-512x512.png\nMaskable Icon URL: https://www.pendo.website/pwa-maskable-512x512.png\nContact: ${ADMIN_EMAIL}`,
      },
      {
        id: 'apkpure',
        name: 'APKPure Developer Console',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Signed Android .apk',
        portalUrl: 'https://apkpure.com/developer',
        summary: 'High organic Android traffic in Kenya; 100% free developer APK submission.',
        steps: [
          'Upload signed com.pendo.kenyandating APK',
          'Paste store metadata and Kenya keywords below',
        ],
        copyPayload: `App Name: Pendo - Kenyan Dating\nPackage Name: com.pendo.kenyandating\nDeveloper Name: ${ADMIN_DISPLAY_NAME}\nOfficial Website: https://www.pendo.website/\nContact Email: ${ADMIN_EMAIL}\nCategory: Dating\nShort Summary: ${SHORT_DESC}\nFull Description:\n${LONG_DESC}\nTags: ${STORE_KEYWORDS}`,
      },
      {
        id: 'uptodown',
        name: 'Uptodown App Store',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Signed Android .apk',
        portalUrl: 'https://developer.uptodown.com/',
        summary: 'Free global multi-region Android marketplace with high mobile browser conversion.',
        steps: [
          'Register free on Uptodown Developer Zone',
          'Upload Android APK & paste listing copy',
        ],
        copyPayload: `App Title: Pendo - Kenyan Dating\nPackage ID: com.pendo.kenyandating\nAuthor: ${ADMIN_DISPLAY_NAME}\nLicense: Free\nOfficial URL: https://www.pendo.website/\nSupport Email: ${ADMIN_EMAIL}\nDescription:\n${SHORT_DESC}\n\n${LONG_DESC}`,
      },
      {
        id: 'aptoide',
        name: 'Aptoide App Store',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Signed Android .apk',
        portalUrl: 'https://www.aptoide.com/en/developers',
        summary: 'Free alternative Android store popular across African & emerging mobile markets.',
        steps: [
          'Register Aptoide Store publisher account (Free)',
          'Upload APK and claim package com.pendo.kenyandating',
        ],
        copyPayload: `App Name: Pendo - Kenyan Dating\nPackage ID: com.pendo.kenyandating\nStore Category: Dating / Social\nAge Rating: Mature 18+\nWebsite: https://www.pendo.website/\nSummary: ${SHORT_DESC}\nDescription:\n${LONG_DESC}`,
      },
      {
        id: 'fdroid_izzy',
        name: 'F-Droid / IzzyOnDroid Metadata',
        feeLabel: 'FREE · $0',
        isFree: true,
        packageFormat: 'Android .apk + YAML Metadata',
        portalUrl: 'https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/',
        summary: 'Free privacy-respecting Android catalog metadata ready to copy.',
        steps: [
          'Use metadata YAML below if publishing APK to open catalogs',
        ],
        copyPayload: `Categories:\n  - Internet\n  - Connectivity\nLicense: Proprietary-Free\nAuthorName: ${ADMIN_DISPLAY_NAME}\nAuthorEmail: ${ADMIN_EMAIL}\nWebSite: https://www.pendo.website/\nName: Pendo - Kenyan Dating\nSummary: ${SHORT_DESC}\nDescription: |\n  ${LONG_DESC.replace(/\n/g, '\n  ')}`,
      },
      {
        id: 'google_play',
        name: 'Google Play Console',
        feeLabel: '$25 ONE-TIME',
        isFree: false,
        packageFormat: 'Android .aab (Capacitor or Bubblewrap TWA)',
        portalUrl: 'https://play.google.com/console',
        summary: 'Flagship Android store. Pair Capacitor or Bubblewrap TWA with /.well-known/assetlinks.json so Chrome URL bar disappears.',
        steps: [
          'Build release .aab via Bubblewrap or Capacitor (com.pendo.kenyandating)',
          'Copy Play App Signing SHA-256 into the SHA-256 generator above -> deploy assetlinks.json',
          'Paste Store Listing fields & 100% Free / 18+ Data Safety answers',
        ],
        copyPayload: `App Name (<=30 chars): Pendo - Kenyan Dating\nShort Description (<=80 chars): ${SHORT_DESC}\nFull Description (<=4000 chars):\n${LONG_DESC}\n\nPackage Name: com.pendo.kenyandating\nCategory: Dating\nTags: Dating, Singles, Kenya, Matchmaking\nFree or Paid: Free (No paid in-app products)\nTarget Audience: 18 and over\nPrivacy Policy URL: https://www.pendo.website/serious-relationships-kenya\nSupport Email: ${ADMIN_EMAIL}\nApp Website: https://www.pendo.website/\nAsset Links URL: https://www.pendo.website/.well-known/assetlinks.json`,
      },
      {
        id: 'apple_app_store',
        name: 'Apple App Store Connect',
        feeLabel: '$99 / YEAR',
        isFree: false,
        packageFormat: 'iOS IPA (Capacitor iOS or PWABuilder iOS)',
        portalUrl: 'https://appstoreconnect.apple.com/',
        summary: 'Flagship iOS distribution with Apple Universal Links via /.well-known/apple-app-site-association.',
        steps: [
          'Set your 10-char Apple Team ID above to generate apple-app-site-association',
          'Archive & upload via Xcode / PWABuilder iOS',
          'Paste App Store Connect metadata below',
        ],
        copyPayload: `Name (<=30 chars): Pendo - Kenyan Dating\nSubtitle (<=30 chars): Free Verified Kenya Dating\nBundle ID: com.pendo.kenyandating\nPromotional Text (<=170 chars): ${SHORT_DESC}\nKeywords (<=100 chars): ${STORE_KEYWORDS.slice(0, 99)}\nPrimary Category: Social Networking\nAge Rating: 17+ / 18+ Unrestricted Dating\nPrice Schedule: Free ($0.00)\nSupport URL: https://www.pendo.website/\nMarketing URL: https://www.pendo.website/\nPrivacy Policy URL: https://www.pendo.website/serious-relationships-kenya\nDescription:\n${LONG_DESC}`,
      },
    ],
    []
  );

  if (!isAuthorized) {
    return (
      <main id="main-content" className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <Lock size={22} />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight">Restricted Workspace</h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            This route is exclusively restricted to the verified Pendo owner account ({ADMIN_DISPLAY_NAME}).
          </p>
          <button
            type="button"
            onClick={onBackToApp}
            className="min-h-[44px] w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Return to Pendo
          </button>
        </div>
      </main>
    );
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredStores = allStores.filter((store) => {
    if (storeFilter === 'FREE' && !store.isFree) return false;
    if (storeFilter === 'PAID' && store.isFree) return false;
    if (!normalizedQuery) return true;
    return (
      store.name.toLowerCase().includes(normalizedQuery) ||
      store.summary.toLowerCase().includes(normalizedQuery) ||
      store.copyPayload.toLowerCase().includes(normalizedQuery)
    );
  });

  const completedCount = CHECKLIST_ITEMS.filter((item) => Boolean(completedSteps[item.id])).length;

  return (
    <main id="main-content" className="min-h-screen bg-[#FAF8F5] text-slate-900 pb-16">
      {/* Top Operator Bar */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToApp}
              className="min-h-[40px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>App</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight">
                  Pendo Copy &amp; Paste Launch Center
                </h1>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck size={11} />
                  Vincent Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {ADMIN_DISPLAY_NAME} · {authUser?.email || ADMIN_EMAIL}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[40px] px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Metric Summary Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Canonical URLs</p>
            <p className="text-2xl font-black font-mono tabular-nums text-slate-900 mt-1">{CANONICAL_URLS.length}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Root + 24 Kenya SEO Hubs</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Free App Stores</p>
            <p className="text-2xl font-black font-mono tabular-nums text-emerald-700 mt-1">
              {allStores.filter((s) => s.isFree).length}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">$0 registration catalogs</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Package ID</p>
            <p className="text-sm font-extrabold font-mono text-slate-900 mt-2 truncate">com.pendo.kenyandating</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Capacitor + TWA Ready</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Launch Progress</p>
            <p className="text-2xl font-black font-mono tabular-nums text-rose-600 mt-1">
              {completedCount}/{CHECKLIST_ITEMS.length}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              {savingChecklist ? 'Syncing...' : 'Saved privately'}
            </p>
          </div>
        </section>

        {/* Primary Mode Navigation + Quick Filter */}
        <section className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('GOOGLE_SEO')}
              className={`min-h-[42px] px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 border cursor-pointer transition-colors ${
                activeTab === 'GOOGLE_SEO'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Globe size={15} />
              <span>Google Search &amp; Indexing</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('APP_STORES')}
              className={`min-h-[42px] px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 border cursor-pointer transition-colors ${
                activeTab === 'APP_STORES'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Smartphone size={15} />
              <span>All App Stores (Free + Paid)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CHECKLIST')}
              className={`min-h-[42px] px-4 rounded-lg text-xs font-extrabold flex items-center gap-2 border cursor-pointer transition-colors ${
                activeTab === 'CHECKLIST'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <CheckCircle2 size={15} />
              <span>Submission Checklist</span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter stores or snippets..."
              aria-label="Filter stores or snippets"
              className="w-full min-h-[40px] pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
          </div>
        </section>

        {/* TAB 1: GOOGLE SEARCH & INDEXING COPY CENTER */}
        {activeTab === 'GOOGLE_SEO' && (
          <div className="space-y-6">
            {/* Live Diagnostic Runner */}
            <section className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-300" />
                    Live Google Sitemap &amp; Indexing Verification
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Checks your sitemap XML, sitemap index, clean robots.txt (no invalid directives), verification files, and store links.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={runLiveSeoAudit}
                    disabled={auditLoading}
                    className="min-h-[42px] px-3.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw size={14} className={auditLoading ? 'animate-spin' : ''} />
                    <span>{auditLoading ? 'Auditing...' : 'Run Live Indexing Audit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={triggerAdminIndexNow}
                    disabled={indexNowLoading}
                    className="min-h-[42px] px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Send size={14} />
                    <span>{indexNowLoading ? 'Pinging...' : 'Ping IndexNow Now'}</span>
                  </button>
                </div>
              </div>

              {auditError && (
                <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-3 text-xs text-rose-200 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{auditError}</span>
                </div>
              )}

              {indexNowStatus && (
                <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-200">
                  {indexNowStatus}
                </div>
              )}

              {auditChecks && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {auditChecks.map((chk) => (
                    <div
                      key={chk.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{chk.label}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">{chk.url}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                          chk.ok
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {chk.ok ? 'PASS' : 'CHECK'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Links to Search Consoles */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-black text-slate-900">Google Search Console</p>
                  <p className="text-[11px] text-slate-500">Submit Sitemaps &amp; Inspect URLs</p>
                </div>
                <ExternalLink size={15} className="text-slate-400" />
              </a>
              <a
                href="https://www.bing.com/webmasters"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-black text-slate-900">Bing Webmaster Tools</p>
                  <p className="text-[11px] text-slate-500">Submit Sitemap &amp; IndexNow</p>
                </div>
                <ExternalLink size={15} className="text-slate-400" />
              </a>
              <a
                href="https://search.google.com/test/rich-results?url=https%3A%2F%2Fwww.pendo.website%2F"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs font-black text-slate-900">Google Rich Results Test</p>
                  <p className="text-[11px] text-slate-500">Verify FAQ &amp; App JSON-LD</p>
                </div>
                <ExternalLink size={15} className="text-slate-400" />
              </a>
            </section>

            {/* Google Search Console Copy Blocks */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <KeyRound size={16} className="text-rose-600" />
                What to Paste in Google Search Console, Bing &amp; Search Engines
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <CopyFieldCard
                  id="gsc_url_prefix"
                  label="Google Search Console — URL Prefix Property"
                  hint="Paste when adding a new URL-prefix property in Google Search Console."
                  value={`${SITE_ORIGIN}/`}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="gsc_domain"
                  label="Google Search Console — Domain Property"
                  hint="Paste when adding a DNS Domain property (covers all subdomains)."
                  value="pendo.website"
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="gsc_sitemap_url"
                  label="Google Search Console -> Sitemaps (Primary Sitemap URL)"
                  hint="Paste into Search Console -> Indexing -> Sitemaps -> Add a new sitemap."
                  value={`${SITE_ORIGIN}/sitemap.xml`}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="gsc_sitemap_index_url"
                  label="Google Search Console -> Sitemaps (Sitemap Index URL)"
                  hint="Optional secondary sitemap index referencing /sitemap.xml."
                  value={`${SITE_ORIGIN}/sitemap_index.xml`}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="gsc_meta_tag"
                  label="Google Site Verification HTML Meta Tag"
                  hint="Already embedded inside index.html <head>."
                  value='<meta name="google-site-verification" content="google00332d67777e965d" />'
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="gsc_html_file"
                  label="Google Verification HTML File Content & URL"
                  hint={`Hosted at ${SITE_ORIGIN}/google00332d67777e965d.html`}
                  value="google-site-verification: google00332d67777e965d.html"
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="bing_meta"
                  label="Bing Webmaster Verification Meta Tag & XML URL"
                  hint={`Bing XML hosted at ${SITE_ORIGIN}/BingSiteAuth.xml`}
                  value='<meta name="msvalidate.01" content="1A704EBF4AD6B5D3CFBA2F15F6D5689E" />'
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="indexnow_key"
                  label="IndexNow API Key & Key File Location"
                  hint="Used by Bing, Yandex, Naver & Ahrefs instant indexing."
                  value={`Key: 8zvbpmffgtwz251x44qqw5h5ugnvyyva\nLocation: ${SITE_ORIGIN}/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt\nAlt Key: cguyxqk3krxuvjeesrp67h8cmz7cvvmn`}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <CopyFieldCard
                  id="clean_robots"
                  label="Clean robots.txt Contents"
                  hint="Hosted at /robots.txt (blocks /admin & /api/, no unknown Agentmap directive)."
                  value={CLEAN_ROBOTS_TXT}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="indexnow_json"
                  label="IndexNow Bulk POST JSON Payload"
                  hint="POST https://api.indexnow.org/indexnow (Content-Type: application/json)"
                  value={INDEXNOW_PAYLOAD_JSON}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="full_sitemap_xml"
                  label="Full Generated Google Sitemap XML (All 25 Canonical URLs)"
                  hint="Hosted live at /sitemap.xml with hreflang en-KE and image tags."
                  value={sitemapXml}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="schema_json_ld"
                  label="Schema.org Structured Data JSON-LD + AI Discovery URLs"
                  hint={`llms.txt: ${SITE_ORIGIN}/llms.txt · catalog: ${SITE_ORIGIN}/ai-catalog.json`}
                  value={GOOGLE_SCHEMA_JSONLD}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              </div>

              {/* All 25 URLs Inspection Batch */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      All {CANONICAL_URLS.length} Canonical URLs for Google Search Console URL Inspection
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Paste any URL below into the top search bar of Google Search Console -&gt; Request Indexing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('all_25_urls', CANONICAL_URLS.join('\n'))}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === 'all_25_urls' ? <Check size={14} /> : <ClipboardCopy size={14} />}
                    <span>{copiedId === 'all_25_urls' ? 'Copied All 25' : 'Copy All 25 URLs'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {CANONICAL_URLS.map((url, idx) => {
                    const id = `url_${idx}`;
                    return (
                      <div
                        key={url}
                        className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="text-[11px] font-mono text-slate-800 truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(id, url)}
                          className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-bold text-slate-800 shrink-0 cursor-pointer"
                        >
                          {copiedId === id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: ALL APP STORES (FREE + PAID) COPY CENTER */}
        {activeTab === 'APP_STORES' && (
          <div className="space-y-6">
            {/* Store Fee Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStoreFilter('ALL')}
                  className={`min-h-[38px] px-3.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                    storeFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Stores ({allStores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilter('FREE')}
                  className={`min-h-[38px] px-3.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                    storeFilter === 'FREE'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  100% Free Stores ({allStores.filter((s) => s.isFree).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStoreFilter('PAID')}
                  className={`min-h-[38px] px-3.5 rounded-lg text-xs font-extrabold border cursor-pointer ${
                    storeFilter === 'PAID'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  Major Paid Stores ({allStores.filter((s) => !s.isFree).length})
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Includes free PWA, Samsung, Huawei, Amazon, Android catalogs + Google Play &amp; Apple App Store.
              </p>
            </div>

            {/* Universal Store Listing Copy Kit */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-rose-600" />
                Universal Store Listing Form Fields (Copy &amp; Paste Into Any Store Console)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <CopyFieldCard
                  id="store_app_name"
                  label="App Name / Title"
                  hint="Matches capacitor.config.ts and manifest.webmanifest."
                  value="Pendo - Kenyan Dating"
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="store_pkg_id"
                  label="Package Name / Bundle ID"
                  hint="Universal identifier across Google Play, Samsung, Huawei, Amazon & Apple."
                  value="com.pendo.kenyandating"
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="store_short_desc"
                  label="Short Description / Promotional Text (74 chars)"
                  hint="Fits Google Play 80-char and Microsoft/Samsung short summary limits."
                  value={SHORT_DESC}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="store_keywords"
                  label="Store Keywords / Search Tags"
                  hint="Paste into Apple Keywords, Amazon Search Terms, and PWA Store tags."
                  value={STORE_KEYWORDS}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="store_urls"
                  label="App URLs, Manifest & Developer Contact"
                  hint="Website, Privacy Policy, Manifest & Support Email."
                  value={`Website / Start URL: ${SITE_ORIGIN}/\nManifest URL: ${SITE_ORIGIN}/manifest.webmanifest\nPrivacy / Safety Policy URL: ${SITE_ORIGIN}/serious-relationships-kenya\nDeveloper Name: ${ADMIN_DISPLAY_NAME}\nSupport Email: ${ADMIN_EMAIL}`}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="store_assets"
                  label="App Icon & Graphic Asset URLs"
                  hint="All icons served directly (excluded from SPA HTML rewrite)."
                  value={`Icon 512x512: ${SITE_ORIGIN}/pwa-512x512.png\nMaskable 512x512: ${SITE_ORIGIN}/pwa-maskable-512x512.png\nIcon 192x192: ${SITE_ORIGIN}/pwa-192x192.png\nApple Touch Icon: ${SITE_ORIGIN}/apple-touch-icon.png\nVector SVG Icon: ${SITE_ORIGIN}/icon.svg`}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              </div>

              <CopyFieldCard
                id="store_long_desc"
                label="Full Store Description (Play Store, Apple, Microsoft, Samsung, Huawei, Amazon)"
                hint={`${LONG_DESC.length} / 4000 characters · 100% Free & 18+ Safety compliant`}
                value={LONG_DESC}
                multiline
                copiedId={copiedId}
                onCopy={handleCopy}
              />
            </section>

            {/* Technical Store Verification: AssetLinks, Universal Links & Packaging CLI */}
            <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Terminal size={16} className="text-slate-700" />
                    Deep Links &amp; App Store Packaging Commands
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste your Play Console SHA-256 fingerprint or Apple Team ID to generate live verification JSON files.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sha256-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Android Signing SHA-256 Fingerprint (for Google Play TWA / App Links)
                  </label>
                  <input
                    id="sha256-input"
                    type="text"
                    value={androidSha256}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAndroidSha256(v);
                      persistAdminState(completedSteps, v, appleTeamId, notes);
                    }}
                    placeholder="AA:BB:CC:..."
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label htmlFor="apple-team-input" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Apple Developer 10-Char Team ID (for Universal Links)
                  </label>
                  <input
                    id="apple-team-input"
                    type="text"
                    value={appleTeamId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAppleTeamId(v);
                      persistAdminState(completedSteps, androidSha256, v, notes);
                    }}
                    placeholder="TEAMID"
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                <CopyFieldCard
                  id="well_known_android"
                  label="/.well-known/assetlinks.json"
                  hint="Paste into public/.well-known/assetlinks.json"
                  value={assetLinksJson}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="well_known_apple"
                  label="/.well-known/apple-app-site-association"
                  hint="Paste into public/.well-known/apple-app-site-association"
                  value={appleAssocJson}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
                <CopyFieldCard
                  id="cli_build_commands"
                  label="TWA Bubblewrap & Capacitor CLI Commands"
                  hint="Build .aab / .apk packages for free & paid Android stores."
                  value={`# Capacitor Android sync\nnpm run android:sync\n\n# Or Google Bubblewrap TWA from PWA manifest\nnpx @bubblewrap/cli init --manifest=${SITE_ORIGIN}/manifest.webmanifest\nnpx @bubblewrap/cli build`}
                  multiline
                  copiedId={copiedId}
                  onCopy={handleCopy}
                />
              </div>
            </section>

            {/* All 11 Store Submission Cards */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-slate-900">
                Store-by-Store Submission Packs ({filteredStores.length} shown)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredStores.map((store) => {
                  const copyKey = `store_card_${store.id}`;
                  const isCopied = copiedId === copyKey;
                  return (
                    <article
                      key={store.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-black text-slate-900">{store.name}</h3>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  store.isFree
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {store.feeLabel}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">{store.packageFormat}</p>
                          </div>
                          <a
                            href={store.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <span>Portal</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{store.summary}</p>

                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                          {store.steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(copyKey, store.copyPayload)}
                          className={`min-h-[42px] w-full rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 border cursor-pointer transition-colors ${
                            isCopied
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                          }`}
                        >
                          {isCopied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                          <span>{isCopied ? 'Copied Full Store Pack!' : `Copy ${store.name} Listing Pack`}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: SUBMISSION & INDEXING CHECKLIST */}
        {activeTab === 'CHECKLIST' && (
          <section className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Launch &amp; Store Readiness Tracker
                  </h2>
                  <p className="text-xs text-slate-500">
                    Saved securely to Firestore (/adminSettings/launchState) strictly for {ADMIN_EMAIL}.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-mono font-bold tabular-nums">
                  {completedCount} / {CHECKLIST_ITEMS.length} Done
                </span>
              </div>

              <div className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => {
                  const checked = Boolean(completedSteps[item.id]);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = { ...completedSteps, [item.id]: !checked };
                          setCompletedSteps(next);
                          persistAdminState(next, androidSha256, appleTeamId, notes);
                        }}
                        className="w-4 h-4 accent-emerald-600 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${checked ? 'line-through opacity-75' : ''}`}>
                          {item.label}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                          {item.group}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2">
                <label htmlFor="admin-launch-notes" className="block text-xs font-bold text-slate-800 mb-1.5">
                  Private Release Notes (Play / App Store / Search Console)
                </label>
                <textarea
                  id="admin-launch-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => persistAdminState(completedSteps, androidSha256, appleTeamId, notes)}
                  placeholder="Track build numbers, review status, or SHA-256 fingerprint notes..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default AdminDashboard;
