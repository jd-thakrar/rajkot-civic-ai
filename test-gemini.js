import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './src/server/config/env.js';

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const res = await model.generateContent('Respond with OK if you receive this.');
    console.log('Success:', res.response.text());
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
