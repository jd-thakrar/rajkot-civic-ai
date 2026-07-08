import { env } from './src/server/config/env.js';
import { geminiText } from './src/server/services/gemini.js';

async function test() {
  try {
    const res = await geminiText('Respond with OK if you receive this.');
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
