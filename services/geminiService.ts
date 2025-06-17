import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_NAME } from '../constants';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn("API_KEY environment variable not found. Gemini AI features will be disabled.");
}

export const analyzeUDEsForRootCauses = async (udeTexts: string[]): Promise<string[]> => {
  if (!ai) {
    throw new Error("Gemini AI client not initialized. API_KEY might be missing.");
  }
  if (udeTexts.length === 0) {
    return [];
  }

  const prompt = `Você é um especialista em Teoria das Restrições. Dada a seguinte lista de Efeitos Indesejáveis (EIs) em um sistema organizacional, identifique e liste potenciais problemas raiz ou causas fundamentais que poderiam levar a esses EIs. Responda com cada causa potencial em uma nova linha. Não inclua numeração, marcadores ou qualquer texto introdutório/conclusivo, apenas a lista de causas.
EIs:
${udeTexts.join("\n")}
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
    });
    
    const textResponse = response.text;
    if (!textResponse) return [];

    return textResponse.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error; // Re-throw for the caller to handle
  }
};