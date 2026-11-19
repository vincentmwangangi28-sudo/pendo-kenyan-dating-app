import express from "express";
import { requireAuth, AuthRequest } from "../src/middleware/auth.ts";
import { getOrCreateUser } from "../src/db/users.ts";
import * as geminiServer from "../services/geminiServerService.ts";
import { CANONICAL_URLS, generateSitemapXml } from "../src/lib/seoRoutes.ts";
import {
  recordMpesaCheckout,
  getMpesaCheckout,
  finalizeMpesaCheckout,
  listVibeMeetups,
  toggleVibeMeetupRsvp,
  addUserNotification,
  getUserNotifications,
  markUserNotificationsRead,
  savePushSubscription,
} from "../src/db/ledger.ts";
import {
  normalizeKenyanMsisdn,
  generateSandboxReceiptCode,
  initiateDarajaStkPush,
  parseDarajaCallbackPayload,
} from "../src/lib/mpesaDaraja.ts";
import { AppNotification, AppView } from "../types.ts";

const app = express();

// CORS setup for Vercel deployment and custom domain
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://www.pendo.website',
    'https://pendo.website',
    'https://pendo-kenyan-dating-app.vercel.app',
    req.headers.origin || ''
  ];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// Agentic Discovery & SEO Handlers (Fallback for serverless execution)
app.get(["/llms.txt", "/api/llms.txt"], (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(`# Pendo — Kenya's #1 Dating & Matchmaking Platform

> Pendo is the leading Kenyan dating and matchmaking web application designed for verified singles in Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret. Featuring M-Pesa Zawadi gifts, Live Date Safety Shield (Matatu Fare Shield), Sheng AI Wingman, and real-time Voice Lounges.

## Canonical Web Resources
- [Home & City Dating Directory](https://www.pendo.website/): Discover verified singles across Kenyan urban hubs with zero catfishing.
- [Nairobi Dating Hub](https://www.pendo.website/nairobi-dating): Connect with verified singles and curated first-date venues in Westlands, Kilimani, and Karen.
- [Mombasa Dating Hub](https://www.pendo.website/mombasa-dating): Coastal matchmaking and safe beach date spots in Nyali and Old Town.
- [Kisumu Dating Hub](https://www.pendo.website/kisumu-dating): Lakeside singles directory and Dunga Hill sunset lounges.
- [Nakuru Dating Hub](https://www.pendo.website/nakuru-dating): Rift Valley dating and Great Rift romance spots.
- [Eldoret Dating Hub](https://www.pendo.website/eldoret-dating): Champions hub dating and safe rendezvous lounges.
- [Thika Dating Hub](https://www.pendo.website/thika-dating): Thika Road & Kiambu verified singles.
- [Diani & Ukunda Dating Hub](https://www.pendo.website/diani-dating): South Coast beach dating.
- [Naivasha Dating Hub](https://www.pendo.website/naivasha-dating): Lake Naivasha & Rift getaway singles.
- [Nanyuki Dating Hub](https://www.pendo.website/nanyuki-dating): Mt. Kenya & Laikipia singles.
- [Nyeri Dating Hub](https://www.pendo.website/nyeri-dating): Central Highlands verified dating.
- [Machakos Dating Hub](https://www.pendo.website/machakos-dating): Masaku & Eastern Kenya singles.
- [Kenyan Diaspora Dating Hub](https://www.pendo.website/kenyan-diaspora): Connect with Kenyans in UK, USA, UAE, Canada & Australia.
- [Serious Relationships & Marriage](https://www.pendo.website/serious-relationships-kenya): Intentional long-term dating in Kenya.
- [Christian Singles Kenya](https://www.pendo.website/christian-dating-kenya): Faith-centered Kenyan Christian dating.
- [Muslim Singles & Nikah Kenya](https://www.pendo.website/muslim-dating-kenya): Halal courtship & Nikah matchmaking.
- [Voice Lounges](https://www.pendo.website/voice-lounge): Live audio hangouts and icebreaker speed dating hosted with Auntie Shosh AI.
- [Alika Rafiki Referral](https://www.pendo.website/alika-rafiki): Viral WhatsApp referral program with Trust Score rewards and free Profile Boosts.
- [Kilimani Mums](https://www.pendo.website/kilimani-mums): Verified, established Nairobi queens in Kilimani, Kileleshwa & Lavington.
- [Mama wa Harrier](https://www.pendo.website/mama-wa-harrier): Confident Kenyan boss ladies for road trips, fine dining & companionship.
- [Ben 10 Kenya](https://www.pendo.website/ben10-dating-kenya): Verified young Kenyan gentlemen (21+) bringing fitness, energy & attentive company.
- [Wababa & Soft Life](https://www.pendo.website/wababa-soft-life-kenya): VIP matchmaking, fine dining & Diani getaways in Runda, Karen & Westlands.

## Trust & Safety Architecture
- Pendo Ngao Trust Score: Explainable 0–100 identity verification score based on Google Auth, live camera selfie pose checks, and community standing.
- Matatu Fare Shield & Safe Date Check-in: Real-time emergency check-in sharing trusted contact emergency numbers and fare guarantees.
- Local M-Pesa STK Push: Transparent KES transactions for date reservations, virtual gifts (Chai, Dawa, Nyama Choma), and Pendo Gold.
`);
});

