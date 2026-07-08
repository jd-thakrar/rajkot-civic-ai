import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './src/server/config/env.js';

async function testModels() {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  
  const modelsToTest = [
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash-001',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-pro-latest'
  ];

  for (const modelName of modelsToTest) {
    console.log(`Testing ${modelName}...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.generateContent('Say exactly: OK');
      console.log(`✅ Success with ${modelName}:`, res.response.text());
      return; // Exit after finding the first working model
    } catch (err) {
      console.log(`❌ Failed with ${modelName}:`, err.message.substring(0, 100));
    }
  }
}

testModels();
