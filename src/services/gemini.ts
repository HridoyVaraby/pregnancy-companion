import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Symptom } from '../hooks/useSymptomMatch';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function getSymptomInsights(
  query: string,
  localMatch: Symptom | null,
  isOnline: boolean
): Promise<{ advice: string; isAiEnriched: boolean }> {
  // If offline, fallback to local match
  if (!isOnline) {
    if (localMatch) {
      return { advice: localMatch.advice, isAiEnriched: false };
    }
    return {
      advice: "I couldn't find a direct match in the offline database. Please seek medical advice if you are concerned, or try again when online.",
      isAiEnriched: false,
    };
  }

  // Ensure API key is present
  if (!apiKey) {
      if (localMatch) {
        return { advice: localMatch.advice + " (AI enrichment unavailable due to missing API key)", isAiEnriched: false };
      }
      return { advice: "AI enrichment unavailable. Please configure VITE_GEMINI_API_KEY.", isAiEnriched: false };
  }

  // If online, use Gemini for enrichment
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let systemPrompt = `You are an empathetic and supportive Pregnancy Companion AI. A user is experiencing the following symptom: "${query}".\n`;

    if (localMatch) {
      systemPrompt += `Our local database matched this to: "${localMatch.name}" with severity "${localMatch.severity}". The standard advice is: "${localMatch.advice}".\n`;
      systemPrompt += `Please provide a reassuring and detailed explanation that cross-references this standard advice but adds supportive, conversational detail. Keep the response concise, compassionate, and easy to read.`;
    } else {
      systemPrompt += `We do not have a local match for this symptom. Please provide general, non-diagnostic guidance about this symptom in the context of pregnancy. Encourage them to speak to a doctor if they are concerned. Keep it concise, empathetic, and clear.`;
    }

    systemPrompt += `\n\nCRITICAL RULE: DO NOT provide definitive medical diagnoses. Always include a reminder that they should consult their healthcare provider for medical advice.`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    return { advice: text, isAiEnriched: true };
  } catch (error) {
    console.error('Error fetching from Gemini API:', error);
    // Fallback on error
    if (localMatch) {
      return { advice: localMatch.advice, isAiEnriched: false };
    }
    return {
      advice: "There was an error connecting to the AI service. Please seek medical advice if you are concerned.",
      isAiEnriched: false,
    };
  }
}
