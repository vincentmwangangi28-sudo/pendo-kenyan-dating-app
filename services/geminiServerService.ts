import { GoogleGenAI, Modality, Type } from "@google/genai";
import { UserProfile, MatchProfile, HangoutSpot } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Models Configuration
const SEARCH_MODEL = "gemini-3.5-flash";
const MAPS_MODEL = "gemini-3.5-flash";
const IMAGE_MODEL = "gemini-3.1-flash-image";
const FAST_MODEL = "gemini-3.1-flash-lite";
const THINKING_MODEL = "gemini-3.1-pro-preview";
const TTS_MODEL = "gemini-3.1-flash-tts-preview";
const VISION_MODEL = "gemini-3.1-flash-image";

/**
 * Generates horoscope compatibility reading.
 */
export const generateHoroscope = async (userZodiac?: string, matchZodiac?: string, matchName?: string): Promise<string> => {
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
      contents: prompt,
    });

    return response.text?.trim() || "The stars are perfectly aligned for you two today!";
  } catch (error) {
    console.error("Error generating horoscope:", error);
    return "The stars are a bit cloudy today, check back later!";
  }
};

/**
 * Enhances a user's bio.
 */
export const enhanceBio = async (currentBio: string, interests: string[], name: string): Promise<string> => {
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
      contents: prompt,
    });

    return response.text?.trim() || currentBio;
  } catch (error) {
    console.error("Error enhancing bio:", error);
    return currentBio;
  }
};

/**
 * Generates a description for a new social group.
 */
export const generateGroupDescription = async (groupName: string, interest: string): Promise<string> => {
  try {
    const prompt = `
      Write a short, exciting description (under 200 characters) for a social group in Kenya called "${groupName}".
      The group is focused on "${interest}".
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || `Join ${groupName} to connect with lovers of ${interest}!`;
  } catch (error) {
    return `A community for people who love ${interest}.`;
  }
};

/**
 * Generates a "Vibe Check" description for a venue.
 */
export const generateVenueVibe = async (venueName: string, venueType: string, location: string): Promise<string> => {
  try {
    const prompt = `
      Describe the vibe of "${venueName}" (${venueType}) in ${location}, Kenya.
      Target audience: Young Kenyans.
      Tone: Hyped, casual, using a little bit of Sheng/Slang where appropriate.
      Length: Max 6 words. Extremely concise.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || `${venueName} is the place to be!`;
  } catch (error) {
    return "Great spot to hang out.";
  }
};

/**
 * Generates a fun icebreaker.
 */
