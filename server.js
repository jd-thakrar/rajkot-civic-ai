import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const areaWardMapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'areaWardMapping.json'), 'utf8'));
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname)); // Serve frontend files on Render
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Gemini Client ────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─── Local JSON database ──────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'suggestions.json');
function readDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

// ─── RMC Ticket ID Generator ──────────────────────────────────────────────────
function generateTicketId(wardId) {
  const year = new Date().getFullYear();
  const ward = wardId ? wardId.replace('RMC-', '') : 'GEN';
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `RMC/${year}/W${ward}/${seq}`;
}

// ─── Ward demographic data (authoritative) ────────────────────────────────────
export const WARDS = {
  'RMC-01': { name: 'Ward 1',  areas: 'Aji Dam, Mavdi, Raiyadhar',                      population: 76424, bpl: 15.2, schoolDistKm: 1.2, waterQI: 82, waterHrs: 12, healthDistKm: 2.5, vulnIndex: 0.35, coords: [22.3134, 70.7852] },
  'RMC-02': { name: 'Ward 2',  areas: 'Raiya Road, Kalawad Road, Tagore Nagar',          population: 54854, bpl: 12.1, schoolDistKm: 1.5, waterQI: 85, waterHrs: 14, healthDistKm: 1.8, vulnIndex: 0.28, coords: [22.3090, 70.8010] },
  'RMC-03': { name: 'Ward 3',  areas: 'University Road, Race Course, Bhaktinagar',       population: 51696, bpl: 18.5, schoolDistKm: 2.1, waterQI: 72, waterHrs: 10, healthDistKm: 3.2, vulnIndex: 0.42, coords: [22.3210, 70.7950] },
  'RMC-04': { name: 'Ward 4',  areas: 'Kothariya, Nana Mava, Patel Colony',              population: 40398, bpl: 22.4, schoolDistKm: 2.8, waterQI: 65, waterHrs: 8,  healthDistKm: 4.1, vulnIndex: 0.55, coords: [22.3150, 70.8120] },
  'RMC-05': { name: 'Ward 5',  areas: 'Yagnik Road, Doctor House, Rajnagar',             population: 74434, bpl: 14.8, schoolDistKm: 1.8, waterQI: 80, waterHrs: 12, healthDistKm: 2.1, vulnIndex: 0.30, coords: [22.3020, 70.8150] },
  'RMC-06': { name: 'Ward 6',  areas: 'Kuvadva Road, 150 Ft Ring Road, Nirmala Area',   population: 58686, bpl: 10.5, schoolDistKm: 1.0, waterQI: 88, waterHrs: 18, healthDistKm: 1.5, vulnIndex: 0.22, coords: [22.2980, 70.8000] },
  'RMC-07': { name: 'Ward 7',  areas: 'Gondal Road, Sorathiyawadi, Jalaram Society',     population: 39088, bpl: 8.2,  schoolDistKm: 0.8, waterQI: 90, waterHrs: 20, healthDistKm: 1.2, vulnIndex: 0.18, coords: [22.2920, 70.7950] },
  'RMC-08': { name: 'Ward 8',  areas: 'Malviya Nagar, Shastri Maidan, Old RMC Area',    population: 35097, bpl: 16.5, schoolDistKm: 2.5, waterQI: 75, waterHrs: 10, healthDistKm: 3.0, vulnIndex: 0.45, coords: [22.2850, 70.8050] },
  'RMC-09': { name: 'Ward 9',  areas: 'Soni Bazar, Sadar Bazar, Ghee Kanta',            population: 44118, bpl: 19.8, schoolDistKm: 3.2, waterQI: 68, waterHrs: 8,  healthDistKm: 3.8, vulnIndex: 0.52, coords: [22.2800, 70.8180] },
  'RMC-10': { name: 'Ward 10', areas: 'Dhebar Road, Kasturba Road, Panchnath',           population: 44897, bpl: 11.2, schoolDistKm: 1.4, waterQI: 84, waterHrs: 16, healthDistKm: 2.0, vulnIndex: 0.25, coords: [22.2880, 70.7850] },
  'RMC-11': { name: 'Ward 11', areas: 'Aji Industrial Area, Bharat Colony, Gokuldham',   population: 52800, bpl: 13.5, schoolDistKm: 1.7, waterQI: 81, waterHrs: 14, healthDistKm: 2.3, vulnIndex: 0.32, coords: [22.2820, 70.7700] },
  'RMC-12': { name: 'Ward 12', areas: 'Aerodrome Area, Bajarangwadi, Indira Nagar',       population: 74369, bpl: 25.4, schoolDistKm: 4.1, waterQI: 58, waterHrs: 6,  healthDistKm: 5.2, vulnIndex: 0.68, coords: [22.2700, 70.7600] },
  'RMC-13': { name: 'Ward 13', areas: 'Sardarnagar, Bhavnagar Road, Karanpara',           population: 95917, bpl: 28.6, schoolDistKm: 3.8, waterQI: 55, waterHrs: 6,  healthDistKm: 4.8, vulnIndex: 0.72, coords: [22.2600, 70.7800] },
  'RMC-14': { name: 'Ward 14', areas: 'Trikon Baug, Kalyanpur, Jubilee Garden',           population: 47450, bpl: 21.2, schoolDistKm: 2.9, waterQI: 66, waterHrs: 8,  healthDistKm: 3.5, vulnIndex: 0.50, coords: [22.2680, 70.7950] },
  'RMC-15': { name: 'Ward 15', areas: 'Aamroli, Mavdi Circle, Pancheshwar Colony',        population: 39496, bpl: 17.8, schoolDistKm: 2.2, waterQI: 74, waterHrs: 10, healthDistKm: 2.8, vulnIndex: 0.40, coords: [22.2750, 70.8050] },
  'RMC-16': { name: 'Ward 16', areas: 'Hirabaug, Swaminarayan Temple Area, Vibhag 5',    population: 44421, bpl: 15.6, schoolDistKm: 1.9, waterQI: 78, waterHrs: 12, healthDistKm: 2.4, vulnIndex: 0.36, coords: [22.2850, 70.8250] },
  'RMC-17': { name: 'Ward 17', areas: 'Rajkot Station, Limbda Chowk, Jagnath Plot',      population: 60994, bpl: 23.5, schoolDistKm: 3.5, waterQI: 62, waterHrs: 8,  healthDistKm: 4.2, vulnIndex: 0.60, coords: [22.2700, 70.8200] },
  'RMC-18': { name: 'Ward 18', areas: 'Gandhigram, Ramnathpara, 80 Ft Road',             population: 53863, bpl: 26.8, schoolDistKm: 4.5, waterQI: 50, waterHrs: 6,  healthDistKm: 5.5, vulnIndex: 0.75, coords: [22.2500, 70.8100] }
};

