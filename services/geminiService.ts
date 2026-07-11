import { UserProfile, MatchProfile, HangoutSpot } from "../types";

const FALLBACK_EVENTS = [
  {
    name: "Blankets & Wine Nairobi",
    location: "Laureen Gardens, Nairobi",
    date: "Sun, Oct 12, 12 PM - 10 PM",
    description: "Kenya's premier music festival showcasing outstanding live music, art, and fashion. Grab your picnic blanket and enjoy the vibe!",
    link: "https://www.blanketsandwine.com",
    mapsUri: "https://www.blanketsandwine.com"
  },
  {
    name: "Nairobi Tech Week Showcase",
    location: "Maji House, Ngong Road, Nairobi",
    date: "Wed, Oct 15, 9 AM - 5 PM",
    description: "The largest sub-Saharan Africa tech event focusing on developers, startups, and tech innovation. Great networking opportunity!",
    link: "https://nairobitechweek.com",
    mapsUri: "https://nairobitechweek.com"
  },
  {
    name: "K1 Flea Market & Sunday Brunch",
    location: "K1 Klub House, Parklands, Nairobi",
    date: "Sun, Oct 12, 10 AM - 6 PM",
    description: "Shop from local Kenyan artisans, enjoy amazing food, craft beers, and live DJ sets in a beautiful cozy garden atmosphere.",
    link: "https://k1klubhouse.com",
    mapsUri: "https://k1klubhouse.com"
  },
  {
    name: "Nairobi Art & Jazz Night",
    location: "Shamba Cafe, Loresho, Nairobi",
    date: "Fri, Oct 10, 6 PM - 11 PM",
    description: "An evening of smooth contemporary jazz accompanied by an art exhibition featuring rising Kenyan visual artists.",
    link: "https://shambacafe.co.ke",
    mapsUri: "https://shambacafe.co.ke"
  }
];

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
    console.warn(`Gemini API client proxy warning for action ${action} (using fallback if available):`, error);
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
    return FALLBACK_EVENTS;
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
    console.warn("Geocoding client failed (using warning to prevent error flags):", error);
    return null;
  }
};

/**
 * Translates and analyzes Sheng slang or slangifies regular text using server-side Gemini.
 */
export const translateShengSlang = async (text: string, mode: 'explain' | 'slangify'): Promise<{
  translation: string;
  vibeScore: string;
  explanation: string;
} | null> => {
  try {
    return await callGeminiApi<{
      translation: string;
      vibeScore: string;
      explanation: string;
    } | null>("translateShengSlang", [text, mode]);
  } catch (error) {
    console.error("Client call translateShengSlang error:", error);
    return {
      translation: text,
      vibeScore: "Safe & Authentic Form 👍",
      explanation: "Aiya! The network from the farm is weak, ask me again once I climb the hill!"
    };
  }
};

/**
 * Evaluates a user's dating line in a specific scenario.
 */
export const evaluateShengRizz = async (
  userLine: string,
  scenario: string,
  name: string
): Promise<{
  score: number;
  rank: string;
  feedback: string;
  revisedLine: string;
  slangDefinitions: Array<{ slang: string; meaning: string }>;
} | null> => {
  try {
    return await callGeminiApi<any>("evaluateShengRizz", [userLine, scenario, name]);
  } catch (error) {
    console.error("Client call evaluateShengRizz error:", error);
    return null;
  }
};

/**
 * Evaluates red flags and custom descriptions for a partner.
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
    return await callGeminiApi<any>("evaluateRedFlags", [selectedFlags, customDescription, userName]);
  } catch (error) {
    console.error("Client call evaluateRedFlags error:", error);
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
    return await callGeminiApi<any>("generateFareShieldContract", [
      hostName,
      guestName,
      fareAmount,
      venueName,
      meetTime
    ]);
  } catch (error) {
    console.error("Client call generateFareShieldContract error:", error);
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





