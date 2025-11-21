require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Test endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running!' });
});

// Summarize endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { content } = req.body;
    const prompt = `Summarize this article in 3-5 concise bullet points:\n\n${content}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();
    
    res.json({ summary });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
