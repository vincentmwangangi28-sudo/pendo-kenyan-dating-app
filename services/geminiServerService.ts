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

    } catch (error) {
        console.error("Event search error", error);
        return [];
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


