import { Router } from 'express';
import { geminiText } from '../services/gemini.js';
import { getAllSuggestions } from '../services/suggestionsRepository.js';
import { requireOfficer } from '../middleware/auth.js';
import { WARDS, buildPriorities } from '../services/scoring.js';
import { DEPT_MAP } from '../../shared/wards.js';

const router = Router();

router.post('/copilot', requireOfficer, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const suggestions = await getAllSuggestions();

    const wardsContext = Object.entries(WARDS).map(([id, w]) => {
      const wardSugs = suggestions.filter((s) => s.wardId === id);
      const cats = {};
      wardSugs.forEach((s) => { cats[s.category] = (cats[s.category] || 0) + 1; });
      return `${w.name} (${w.areas}): pop=${w.population.toLocaleString()}, BPL=${w.bpl}%, waterQI=${w.waterQI}/100, complaints=${JSON.stringify(cats)}`;
    }).join('\n');

    const systemPrompt = `You are an expert AI civic development analyst for the Rajkot Municipal Corporation (RMC), Gujarat.

LIVE WARD DATA (18 RMC administrative wards):
${wardsContext}

TOTAL CITIZEN GRIEVANCES LOGGED: ${suggestions.length}
RECENT GRIEVANCES (last 5): ${suggestions.slice(0, 5).map((s) => `[${s.wardId}/${s.category} | Ticket:${s.ticketId}]: "${s.keyConcern || s.translatedContent}"`).join('; ')}

Conversation history: ${history.map((h) => `${h.role}: ${h.content}`).join('\n')}

Commissioner's query: ${message}`;

    const reply = await geminiText(systemPrompt);
    res.json({ reply });
  } catch (err) {
    console.error('copilot error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-proposal', requireOfficer, async (req, res) => {
  try {
    const { projectTitle, wardId, category, estimatedCost } = req.body;
    const ward = WARDS[wardId];
    if (!ward) return res.status(400).json({ error: 'Invalid wardId' });

    const suggestions = await getAllSuggestions();
    const relevantComplaints = suggestions
      .filter((s) => s.wardId === wardId && s.category === category)
      .slice(0, 5)
      .map((s) => `Ticket ${s.ticketId}: "${s.translatedContent || s.keyConcern}"`)
      .join('\n');

    const prompt = `You are a senior proposal writer for the Rajkot Municipal Corporation (RMC), Gujarat.
Write a formal civic scheme sanction proposal following Indian government formatting standards.

Project: ${projectTitle}
Ward: ${ward.name} (Areas: ${ward.areas})
Responsible Department: ${DEPT_MAP[category] || 'General Administration'}
Category: ${category}
Estimated Cost: ₹${(estimatedCost / 100000).toFixed(1)} Lakhs
Ward Statistics: Population=${ward.population.toLocaleString()}, BPL=${ward.bpl}%, Water Quality Index=${ward.waterQI}/100
Citizen Grievances on Record:
${relevantComplaints || 'Infrastructure gap identified via ward-level data analysis.'}

Write the formal proposal with numbered sections: EXECUTIVE SUMMARY, BACKGROUND, PROPOSED SOLUTION, TARGET BENEFICIARIES, COST ESTIMATE, EXPECTED OUTCOMES, CITIZEN VOICE, DEPARTMENT RECOMMENDATION. Use formal government English. 500-600 words.`;

    const proposal = await geminiText(prompt);
    res.json({ proposal, ward, category, estimatedCost });
  } catch (err) {
    console.error('generate-proposal error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/recalculate-priorities', requireOfficer, async (req, res) => {
  try {
    const reqWeights = req.body.weights || {};
    const weights = {
      demand: typeof reqWeights.demand === 'number' ? reqWeights.demand : 0.30,
      urgency: typeof reqWeights.urgency === 'number' ? reqWeights.urgency : 0.30,
      dataGap: typeof reqWeights.dataGap === 'number' ? reqWeights.dataGap : 0.25,
      populationHelped: typeof reqWeights.populationHelped === 'number' ? reqWeights.populationHelped : 0.15
    };

    const suggestions = await getAllSuggestions();
    const priorities = buildPriorities(suggestions, weights);
    res.json({ priorities, totalSuggestions: suggestions.length });
  } catch (err) {
    console.error('priorities error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
