import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

if (env.nodeEnv !== 'test') {
  app.listen(env.port, () => {
    console.log(`\n🏙️  RMC Seva API running on http://localhost:${env.port}`);
    console.log(`🤖  Gemini Model: gemini-2.0-flash`);
    console.log(`🔥  Storage: Firestore`);
    console.log(`🔑  Gemini Key: ${env.geminiApiKey ? '✅' : '❌ MISSING'}`);
    console.log(`🔑  Firebase: ${env.firebaseProjectId || env.firebaseServiceAccountJson ? '✅' : '❌ MISSING'}\n`);
  });
}

export { createApp };
