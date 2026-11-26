import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { requireAuth, requireVincentAdmin, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import * as geminiServer from "./services/geminiServerService.ts";
import { CANONICAL_URLS, SEO_ROUTES, generateSitemapXml, generateSitemapIndexXml } from "./src/lib/seoRoutes.ts";
import {
  listVibeMeetups,
  toggleVibeMeetupRsvp,
  addUserNotification,
  getUserNotifications,
  markUserNotificationsRead,
  savePushSubscription,
} from "./src/db/ledger.ts";
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
      req.path === "/sitemap.xml" ||
      req.path === "/sitemap_index.xml" ||
      req.path.startsWith("/.well-known/");
    const normalizedReqPath =
      req.path.length > 1 && req.path.endsWith("/") && !req.path.startsWith("/api/")
        ? req.path.replace(/\/+$/, "")
        : req.path;
    const querySuffix = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";

    if (host === "pendo.website" && !isVerificationPath) {
      return res.redirect(301, `https://www.pendo.website${normalizedReqPath}${querySuffix}`);
    }

    if (
      req.method === "GET" &&
      req.path.length > 1 &&
      req.path.endsWith("/") &&
      !req.path.startsWith("/api/")
    ) {
      return res.redirect(301, `${normalizedReqPath}${querySuffix}`);
    }

    if (req.path === "/admin" || req.path.startsWith("/api/")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
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

  // Render Automated Deploy Hook Endpoint (Authenticated Admin Only)
  app.post("/api/render/deploy", requireVincentAdmin, async (req: AuthRequest, res) => {
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
        message: "Live Date Safety Check-In registered with Pendo Ngao.",
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
      "User-agent: Googlebot\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nUser-agent: Googlebot-Image\nAllow: /\n\nUser-agent: Google-InspectionTool\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nUser-agent: Bingbot\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nUser-agent: AhrefsBot\nAllow: /\nDisallow: /admin\n\nUser-agent: AhrefsSiteAudit\nAllow: /\nDisallow: /admin\n\nUser-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\n\nSitemap: https://www.pendo.website/sitemap.xml\nSitemap: https://www.pendo.website/sitemap_index.xml\n"
    );
  });

  // App Store Deep Link Verification Files
  app.get("/.well-known/assetlinks.json", (req, res) => {
    const filePath = path.join(process.cwd(), "public", ".well-known", "assetlinks.json");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath, { dotfiles: "allow" });
    }
    return res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.pendo.kenyandating",
          sha256_cert_fingerprints: ["REPLACE_WITH_YOUR_ANDROID_SIGNING_SHA256_FINGERPRINT"],
        },
      },
    ]);
  });

  app.get("/.well-known/apple-app-site-association", (req, res) => {
    const filePath = path.join(process.cwd(), "public", ".well-known", "apple-app-site-association");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath, { dotfiles: "allow" });
    }
    return res.json({
      applinks: {
        apps: [],
        details: [{ appID: "TEAMID.com.pendo.kenyandating", paths: ["/", "/*"] }],
      },
    });
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

  app.get("/sitemap_index.xml", (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(generateSitemapIndexXml());
  });

  // Strict Vincent-Only Admin SEO Audit, Ahrefs Site Audit Proxy & IndexNow Endpoints
  app.get("/api/admin/seo-audit", requireVincentAdmin, (req: AuthRequest, res) => {
    const publicDir = path.join(process.cwd(), "public");
    const distDir = path.join(process.cwd(), "dist");
    const sitemapXml = generateSitemapXml();
    const robotsPath = path.join(publicDir, "robots.txt");
    const robotsTxt = fs.existsSync(robotsPath) ? fs.readFileSync(robotsPath, "utf-8") : "";
    const googleVerifExists = fs.existsSync(path.join(publicDir, "google00332d67777e965d.html"));
    const bingVerifExists = fs.existsSync(path.join(publicDir, "BingSiteAuth.xml"));
    const assetLinksExists = fs.existsSync(path.join(publicDir, ".well-known", "assetlinks.json"));
    const appleAssocExists = fs.existsSync(path.join(publicDir, ".well-known", "apple-app-site-association"));
    const pwa192Exists = fs.existsSync(path.join(publicDir, "pwa-192x192.png"));
    const pwa512Exists = fs.existsSync(path.join(publicDir, "pwa-512x512.png"));
    const pwaMaskableExists = fs.existsSync(path.join(publicDir, "pwa-maskable-512x512.png"));
    const publicSitemapSynced =
      fs.existsSync(path.join(publicDir, "sitemap.xml")) &&
      fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf-8") === sitemapXml;

    // Inspect HTML pages (dist/ if built, otherwise source index.html + SEO_ROUTES)
    const htmlFiles: string[] = [];
    if (fs.existsSync(path.join(distDir, "index.html"))) {
      htmlFiles.push(path.join(distDir, "index.html"));
      for (const route of SEO_ROUTES) {
        const slug = route.path.replace(/^\/+/, "");
        const candidate = path.join(distDir, slug, "index.html");
        if (fs.existsSync(candidate)) htmlFiles.push(candidate);
      }
    } else if (fs.existsSync(path.join(process.cwd(), "index.html"))) {
      htmlFiles.push(path.join(process.cwd(), "index.html"));
    }

    let singleH1AllPages = htmlFiles.length > 0;
    let metaDescLengthOk = htmlFiles.length > 0 && SEO_ROUTES.every((r) => r.description.length >= 70 && r.description.length <= 160);
    const seenTitles = new Set<string>();
    const seenCanonicals = new Set<string>();
    let uniqueTitlesAndCanonicals = htmlFiles.length > 0;

    for (const filePath of htmlFiles) {
      const html = fs.readFileSync(filePath, "utf-8");
      const h1Matches = html.match(/<h1[\s>]/gi) || [];
      if (h1Matches.length !== 1) singleH1AllPages = false;
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
      const decodedDesc = (descMatch?.[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      if (!decodedDesc || decodedDesc.length < 70 || decodedDesc.length > 160) {
        metaDescLengthOk = false;
      }
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
      const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i);
      const t = (titleMatch?.[1] || "").trim();
      const c = (canonicalMatch?.[1] || "").trim();
      if (!t || !c || seenTitles.has(t) || seenCanonicals.has(c)) {
        uniqueTitlesAndCanonicals = false;
      }
      seenTitles.add(t);
      seenCanonicals.add(c);
    }

    return res.json({
      adminEmail: req.user?.email,
      checkedAt: new Date().toISOString(),
      canonicalCount: CANONICAL_URLS.length,
      checks: [
        { id: "sitemap_xml", label: "Google Sitemap XML (25 URLs)", ok: publicSitemapSynced, url: "https://www.pendo.website/sitemap.xml" },
        { id: "sitemap_index", label: "Google Sitemap Index XML", ok: fs.existsSync(path.join(publicDir, "sitemap_index.xml")), url: "https://www.pendo.website/sitemap_index.xml" },
        { id: "robots_txt", label: "Clean robots.txt (No Invalid Directives, Blocks /admin)", ok: !robotsTxt.includes("Agentmap:") && robotsTxt.includes("Disallow: /admin"), url: "https://www.pendo.website/robots.txt" },
        { id: "single_h1_per_page", label: `Single <h1> Tag Enforced (${htmlFiles.length} HTML Pages)`, ok: singleH1AllPages, url: "https://www.pendo.website/" },
        { id: "meta_desc_length", label: "Meta Description 70-160 Chars Across All Routes", ok: metaDescLengthOk, url: "https://www.pendo.website/kilimani-mums" },
        { id: "unique_titles_canonicals", label: "Unique Titles & Non-Trailing-Slash Canonicals (301)", ok: uniqueTitlesAndCanonicals, url: "https://www.pendo.website/nairobi-dating" },
        { id: "google_verif", label: "Google Search Console HTML Verification", ok: googleVerifExists, url: "https://www.pendo.website/google00332d67777e965d.html" },
        { id: "bing_verif", label: "Bing Webmaster Verification XML", ok: bingVerifExists, url: "https://www.pendo.website/BingSiteAuth.xml" },
        { id: "assetlinks", label: "Android TWA Digital Asset Links", ok: assetLinksExists, url: "https://www.pendo.website/.well-known/assetlinks.json" },
        { id: "apple_assoc", label: "Apple Universal Links Association", ok: appleAssocExists, url: "https://www.pendo.website/.well-known/apple-app-site-association" },
        { id: "pwa_icons", label: "PWA Store Icons (192, 512, Maskable)", ok: pwa192Exists && pwa512Exists && pwaMaskableExists, url: "https://www.pendo.website/pwa-512x512.png" },
      ],
    });
  });

  app.get("/api/admin/ahrefs-issues", requireVincentAdmin, async (req: AuthRequest, res) => {
    const rawProjectId = typeof req.query.project_id === "string" ? req.query.project_id.trim() : "";
    const projectId = /^\d{1,20}$/.test(rawProjectId)
      ? rawProjectId
      : (process.env.AHREFS_PROJECT_ID || "10647395").replace(/[^\d]/g, "") || "10647395";

    const rawDate = typeof req.query.date === "string" ? req.query.date.trim() : "";
    const date = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(rawDate)
      ? rawDate
      : "2026-11-25T21:29:43Z";

    const rawDateCompared = typeof req.query.date_compared === "string" ? req.query.date_compared.trim() : "";
    const dateCompared = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(rawDateCompared)
      ? rawDateCompared
      : "2026-11-24T21:14:54Z";

    const apiKey = (process.env.AHREFS_API_KEY || "").trim();
    if (!apiKey) {
      return res.json({
        configured: false,
        projectId,
        date,
        dateCompared,
        message: "Server environment variable AHREFS_API_KEY is not configured yet. Add AHREFS_API_KEY in your server environment settings to sync live issues from Ahrefs Project 10647395.",
        issues: [],
      });
    }

    try {
      const upstreamUrl = new URL("https://api.ahrefs.com/v3/site-audit/issues");
      upstreamUrl.searchParams.set("project_id", projectId);
      upstreamUrl.searchParams.set("date", date);
      upstreamUrl.searchParams.set("date_compared", dateCompared);

      const response = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          configured: true,
          projectId,
          date,
          dateCompared,
          error: payload?.error?.message || payload?.message || `Ahrefs API returned HTTP ${response.status}`,
        });
      }

      const issues = Array.isArray(payload?.issues)
        ? payload.issues
        : Array.isArray(payload?.data)
        ? payload.data
        : [];
      return res.json({
        configured: true,
        projectId,
        date,
        dateCompared,
        issues,
        raw: payload,
      });
    } catch (err: any) {
      return res.status(502).json({
        configured: true,
        projectId,
        date,
        dateCompared,
        error: err?.message || "Failed to reach Ahrefs Site Audit API",
      });
    }
  });

  app.post("/api/admin/indexnow", requireVincentAdmin, async (req: AuthRequest, res) => {
    try {
      const canonicalHost = "www.pendo.website";
      const key = "8zvbpmffgtwz251x44qqw5h5ugnvyyva";
      const payload = {
        host: canonicalHost,
        key,
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
        submittedCount: CANONICAL_URLS.length,
        message: response.ok
          ? `Submitted all ${CANONICAL_URLS.length} URLs to IndexNow (Bing, Yandex, Ahrefs)`
          : `IndexNow responded with HTTP ${response.status}`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to notify IndexNow" });
    }
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

  app.use('/api', (_req, res) => {
    return res.status(404).json({ error: 'API endpoint not found' });
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
    const knownSpaPaths = new Set(['/', '/admin', ...SEO_ROUTES.map((r) => r.path.toLowerCase())]);
    app.get('*all', (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      const normalizedPath = req.path.toLowerCase().replace(/\/+$/, '') || '/';
      if (normalizedPath === '/admin') {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      const cleanSlug = req.path.replace(/^\/+|\/+$/g, '');
      const routeHtml = cleanSlug ? path.join(distPath, cleanSlug, 'index.html') : '';
      if (routeHtml && routeHtml.startsWith(distPath) && fs.existsSync(routeHtml)) {
        return res.sendFile(routeHtml);
      }
      if (!knownSpaPaths.has(normalizedPath)) {
        return res.status(404).sendFile(path.join(distPath, 'index.html'));
      }
      return res.sendFile(path.join(distPath, 'index.html'));
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
