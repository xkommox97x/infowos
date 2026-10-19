import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Translation endpoint using @google/genai
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLang, targetLangName, context } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Missing text or targetLang' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a professional game localization expert specializing in the mobile strategy game "Whiteout Survival".
Translate the following game text or strategy advice into ${targetLangName || targetLang}.
Preserve game terms (such as Furnace, Helios T11, Bear Trap, Chief Gear, Chief Charms, Empowerment, Mithril, Shards, Infantry, Lancer, Marksman, SvS, Sunfire Castle, Gen 1-18, etc.) using official localized nomenclature standard in Whiteout Survival.
Do not add meta conversational remarks or markdown code wraps unless present in input.

Context: ${context || 'Whiteout Survival Professional Encyclopedia'}
Text to translate:
"""
${text}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const translatedText = response.text || '';
    return res.json({ translatedText, targetLang });
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: err.message || 'Internal translation error' });
  }
});

// AI Whiteout Survival Strategist endpoint
app.post('/api/ask-strategist', async (req, res) => {
  try {
    const { question, language = 'tr' } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are the master grand strategist of Whiteout Survival with deep expertise in:
- Hero Gear Empowerment curve (+20 -> +60 -> +100 priority, skipping +40 and +80)
- Helios T11 requirements, costs (~13,400 Shards), and 1st army troop ratios
- Bear Trap rally leader vs joiner mechanics (Jessie, Jasser, Seo-yoon in slot 1; Gwen debate analysis)
- Sunfire Castle 2.5h clean win vs 5h cumulative time
- Chief Gear set bonus rules (5 Gold + 1 Purple = Purple T1 bonus)
- Dawn Academy Experts (Agnes, Cyrille, Baldur, Romulus, Holger)
- Troop Counter Triangle: Infantry > Lancer > Marksman > Infantry.
Respond in the language code "${language}". Be concise, highly tactical, accurate, and direct with bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: question,
      config: {
        systemInstruction,
      }
    });

    return res.json({ answer: response.text || '' });
  } catch (err: any) {
    console.error('Strategist error:', err);
    return res.status(500).json({ error: err.message || 'Error generating advice' });
  }
});

// Setup Vite middleware in dev or static files in production
async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Whiteout Survival Encyclopedia server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