// ─── Helper: call Gemini ──────────────────────────────────────────────────────
async function geminiText(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ─── Helper: Gujarati acknowledgement reply ───────────────────────────────────
function buildWhatsAppReply(analysis, suggestion) {
  const w = WARDS[suggestion.wardId];
  const wardLabel = w ? `${w.name} (${w.areas.split(',')[0]})` : 'અજ્ઞાત વોર્ડ';
  const lang = analysis.detectedLanguage;

  if (lang === 'Gujarati') {
    return `🙏 નમસ્કાર! આપની ફરિયાદ નોંધવામાં આવી છે.\n\n📋 ટિકિટ ID: <strong>${suggestion.ticketId}</strong>\n📍 વોર્ડ: ${wardLabel}\n🏷️ વિભાગ: ${analysis.category.toUpperCase()}\n⚡ જરૂરિયાત: <strong>${analysis.urgency.toUpperCase()}</strong>\n\n_RMC Seva Bot — Rajkot Municipal Corporation_`;
  } else if (lang === 'Hindi') {
    return `🙏 नमस्कार! आपकी शिकायत दर्ज की गई है।\n\n📋 टिकट ID: <strong>${suggestion.ticketId}</strong>\n📍 वार्ड: ${wardLabel}\n🏷️ श्रेणी: ${analysis.category.toUpperCase()}\n⚡ प्राथमिकता: <strong>${analysis.urgency.toUpperCase()}</strong>\n\n_RMC Seva Bot — Rajkot Municipal Corporation_`;
  } else {
    return `✅ Grievance logged successfully.\n\n📋 Ticket ID: <strong>${suggestion.ticketId}</strong>\n📍 Ward: ${wardLabel}\n🏷️ Category: <strong>${analysis.category.toUpperCase()}</strong>\n⚡ Urgency: <strong>${analysis.urgency.toUpperCase()}</strong>\n\nYou will be notified once RMC takes action.\n_RMC Seva Bot — Rajkot Municipal Corporation_`;
  }
}

// ─── ROUTE: Health check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, key: !!process.env.GEMINI_API_KEY, model: 'gemini-2.5-flash' });
});

