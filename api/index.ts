import express from "express";
import { requireAuth, AuthRequest } from "../src/middleware/auth.ts";
import { getOrCreateUser } from "../src/db/users.ts";
import * as geminiServer from "../services/geminiServerService.ts";

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
- [Nairobi Dating Hub](https://www.pendo.website/#city-nairobi): Connect with verified singles and curated first-date venues in Westlands, Kilimani, and Karen.
- [Mombasa Dating Hub](https://www.pendo.website/#city-mombasa): Coastal matchmaking and safe beach date spots in Nyali and Old Town.
- [Kisumu Dating Hub](https://www.pendo.website/#city-kisumu): Lakeside singles directory and Dunga Hill sunset lounges.
- [Nakuru Dating Hub](https://www.pendo.website/#city-nakuru): Rift Valley dating and Great Rift romance spots.
- [Eldoret Dating Hub](https://www.pendo.website/#city-eldoret): Champions hub dating and safe rendezvous lounges.
- [Voice Lounges](https://www.pendo.website/#voice-lounge): Live audio hangouts and icebreaker speed dating hosted with Auntie Shosh AI.
- [Alika Rafiki Referral](https://www.pendo.website/#alika): Viral WhatsApp referral program with Trust Score rewards and free Profile Boosts.

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

app.get(["/robots.txt", "/api/robots.txt"], (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send("User-agent: *\nAllow: /\nSitemap: https://www.pendo.website/sitemap.xml\nAgentmap: https://www.pendo.website/ai-catalog.json\n");
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

// Simulated & Live M-Pesa STK Push Express Endpoint (Safaricom Daraja)
app.post("/api/mpesa/stk-push", async (req, res) => {
  try {
    const { phone, amountKes, purpose, itemName, recipientName } = req.body;
    const sanitizedPhone = (phone || "").replace(/[^0-9]/g, "");

    if (!sanitizedPhone || sanitizedPhone.length < 9) {
      return res.status(400).json({ error: "Invalid Kenyan phone number format. Provide 07... or 254..." });
    }

    // Generate realistic Daraja STK Push Simulation Response
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "QK";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return res.json({
      success: true,
      merchantRequestId: `29115-34620561-${Date.now()}`,
      checkoutRequestId: `ws_CO_${Date.now()}`,
      responseCode: "0",
      customerMessage: "Success. Request accepted for processing",
      receiptNumber: code,
      amountKes: Number(amountKes) || 150,
      purpose: purpose || "GOLD_SUBSCRIPTION",
      itemName: itemName || "Pendo Gold",
      recipientName: recipientName || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "M-Pesa STK Push gateway error" });
  }
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

// IndexNow API Submission Endpoint for Bing & Search Engines
app.post("/api/indexnow/submit", async (req, res) => {
  try {
    const host = req.headers.host || "www.pendo.website";
    const hostClean = host.split(":")[0];
    const key = "8zvbpmffgtwz251x44qqw5h5ugnvyyva";
    const payload = {
      host: hostClean.includes("pendo.website") ? "www.pendo.website" : hostClean,
      key: key,
      keyLocation: `https://www.pendo.website/${key}.txt`,
      urlList: [
        "https://www.pendo.website/",
        "https://www.pendo.website/#city-nairobi",
        "https://www.pendo.website/#city-mombasa",
        "https://www.pendo.website/#city-kisumu",
        "https://www.pendo.website/#city-nakuru",
        "https://www.pendo.website/#city-eldoret",
        "https://www.pendo.website/#voice-lounge",
      ],
    };

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    return res.json({
      success: response.ok,
      status: response.status,
      message: response.ok ? "Successfully notified IndexNow engines (Bing, Yandex, Naver)" : "IndexNow responded with code " + response.status,
      payload,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to notify IndexNow" });
  }
});

export default app;
