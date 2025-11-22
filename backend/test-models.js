require('dotenv').config();
const fetch = require('node-fetch').default;

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log('\n✅ Available Gemini models for your API key:\n');
      data.models.forEach(model => {
        console.log(`  - ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Failed to fetch models:', error.message);
  }
}

listModels();