export const generateIcebreaker = async (match: MatchProfile, userInterests: string[]): Promise<string> => {
  try {
    const prompt = `
      Generate a fun, friendly dating app icebreaker message to send to ${match.name}.
      Their details: ${match.location}, Interests: ${match.interests.join(", ")}.
      My interests: ${userInterests.join(", ")}.
      Keep it casual and short (under 20 words).
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || "Hi! I saw you like " + match.interests[0] + ", that's cool!";
  } catch (error) {
    return "Hi there! How is your day going?";
  }
};

/**
 * Analyzes compatibility using Thinking Mode.
 */
export const analyzeCompatibility = async (user: UserProfile, match: MatchProfile): Promise<string> => {
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
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });

    return response.text?.trim() || "You both have great taste! Start a chat to see if the vibe matches.";
  } catch (error) {
    console.error(error);
    return "Looks like a potential match! Say hi to find out more.";
  }
};

/**
 * Generates specific date ideas using Google Search.
 */
export const generateDateIdeas = async (location: string, userInterests: string[], matchInterests: string[]): Promise<string> => {
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
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    // Extract sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let text = response.text || "1. Coffee date at a local java house.\n2. Walk in the park.";
    
    if (chunks && chunks.length > 0) {
        text += "\n\nSources:";
        chunks.forEach((chunk: any) => {
            if (chunk.web?.uri) {
                text += `\n- ${chunk.web.title}: ${chunk.web.uri}`;
            }
        });
    }

    return text;
  } catch (error) {
    return "How about grabbing coffee or going for a walk?";
  }
};

/**
 * Finds hangout spots using Google Maps.
 */
export const findHangoutSpots = async (lat: number, lng: number, query: string = "popular hangouts"): Promise<HangoutSpot[]> => {
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

    // Getting grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const spots: HangoutSpot[] = [];

    if (chunks) {
        chunks.forEach((chunk: any, index: number) => {
            if (chunk.maps) {
                spots.push({
                    id: `maps_${index}_${Date.now()}`,
                    name: chunk.maps.title || "Found Spot",
                    type: 'EVENT',
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
}

/**
 * Finds real-time events using Google Search Grounding and returns JSON.
 */
export const findRealtimeEvents = async (lat: number, lng: number): Promise<any[]> => {
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
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            location: { type: Type.STRING },
                            date: { type: Type.STRING },
                            description: { type: Type.STRING },
                            link: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const jsonText = response.text || "[]";
        const eventsData = JSON.parse(jsonText);
        
        // Attach grounding sources if available for attribution to ensure links are valid
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        return eventsData.map((event: any, index: number) => {
            let realLink = event.link;
            if ((!realLink || realLink === '') && chunks && chunks[index]?.web?.uri) {
                realLink = chunks[index].web.uri;
            }

            return {
                ...event,
                mapsUri: realLink,
                type: 'EVENT'
            };
        });

    } catch (error: any) {
        console.warn("Event search: Gemini API quota exceeded or unavailable. Gracefully returning curated fallback local events.");
        return [
          {
            name: "Blankets & Wine Nairobi",
            location: "Laureen Gardens, Nairobi",
            date: "Sun, Oct 12, 12 PM - 10 PM",
            description: "Kenya's premier music festival showcasing outstanding live music, art, and fashion. Grab your picnic blanket and enjoy the vibe!",
            link: "https://www.blanketsandwine.com",
            mapsUri: "https://www.blanketsandwine.com",
            type: "EVENT"
          },
          {
            name: "Nairobi Tech Week Showcase",
            location: "Maji House, Ngong Road, Nairobi",
            date: "Wed, Oct 15, 9 AM - 5 PM",
            description: "The largest sub-Saharan Africa tech event focusing on developers, startups, and tech innovation. Great networking opportunity!",
            link: "https://nairobitechweek.com",
            mapsUri: "https://nairobitechweek.com",
            type: "EVENT"
          },
          {
            name: "K1 Flea Market & Sunday Brunch",
            location: "K1 Klub House, Parklands, Nairobi",
            date: "Sun, Oct 12, 10 AM - 6 PM",
            description: "Shop from local Kenyan artisans, enjoy amazing food, craft beers, and live DJ sets in a beautiful cozy garden atmosphere.",
            link: "https://k1klubhouse.com",
            mapsUri: "https://k1klubhouse.com",
            type: "EVENT"
          },
          {
            name: "Nairobi Art & Jazz Night",
            location: "Shamba Cafe, Loresho, Nairobi",
            date: "Fri, Oct 10, 6 PM - 11 PM",
            description: "An evening of smooth contemporary jazz accompanied by an art exhibition featuring rising Kenyan visual artists.",
            link: "https://shambacafe.co.ke",
            mapsUri: "https://shambacafe.co.ke",
            type: "EVENT"
          }
        ];
    }
}

/**
 * Generates an image for a group.
 */
export const generateGroupImage = async (prompt: string, size: '1K'|'2K'|'4K' = '1K'): Promise<string | null> => {
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

/**
 * Generates speech from text.
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: TTS_MODEL,
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("TTS Error", error);
        return null;
    }
}

/**
 * Translates/Explains a message using Fast model.
 */
export const explainMessage = async (message: string): Promise<string> => {
  try {
    const prompt = `
      Explain/Translate this Kenyan dating message: "${message}".
      Keep it short (under 20 words).
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || "Translation unavailable.";
  } catch (error) {
    return "Could not translate message.";
  }
};

/**
 * Verifies photo gesture.
 */
export const verifyPhotoGesture = async (imageBase64: string, gesture: string): Promise<boolean> => {
  try {
    const prompt = `Is the person doing a "${gesture}" gesture? Answer YES or NO.`;
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      }
    });

    const text = response.text?.trim().toUpperCase();
    return text?.includes('YES') || false;
  } catch (error) {
    return false;
  }
};

/**
 * Generates a highly engaging theme-specific plan for a virtual video date.
 */
