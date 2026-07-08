import { Router } from 'express';
import multer from 'multer';
import { geminiText, geminiVision, parseGeminiJson } from '../services/gemini.js';
import { resolveAreaLocation } from '../services/geocoding.js';
import { createSuggestion } from '../services/suggestionsRepository.js';
import { resolveWardFromText, generateTicketId } from '../services/wardData.js';
import { buildWhatsAppReply } from '../services/scoring.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.post('/analyze-feedback', async (req, res) => {
  try {
    const { text, wardId, source = 'text', area = null } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const prompt = `You are an AI assistant for the Rajkot Municipal Corporation (RMC) citizen grievance management system.
Analyze the following citizen feedback which may be in Gujarati, Hindi, or English and return ONLY a valid JSON object (no markdown, no explanation).

Citizen feedback: "${text}"

Return JSON with exactly these fields:
{
  "detectedLanguage": "<Gujarati, Hindi, or English>",
  "translatedText": "<accurate English translation, or original if already English>",
  "extractedArea": "<the exact area or locality name mentioned by the user, or null if none mentioned>",
  "category": "<one of: solid_waste, water, drainage, roads, streetlights, health, other>",
  "sentiment": "<negative, neutral, or positive>",
  "urgency": "<critical, high, medium, low>",
  "keyConcern": "<one sentence summarising the core citizen demand in English>"
}`;

    const analysis = parseGeminiJson(await geminiText(prompt));

    let resolvedWardId = resolveWardFromText(text, wardId || null, area || analysis.extractedArea);
    const location = await resolveAreaLocation(area || analysis.extractedArea, resolvedWardId);
    if (location.wardId) resolvedWardId = location.wardId;

    const ticketId = generateTicketId(resolvedWardId);
    const suggestion = {
      id: `SUG-${Date.now()}`,
      ticketId,
      wardId: resolvedWardId,
      area: area || analysis.extractedArea || null,
      category: analysis.category,
      type: source,
      language: analysis.detectedLanguage,
      originalContent: text,
      translatedContent: analysis.translatedText,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      keyConcern: analysis.keyConcern,
      timestamp: new Date().toISOString(),
      source: source === 'whatsapp' ? `WhatsApp (${resolvedWardId || 'Unknown'})` : `RMC Portal (${source.toUpperCase()})`,
      coords: location.coords,
      geocoded: !!location.geocoded,
      formattedAddress: location.formattedAddress || null
    };

    await createSuggestion(suggestion);
    const waReply = buildWhatsAppReply(analysis, suggestion);
    res.json({ suggestion, analysis, waReply });
  } catch (err) {
    console.error('analyze-feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const imageData = {
      inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype }
    };

    const prompt = `You are an AI civic analyst for the Rajkot Municipal Corporation.
Analyze this photo submitted by a citizen as a grievance report.
Return ONLY a valid JSON object (no markdown, no explanation) with:
{
  "category": "<one of: solid_waste, water, drainage, roads, streetlights, health, other>",
  "severity": "<critical, high, medium, low>",
  "detectedObjects": "<comma-separated list of infrastructure issues detected>",
  "description": "<2-3 sentence factual description of what is visually wrong>",
  "recommendedAction": "<one concrete recommended RMC department action>"
}`;

    const analysis = parseGeminiJson(await geminiVision(prompt, imageData));
    res.json({ analysis });
  } catch (err) {
    console.error('analyze-photo error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
