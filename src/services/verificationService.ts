import { Verse, removeDiacritics } from "../data/quran";

declare global {
  interface Window {
    puter: any;
  }
}

export interface VerificationResult {
  matchedWordIds: number[];
  confidence: number;
}

// Calculate Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1: string, str2: string): number => {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[len2][len1];
};

// Calculate similarity score (0-1, where 1 is perfect match)
const calculateSimilarity = (str1: string, str2: string): number => {
  const clean1 = removeDiacritics(str1).toLowerCase();
  const clean2 = removeDiacritics(str2).toLowerCase();
  
  if (clean1 === clean2) return 1.0;
  
  const dist = levenshteinDistance(clean1, clean2);
  const maxLen = Math.max(clean1.length, clean2.length);
  
  return Math.max(0, 1 - (dist / maxLen));
};

// Split user input into words
const parseUserInput = (input: string): string[] => {
  return input
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
};

export const verifyRecitationWithGemini = async (
  targetVerse: Verse,
  userInput: string
): Promise<VerificationResult> => {
  if (!userInput || !userInput.trim()) {
    return { matchedWordIds: [], confidence: 0 };
  }

  // Check if Puter.js is available
  if (!window.puter || !window.puter.ai || !window.puter.ai.chat) {
    // Fallback to local fuzzy matching if Puter is not available
    return verifyRecitationLocally(targetVerse, userInput);
  }

  const userWords = parseUserInput(userInput);
  const wordsList = targetVerse.words.map(w => ({
    id: w.id,
    text: w.text,
    clean: w.cleanText,
  }));

  const prompt = `You are an expert Quranic recitation verifier specializing in Arabic word matching with flexibility for voice recognition errors and typing mistakes.

Target Verse Words: ${JSON.stringify(wordsList)}

User Input Words: ${JSON.stringify(userWords)}

Task: Match each user input word to the corresponding Quranic words starting from the first word. Stop matching when you find a word that doesn't correspond to the next sequential word in the verse.

Matching Rules:
1. Start from the first word of the verse (ID 1)
2. For each user word in order, find the best match in the sequential verse words
3. Accept matches with typos (1-2 character differences) - common in voice/text input
4. Ignore diacritics (Tashkeel marks) when comparing
5. Handle common orthographic variations:
   - ا (Alif) vs إ/أ (Alif with Hamza)
   - ة (Taa Marbuta) vs ه (Haa)
   - ى (Alif Maksura) vs ي (Yaa)
6. If a user word is very close (>80% similar) to the next verse word, consider it a match
7. Stop matching when encountering a word with <60% similarity to the next expected verse word

For each matched user word, provide:
- The matching verse word ID
- Similarity score (0-1)

Return ONLY valid JSON:
{
  "matchedWordIds": [number],
  "matchDetails": [{"userWord": "string", "verseWordId": number, "similarity": number}],
  "confidence": number
}`;

  try {
    const responseText = await window.puter.ai.chat(prompt, {
      model: "gpt-5-nano",
      stream: false,
    });
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    return {
      matchedWordIds: result.matchedWordIds || [],
      confidence: result.confidence || 0
    };

  } catch (error) {
    console.error("Puter Verification Error:", error);
    // Fallback to local verification
    return verifyRecitationLocally(targetVerse, userInput);
  }
};

// Local fallback verification using fuzzy matching
export const verifyRecitationLocally = (
  targetVerse: Verse,
  userInput: string
): VerificationResult => {
  const userWords = parseUserInput(userInput);
  const matchedWordIds: number[] = [];
  let confidence = 0;

  let verseWordIndex = 0;
  let matchCount = 0;

  for (const userWord of userWords) {
    if (verseWordIndex >= targetVerse.words.length) break;

    const verseWord = targetVerse.words[verseWordIndex];
    const similarity = calculateSimilarity(userWord, verseWord.cleanText);

    // Match if similarity is above 70% threshold
    if (similarity >= 0.7) {
      matchedWordIds.push(verseWord.id);
      matchCount++;
      verseWordIndex++;
    } else {
      // Stop matching on first mismatch
      break;
    }
  }

  // Calculate overall confidence
  confidence = matchCount > 0 ? matchCount / targetVerse.words.length : 0;
  confidence = Math.min(confidence, 1.0);

  return {
    matchedWordIds,
    confidence
  };
};
