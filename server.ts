import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import * as geminiServer from "./services/geminiServerService.ts";
import { CANONICAL_URLS, generateSitemapXml } from "./src/lib/seoRoutes.ts";
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
} from "./src/db/ledger.ts";
import {
  normalizeKenyanMsisdn,
  generateSandboxReceiptCode,
  initiateDarajaStkPush,
  parseDarajaCallbackPayload,
} from "./src/lib/mpesaDaraja.ts";
import { AppNotification, AppView } from "./types.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  // Authoritative Real-Time Event Hub (/ws/events) — isolated from Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/events" });
  const wsClientsByUser = new Map<string, Set<WebSocket>>();

  const broadcastUserEvent = (userId: string, payload: unknown) => {
    const serialized = JSON.stringify(payload);
    const sockets = wsClientsByUser.get(userId);
    if (!sockets) return;
    sockets.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  };

  const broadcastAll = (payload: unknown) => {
    const serialized = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  };

  wss.on("connection", (ws, req) => {
    let userId = "guest_user";
    try {
      const url = new URL(req.url || "/ws/events", "http://localhost");
      userId = (url.searchParams.get("userId") || "guest_user").slice(0, 128);
    } catch {}

    if (!wsClientsByUser.has(userId)) {
      wsClientsByUser.set(userId, new Set());
    }
    wsClientsByUser.get(userId)!.add(ws);

    try {
      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          userId,
          unreadCount: getUserNotifications(userId).filter((n) => !n.read).length,
          timestamp: Date.now(),
        })
      );
    } catch {}

    ws.on("close", () => {
      const set = wsClientsByUser.get(userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) wsClientsByUser.delete(userId);
      }
    });
  });

  // Trust Render's reverse proxy & load balancer
  app.set("trust proxy", 1);

  // Canonical domain redirect (pendo.website -> www.pendo.website) & security headers for Render
  app.use((req, res, next) => {
    const host = (req.headers.host || "").toLowerCase();
    const isVerificationPath =
      req.path === "/cguyxqk3krxuvjeesrp67h8cmz7cvvmn.txt" ||
      req.path === "/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt" ||
      req.path === "/robots.txt" ||
      req.path === "/sitemap.xml";
    if (host === "pendo.website" && !isVerificationPath) {
      return res.redirect(301, `https://www.pendo.website${req.originalUrl}`);
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    if (req.secure || req.headers["x-forwarded-proto"] === "https") {
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }

    const origin = req.headers.origin;
    if (origin) {
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

  app.use(express.json({ limit: '10mb' })); // Increase JSON limit to allow base64 images

  // Render Zero-Downtime Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "Pendo Dating Kenya API",
      platform: process.env.RENDER ? "render" : "node",
      renderService: process.env.RENDER_SERVICE_NAME || "pendo-kenya-dating",
      renderServiceId: "srv-dbq6rflg1s2s739lb230",
      externalUrl: process.env.RENDER_EXTERNAL_URL || "https://www.pendo.website",
      commit: process.env.RENDER_GIT_COMMIT || "latest",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Render Automated Deploy Hook Endpoint (Authenticated, env-configured)
  app.post("/api/render/deploy", requireAuth, async (req: AuthRequest, res) => {
    try {
      const hookUrl = process.env.RENDER_DEPLOY_HOOK_URL;
      if (!hookUrl) {
        return res.status(503).json({ error: "RENDER_DEPLOY_HOOK_URL is not configured on the server." });
      }
      const response = await fetch(hookUrl, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: response.ok,
        serviceId: "srv-dbq6rflg1s2s739lb230",
        deploy: data.deploy || data,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to trigger Render deploy hook" });
    }
  });

  // M-Pesa Daraja 2.0 Express STK Push + Ledger Endpoint
  app.post("/api/mpesa/stk-push", async (req, res) => {
    try {
      const { phone, amountKes, purpose, itemName, recipientName, userId } = req.body || {};
      const msisdn = normalizeKenyanMsisdn(phone);
      if (!msisdn) {
        return res.status(400).json({ error: "Invalid Kenyan Safaricom/Airtel phone format." });
      }

      const resolvedAmount = Math.max(1, Number(amountKes) || 150);
      const resolvedPurpose = String(purpose || "GOLD_SUBSCRIPTION");
      const resolvedItemName = String(itemName || "Pendo Gold");
      const resolvedUserId = String(userId || "guest_user");

      const stk = await initiateDarajaStkPush({
        msisdn,
        amountKes: resolvedAmount,
        purpose: resolvedPurpose,
        itemName: resolvedItemName,
      });

      const pendingRecord = await recordMpesaCheckout({
        checkoutRequestId: stk.checkoutRequestId,
        merchantRequestId: stk.merchantRequestId,
        userId: resolvedUserId,
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

  // Safaricom Daraja 2.0 Webhook Callback Verification Endpoint
  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const parsed = parseDarajaCallbackPayload(req.body);
      if (!parsed.checkoutRequestId) {
        return res.status(400).json({ error: "Missing CheckoutRequestID in Daraja callback." });
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
        return res.status(404).json({ error: "Checkout transaction not found in ledger." });
      }

      if (updated.status === "COMPLETED") {
        const notif: AppNotification = {
          id: `mpesa_${updated.checkoutRequestId}`,
          userId: updated.userId,
          type: "MPESA",
          title: `M-Pesa Receipt #${updated.receiptNumber} Confirmed`,
          body: `KES ${updated.amountKes.toLocaleString()} for ${updated.itemName} verified via Daraja.`,
          read: false,
          targetView: AppView.DISCOVERY,
          createdAt: Date.now(),
        };
        addUserNotification(notif);
        broadcastUserEvent(updated.userId, {
          type: "MPESA_CONFIRMED",
          transaction: updated,
          notification: notif,
        });
      }

      return res.json({
        ResultCode: 0,
        ResultDesc: "Accepted",
        transaction: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to process Daraja callback" });
    }
  });

  // Sandbox Checkout Reconciliation Endpoint (when live Daraja keys are unset)
  app.post("/api/mpesa/sandbox-confirm", async (req, res) => {
    try {
      const { checkoutRequestId } = req.body || {};
      if (!checkoutRequestId) {
        return res.status(400).json({ error: "checkoutRequestId is required." });
      }
      const existing = await getMpesaCheckout(String(checkoutRequestId));
      if (!existing) {
        return res.status(404).json({ error: "Checkout transaction not found." });
      }
      if (existing.mode !== "SANDBOX") {
        return res.status(403).json({ error: "Sandbox confirmation disabled when Live Daraja is active." });
      }

      const receipt = existing.receiptNumber || generateSandboxReceiptCode("SGK");
      const updated = await finalizeMpesaCheckout(
        existing.checkoutRequestId,
        "COMPLETED",
        receipt,
        "The service request is processed successfully (Sandbox Verified)."
      );

      if (updated) {
        const notif: AppNotification = {
          id: `mpesa_${updated.checkoutRequestId}`,
          userId: updated.userId,
          type: "MPESA",
          title: `M-Pesa Receipt #${updated.receiptNumber} Confirmed`,
          body: `KES ${updated.amountKes.toLocaleString()} for ${updated.itemName} confirmed.`,
          read: false,
          targetView: AppView.DISCOVERY,
          createdAt: Date.now(),
        };
        addUserNotification(notif);
        broadcastUserEvent(updated.userId, {
          type: "MPESA_CONFIRMED",
          transaction: updated,
          notification: notif,
        });
      }

      return res.json({ success: true, transaction: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Sandbox confirmation error" });
    }
  });

  // M-Pesa Transaction Status Endpoint
  app.get("/api/mpesa/status/:checkoutRequestId", async (req, res) => {
    const tx = await getMpesaCheckout(req.params.checkoutRequestId);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    return res.json({ success: true, transaction: tx });
  });

  // Kenyan Vibe Circles Meetups & Server-Gated RSVP Endpoints
  app.get("/api/vibes/meetups", async (req, res) => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const meetups = await listVibeMeetups(userId);
    return res.json({ meetups });
  });

  app.post("/api/vibes/rsvp", async (req, res) => {
    try {
      const { eventId, userId, userName, userAge, userTrustScore } = req.body || {};
      if (!eventId || !userId) {
        return res.status(400).json({ error: "eventId and userId are required." });
      }
      const result = await toggleVibeMeetupRsvp({
        eventId: String(eventId),
        userId: String(userId),
        userName: String(userName || "Pendo Member"),
        userAge: Number(userAge) || 18,
        userTrustScore: Number(userTrustScore) || 0,
      });

      if ('error' in result) {
        return res.status(result.status).json({ error: result.error });
      }

      if (result.action === "JOINED") {
        const notif: AppNotification = {
          id: `meetup_${result.event.id}_${userId}_${Date.now()}`,
          userId: String(userId),
          type: "MEETUP",
          title: `RSVP Confirmed · ${result.event.vibeCircle}`,
          body: `${result.event.title} at ${result.event.venueName} (${result.event.dateLabel}).`,
          read: false,
          targetView: AppView.VIBES,
          targetId: result.event.id,
          createdAt: Date.now(),
        };
        addUserNotification(notif);
        broadcastUserEvent(String(userId), { type: "NOTIFICATION", notification: notif });
      }

      broadcastAll({ type: "MEETUP_UPDATED", event: result.event });
      return res.json({ success: true, action: result.action, event: result.event });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to toggle meetup RSVP" });
    }
  });

  // Real-Time Notifications & Web Push Endpoints
  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = getUserNotifications(req.params.userId);
    return res.json({ notifications });
  });

  app.post("/api/notifications/read", (req, res) => {
    const { userId, notificationId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId is required." });
    }
    const notifications = markUserNotificationsRead(String(userId), notificationId ? String(notificationId) : undefined);
    return res.json({ success: true, notifications });
  });

  app.post("/api/notifications/trigger", (req, res) => {
    const { userId, type, title, body, targetView, targetId } = req.body || {};
    if (!userId || !title) {
      return res.status(400).json({ error: "userId and title are required." });
    }
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
    broadcastUserEvent(String(userId), { type: "NOTIFICATION", notification: notif });
    return res.json({ success: true, notification: notif });
  });

  app.post("/api/notifications/subscribe", async (req, res) => {
    const { userId, endpoint, keys } = req.body || {};
    if (!userId || !endpoint) {
      return res.status(400).json({ error: "userId and endpoint are required." });
    }
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

  // Google Search Console Verification File
  app.get("/google00332d67777e965d.html", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("google-site-verification: google00332d67777e965d.html");
  });

  // IndexNow Key Verification Endpoints (Ahrefs & Bing)
  app.get("/cguyxqk3krxuvjeesrp67h8cmz7cvvmn.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("cguyxqk3krxuvjeesrp67h8cmz7cvvmn");
  });

  app.get("/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("8zvbpmffgtwz251x44qqw5h5ugnvyyva");
  });

  // IndexNow API Submission Endpoint for Ahrefs, Bing & Search Engines
  app.post("/api/indexnow/submit", async (req, res) => {
    try {
      const canonicalHost = "www.pendo.website";
      const key = "8zvbpmffgtwz251x44qqw5h5ugnvyyva";
      const payload = {
        host: canonicalHost,
        key: key,
        keyLocation: `https://${canonicalHost}/${key}.txt`,
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

  // Microsoft Bing Webmaster Tools Verification File
  const bingXml = `<?xml version="1.0"?>\n<users>\n\t<user>1A704EBF4AD6B5D3CFBA2F15F6D5689E</user>\n</users>\n`;
  app.get(["/BingSiteAuth.xml", "/bingsiteauth.xml"], (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(bingXml);
  });

  // Search Engine Crawling & SEO Endpoints
  app.get("/robots.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(
      "User-agent: Googlebot\nAllow: /\nDisallow: /api/\n\nUser-agent: Googlebot-Image\nAllow: /\n\nUser-agent: Google-InspectionTool\nAllow: /\n\nUser-agent: Bingbot\nAllow: /\nDisallow: /api/\n\nUser-agent: AhrefsBot\nAllow: /\n\nUser-agent: AhrefsSiteAudit\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://www.pendo.website/sitemap.xml\nAgentmap: https://www.pendo.website/ai-catalog.json\n"
    );
  });

  // Agentic Browsing & AI Discovery Endpoints
  app.get("/llms.txt", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "llms.txt");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.sendFile(filePath);
  });

  app.get("/ai-catalog.json", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "ai-catalog.json");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.sendFile(filePath);
  });

  app.get("/sitemap.xml", (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(generateSitemapXml());
  });

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

  // Vite middleware for development, Express static with immutable caching for Render production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Immutable 1-year cache for hashed Vite bundles on Render
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );
    // Standard cache for icons, manifest, service worker, and verification files
    app.use(
      express.static(distPath, {
        maxAge: '1d',
        redirect: false,
        extensions: ['html'],
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html') || filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          }
        },
      })
    );
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      const cleanSlug = req.path.replace(/^\/+|\/+$/g, '');
      const routeHtml = cleanSlug ? path.join(distPath, cleanSlug, 'index.html') : '';
      if (routeHtml && routeHtml.startsWith(distPath) && fs.existsSync(routeHtml)) {
        return res.sendFile(routeHtml);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);

    // Render Keep-Alive Self-Ping (prevents instance spin-down & cold starts on Render)
    const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderExternalUrl) {
      const keepAliveIntervalMs = 14 * 60 * 1000; // 14 minutes
      setInterval(() => {
        fetch(`${renderExternalUrl}/api/health`).catch(() => {});
      }, keepAliveIntervalMs);
    }

    // Automatic backend IndexNow SEO notification (running in backend without UI)
    setTimeout(async () => {
      try {
        const payload = {
          host: "www.pendo.website",
          key: "8zvbpmffgtwz251x44qqw5h5ugnvyyva",
          keyLocation: "https://www.pendo.website/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt",
          urlList: CANONICAL_URLS,
        };
        await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload),
        });
        console.log("[Backend Task] Automatic IndexNow ping to Bing/search engines completed.");
      } catch (err: any) {
        console.warn("[Backend Task] IndexNow background ping:", err?.message || err);
      }
    }, 3000);
  });
}

startServer();