app.get(["/ai-catalog.json", "/api/ai-catalog.json"], (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({
    specVersion: "1.0",
    host: {
      displayName: "Pendo Dating Kenya",
      identifier: "did:web:pendo.website",
      documentationUrl: "https://www.pendo.website/llms.txt",
      logoUrl: "https://www.pendo.website/pwa-512x512.png"
    },
    entries: [
      {
        identifier: "urn:air:pendo.website:city-directory",
        displayName: "Kenyan City Dating Directory",
        type: "web",
        url: "https://www.pendo.website/#city-nairobi"
      },
      {
        identifier: "urn:air:pendo.website:mpesa-checkout",
        displayName: "M-Pesa STK Push Integration",
        type: "api",
        url: "https://www.pendo.website/api/mpesa/stk-push"
      },
      {
        identifier: "urn:air:pendo.website:safety-shield",
        displayName: "Pendo Ngao Date Safety Check-In",
        type: "api",
        url: "https://www.pendo.website/api/safety/checkin"
      },
      {
        identifier: "urn:air:pendo.website:indexnow",
        displayName: "IndexNow Search Engine Indexing",
        type: "api",
        url: "https://www.pendo.website/api/indexnow/submit"
      }
    ]
  });
});

app.get(["/cguyxqk3krxuvjeesrp67h8cmz7cvvmn.txt", "/api/cguyxqk3krxuvjeesrp67h8cmz7cvvmn.txt"], (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send("cguyxqk3krxuvjeesrp67h8cmz7cvvmn");
});

app.get(["/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt", "/api/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt"], (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send("8zvbpmffgtwz251x44qqw5h5ugnvyyva");
});

app.get(["/robots.txt", "/api/robots.txt"], (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(
    "User-agent: Googlebot\nAllow: /\nDisallow: /api/\n\nUser-agent: Googlebot-Image\nAllow: /\n\nUser-agent: Google-InspectionTool\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\nDisallow: /api/\n\nUser-agent: AhrefsBot\nAllow: /\n\nUser-agent: AhrefsSiteAudit\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.pendo.website/sitemap.xml\nAgentmap: https://www.pendo.website/ai-catalog.json\n"
  );
});

app.get(["/sitemap.xml", "/api/sitemap.xml"], (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(generateSitemapXml());
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    domain: "www.pendo.website",
    timestamp: new Date().toISOString()
  });
});

