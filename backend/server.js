require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function getGeminiSummary(content) {
  const apiKey = process.env.GEMINI_API_KEY;
  // FIXED: Using gemini-2.5-flash (available in your account)
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const payload = {
    contents: [
      { parts: [ { text: `Summarize this article in 3-5 bullet points:\n${content}` } ] }
    ]
  };
  const response = await fetch(`${url}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return data;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running!' });
});

app.post('/api/summarize', async (req, res) => {
  try {
    console.log("=== Summarize Request Received ===");
    console.log("Content length:", req.body.content ? req.body.content.length : 0);

    const { content } = req.body;
    if (!content || content.trim().length < 100) {
      throw new Error("Content is empty or too short");
    }

    console.log("Calling Gemini REST API...");
    const result = await getGeminiSummary(content);

    let summary = "No summary found.";
    if (result && result.candidates && result.candidates[0]) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        summary = candidate.content.parts[0].text;
      }
    } else if (result && result.error && result.error.message) {
      throw new Error(result.error.message);
    }

    console.log("Extracted summary:", summary);
    res.json({ summary });
  } catch (error) {
    console.error('=== Summarization Error ===');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
