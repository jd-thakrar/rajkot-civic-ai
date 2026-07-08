import { Router } from 'express';
import { getAllSuggestions, deleteSuggestion } from '../services/suggestionsRepository.js';
import { requireOfficer } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const suggestions = await getAllSuggestions();
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireOfficer, async (req, res) => {
  try {
    await deleteSuggestion(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
