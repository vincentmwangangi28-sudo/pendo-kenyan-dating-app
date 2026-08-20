import express from "express";
import { requireAuth, AuthRequest } from "../src/middleware/auth.ts";
import { getOrCreateUser } from "../src/db/users.ts";
import * as geminiServer from "../services/geminiServerService.ts";

const app = express();

// CORS setup for Vercel deployment
app.use((req, res, next) => {
  const allowedOrigins = [
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

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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

export default app;
