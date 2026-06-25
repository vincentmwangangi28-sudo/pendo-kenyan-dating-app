import { UserProfile, MatchProfile, HangoutSpot } from "../types";

/**
 * Generic helper to call the backend Gemini proxy API.
 */
async function callGeminiApi<T>(action: string, args: any[] = []): Promise<T> {
  try {
    const response = await fetch("/api/gemini/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, args }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to call Gemini action ${action}: ${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.result as T;
  } catch (error) {
    console.error(`Gemini API client proxy error for action ${action}:`, error);
    throw error;
  }
}

/**
 * Generates horoscope compatibility reading.
 */
export const generateHoroscope = async (userZodiac?: string, matchZodiac?: string, matchName?: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateHoroscope", [userZodiac, matchZodiac, matchName]);
  } catch (error) {
    return "The stars are a bit cloudy today, check back later!";
  }
};

/**
 * Enhances a user's bio.
 */
export const enhanceBio = async (currentBio: string, interests: string[], name: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("enhanceBio", [currentBio, interests, name]);
  } catch (error) {
    return currentBio;
  }
};

/**
 * Generates a description for a new social group.
 */
export const generateGroupDescription = async (groupName: string, interest: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateGroupDescription", [groupName, interest]);
  } catch (error) {
    return `A community for people who love ${interest}.`;
  }
};

/**
 * Generates a "Vibe Check" description for a venue.
 */
export const generateVenueVibe = async (venueName: string, venueType: string, location: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateVenueVibe", [venueName, venueType, location]);
  } catch (error) {
    return "Great spot to hang out.";
  }
};

/**
 * Generates a fun icebreaker.
 */
export const generateIcebreaker = async (match: MatchProfile, userInterests: string[]): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateIcebreaker", [match, userInterests]);
  } catch (error) {
    return "Hi there! How is your day going?";
  }
};

/**
 * Analyzes compatibility using Thinking Mode.
 */
export const analyzeCompatibility = async (user: UserProfile, match: MatchProfile): Promise<string> => {
  try {
    return await callGeminiApi<string>("analyzeCompatibility", [user, match]);
  } catch (error) {
    return "Looks like a potential match! Say hi to find out more.";
  }
};

/**
 * Generates specific date ideas using Google Search.
 */
export const generateDateIdeas = async (location: string, userInterests: string[], matchInterests: string[]): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateDateIdeas", [location, userInterests, matchInterests]);
  } catch (error) {
    return "How about grabbing coffee or going for a walk?";
  }
};

/**
 * Finds hangout spots using Google Maps.
 */
export const findHangoutSpots = async (lat: number, lng: number, query: string = "popular hangouts"): Promise<HangoutSpot[]> => {
  try {
    return await callGeminiApi<HangoutSpot[]>("findHangoutSpots", [lat, lng, query]);
  } catch (error) {
    return [];
  }
}

/**
 * Finds real-time events using Google Search Grounding and returns JSON.
 */
export const findRealtimeEvents = async (lat: number, lng: number): Promise<any[]> => {
  try {
    return await callGeminiApi<any[]>("findRealtimeEvents", [lat, lng]);
  } catch (error) {
    return [];
  }
}

/**
 * Generates an image for a group.
 */
export const generateGroupImage = async (prompt: string, size: '1K'|'2K'|'4K' = '1K'): Promise<string | null> => {
  try {
    return await callGeminiApi<string | null>("generateGroupImage", [prompt, size]);
  } catch (error) {
    return null;
  }
};

/**
 * Generates speech from text.
 */
export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    return await callGeminiApi<string | null>("generateSpeech", [text]);
  } catch (error) {
    return null;
  }
}

/**
 * Translates/Explains a message using Fast model.
 */
export const explainMessage = async (message: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("explainMessage", [message]);
  } catch (error) {
    return "Could not translate message.";
  }
};

/**
 * Verifies photo gesture.
 */
export const verifyPhotoGesture = async (imageBase64: string, gesture: string): Promise<boolean> => {
  try {
    return await callGeminiApi<boolean>("verifyPhotoGesture", [imageBase64, gesture]);
  } catch (error) {
    return false;
  }
};

/**
 * Generates a highly engaging theme-specific plan for a virtual video date.
 */
export const generateVidDateThemePlan = async (themeName: string, partnerName: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateVidDateThemePlan", [themeName, partnerName]);
  } catch (error) {
    return "Error creating live plan. Set up your screen, prepare a refreshing drink, and let the conversation flow naturally!";
  }
};

/**
 * Generates a random, engaging icebreaker question based on a selected category.
 */
export const generateLiveIcebreakerQuestion = async (category: string): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateLiveIcebreakerQuestion", [category]);
  } catch (error) {
    return "What is your absolute dream venue for a first physical meetup?";
  }
};

/**
 * Generates custom advice from Auntie Shosh.
 */
export const generateAuntieShoshAdvice = async (question: string, userProfile: UserProfile): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateAuntieShoshAdvice", [question, userProfile]);
  } catch (error) {
    return "Aiya! The network from the farm is weak, ask me again once I climb the hill!";
  }
};

/**
 * Generates a response for the Voice Coach chat.
 */
export const generateVoiceCoachResponse = async (userMessage: string, chatHistory: any[]): Promise<string> => {
  try {
    return await callGeminiApi<string>("generateVoiceCoachResponse", [userMessage, chatHistory]);
  } catch (error) {
    return "That's a great start! Try asking about their favorite spots in town.";
  }
};

/**
 * Resolves a global city name to latitude/longitude coordinates via the backend Gemini service.
 */
export const geocodeCity = async (cityName: string): Promise<{ name: string; lat: number; lng: number } | null> => {
  try {
    return await callGeminiApi<{ name: string; lat: number; lng: number } | null>("geocodeCity", [cityName]);
  } catch (error) {
    console.error("Geocoding client failed:", error);
    return null;
  }
};


