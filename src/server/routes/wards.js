import { Router } from 'express';
import { getAreaWardMapping, getWardBoundaries } from '../services/wardData.js';

const router = Router();

router.get('/ward-boundaries', (_req, res) => {
  res.json(getWardBoundaries());
});

router.get('/area-registry', (_req, res) => {
  res.json(getAreaWardMapping());
});

export default router;
