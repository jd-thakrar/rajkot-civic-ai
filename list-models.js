import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './src/server/config/env.js';

async function listModels() {
  const genAI = new GoogleGenerativeAI(env.geminiApiKey);
  
  // Try calling listModels using the REST API directly since the SDK might not expose it easily
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${env.geminiApiKey}`);
  const data = await response.json();
  
  if (data.models) {
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } else {
    console.log("Error listing models:", data);
  }
}

listModels();
