var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");

// src/lib/firebase-admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "lexical-apex-gqvh5",
  appId: "1:131484734930:web:a5e7255be93021b250e40b",
  apiKey: "AIzaSyDK7DyMQ6KLGmFqurmspT1OTjaJxSKlTx4",
  authDomain: "lexical-apex-gqvh5.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-389731fa-e167-47fb-8cea-296d2b765f81",
  storageBucket: "lexical-apex-gqvh5.firebasestorage.app",
  messagingSenderId: "131484734930",
  measurementId: ""
};

// src/lib/firebase-admin.ts
if (!(0, import_app.getApps)().length) {
  (0, import_app.initializeApp)({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = (0, import_auth.getAuth)();

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"), 1);

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  uid: (0, import_pg_core.text)("uid").notNull().unique(),
  // Firebase Auth UID
  email: (0, import_pg_core.text)("email").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});

// src/db/index.ts
var { Pool } = import_pg.default;
var createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15e3
  });
};
var pool = createPool();
pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// src/db/users.ts
async function getOrCreateUser(uid, email) {
  const result = await db.insert(users).values({
    uid,
    email
  }).onConflictDoUpdate({
    target: users.uid,
    set: {
      email
    }
  }).returning();
  return result[0];
}

// services/geminiServerService.ts
var geminiServerService_exports = {};
__export(geminiServerService_exports, {
  analyzeCompatibility: () => analyzeCompatibility,
  enhanceBio: () => enhanceBio,
  explainMessage: () => explainMessage,
  findHangoutSpots: () => findHangoutSpots,
  findRealtimeEvents: () => findRealtimeEvents,
  generateAuntieShoshAdvice: () => generateAuntieShoshAdvice,
  generateDateIdeas: () => generateDateIdeas,
  generateGroupDescription: () => generateGroupDescription,
  generateGroupImage: () => generateGroupImage,
  generateHoroscope: () => generateHoroscope,
  generateIcebreaker: () => generateIcebreaker,
  generateLiveIcebreakerQuestion: () => generateLiveIcebreakerQuestion,
  generateSpeech: () => generateSpeech,
  generateVenueVibe: () => generateVenueVibe,
  generateVidDateThemePlan: () => generateVidDateThemePlan,
  generateVoiceCoachResponse: () => generateVoiceCoachResponse,
  geocodeCity: () => geocodeCity,
  verifyPhotoGesture: () => verifyPhotoGesture
});
var import_genai = require("@google/genai");
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var SEARCH_MODEL = "gemini-3.5-flash";
var MAPS_MODEL = "gemini-3.5-flash";
var IMAGE_MODEL = "gemini-3.1-flash-image";
var FAST_MODEL = "gemini-3.1-flash-lite";
var THINKING_MODEL = "gemini-3.1-pro-preview";
var TTS_MODEL = "gemini-3.1-flash-tts-preview";
var VISION_MODEL = "gemini-3.1-flash-image";
var generateHoroscope = async (userZodiac, matchZodiac, matchName) => {
  try {
    if (!userZodiac) return "Update your profile with your zodiac sign to get a personalized compatibility reading!";
    if (!matchZodiac) return `We don't know ${matchName || "this person"}'s zodiac sign yet, but the stars are aligning!`;
    const prompt = `
      Write a short, engaging, and fun daily zodiac compatibility astrology reading (max 3 sentences) 
      for a relationship between a ${userZodiac} and a ${matchZodiac}. 
      Make it romantic but playful.
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "The stars are perfectly aligned for you two today!";
  } catch (error) {
    console.error("Error generating horoscope:", error);
    return "The stars are a bit cloudy today, check back later!";
  }
};
var enhanceBio = async (currentBio, interests, name) => {
  try {
    const prompt = `
      You are an expert dating profile consultant for the Kenyan market. 
      Rewrite the following bio to be more charming, witty, and engaging, keeping it culturally relevant to Kenya.
      Keep it under 250 characters.
      
      Name: ${name}
      Current Bio: ${currentBio}
      Interests: ${interests.join(", ")}
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || currentBio;
  } catch (error) {
    console.error("Error enhancing bio:", error);
    return currentBio;
  }
};
var generateGroupDescription = async (groupName, interest) => {
  try {
    const prompt = `
      Write a short, exciting description (under 200 characters) for a social group in Kenya called "${groupName}".
      The group is focused on "${interest}".
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || `Join ${groupName} to connect with lovers of ${interest}!`;
  } catch (error) {
    return `A community for people who love ${interest}.`;
  }
};
var generateVenueVibe = async (venueName, venueType, location) => {
  try {
    const prompt = `
      Describe the vibe of "${venueName}" (${venueType}) in ${location}, Kenya.
      Target audience: Young Kenyans.
      Tone: Hyped, casual, using a little bit of Sheng/Slang where appropriate.
      Length: Max 6 words. Extremely concise.
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || `${venueName} is the place to be!`;
  } catch (error) {
    return "Great spot to hang out.";
  }
};
var generateIcebreaker = async (match, userInterests) => {
  try {
    const prompt = `
      Generate a fun, friendly dating app icebreaker message to send to ${match.name}.
      Their details: ${match.location}, Interests: ${match.interests.join(", ")}.
      My interests: ${userInterests.join(", ")}.
      Keep it casual and short (under 20 words).
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "Hi! I saw you like " + match.interests[0] + ", that's cool!";
  } catch (error) {
    return "Hi there! How is your day going?";
  }
};
var analyzeCompatibility = async (user, match) => {
  try {
    const prompt = `
      Analyze compatibility between:
      Me: ${user.name}, Age ${user.age}, Likes: ${user.interests.join(", ")}. Bio: ${user.bio}.
      Match: ${match.name}, Age ${match.age}, Likes: ${match.interests.join(", ")}. Bio: ${match.bio}.
      
      Give me a "Vibe Check" result. Be brief, fun, and highlight why we might click.
      Mention specific shared interests. Max 40 words.
    `;
    const response = await ai.models.generateContent({
      model: THINKING_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });
    return response.text?.trim() || "You both have great taste! Start a chat to see if the vibe matches.";
  } catch (error) {
    console.error(error);
    return "Looks like a potential match! Say hi to find out more.";
  }
};
var generateDateIdeas = async (location, userInterests, matchInterests) => {
  try {
    const prompt = `
      Suggest 3 CREATIVE and SPECIFIC date ideas in ${location}, Kenya for two people with these interests:
      User 1: ${userInterests.join(", ")}
      User 2: ${matchInterests.join(", ")}
      
      Use Google Search to find REAL, currently open places or specific upcoming events if possible.
      Include the name of the place and why it fits.
      Format as a short bulleted list.
    `;
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let text2 = response.text || "1. Coffee date at a local java house.\n2. Walk in the park.";
    if (chunks && chunks.length > 0) {
      text2 += "\n\nSources:";
      chunks.forEach((chunk) => {
        if (chunk.web?.uri) {
          text2 += `
- ${chunk.web.title}: ${chunk.web.uri}`;
        }
      });
    }
    return text2;
  } catch (error) {
    return "How about grabbing coffee or going for a walk?";
  }
};
var findHangoutSpots = async (lat, lng, query = "popular hangouts") => {
  try {
    const prompt = `Find 5 good ${query} near the provided location. Return them as a JSON list.`;
    const response = await ai.models.generateContent({
      model: MAPS_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: lat, longitude: lng }
          }
        }
      }
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const spots = [];
    if (chunks) {
      chunks.forEach((chunk, index) => {
        if (chunk.maps) {
          spots.push({
            id: `maps_${index}_${Date.now()}`,
            name: chunk.maps.title || "Found Spot",
            type: "EVENT",
            location: "View on Map",
            photoUrl: "https://picsum.photos/400/300?grayscale",
            activeCount: Math.floor(Math.random() * 100) + 10,
            trending: true,
            // @ts-ignore
            mapsUri: chunk.maps.uri
          });
        }
      });
    }
    return spots;
  } catch (error) {
    console.error("Maps error", error);
    return [];
  }
};
var findRealtimeEvents = async (lat, lng) => {
  try {
    const prompt = `
            Find 5 popular and safe events happening THIS WEEK near latitude ${lat}, longitude ${lng} (specifically in Nairobi or nearby cities). 
            Look for concerts, festivals, tech meetups, markets, or workshops.
            Return a JSON array of objects. Each object must have:
            - name (string)
            - location (string)
            - date (string, e.g. "Sat, Oct 12, 7 PM")
            - description (string)
            - link (string, url if found, otherwise empty)
        `;
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              name: { type: import_genai.Type.STRING },
              location: { type: import_genai.Type.STRING },
              date: { type: import_genai.Type.STRING },
              description: { type: import_genai.Type.STRING },
              link: { type: import_genai.Type.STRING }
            }
          }
        }
      }
    });
    const jsonText = response.text || "[]";
    const eventsData = JSON.parse(jsonText);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    return eventsData.map((event, index) => {
      let realLink = event.link;
      if ((!realLink || realLink === "") && chunks && chunks[index]?.web?.uri) {
        realLink = chunks[index].web.uri;
      }
      return {
        ...event,
        mapsUri: realLink,
        type: "EVENT"
      };
    });
  } catch (error) {
    console.error("Event search error", error);
    return [];
  }
};
var generateGroupImage = async (prompt, size = "1K") => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: `A photorealistic image of: ${prompt}, set in Kenya.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size
        }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image gen error", error);
    return null;
  }
};
var generateSpeech = async (text2) => {
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: { parts: [{ text: text2 }] },
      config: {
        responseModalities: [import_genai.Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error", error);
    return null;
  }
};
var explainMessage = async (message) => {
  try {
    const prompt = `
      Explain/Translate this Kenyan dating message: "${message}".
      Keep it short (under 20 words).
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "Translation unavailable.";
  } catch (error) {
    return "Could not translate message.";
  }
};
var verifyPhotoGesture = async (imageBase64, gesture) => {
  try {
    const prompt = `Is the person doing a "${gesture}" gesture? Answer YES or NO.`;
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: prompt }
        ]
      }
    });
    const text2 = response.text?.trim().toUpperCase();
    return text2?.includes("YES") || false;
  } catch (error) {
    return false;
  }
};
var generateVidDateThemePlan = async (themeName, partnerName) => {
  try {
    const prompt = `
      Create an incredibly fun, romantic, and engaging action-plan for a virtual 1-on-1 video date with "${partnerName}".
      The selected theme is: "${themeName}".
      Suggest details for:
      1. Preparation (e.g. drinks, setup, dressing vibe).
      2. 3 actionable micro-activities to do live over video.
      3. A signature "Daring Question" to ask each other.
      Make the content warm, youthful, customized for Kenyan daters, and formatted in clear, bite-sized sections. Max 140 words.
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "Get ready to have an amazing online date! Bring your good energy, grab your favorite snacks, and enjoy!";
  } catch (error) {
    console.error("Error generating date plan:", error);
    return "Error creating live plan. Set up your screen, prepare a refreshing drink, and let the conversation flow naturally!";
  }
};
var generateLiveIcebreakerQuestion = async (category) => {
  try {
    const prompt = `
      Generate one single highly engaging, deep, or fun conversation-starter question for a video dating couple.
      Category vibe: "${category}".
      Keep the question under 18 words. No introductory text. Just output the question.
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "What was your very first impression of my profile?";
  } catch (error) {
    console.error("Error generating icebreaker question:", error);
    return "What is your absolute dream venue for a first physical meetup?";
  }
};
var generateAuntieShoshAdvice = async (question, userProfile) => {
  try {
    const prompt = `
      You are "Auntie Shosh" (Shosho / Auntie Matchmaker), a humorous, traditional, and energetic 
      Kenyan Auntie relationship advisor on Pendo, Kenya's premiere local dating app.
      
      User's details: Name: ${userProfile.name}, Age: ${userProfile.age}, From: ${userProfile.location}.

      A tenant of your counseling style:
      - Use authentic Kenyan English and friendly Sheng/Swahili slang terms where appropriate (e.g., "bana", "sawa", "mambo", "shosho", "bora", "kijana", "mrembo", "shamba", "mpango", "sasa", "M-Pesa", "Character Development", "Nairobi speed", "draft").
      - Be witty, slightly sassy, but fundamentally loving, supportive, and traditional (always pushing them towards solid local marriage/courtship or finding a good partner with a reliable character).
      - Maintain a warm, encouraging, but slightly roast-heavy Kenyan grandmother persona.
      - Reference traditional symbols like tea cups, cows, goats, and clean kitchens.
      - Keep it short, funny, and engaging (max 3 sentences).

      The user asks: "${question}"
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "Aiya! Ask again, my tea has boiled over!";
  } catch (error) {
    console.error("Error from Shosh:", error);
    return "Aiya! The network from the farm is weak, ask me again once I climb the hill!";
  }
};
var generateVoiceCoachResponse = async (userMessage, chatHistory) => {
  try {
    const prompt = `
      You are "Pendo", an elite, charming, and supportive relationship and dating coach in Kenya. 
      You are helping the user practice their conversation and conversational confidence for first dates or chat apps.
      
      Chat history:
      ${chatHistory.map((h) => `${h.role}: ${h.text}`).join("\n")}
      
      User said: "${userMessage}"
      
      Give a warm, encouraging, short conversational response (max 2 sentences). Keep it natural, witty, and engaging, with soft Kenyan cultural warmth where appropriate.
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt
    });
    return response.text?.trim() || "You're doing great! Keep the conversation flowing naturally.";
  } catch (error) {
    console.error("Voice Coach response error:", error);
    return "That's a great start! Try asking about their favorite spots in town.";
  }
};
var geocodeCity = async (cityName) => {
  try {
    const prompt = `
      Resolve the city name "${cityName}" to its official capitalized city details.
      Return a JSON object consisting of its Latitude and Longitude.
      Format:
      {
        "name": "Official City Name, Country",
        "lat": latitude,
        "lng": longitude
      }
    `;
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            name: { type: import_genai.Type.STRING },
            lat: { type: import_genai.Type.NUMBER },
            lng: { type: import_genai.Type.NUMBER }
          },
          required: ["name", "lat", "lng"]
        }
      }
    });
    const jsonText = response.text || "";
    const data = JSON.parse(jsonText.trim());
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      return {
        name: data.name || cityName,
        lat: data.lat,
        lng: data.lng
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error in backend:", error);
    return null;
  }
};

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/gemini/call", async (req, res) => {
    try {
      const { action, args = [] } = req.body;
      if (!action || typeof geminiServerService_exports[action] !== "function") {
        return res.status(400).json({ error: `Unknown action: ${action}` });
      }
      const result = await geminiServerService_exports[action](...args);
      res.json({ result });
    } catch (error) {
      console.error(`Error executing Gemini action ${req.body?.action}:`, error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
  app.post("/api/users/sync", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      const dbUser = await getOrCreateUser(req.user.uid, req.user.email || "no-email");
      res.json(dbUser);
    } catch (error) {
      console.error("Error syncing user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
