import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

let model = null;

export function getModel() {
  if (!model) {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  }
  return model;
}

export async function geminiText(prompt) {
  const result = await getModel().generateContent(prompt);
  return result.response.text().trim();
}

export async function geminiVision(prompt, imageData) {
  const result = await getModel().generateContent([prompt, imageData]);
  return result.response.text().trim();
}

export function parseGeminiJson(raw) {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}
