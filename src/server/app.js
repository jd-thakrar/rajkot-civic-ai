import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { initFirebase } from './config/firebase.js';
import { loadReferenceData } from './services/wardData.js';

import healthRoutes from './routes/health.js';
import suggestionsRoutes from './routes/suggestions.js';
import analyzeRoutes from './routes/analyze.js';
import geocodeRoutes from './routes/geocode.js';
import wardsRoutes from './routes/wards.js';
import officerRoutes from './routes/officer.js';

export function createApp() {
  initFirebase();
  loadReferenceData();

  const app = express();

  app.use(cors({
    origin: [
      'https://rmc-seva-v2.web.app',
      'https://rmc-seva-v2.firebaseapp.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ],
    credentials: true
  }));
  app.use(express.json({ limit: '20mb' }));

  app.use('/api', healthRoutes);
  app.use('/api/suggestions', suggestionsRoutes);
  app.use('/api', analyzeRoutes);
  app.use('/api', geocodeRoutes);
  app.use('/api', wardsRoutes);
  app.use('/api', officerRoutes);

  if (!env.isProduction) {
    app.use(express.static(env.staticDir));
  } else {
    app.use(express.static(path.join(env.staticDir, 'dist')));
  }

  return app;
}
