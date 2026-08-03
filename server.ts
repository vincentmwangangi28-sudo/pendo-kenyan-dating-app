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

  // Search Engine Crawling & SEO Endpoints
  app.get("/robots.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send("User-agent: *\nAllow: /\nSitemap: https://ais-pre-ohryznl5tg2opvo3ua73bl-937574102702.europe-west2.run.app/sitemap.xml");
  });

  app.get("/sitemap.xml", (req, res) => {
    res.setHeader("Content-Type", "application/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ais-pre-ohryznl5tg2opvo3ua73bl-937574102702.europe-west2.run.app/</loc>
    <lastmod>2026-08-02</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ais-pre-ohryznl5tg2opvo3ua73bl-937574102702.europe-west2.run.app/#voice-lounge</loc>
    <lastmod>2026-08-02</lastmod>
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
