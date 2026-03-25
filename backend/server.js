const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

app.get('/', (req, res) => res.send('🚀 Backend server is running successfully!'));

app.get('/api/test-key', (req, res) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ status: '❌ API key missing in environment' });
  res.json({ status: '✅ API key found', prefix: key.substring(0, 10) + '...' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.log('⚠️ MongoDB error:', err.message));

const Prompt = mongoose.model('Prompt', new mongoose.Schema({
  prompt: String,
  response: String,
  createdAt: { type: Date, default: Date.now }
}));

async function askAI(prompt, apiKey) {
  const models = [
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o-mini',
    'deepseek/deepseek-chat',
    'google/gemini-2.0-flash-lite-preview-02-05:free',
    'mistralai/mistral-7b-instruct:free'
  ];

  for (const model of models) {
    try {
      console.log(`📡 Trying ${model}...`);
      const { data } = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        { model, messages: [{ role: 'user', content: prompt }] },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'MERN AI Flow',
          },
        }
      );
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        console.log(`✅ Response from ${model}`);
        return text;
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      console.log(`⚠️ ${model} failed:`, errorMsg);
      if (errorMsg.includes('User not found')) {
        throw new Error('API key is invalid (User not found). Check Render settings.');
      }
    }
  }

  throw new Error('All AI models failed. Please check your OpenRouter credits or API key settings.');
}

app.post('/api/ask-ai', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const response = await askAI(prompt, apiKey);
    res.json({ response });
  } catch (err) {
    console.error('❌', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const { prompt, response } = req.body;
    if (!prompt || !response) return res.status(400).json({ error: 'Missing data' });

    await new Prompt({ prompt, response }).save();
    console.log('💾 Saved to MongoDB');
    res.json({ message: 'Saved successfully' });
  } catch (err) {
    console.error('❌ Save error:', err.message);
    res.status(500).json({ error: 'Failed to save' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running → http://localhost:${PORT}\n`);
});