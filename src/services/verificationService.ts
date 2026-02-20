import { GoogleGenAI, Type } from "@google/genai";
import { Verse } from "../data/quran";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface VerificationResult {
  matchedWordIds: number[];
  confidence: number;
}

export const verifyRecitationWithGemini = async (
  targetVerse: Verse,
  userInput: string
): Promise<VerificationResult> => {
  if (!userInput || !userInput.trim()) {
    return { matchedWordIds: [], confidence: 0 };
  }

  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert Quranic recitation verifier.
    
    Target Verse: "${targetVerse.text_uthmani}"
    Target Words List: ${JSON.stringify(targetVerse.words.map(w => ({ id: w.id, text: w.text, clean: w.cleanText })))}
    
    User Input: "${userInput}"
    
    Task: Determine which words from the **beginning** of the target verse have been correctly recited/typed in the User Input.
    
    Rules:
    1. The matching must start from the first word of the verse.
    2. The order must be sequential. If word 1 is matched, check word 2. If word 2 is missing or wrong, stop matching.
    3. Be flexible with diacritics (Tashkeel). "اياك" should match "إِيَّاكَ".
    4. Be flexible with common orthographic variations (e.g., Alif Hamza vs Alif, Taa Marbuta vs Haa).
    5. Be flexible with speech-to-text anomalies (e.g. slight misspellings that sound similar).
    6. Return the list of IDs of the words that are considered "recited correctly".
    
    Output JSON Schema:
    {
      "matchedWordIds": [number],
      "confidence": number (0-1)
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedWordIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER }
            },
            confidence: { type: Type.NUMBER }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      matchedWordIds: result.matchedWordIds || [],
      confidence: result.confidence || 0
    };

  } catch (error) {
    console.error("Gemini Verification Error:", error);
    return { matchedWordIds: [], confidence: 0 };
  }
};
