require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* --- Existing Gemini summary code --- */
async function getGeminiSummary(content) {
  const apiKey = process.env.GEMINI_API_KEY;
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

/* --- Health check --- */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running!' });
});

/* --- Gemini summary endpoint (no change) --- */
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

/* --- NEW: Chatbot endpoint (for extension chat, echos message for now) --- */
app.post('/chat', async (req, res) => {
  try {
    const { message, pageContext, conversationHistory } = req.body;

    // Build prompt/context for Gemini
    let prompt = `You are a helpful browser assistant. The user asked a question about this webpage.\n\n`;
    if (pageContext && pageContext.title) {
      prompt += `Title: ${pageContext.title}\n`;
    }
    if (pageContext && pageContext.description) {
      prompt += `Description: ${pageContext.description}\n`;
    }
    if (pageContext && pageContext.mainContent) {
      prompt += `Content sample: ${pageContext.mainContent.slice(0, 600)}\n`;
    }
    prompt += `\nConversation:\n`;
    // Optionally, add conversation history for multi-turn memory
    if (Array.isArray(conversationHistory) && conversationHistory.length) {
      conversationHistory.forEach(({ role, content }) => {
        prompt += `${role === 'user' ? 'User' : 'Assistant'}: ${content}\n`;
      });
    }
    prompt += `User: ${message}\nAssistant:`;

    // Gemini request
    const apiKey = process.env.GEMINI_API_KEY;
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const payload = {
      contents: [
        { parts: [ { text: prompt } ] }
      ]
    };
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    let reply = "Sorry, I couldn't get a reply.";
    if (data && data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
        reply = candidate.content.parts[0].text;
      }
    } else if (data && data.error && data.error.message) {
      reply = `Gemini error: ${data.error.message}`;
    }

    res.json({ reply });
  } catch (err) {
    console.error("Gemini chatbot error:", err);
    res.status(500).json({ reply: "Backend error: " + (err.message || "Unknown error") });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
