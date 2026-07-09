import { Router } from 'express';
import { env } from '../config/env.js';
import { getWardBoundaryFeatures } from '../services/wardData.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    key: !!env.geminiApiKey,
    geocoding: !!env.googleMapsApiKey,
    firebase: !!env.firebaseProjectId || !!env.firebaseServiceAccountJson,
    wardBoundaries: getWardBoundaryFeatures().length,
    model: 'gemini-3-flash-preview',
    storage: 'firestore'
  });
});

export default router;
