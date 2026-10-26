# Pendo Unified Platform Expansion ("Connect All" Milestone)

This plan unifies and connects all four core pillars of **Pendo — Kenya's #1 Dating & Matchmaking App** into a cohesive, real-time, and search-indexed platform: **Public SEO City Directories**, **Real-Time Messaging & Live Voice Rooms**, **M-Pesa Premium Tiers & Virtual Gifts**, and **Selfie Verification, Trust Scores & Date Safety**.

## User Review & Critical Decisions

> [!IMPORTANT]
> You confirmed **"Connect All"** in response to our milestone prioritization. Below is the unified architectural blueprint connecting organic acquisition, real-time engagement, monetization, and user safety into one seamless experience.

- **Confirmed Decision 1 (Full-Scope Integration)**: Connect all four capability pillars—Public SEO & City Directories, Real-Time Chat/Voice/Live Rooms, M-Pesa Premium & Virtual Gifts, and Selfie Verification/Date Safety—into the existing Pendo navigation and backend.
- **Confirmed Decision 2 (Dual-Layer Persistence & Real-Time Sync)**: Use **Firebase Firestore** (`ai-studio-389731fa-e167-47fb-8cea-296d2b765f81`) with hardened ABAC rules for low-latency real-time interactions (live swipes, chat rooms, voice lounges, virtual gift animations, safety check-ins) and **PostgreSQL / Drizzle** (`server.ts`) for durable account ledgering, M-Pesa transaction logs, subscription state, and IndexNow SEO triggers.
- **Default Choice (M-Pesa STK Push Flow)**: Implement an interactive M-Pesa Express (STK Push) checkout modal with real-time phone validation (`07XX` / `01XX` / `+254`), instant receipt generation, and live Firestore + PostgreSQL wallet/tier unlocking so users can immediately test and experience Pendo Gold, Profile Boosts, and Virtual Gifts (Chai, Dawa, Samosa, Safari).

---

## 1. Overview & Core Concept

- **What It Does**: Transforms Pendo from a standalone discovery deck into a fully connected Kenyan matchmaking ecosystem. Unauthenticated visitors land on an SEO-optimized public showcase featuring Kenyan city directories (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret) and live hangout previews; authenticated members swipe on real Firestore profiles, chat with voice notes and Sheng/Swahili AI translations, send M-Pesa-powered virtual gifts, verify their identity via live camera selfie checks, and share real-time Matatu Fare Shield & Safe-Date check-ins.
- **Target Audience / Persona**: Kenyan singles (ages 21–40) in urban hubs and the diaspora seeking authentic relationships, cultural resonance, and verified date safety.
- **Key Value**: Bridges organic search discovery (Google & Bing IndexNow) with immediate in-app trust (Selfie Verification + Trust Score), high-retention social spaces (Live Voice Lounges + Hangout Check-ins), and frictionless local monetization (M-Pesa STK Push).

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Public SEO & City Directory Flow**: First-time visitors and search crawlers view an editorial, semantic HTML5 landing experience with `<h1>` hierarchy, interactive Kenyan city tabs (Nairobi, Mombasa, Kisumu, Nakuru, Eldoret), curated safe date spots, and a one-tap Google/Guest onboarding trigger.
  2. **Real-Time Discovery & Live Voice Lounge Flow**: Users browse Firestore-synced profiles filtered by city/distance, listen to 15-second voice intros, join active Voice Rooms in the Meet Hub with live speaker indicators, and send voice notes or Sheng/Swahili-translated messages in real time.
  3. **M-Pesa Premium, Boosts & Virtual Gifts Flow**: From Discovery or any Chat Room, users can trigger a 30-minute Profile Boost, upgrade to **Pendo Gold**, or send a culturally tailored Virtual Gift (*Chai ya Tangawizi*, *Westlands Dawa*, *Mombasa Mahamri*, *Maasai Mara Weekend*) via an M-Pesa STK Push drawer that credits the recipient's badge counter and posts a rich gift card in chat.
  4. **Selfie Verification, Trust Score & Date Safety Flow**: Users open the Trust & Safety Center to capture a live webcam/camera pose for AI-assisted verification, earn a dynamic **Trust Score (0–100)** based on verification + profile completeness + community standing, and activate a **Live Date Safety Check-In** (sharing venue, trusted contact, and Matatu Fare Shield status).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm East African Modernism—high-craft editorial typography paired with tactile mobile-first ergonomics that expand gracefully to a multi-column `1440px` desktop workspace (`max-w-7xl`).
  - *Color Palette & Mood (60-30-10 Discipline)*:
    - **60% Dominant Canvas**: Crisp warm ivory (`#FAF8F5` light) / deep obsidian slate (`#0B0F17` dark).
    - **30% Structural Surfaces**: Soft alabaster cards (`#FFFFFF` with `1px solid rgba(15,23,42,0.08)` hairlines) and muted charcoal prose (`#475569`).
    - **10% Accent Budget**: Kenyan Rose-Coral (`#E11D48`) for primary matchmaking actions, Savannah Emerald (`#059669`) for M-Pesa & Verified Trust states, and Warm Amber (`#D97706`) for Profile Boosts.
  - *Typography & Hierarchy (2+1 Font Rule)*:
    - **Display / Headings**: `Plus Jakarta Sans` (`SemiBold 600` / `Bold 700`, `tracking-tight`, `text-wrap: balance`).
    - **Body Prose**: `DM Sans` (`Regular 400` / `Medium 500`, `15px–16px`, `leading-relaxed`).
    - **Metrics, Prices & Timers**: `JetBrains Mono` with `tabular-nums` for M-Pesa KES amounts, distances (`km`), countdown timers, and Trust Scores.
  - *Component Styling & Layout*:
    - Adheres to the **Zero-Pill Metadata Discipline**: static profile metadata (city, distance, zodiac, languages) renders as clean inline text separated by `·` dividers rather than cluttered badge sandwiches.
    - Touch targets strictly $\ge 44 \times 44\text{px}$ on mobile with a fixed bottom navigation bar respecting the **15% Mobile Sticky Cap**.