// ─── ROUTE: Get all suggestions ───────────────────────────────────────────────
app.get('/api/suggestions', (req, res) => res.json(readDB()));

// ─── ROUTE: Analyze text / voice feedback via Gemini ─────────────────────────
app.post('/api/analyze-feedback', async (req, res) => {
  try {
    const { text, wardId, source = 'text' } = req.body;
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

    const raw = await geminiText(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleaned);

    let resolvedWardId = wardId || null;
    if (analysis.extractedArea) {
      const normalizedArea = analysis.extractedArea.trim().toLowerCase();
      if (areaWardMapping[normalizedArea]) {
        resolvedWardId = areaWardMapping[normalizedArea].wardId;
      }
    }
    const ticketId = generateTicketId(resolvedWardId);

    const db = readDB();
    const suggestion = {
      id: `SUG-${Date.now()}`,
      ticketId,
      wardId: resolvedWardId,
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
      coords: resolvedWardId && WARDS[resolvedWardId]
        ? [
            WARDS[resolvedWardId].coords[0] + (Math.random() - 0.5) * 0.008,
            WARDS[resolvedWardId].coords[1] + (Math.random() - 0.5) * 0.008
          ]
        : [22.30, 70.80]
    };
    db.push(suggestion);
    writeDB(db);

    // Build WhatsApp reply text
    const waReply = buildWhatsAppReply(analysis, suggestion);
    res.json({ suggestion, analysis, waReply });
  } catch (err) {
    console.error('analyze-feedback error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE: Analyze photo via Gemini Vision ───────────────────────────────────
app.post('/api/analyze-photo', upload.single('photo'), async (req, res) => {
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
  "description": "<2-3 sentence factual description of what is visually wrong — use exact RMC civic language>",
  "recommendedAction": "<one concrete recommended RMC department action e.g. SWM dept should schedule daily collection>"
}`;

    const result = await model.generateContent([prompt, imageData]);
    const raw = result.response.text().trim().replace(/```json|```/g, '');
    const analysis = JSON.parse(raw);
    res.json({ analysis });
  } catch (err) {
    console.error('analyze-photo error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE: AI Copilot chat ───────────────────────────────────────────────────
app.post('/api/copilot', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const suggestions = readDB();

    const wardsContext = Object.entries(WARDS).map(([id, w]) => {
      const wardSugs = suggestions.filter(s => s.wardId === id);
      const cats = {};
      wardSugs.forEach(s => { cats[s.category] = (cats[s.category] || 0) + 1; });
      return `${w.name} (${w.areas}): pop=${w.population.toLocaleString()}, BPL=${w.bpl}%, waterQI=${w.waterQI}/100, waterHrs=${w.waterHrs}h, drainDist=${w.healthDistKm}km, vulnIdx=${w.vulnIndex}, complaints=${JSON.stringify(cats)}`;
    }).join('\n');

    const systemPrompt = `You are an expert AI civic development analyst for the Rajkot Municipal Corporation (RMC), Gujarat.
You assist the RMC Commissioner and Ward Officers with evidence-based civic planning and formal proposal writing.

LIVE WARD DATA (18 RMC administrative wards):
${wardsContext}

TOTAL CITIZEN GRIEVANCES LOGGED: ${suggestions.length}
RECENT GRIEVANCES (last 5): ${suggestions.slice(-5).map(s => `[${s.wardId}/${s.category} | Ticket:${s.ticketId}]: "${s.keyConcern || s.translatedContent}"`).join('; ')}

Your role:
- Analyze ward-level civic data and citizen complaints to provide evidence-backed recommendations
- Draft formal RMC proposals referencing actual area names (e.g., Sardarnagar, Ghee Kanta, Mavdi)
- Compare proposed civic projects using population impact, infrastructure gap indices, and demographic vulnerability
- Answer RMC Commissioner questions with clear, data-driven insights using real Rajkot context
- When drafting proposals, include: objective, affected area names, ward data, citizen complaint evidence, estimated impact, department responsible, and budget justification

Conversation history: ${history.map(h => `${h.role}: ${h.content}`).join('\n')}

Commissioner's query: ${message}`;

    const result = await model.generateContent(systemPrompt);
    const reply = result.response.text().trim();
    res.json({ reply });
  } catch (err) {
    console.error('copilot error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE: Generate formal proposal document ─────────────────────────────────
app.post('/api/generate-proposal', async (req, res) => {
  try {
    const { projectTitle, wardId, category, estimatedCost } = req.body;
    const ward = WARDS[wardId];
    if (!ward) return res.status(400).json({ error: 'Invalid wardId' });

    const suggestions = readDB();
    const relevantComplaints = suggestions
      .filter(s => s.wardId === wardId && s.category === category)
      .slice(0, 5)
      .map(s => `Ticket ${s.ticketId}: "${s.translatedContent || s.keyConcern}"`)
      .join('\n');

    const deptMap = {
      solid_waste: 'Solid Waste Management (SWM) Department',
      water: 'Water Supply & Sewerage Board (RSWB)',
      drainage: 'Storm Water Drainage Department',
      roads: 'Roads & Buildings Department',
      streetlights: 'Street Light Department',
      health: 'Urban Health Centre (UHC) Department'
    };

    const prompt = `You are a senior proposal writer for the Rajkot Municipal Corporation (RMC), Gujarat.
Write a formal civic scheme sanction proposal following Indian government formatting standards.

Project: ${projectTitle}
Ward: ${ward.name} (Areas: ${ward.areas})
Responsible Department: ${deptMap[category] || 'General Administration'}
Category: ${category}
Estimated Cost: ₹${(estimatedCost / 100000).toFixed(1)} Lakhs
Ward Statistics: Population=${ward.population.toLocaleString()}, BPL=${ward.bpl}%, Water Quality Index=${ward.waterQI}/100, Water Supply=${ward.waterHrs}hrs/day, Vulnerability Index=${ward.vulnIndex}
Citizen Grievances on Record:
${relevantComplaints || 'Infrastructure gap identified via ward-level data analysis.'}

Write the formal proposal with these numbered sections:
1. EXECUTIVE SUMMARY
2. BACKGROUND & PROBLEM STATEMENT (cite ward data, area names, and citizen complaints)
3. PROPOSED SOLUTION & SCOPE OF WORK
4. TARGET BENEFICIARIES (with specific population numbers)
5. COST ESTIMATE & PHASING (3 phases)
6. EXPECTED OUTCOMES & KPIs
7. CITIZEN VOICE & EVIDENCE BASE
8. DEPARTMENT RECOMMENDATION

Use formal government English. Bold all section headings. Be specific with numbers and area names. Write 500-600 words.`;

    const result = await model.generateContent(prompt);
    const proposal = result.response.text().trim();
    res.json({ proposal, ward, category, estimatedCost });
  } catch (err) {
    console.error('generate-proposal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE: Get AI-ranked priority list ───────────────────────────────────────
export function computeScore(wardId, category, suggestions, weights) {
  const w = WARDS[wardId];
  if (!w) return {
    demandScore: 0, urgencyScore: 0, dataGapScore: 0, populationHelpedScore: 0,
    feedbackScore: 0, infraScore: 0, demoScore: 0, finalScore: 0, volume: 0
  };

  const vol = suggestions.filter(s => s.wardId === wardId && s.category === category).length;
  // Normalized grievance volume: (vol / w.population) * 2000000. Capped at 100.
  // Calibrated for an ACTIVE dashboard: assumes 5 active complaints per 100,000 residents yields 100 score.
  const demandScore = Math.min((vol / w.population) * 2000000, 100);

  const catSugs = suggestions.filter(s => s.wardId === wardId && s.category === category);
  const urgencySum = catSugs.reduce((sum, s) => {
    const uWeights = { critical: 100, high: 70, medium: 40, low: 10 };
    return sum + (uWeights[s.urgency] || 40);
  }, 0);
  const urgencyScore = catSugs.length > 0 ? (urgencySum / catSugs.length) : 0;

  let dataGapScore = 0;
  if (category === 'water')        dataGapScore = ((100 - w.waterQI) * 0.5) + (((24 - w.waterHrs) / 24) * 100 * 0.5);
  else if (category === 'health')  dataGapScore = Math.min((w.healthDistKm / 8) * 100, 100);
  else if (category === 'drainage' || category === 'solid_waste') dataGapScore = (100 - w.waterQI) * 0.6 + w.vulnIndex * 40;
  else if (category === 'roads' || category === 'streetlights') dataGapScore = w.vulnIndex * 100;
  else dataGapScore = 50;

  const maxPopulation = Math.max(...Object.values(WARDS).map(ward => ward.population));
  const populationHelpedScore = Math.min((w.population / maxPopulation) * 100, 100);

  const final = demandScore * weights.demand +
                urgencyScore * weights.urgency +
                dataGapScore * weights.dataGap +
                populationHelpedScore * weights.populationHelped;

  return {
    demandScore: Math.round(demandScore),
    urgencyScore: Math.round(urgencyScore),
    dataGapScore: Math.round(dataGapScore),
    populationHelpedScore: Math.round(populationHelpedScore),
    // Aliases for compatibility
    feedbackScore: Math.round(demandScore),
    infraScore: Math.round(dataGapScore),
    demoScore: Math.round(populationHelpedScore),
    finalScore: Math.round(Math.min(final, 100)),
    volume: vol
  };
}

// ─── ROUTE: Get AI-ranked priority list ───────────────────────────────────────
app.post('/api/recalculate-priorities', async (req, res) => {
  try {
    const reqWeights = req.body.weights || {};
    const weights = {
      demand: typeof reqWeights.demand === 'number' ? reqWeights.demand : 0.30,
      urgency: typeof reqWeights.urgency === 'number' ? reqWeights.urgency : 0.30,
      dataGap: typeof reqWeights.dataGap === 'number' ? reqWeights.dataGap : 0.25,
      populationHelped: typeof reqWeights.populationHelped === 'number' ? reqWeights.populationHelped : 0.15
    };
    const suggestions = readDB();

    const LOCAL_PLANS = [
      { id: 'RMC-P01', title: 'Sardarnagar SWM Collection Hub',               wardId: 'RMC-13', category: 'solid_waste',  cost: 7500000  },
      { id: 'RMC-P02', title: 'Aerodrome Area Water Pipeline Extension',       wardId: 'RMC-12', category: 'water',        cost: 12000000 },
      { id: 'RMC-P03', title: 'Gandhigram RO Water Treatment Plant',          wardId: 'RMC-18', category: 'water',        cost: 9500000  },
      { id: 'RMC-P04', title: 'Ghee Kanta Underground Drainage Reconstruction',wardId: 'RMC-09', category: 'drainage',     cost: 8200000  },
      { id: 'RMC-P05', title: 'Ward 17 LED Streetlight Installation (500 pts)',wardId: 'RMC-17', category: 'streetlights', cost: 1800000  },
      { id: 'RMC-P06', title: 'Karanpara Urban Health Sub-Centre (UHC)',       wardId: 'RMC-13', category: 'health',       cost: 6500000  },
      { id: 'RMC-P07', title: 'Kothariya Road Patch Work & Repair',            wardId: 'RMC-04', category: 'roads',        cost: 3200000  },
    ];

    const scored = LOCAL_PLANS.map(p => ({
      ...p,
      scores: computeScore(p.wardId, p.category, suggestions, weights),
      wardName: WARDS[p.wardId]?.name,
      wardAreas: WARDS[p.wardId]?.areas
    }));

    // AI gap detection
    for (const [wid] of Object.entries(WARDS)) {
      for (const cat of ['solid_waste', 'water', 'drainage', 'roads', 'streetlights', 'health']) {
        const hasPlan = LOCAL_PLANS.some(p => p.wardId === wid && p.category === cat);
        if (!hasPlan) {
          const sc = computeScore(wid, cat, suggestions, weights);
          if (sc.finalScore > 45 || sc.volume > 0) {
            scored.push({
              id: `AI-${wid}-${cat.substring(0, 3).toUpperCase()}`,
              title: `[AI Gap] ${cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Infrastructure Deficit`,
              wardId: wid, category: cat,
              cost: cat === 'water' ? 8000000 : cat === 'drainage' ? 9500000 : cat === 'health' ? 6500000 : 4500000,
              scores: sc,
              wardName: WARDS[wid]?.name,
              wardAreas: WARDS[wid]?.areas,
              aiDetected: true
            });
          }
        }
      }
    }

    scored.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
    res.json({ priorities: scored.slice(0, 25), totalSuggestions: suggestions.length });
  } catch (err) {
    console.error('priorities error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── ROUTE: Delete a suggestion (for admin) ───────────────────────────────────
app.delete('/api/suggestions/:id', (req, res) => {
  const db = readDB().filter(s => s.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🏙️  RMC-Pulse Backend running on http://localhost:${PORT}`);
    console.log(`🤖  Gemini Model: gemini-2.5-flash`);
    console.log(`🔑  API Key: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ MISSING — add to .env file'}`);
    console.log(`💾  Database: ${DB_PATH}\n`);
  });
}
