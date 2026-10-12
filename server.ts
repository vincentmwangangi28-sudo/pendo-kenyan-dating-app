import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { users } from "./src/db/schema.ts";
import * as geminiServer from "./services/geminiServerService.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS setup for Vercel & local deployment
  app.use((req, res, next) => {
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

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Google Search Console Verification File
  app.get("/google00332d67777e965d.html", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send("google-site-verification: google00332d67777e965d.html");
  });

  // IndexNow Key Verification Endpoint
  app.get("/8zvbpmffgtwz251x44qqw5h5ugnvyyva.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send("8zvbpmffgtwz251x44qqw5h5ugnvyyva");
  });

  // IndexNow API Submission Endpoint for Bing & Search Engines
  app.post("/api/indexnow/submit", async (req, res) => {
    try {
      const host = req.headers.host || "pendo-kenyan-dating-app.vercel.app";
      const hostClean = host.split(":")[0];
      const key = "8zvbpmffgtwz251x44qqw5h5ugnvyyva";
      const payload = {
        host: hostClean,
        key: key,
        keyLocation: `https://${hostClean}/${key}.txt`,
        urlList: [
          `https://${hostClean}/`,
          `https://${hostClean}/#voice-lounge`,
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

  // Microsoft Bing Webmaster Tools Verification File
  const bingXml = `<?xml version="1.0"?>\n<users>\n\t<user>1A704EBF4AD6B5D3CFBA2F15F6D5689E</user>\n</users>\n`;
  app.get(["/BingSiteAuth.xml", "/bingsiteauth.xml"], (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(bingXml);
  });

  // Search Engine Crawling & SEO Endpoints
  app.get("/robots.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send("User-agent: *\nAllow: /\nSitemap: https://pendo-kenyan-dating-app.vercel.app/sitemap.xml");
  });

  app.get("/sitemap.xml", (req, res) => {
    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://pendo-kenyan-dating-app.vercel.app/</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://pendo-kenyan-dating-app.vercel.app/#voice-lounge</loc>
    <lastmod>2026-08-03</lastmod>
    <changefreq>always</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