- **Interactive Feedback & Motion**:
  - Compositor-only transitions (`transform`, `opacity` settling within `150ms–200ms`).
  - Real-time STK Push step progress (`Initiating STK Push` $\rightarrow$ `Confirm on Phone` $\rightarrow$ `M-Pesa Receipt Confirmed`), live audio waveform visualizers for voice notes, and instant optimistic chat delivery.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid Public SEO Directory + Authenticated App Shell**
  - *Chosen Approach*: Render an indexable, semantic City Directory & Safe Date Guide directly below the fold and via clean view toggles on the Landing screen, while keeping the semantic `<h1>` and JSON-LD structured data intact for Bing and Google crawlers.
  - *Why*: Search engines index real local content (Nairobi, Mombasa, Kisumu date spots and matchmaking guides) without blocking authenticated users from jumping straight into Discovery.
  - *Alternatives Considered*: Separate static HTML pages per city—passed over to keep the React SPA unified and prevent broken route states.

- **Decision 2: Unified Firestore + PostgreSQL Data Synchronization**
  - *Chosen Approach*: Sync every authenticated user, verification status, Trust Score, and M-Pesa transaction to both Firestore (`users/{uid}`, `transactions/{txId}`, `safetyCheckins/{checkinId}`) and the backend Express/PostgreSQL API (`/api/users/sync`, `/api/mpesa/stk-push`, `/api/safety/checkin`).
  - *Why*: Firestore powers instant cross-client reactivity (`onSnapshot`) for chat messages, gifts, and voice rooms, while Express/PostgreSQL provides a tamper-evident server ledger and IndexNow ping automation.

- **Decision 3: Camera-First Selfie Verification & Explainable Trust Score**
  - *Chosen Approach*: Use the browser `MediaDevices.getUserMedia` camera stream to capture a live verification frame, verify pose/authenticity via the server-side Gemini vision proxy (`/api/gemini/call`), and compute an explainable Trust Score (`Base 30 + Google Auth 20 + Selfie Verified 30 + Voice Intro 10 + Complete Bio 10 = 100`).
  - *Why*: Gives Kenyan singles tangible confidence against catfishing without requiring manual moderator queues.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         PENDO CLIENT APPLICATION (React)                     │
