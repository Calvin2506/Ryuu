// ============================================
//  Vercel Serverless Function — api/chat.js
//  This replaces your entire server.js
//  Vercel automatically exposes this as POST /api/chat
// ============================================

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are Ryuu, a friendly and helpful AI assistant embedded on a website.
Keep your answers concise, warm, and conversational.
Use simple language. If you don't know something, say so honestly.
Never make up facts.`;

export default async function handler(req, res) {
  // Allow requests from any website (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [] } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set in Vercel environment vRyuubles' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model      : MODEL,
        max_tokens : 1024,
        temperature: 0.7,
        messages   : [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.slice(-20),
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Groq API error');
    }

    const data  = await response.json();
    const reply = data.choices[0].message.content;

    return res.status(200).json({ reply, model: data.model });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}