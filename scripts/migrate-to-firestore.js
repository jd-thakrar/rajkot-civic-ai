/**
 * One-time migration: suggestions.json → Firestore
 * Usage: node scripts/migrate-to-firestore.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initFirebase } from '../src/server/config/firebase.js';
import { createSuggestion } from '../src/server/services/suggestionsRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '..', 'suggestions.json');

initFirebase();

if (!fs.existsSync(jsonPath)) {
  console.log('No suggestions.json found — nothing to migrate.');
  process.exit(0);
}

const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
console.log(`Migrating ${items.length} suggestions to Firestore…`);

for (const item of items) {
  await createSuggestion(item);
  console.log(`  ✓ ${item.ticketId || item.id}`);
}

console.log('Done.');