export const generateVidDateThemePlan = async (themeName: string, partnerName: string): Promise<string> => {
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
      contents: prompt,
    });

    return response.text?.trim() || "Get ready to have an amazing online date! Bring your good energy, grab your favorite snacks, and enjoy!";
  } catch (error) {
    console.error("Error generating date plan:", error);
    return "Error creating live plan. Set up your screen, prepare a refreshing drink, and let the conversation flow naturally!";
  }
};

/**
 * Generates a random, engaging icebreaker question based on a selected category.
 */
export const generateLiveIcebreakerQuestion = async (category: string): Promise<string> => {
  try {
    const prompt = `
      Generate one single highly engaging, deep, or fun conversation-starter question for a video dating couple.
      Category vibe: "${category}".
      Keep the question under 18 words. No introductory text. Just output the question.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || "What was your very first impression of my profile?";
  } catch (error) {
    console.error("Error generating icebreaker question:", error);
    return "What is your absolute dream venue for a first physical meetup?";
  }
};

/**
 * Generates custom advice from Auntie Shosh.
 */
export const generateAuntieShoshAdvice = async (question: string, userProfile: UserProfile): Promise<string> => {
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
      contents: prompt,
    });

    return response.text?.trim() || "Aiya! Ask again, my tea has boiled over!";
  } catch (error) {
    console.error("Error from Shosh:", error);
    return "Aiya! The network from the farm is weak, ask me again once I climb the hill!";
  }
};

/**
 * Evaluates a user's dating message for Sheng/Kenyan slang usage and romantic "Rizz".
 */
export const evaluateShengRizz = async (userLine: string, scenario: string, name: string): Promise<any> => {
  try {
    const prompt = `
      You are "Auntie Shosh" (Shosho), a humorous, traditional, and sassy Kenyan matchmaker.
      You are grading a dating candidate named "${name}" who is trying to flirt or handle a dating situation.
      The scenario they are in is: "${scenario}".
      The candidate wrote the following message: "${userLine}".

      Analyze their line for its level of romantic charm ("Rizz"), Swahili/Sheng slang vocabulary, and local cultural appropriateness in the Kenyan dating scene.
      
      Score their line out of 100:
      - 0 to 45: Poor rizz. They are heading straight for "Nairobi Character Development" (breakup/premium tears). They sound too formal, cold, or completely clueless about Kenyan charm.
      - 46 to 70: Average. They are a "Kofia Wearer" or "Standard Hustler" - trying, but they need more flavor or confidence.
      - 71 to 89: Great. They are a "Chama Favourite" or "Smooth Mrembo/Kijana". They speak with nice warmth and some soft local slang.
      - 90 to 100: Sheng Legend / Nairobi Governor of Rizz. Immaculate local vibes, incredibly smooth sheng, extremely high charm.

      Provide:
      1. A numeric score (0 to 100).
      2. A funny, traditional, sassy Auntie Shosh rank name fitting the score range (e.g. "Character Development Victim 😭", "Kofia Wearer 🧢", "Chama Favourite ☕", "Kilimani Player 🥂", or "Governor of Sheng Rizz 👑").
      3. Hilarious, roast-heavy but encouraging feedback written in Auntie Shosh's unique persona (mixing authentic Kenyan English, motherly roasts, tea and cow references, and local dating tips). Maximum 3 sentences.
      4. A "revised version" of their line, re-written in the ultimate, smoothest Kenyan Sheng/slang that is guaranteed to impress their date.
      5. A list of any local Kenyan slang terms used in either the original or the revised line, along with their meanings (e.g., "bana" -> "man/buddy", "mrembo" -> "beautiful lady", "choma" -> "roasted meat/fun hang", "draft" -> "talking stage/casual dater", "sherehe" -> "partying", "fala" -> "fool").

      Ensure the response strictly follows the JSON schema.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            rank: { type: Type.STRING },
            feedback: { type: Type.STRING },
            revisedLine: { type: Type.STRING },
            slangDefinitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slang: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["slang", "meaning"]
              }
            }
          },
          required: ["score", "rank", "feedback", "revisedLine", "slangDefinitions"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Sheng Rizz evaluation error:", error);
    return {
      score: 50,
      rank: "Chama Standby ☕",
      feedback: "Aiya! Auntie's phone is misbehaving! Just speak from your heart, my child, and remember to carry enough fare!",
      revisedLine: "Sasa mrembo, hope uko poa leo? Kuna form ya nyama choma na tumia baridi hivi karibuni?",
      slangDefinitions: [
        { slang: "Mrembo", meaning: "Beautiful girl" },
        { slang: "Form", meaning: "A plan or plot to hang out" },
        { slang: "Choma", meaning: "Roasted meat, a classic Kenyan date staple" }
      ]
    };
  }
};

