import { Router } from 'express';
import { getAllGeocodes } from '../services/geocodesRepository.js';
import { geocodeAreaName } from '../services/geocoding.js';

const router = Router();

router.get('/area-geocodes', async (_req, res) => {
  try {
    res.json(await getAllGeocodes());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/geocode-area', async (req, res) => {
  try {
    const { area } = req.body;
    if (!area) return res.status(400).json({ error: 'Area name required' });
    const geocoded = await geocodeAreaName(area);
    if (!geocoded?.ok) {
      return res.status(404).json({ error: 'Could not geocode area', status: geocoded?.status });
    }
    res.json(geocoded);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
