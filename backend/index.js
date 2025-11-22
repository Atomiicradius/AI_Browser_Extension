const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

// Example with OpenAI (you can adapt to Gemini)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/chat', async (req, res) => {
  const { message, pageContext, conversationHistory } = req.body;
  const prompt = `User said: "${message}" about this page:\nTitle: ${pageContext.title}\nDescription: ${pageContext.description}\nContent: ${pageContext.mainContent.slice(0, 1200)}\n`;

  // OpenAI format (use Gemini as needed)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: "You're a helpful AI assistant." }]
        .concat(conversationHistory || [])
        .concat({ role: 'user', content: prompt }),
      max_tokens: 500
    })
  });

  const data = await response.json();
  res.json({ reply: data.choices?.[0]?.message?.content || 'AI did not return a reply.' });
});

app.listen(3000, () => console.log("Backend running on http://localhost:3000"));