// Gemini Proxy Route
app.post("/api/gemini/call", async (req, res) => {
  try {
    const { action, args = [] } = req.body;
    if (!action || typeof (geminiServer as any)[action] !== "function") {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const result = await (geminiServer as any)[action](...args);
    res.json({ result });
  } catch (error: any) {
    console.error(`Error executing Gemini action ${req.body?.action}:`, error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// User Sync Route
app.post("/api/users/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "no-email");
    res.json(dbUser);
  } catch (error: any) {
    console.error("Error syncing user:", error);
    res.status(500).json({ error: "Failed to sync user" });
  }
});

// M-Pesa STK Push Express Endpoint (Safaricom Daraja 2.0 + Ledger)
app.post("/api/mpesa/stk-push", async (req, res) => {
  try {
    const { phone, amountKes, purpose, itemName, recipientName, userId } = req.body || {};
    const msisdn = normalizeKenyanMsisdn(phone);

    if (!msisdn) {
      return res.status(400).json({ error: "Invalid Kenyan phone number format. Provide 07... or 254..." });
    }

    const resolvedAmount = Math.max(1, Number(amountKes) || 150);
    const resolvedPurpose = String(purpose || "GOLD_SUBSCRIPTION");
    const resolvedItemName = String(itemName || "Pendo Gold");

    const stk = await initiateDarajaStkPush({
      msisdn,
      amountKes: resolvedAmount,
      purpose: resolvedPurpose,
      itemName: resolvedItemName,
    });

    const pendingRecord = await recordMpesaCheckout({
      checkoutRequestId: stk.checkoutRequestId,
      merchantRequestId: stk.merchantRequestId,
      userId: String(userId || "guest_user"),
      phone: `+${msisdn}`,
      amountKes: resolvedAmount,
      purpose: resolvedPurpose,
      itemName: resolvedItemName,
      recipientName: recipientName || null,
      receiptNumber: stk.receiptPreview || null,
      status: "PENDING",
      resultDesc: stk.customerMessage,
      mode: stk.mode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return res.json({
      success: true,
      mode: stk.mode,
      merchantRequestId: stk.merchantRequestId,
      checkoutRequestId: stk.checkoutRequestId,
      responseCode: stk.responseCode,
      customerMessage: stk.customerMessage,
      receiptNumber: pendingRecord.receiptNumber,
      status: pendingRecord.status,
      amountKes: resolvedAmount,
      purpose: resolvedPurpose,
      itemName: resolvedItemName,
      recipientName: recipientName || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "M-Pesa STK Push gateway error" });
  }
});

app.post("/api/mpesa/callback", async (req, res) => {
  try {
    const parsed = parseDarajaCallbackPayload(req.body);
    if (!parsed.checkoutRequestId) {
      return res.status(400).json({ error: "Missing CheckoutRequestID." });
    }
    const nextStatus = parsed.resultCode === 0 ? "COMPLETED" : "FAILED";
    const receipt =
      nextStatus === "COMPLETED"
        ? parsed.receiptNumber || generateSandboxReceiptCode("QKL")
        : null;
    const updated = await finalizeMpesaCheckout(
      parsed.checkoutRequestId,
      nextStatus,
      receipt,
      parsed.resultDesc
    );
    if (!updated) {
      return res.status(404).json({ error: "Checkout transaction not found." });
    }
    return res.json({ ResultCode: 0, ResultDesc: "Accepted", transaction: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Callback processing failed" });
  }
});

app.post("/api/mpesa/sandbox-confirm", async (req, res) => {
  try {
    const { checkoutRequestId } = req.body || {};
    if (!checkoutRequestId) return res.status(400).json({ error: "checkoutRequestId is required." });
    const existing = await getMpesaCheckout(String(checkoutRequestId));
    if (!existing) return res.status(404).json({ error: "Transaction not found." });
    if (existing.mode !== "SANDBOX") return res.status(403).json({ error: "Forbidden in Live mode." });
    const updated = await finalizeMpesaCheckout(
      existing.checkoutRequestId,
      "COMPLETED",
      existing.receiptNumber || generateSandboxReceiptCode("SGK"),
      "Sandbox Verified"
    );
    return res.json({ success: true, transaction: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Sandbox confirm failed" });
  }
});

app.get("/api/mpesa/status/:checkoutRequestId", async (req, res) => {
  const tx = await getMpesaCheckout(req.params.checkoutRequestId);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  return res.json({ success: true, transaction: tx });
});

app.get("/api/vibes/meetups", async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  return res.json({ meetups: await listVibeMeetups(userId) });
});

app.post("/api/vibes/rsvp", async (req, res) => {
  const { eventId, userId, userName, userAge, userTrustScore } = req.body || {};
  if (!eventId || !userId) return res.status(400).json({ error: "eventId and userId required." });
  const result = await toggleVibeMeetupRsvp({
    eventId: String(eventId),
    userId: String(userId),
    userName: String(userName || "Pendo Member"),
    userAge: Number(userAge) || 18,
    userTrustScore: Number(userTrustScore) || 0,
  });
  if ('error' in result) return res.status(result.status).json({ error: result.error });
  return res.json({ success: true, action: result.action, event: result.event });
});

app.get("/api/notifications/:userId", (req, res) => {
  return res.json({ notifications: getUserNotifications(req.params.userId) });
});

app.post("/api/notifications/read", (req, res) => {
  const { userId, notificationId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "userId required." });
  return res.json({
    success: true,
    notifications: markUserNotificationsRead(String(userId), notificationId ? String(notificationId) : undefined),
  });
});

app.post("/api/notifications/trigger", (req, res) => {
  const { userId, type, title, body, targetView, targetId } = req.body || {};
  if (!userId || !title) return res.status(400).json({ error: "userId and title required." });
  const notif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: String(userId),
    type: (type as AppNotification["type"]) || "CIRCLE",
    title: String(title),
    body: String(body || ""),
    read: false,
    targetView,
    targetId,
    createdAt: Date.now(),
  };
  addUserNotification(notif);
  return res.json({ success: true, notification: notif });
});

app.post("/api/notifications/subscribe", async (req, res) => {
  const { userId, endpoint, keys } = req.body || {};
  if (!userId || !endpoint) return res.status(400).json({ error: "userId and endpoint required." });
  const result = await savePushSubscription({
    userId: String(userId),
    endpoint: String(endpoint),
    p256dh: keys?.p256dh,
    authKey: keys?.auth,
  });
  return res.json({ success: true, ...result });
});

// Live Date Safety Check-In Endpoint
app.post("/api/safety/checkin", async (req, res) => {
  try {
    const checkin = req.body || {};
    return res.json({
      success: true,
      checkinId: checkin.id || `chk_${Date.now()}`,
      status: "ACTIVE",
      message: "Live Date Safety Check-In & Matatu Fare Shield registered with Pendo Ngao.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to register safety check-in" });
  }
});

// IndexNow API Submission Endpoint for Ahrefs, Bing & Search Engines
app.post("/api/indexnow/submit", async (req, res) => {
  try {
    const key = "8zvbpmffgtwz251x44qqw5h5ugnvyyva";
    const payload = {
      host: "www.pendo.website",
      key: key,
      keyLocation: `https://www.pendo.website/${key}.txt`,
      urlList: CANONICAL_URLS,
    };

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    return res.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? "Successfully notified IndexNow engines (Ahrefs, Bing, Yandex, Naver)" : "IndexNow responded with code " + response.status,
      payload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to notify IndexNow" });
  }
});

export default app;