├──────────────────┬──────────────────┬───────────────────┬────────────────────┤
│ 1. Public SEO &  │ 2. Real-Time     │ 3. M-Pesa Wallet, │ 4. Selfie Verify,  │
│ City Directories │ Chat & Live Hub  │ Boosts & Gifts    │ Trust & Date Safe  │
│  • City Explorer │  • Discovery Deck│  • M-Pesa Modal   │  • Live Camera Pose│
│  • Venue Guides  │  • Voice Notes   │  • Pendo Gold     │  • Trust Score 100 │
│  • IndexNow Ping │  • Live Rooms    │  • Virtual Gifts  │  • Safety Check-In │
└────────┬─────────┴────────┬─────────┴─────────┬─────────┴─────────┬──────────┘
         │                  │                   │                   │
         ▼                  ▼                   ▼                   ▼
┌─────────────────────────────────────┐ ┌──────────────────────────────────────┐
│   FIREBASE FIRESTORE & AUTH (SDK)   │ │      EXPRESS + POSTGRESQL SERVER     │
│  • /users/{userId}                  │ │  • POST /api/users/sync              │
│  • /swipes/{swipeId}                │ │  • POST /api/mpesa/stk-push          │
│  • /chatSessions/{id}/messages/{id} │ │  • POST /api/verify/selfie           │
│  • /voiceRooms/{roomId}             │ │  • POST /api/safety/checkin          │
│  • /gifts/{giftId}                  │ │  • POST /api/indexnow/submit         │
│  • /safetyCheckins/{checkinId}      │ │  • GET  /sitemap.xml & /robots.txt   │
└─────────────────────────────────────┘ └──────────────────────────────────────┘
```

### Data Model & State

1. **User Profile & Trust (`users/{userId}`)**:
   - Extends `UserProfile` with `isVerified: boolean`, `trustScore: number`, `subscriptionTier: 'FREE' | 'GOLD' | 'VIP'`, `mpesaPhone?: string`, `giftsReceived: number`, and `verifiedAt?: string`.
2. **Real-Time Swipes & Matches (`swipes/{swipeId}` & `chatSessions/{sessionId}`)**:
   - Records directional likes/super-likes in Firestore, automatically creating or unlocking a shared `chatSessions` document when two users mutually like or initiate a direct connection.
3. **M-Pesa Transactions & Virtual Gifts (`transactions/{txId}` & `chatSessions/{sessionId}/messages/{messageId}`)**:
   - Stores KES amount, M-Pesa receipt code (e.g., `SLK89P2M4Q`), item type (`BOOST`, `GOLD_TIER`, `GIFT_CHAI`, `GIFT_DAWA`, `GIFT_SAMOSA`, `GIFT_SAFARI`), sender/recipient UIDs, and embeds rich gift cards inside the active chat stream.
4. **Date Safety Check-Ins (`safetyCheckins/{checkinId}`)**:
   - Tracks `userId`, `matchName`, `venueName`, `trustedContactName`, `trustedContactPhone`, `matatuShieldActive: boolean`, `scheduledReturnTime`, and `status: 'ACTIVE' | 'COMPLETED' | 'ALERT'`.

### Interactive Component & State Mapping

- **Public SEO City Directory (`Landing` & `HangoutSpots`)**:
  - Interactive city selector (`Nairobi`, `Mombasa`, `Kisumu`, `Nakuru`, `Eldoret`) dynamically filters curated date venues, active single counts, and local safety tips; clicking any city or venue either opens the live venue room (if signed in) or launches onboarding pre-set to that city.
- **M-Pesa Checkout & Virtual Gift Drawer (`MpesaModal` / `ChatRoom`)**:
  - Validates Kenyan phone numbers, calls `/api/mpesa/stk-push`, writes the verified transaction to Firestore, increments the user's boost timer or Gold badge, or dispatches an animated Virtual Gift message directly into the Firestore `messages` subcollection.
- **Selfie Verification & Safety Center (`SafetyVerificationModal` & `MeetHub`)**:
  - Opens live webcam preview, captures base64 frame, invokes Gemini verification check to confirm a real human face/pose, updates `isVerified = true` and `trustScore` in Firestore, and allows creating/completing live Date Safety Check-Ins synced to Firestore.
- **Hardened Firestore Security Rules (` firebase-blueprint.json` & `firestore.rules`)**:
  - Updates `firebase-blueprint.json` and `firestore.rules` to cover all collections (`users`, `chatSessions`, `messages`, `voiceRooms`, `swipes`, `transactions`, `safetyCheckins`) with strict schema validation helpers, size bounds, and `DeployRules` synchronization.
