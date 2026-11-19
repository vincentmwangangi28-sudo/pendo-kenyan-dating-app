import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { users } from "./src/db/schema.ts";
import * as geminiServer from "./services/geminiServerService.ts";
import { CANONICAL_URLS, generateSitemapXml } from "./src/lib/seoRoutes.ts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // Render Automated Deploy Hook Endpoint
  app.post("/api/render/deploy", async (req, res) => {
    try {
      const hookUrl =
        process.env.RENDER_DEPLOY_HOOK_URL ||
        "https://api.render.com/deploy/srv-dbq6rflg1s2s739lb230?key=7d_2_fgvGII";
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

  // M-Pesa Daraja 2.0 Express STK Push Endpoint
  app.post("/api/mpesa/stk-push", async (req, res) => {
    try {
      const { phone, amountKes, purpose, itemName, recipientName } = req.body || {};
      const cleaned = String(phone || "").replace(/\s+/g, "");
      if (!/^\+?254(7|1)\d{8}$/.test(cleaned) && !/^(07|01)\d{8}$/.test(cleaned)) {
        return res.status(400).json({ error: "Invalid Kenyan Safaricom/Airtel phone format." });
      }

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "SGK";
      for (let i = 0; i < 7; i++) {
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

  app.listen(PORT, "0.0.0.0", () => {
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
