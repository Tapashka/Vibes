const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a social media marketing expert for nightlife venues, restaurants, and events in Tbilisi, Georgia.
Create high-converting, engaging content that attracts real visitors.
Rules:
- Keep it short, catchy, and emotional
- Include a clear call-to-action
- Avoid generic phrases
- Use modern social media language
- Reflect the vibe of the event (party, chill, premium, etc.)
- Always reference Tbilisi / Georgia context`;

const callClaude = async (userPrompt, tone = 'party', maxTokens = 600) => {
  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT + `\nTone for this request: ${tone}.`,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Claude API error');
  }

  const data = await response.json();
  return data.content[0].text;
};

// POST /api/ai/improve-description
router.post('/improve-description', authenticate, async (req, res, next) => {
  try {
    const { description, tone = 'party' } = req.body;
    if (!description) return res.status(400).json({ error: 'description required' });

    const prompt = `Rewrite this event description to be more engaging and attractive.

Original:
${description}

Rules:
- Make it more emotional and atmospheric
- Highlight the vibe
- Keep it 3-5 lines
- Make people want to attend
- Nightlife / events tone`;

    const improved = await callClaude(prompt, tone, 300);
    res.json({ improved });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-promo
router.post('/generate-promo', authenticate, async (req, res, next) => {
  try {
    const {
      event_name, description, place_name, date, time,
      platforms = ['tiktok', 'instagram', 'facebook'],
      tone = 'party',
      event_id,
    } = req.body;

    if (!event_name || !platforms.length) {
      return res.status(400).json({ error: 'event_name and platforms required' });
    }

    const results = {};

    const prompts = {
      tiktok: `Create TikTok content for this event:
Event: ${event_name}
Place: ${place_name || 'Tbilisi venue'}
Date: ${date || 'This weekend'}${time ? ` at ${time}` : ''}
Description: ${description || 'An amazing event'}

Output exactly:
Hook: (first 2 seconds text, max 8 words)
Caption: (max 2 lines)
Hashtags: (5-8 hashtags)

Style: viral, energetic, make people feel "I NEED to go there tonight"`,

      instagram: `Create Instagram post for this event:
Event: ${event_name}
Place: ${place_name || 'Tbilisi venue'}
Date: ${date || 'This weekend'}${time ? ` at ${time}` : ''}
Description: ${description || 'An amazing event'}

Output exactly:
Caption: (3-5 lines, aesthetic and atmospheric)
Hashtags: (8-12 hashtags)

Style: aesthetic, emotional, focus on vibe and experience`,

      facebook: `Create a Facebook event post:
Event: ${event_name}
Place: ${place_name || 'Tbilisi venue'}
Date: ${date || 'This weekend'}${time ? ` at ${time}` : ''}
Description: ${description || 'An amazing event'}

Output: Full post text (5-8 lines)
Must include: what, where, when, why to attend, CTA
Style: informative, clear, structured`,
    };

    // Generate all platforms in parallel
    const generated = await Promise.allSettled(
      platforms.map(async (platform) => {
        if (!prompts[platform]) return [platform, null];
        const content = await callClaude(prompts[platform], tone, 500);
        return [platform, content];
      })
    );

    generated.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const [platform, content] = result.value;
        if (content) results[platform] = content;
      }
    });

    // Save to DB if event_id provided
    if (event_id) {
      await Promise.all(
        Object.entries(results).map(([platform, content]) =>
          query(
            `INSERT INTO ai_content (event_id, user_id, platform, tone, content)
             VALUES ($1,$2,$3,$4,$5)`,
            [event_id, req.user.id, platform, tone, content]
          )
        )
      );
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/chat — Vibes AI chat assistant
router.post('/chat', async (req, res, next) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const systemPrompt = `You are Vibes AI — a friendly assistant for the "Vibes in the City" app in Tbilisi, Georgia.
You help users discover venues, events, and experiences.
You know about: nightlife, restaurants, bars, clubs, hookah lounges, rooftop bars, events.
City: Tbilisi, Georgia.
Keep answers short (2-4 sentences), friendly, and enthusiastic.
If asked about specific venues, give general recommendations about the type of venue.`;

    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          ...(context || []),
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I'm not sure about that. Try exploring the map!";

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/content/:eventId — get saved AI content for event
router.get('/content/:eventId', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM ai_content WHERE event_id=$1 ORDER BY created_at DESC`,
      [req.params.eventId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