/**
 * Generates an response for the Voice Coach.
 */
export const generateVoiceCoachResponse = async (userMessage: string, chatHistory: any[]): Promise<string> => {
  try {
    const prompt = `
      You are "Pendo", an elite, charming, and supportive relationship and dating coach in Kenya. 
      You are helping the user practice their conversation and conversational confidence for first dates or chat apps.
      
      Chat history:
      ${chatHistory.map(h => `${h.role}: ${h.text}`).join('\n')}
      
      User said: "${userMessage}"
      
      Give a warm, encouraging, short conversational response (max 2 sentences). Keep it natural, witty, and engaging, with soft Kenyan cultural warmth where appropriate.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    });

    return response.text?.trim() || "You're doing great! Keep the conversation flowing naturally.";
  } catch (error) {
    console.error("Voice Coach response error:", error);
    return "That's a great start! Try asking about their favorite spots in town.";
  }
};

/**
 * Geocodes a city name using Gemini to resolve coordinates (lat/lng) globally.
 */
export const geocodeCity = async (cityName: string): Promise<{ name: string; lat: number; lng: number } | null> => {
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
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["name", "lat", "lng"]
        }
      }
    });

    const jsonText = response.text || "";
    const data = JSON.parse(jsonText.trim());
    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
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

/**
 * Translates and explains Sheng slang or converts regular English text into cool Sheng lines.
 * Analyzes dating vibes and safety under Auntie Shosh's watchful eye.
 */
export const translateShengSlang = async (text: string, mode: 'explain' | 'slangify'): Promise<{
  translation: string;
  vibeScore: string;
  explanation: string;
} | null> => {
  try {
    let prompt = "";
    if (mode === "explain") {
      prompt = `
        Analyze the following Kenyan Sheng/slang phrase or sentence: "${text}".
        
        1. "translation": Provide a clear, natural translation or explanation in simple standard English or Swahili.
        2. "vibeScore": Evaluate its safety, dynamic vibe, or risk category for Nairobi dating. It MUST be exactly one of:
           - "Chama Approved ✅" (very respectful, sincere, traditional marriage material)
           - "Safe & Authentic Form 👍" (fun, normal, clean vibes)
           - "High Risk: Character Development ⚠️" (typical smooth-talking playboy/city-girl slang, leads to tears and billing)
           - "Extreme Form: Nairobi Speed 🏃‍♂️" (dangerously fast-moving, high alert, red flag)
        3. "explanation": Write a hilarious, witty, and sassy commentary in the voice of "Auntie Shosh" (Shosho / Grandmother advisor). Give traditional grandmotherly warnings or encouragement about why they should or shouldn't use this phrase, referencing things like cows, tea cups, saving money, or being home before sunset. Keep it under 2 sentences.
      `;
    } else {
      prompt = `
        Convert/Slangify this standard English or Swahili text into a cool, respectful, and attractive Nairobi Sheng slang dating phrase or pickup line: "${text}".
        
        1. "translation": The resulting cool Sheng dating line/phrase. Make it sound authentic to Nairobi youths today.
        2. "vibeScore": Evaluate this line's style category. It MUST be exactly one of:
           - "Chama Approved ✅" (traditional, sweet, family-friendly)
           - "Safe & Authentic Form 👍" (chill, polite, stylish)
           - "High Risk: Character Development ⚠️" (risky, extremely smooth-talking Nairobi line)
           - "Extreme Form: Nairobi Speed 🏃‍♂️" (highly aggressive line, likely to get ignored or lead to block)
        3. "explanation": Write a hilarious, witty, and sassy commentary in the voice of "Auntie Shosh" (Shosho / Grandmother advisor). Explain why this Sheng translation is a good or bad choice to send, and how a real Kenyan partner would react to it. Keep it under 2 sentences.
      `;
    }

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            vibeScore: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["translation", "vibeScore", "explanation"]
        }
      }
    });

    const jsonText = response.text || "";
    return JSON.parse(jsonText.trim());
  } catch (error) {
    console.error("Sheng slang analyzer error in backend:", error);
    return {
      translation: text,
      vibeScore: "Safe & Authentic Form 👍",
      explanation: "Aiya! Auntie was yawning and couldn't read the words properly, but speak with a clear heart!"
    };
  }
};

/**
 * Evaluates selected red flags and a description of a partner's behaviors to calculate a risk rating.
 */
export const evaluateRedFlags = async (
  selectedFlags: string[],
  customDescription: string,
  userName: string
): Promise<{
  score: number;
  rank: string;
  commentary: string;
  actionPlan: string;
  riskFactors: string[];
} | null> => {
  try {
    const prompt = `
      You are "Auntie Shosh", a humorous, traditional, and protective Kenyan matchmaker relationship expert.
      A candidate named "${userName}" wants to check their partner or date for suspicious dating behaviors ("Red Flags") and risk of Nairobi "Character Development" (heartbreak/premium tears/scams/ghosting).

      Selected Red Flags:
      ${selectedFlags.map(f => `- ${f}`).join('\n')}

      Additional description of behaviors:
      "${customDescription || "No custom description provided."}"

      Analyze these red flags and behaviors to calculate a risk rating out of 100:
      - 0 to 25: Green Flag Angel 😇. Very low risk. Solid matrimonial candidate with high integrity.
      - 26 to 50: Standard Modern Hustler 🧢. Moderate risk. Has a few city quirks but generally harmless. Needs supervision.
      - 51 to 75: High Risk: Subaru Speedster ⚠️. Serious alarm bells. Highly likely to lead to "Nairobi Character Development" and billing.
      - 76 to 100: Premium Tears Certified 🚨. Extreme danger! Block and run! Total playboy, player, or city gold-digger.

      Provide:
      1. score: A numeric percentage risk rating (0 to 100).
      2. rank: A humorous traditional Auntie Shosh risk level name (e.g., "Chama Approved Angel 😇", "Standard Coffee Date Walker ☕", "Nairobi Character Development Risk ⚠️", or "Premium Tears Certified 😭").
      3. commentary: Hilarious, sassy commentary in Auntie Shosh's unique persona (authentic Kenyan English, grandmotherly roast, and tea references, under 3 sentences).
      4. actionPlan: A concrete advice or action plan (e.g., "Introduce them to your grandmother immediately", "Buy a fast pair of running shoes", "Block and delete them from M-Pesa").
      5. riskFactors: A list of 2-3 specific risk elements identified from the flags or description.

      Ensure the response strictly follows the JSON schema.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            rank: { type: Type.STRING },
            commentary: { type: Type.STRING },
            actionPlan: { type: Type.STRING },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["score", "rank", "commentary", "actionPlan", "riskFactors"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Red flag evaluation error:", error);
    return {
      score: 50,
      rank: "Standard Coffee Date Walker ☕",
      commentary: "Aiya! Auntie's crystal ball is cloudy from the kitchen smoke, but when in doubt, introduce them to the family elders first!",
      actionPlan: "Carry your own fare and never meet past 7 PM!",
      riskFactors: ["Unclear communication", "Nairobi modern lifestyle habits"]
    };
  }
};

/**
 * Generates an interactive, humorous "Nairobi Fare Integrity & Date Covenant" (Fare Shield Contract).
 */
export const generateFareShieldContract = async (
  hostName: string,
  guestName: string,
  fareAmount: number,
  venueName: string,
  meetTime: string
): Promise<{
  contractTitle: string;
  hostName: string;
  guestName: string;
  fareAmount: number;
  venueName: string;
  meetTime: string;
  sections: {
    title: string;
    clauses: string[];
  }[];
  eldersVerdict: string;
  sealText: string;
} | null> => {
  try {
    const prompt = `
      You are "Auntie Shosh", the ultimate traditional and protective Kenyan matchmaker and elder of the relationship council.
      Generate a highly humorous, mock-legal, and authentic traditional Kenyan dating contract called the "Nairobi Fare Integrity & Date Covenant" (also known as the Fare Shield Insurance Contract).

      Details of the Covenant:
      - Host/Sponsor: "${hostName}" (The one sending or facilitating transport/fare)
      - Guest/Recipient: "${guestName}" (The one traveling to the date)
      - Mobile Money Fare Amount: ${fareAmount} KES (sent via M-Pesa or equivalent)
      - Selected Venue: "${venueName}"
      - Agreed Time: "${meetTime}"

      Please generate a hilarious contract with exactly 3 sections.
      Write in Auntie Shosh's sassy persona, blending formal legal terminology ("Whereas", "Party of the First Part", "Be it resolved", "Indemnification") with vibrant Kenyan dating slang and cultural humor (e.g., "Kutuma fare", "Character development", "Ngong Road speedsters", "Premium tears", "Chama emergencies", "Sudden headache syndrome").

      Sections to include:
      1. Section 1: Title: "The M-Pesa Disbursal & Transit Covenant"
         Draft 2-3 clauses detailing that the fare is exclusively for boarding a Matatu/Uber directly to the venue, and not for side-hustles, paying off chama debts, hair salon touch-ups, or purchasing bundles to browse Instagram instead.
      2. Section 2: Title: "The Sudden Headache & 'Uko Up?' Indemnification Clause"
         Draft 2-3 clauses covering defense against standard excuse protocols (e.g., "My grandmother has called an emergency baraza", "The matatu got stuck in a pothole in Roysambu", "My phone battery has mysteriously died at 5%").
      3. Section 3: Title: "Traditional Elder-Enforced Sanctions & Penalties"
         Draft 2-3 hilarious penalties if the recipient fails to show up after accepting the fare (e.g., Weeding Auntie Shosh's maize farm in Shamba, returning the fare plus a 15% 'Emotional Damage' M-Pesa transaction cost, or being publicly declared a 'Certified Character Developer' at the next village council).

      Also provide:
      - contractTitle: A grand, mock-royal traditional legal title (e.g., "The Sacred Nairobi Covenant of Transportation and Anti-Fare Eating Integrity")
      - eldersVerdict: A short, extremely protective and sassy 1-2 sentence official stamp verdict written by Auntie Shosh (e.g., "This document is fully backed by the Elders' Council. Play with fire, get burned!").
      - sealText: A humorous text seal (e.g., "ELDERS OF PENDO CHAMA SEAL - 100% SHIELDED").

      Follow the specified JSON schema exactly.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            contractTitle: { type: Type.STRING },
            hostName: { type: Type.STRING },
            guestName: { type: Type.STRING },
            fareAmount: { type: Type.NUMBER },
            venueName: { type: Type.STRING },
            meetTime: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  clauses: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["title", "clauses"]
              }
            },
            eldersVerdict: { type: Type.STRING },
            sealText: { type: Type.STRING }
          },
          required: [
            "contractTitle",
            "hostName",
            "guestName",
            "fareAmount",
            "venueName",
            "meetTime",
            "sections",
            "eldersVerdict",
            "sealText"
          ]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Fare Shield Contract generation error:", error);
    return {
      contractTitle: "The Nairobi Covenant of Transportation and Anti-Fare Eating Integrity",
      hostName,
      guestName,
      fareAmount,
      venueName,
      meetTime,
      sections: [
        {
          title: "The M-Pesa Disbursal & Transit Covenant",
          clauses: [
            `Whereas ${hostName} has dispatched the sum of ${fareAmount} KES via mobile money to ${guestName}, the recipient covenants to utilize said funds exclusively for immediate travel.`,
            "The travel shall be direct, without any physical, emotional, or geographical detours to salons, local chamas, or local chemists."
          ]
        },
        {
          title: "The Sudden Headache & Excuse Indemnification",
          clauses: [
            "Any excuse pertaining to 'sudden heavy rain', 'lost phone keys', or 'family chama emergencies' must be accompanied by certified physical proof signed by a village sub-chief.",
            "A sudden headache diagnosed within 2 hours of the meetup time shall be considered legally null and void."
          ]
        },
        {
          title: "Elders-Enforced Sanctions",
          clauses: [
            `Failure of ${guestName} to appear at ${venueName} by ${meetTime} shall constitute a full breach of trust.`,
            `The defaulter shall return the sum of ${fareAmount} KES plus a penalty of 150 KES for emotional suffering, or face 10 hours of manual maize-grinding supervised by Auntie Shosh.`
          ]
        }
      ],
      eldersVerdict: "This covenant is fully endorsed by Auntie Shosh and the Council of Matchmaker Elders. Do not play with M-Pesa transit assets, city eyes are watching!",
      sealText: "AUNTIE SHOSH COVENANT PROTECTION - CERTIFIED TRUSTED"
    };
  }
};





