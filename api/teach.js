// Serverless endpoint (Vercel). Verifies the Firebase login, then asks Claude to build a whiteboard lesson.
// Env vars: ANTHROPIC_API_KEY (required), FIREBASE_API_KEY (required for real login),
//           ANTHROPIC_MODEL (optional), ALLOW_GUEST=1 (optional, local testing only)
const dns = require('dns').promises;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const HOURLY_LIMIT = Number(process.env.HOURLY_LIMIT || 30);
const hits = new Map(); // best-effort in-memory rate limit per user

async function verifyUser(authHeader) {
  const token = (authHeader || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  if (token === 'guest') return process.env.ALLOW_GUEST === '1' ? 'guest' : null;
  const key = process.env.FIREBASE_API_KEY;
  if (!key) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.users && j.users[0] ? j.users[0].localId : null;
}

function rateLimited(uid) {
  const now = Date.now();
  const arr = (hits.get(uid) || []).filter((t) => now - t < 3600e3);
  if (arr.length >= HOURLY_LIMIT) { hits.set(uid, arr); return true; }
  arr.push(now); hits.set(uid, arr);
  return false;
}

function isPrivateIp(ip) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip) ||
    ip === '::1' || /^f[cd]/i.test(ip) || /^fe80/i.test(ip);
}

async function fetchPage(rawUrl) {
  let url = new URL(rawUrl);
  for (let hop = 0; hop < 4; hop++) {
    if (!/^https?:$/.test(url.protocol)) throw new Error('Only http(s) links are allowed');
    const addrs = await dns.lookup(url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('That link is not allowed');
    const r = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'SamjhoBot/1.0' },
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      url = new URL(r.headers.get('location'), url);
      continue;
    }
    if (!r.ok) throw new Error('Could not open that link (' + r.status + ')');
    const html = (await r.text()).slice(0, 600000);
    return html
      .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
  }
  throw new Error('Too many redirects');
}

const SCHEMA = `Reply with ONE JSON object only. No markdown, no code fences, no text outside the JSON.
{
  "title": "short lesson title",
  "steps": [
    {
      "heading": "3-6 word step title",
      "say": "What you say out loud for this step: 2-4 short, friendly sentences.",
      "lines": ["1-4 short lines written on the board (max ~55 characters each)"],
      "svg": "OPTIONAL diagram, inner SVG markup only"
    }
  ],
  "quiz": [ { "q": "question", "options": ["A","B","C","D"], "answer": 0, "why": "one-line explanation" } ],
  "summary": ["2-4 short key takeaways"]
}
DIAGRAM RULES (svg field):
- Inner markup only (no <svg> wrapper). Coordinate space is 600 wide x 300 tall. Keep everything inside it.
- Allowed elements: line, path, circle, ellipse, rect, polygon, polyline, text, g. Max 25 elements.
- Always set fill="none" on outlines. stroke-width 2-4. Colors: #1b2440 (ink), #e63946 (red), #2a9d8f (green), #f4a300 (orange), #3a86ff (blue).
- Labels: <text x= y= font-size="18" text-anchor="middle" fill="#1b2440">Label</text>. Short labels, no overlaps.
- Draw arrowheads as two short lines or a small polygon. Use diagrams where they truly help (flows, graphs, shapes, cycles, circuits, number lines), skip them otherwise.
- Write math with Unicode (x², √, ½, ×, ÷, →, ≤). Never use LaTeX.`;

function buildSystem(mode, lang) {
  const language = lang === 'hi'
    ? 'LANGUAGE: Hindi. Write title, heading, say, lines, quiz and summary in simple, friendly Hindi (Devanagari), like a kind teacher. Keep formulas and widely-used technical terms in English letters. Keep any SVG text labels very short.'
    : 'LANGUAGE: English. Use simple, clear words, like a kind teacher talking to one student.';
  const modes = {
    topic: 'TASK: Teach the topic from the basics. 5 to 8 steps. Start with the intuition or a real-life analogy (Indian context where natural), build up gradually, then one worked example. Omit "quiz". Include "summary".',
    exam: 'TASK: Fast exam revision. 5 to 7 steps: key concepts, important formulas or points, a typical exam question solved, common mistakes to avoid, and a memory trick. Include "quiz" with exactly 5 multiple-choice questions (4 options each, "answer" is the 0-based index). Include "summary".',
    homework: 'TASK: The student shared a homework problem (text and/or photo/file). Solve it step by step and explain WHY each step is done, so they learn the method, not just the answer. 3 to 8 steps. The last step states the final answer clearly. Omit "quiz". Include "summary". If the photo is unreadable, use one step asking for a clearer photo.',
    followup: 'TASK: The student is in the middle of a lesson and asked a doubt (shown below with the lesson so far). Answer it in 1 to 4 steps, building on what was already taught. Omit "quiz" and "summary".',
  };
  return `You are Samjho, a warm, patient AI whiteboard tutor for school and college students. You teach by speaking and drawing on a whiteboard, one step at a time.\n${language}\n${modes[mode] || modes.topic}\n\n${SCHEMA}`;
}

function extractJson(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('No JSON in reply');
  return JSON.parse(text.slice(a, b + 1));
}

function clean(obj, mode) {
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  const steps = (Array.isArray(obj.steps) ? obj.steps : []).slice(0, 10).map((s) => ({
    heading: str(s.heading, 80),
    say: str(s.say, 900),
    lines: (Array.isArray(s.lines) ? s.lines : []).slice(0, 5).map((l) => str(l, 120)),
    svg: typeof s.svg === 'string' ? s.svg.slice(0, 8000) : '',
  })).filter((s) => s.say || s.lines.length);
  if (!steps.length) throw new Error('Empty lesson');
  const out = { title: str(obj.title, 120) || 'Lesson', steps };
  if (Array.isArray(obj.summary)) out.summary = obj.summary.slice(0, 5).map((x) => str(x, 200));
  if (mode === 'exam' && Array.isArray(obj.quiz)) {
    out.quiz = obj.quiz.slice(0, 8).map((q) => ({
      q: str(q.q, 300),
      options: (Array.isArray(q.options) ? q.options : []).slice(0, 5).map((o) => str(o, 150)),
      answer: Math.max(0, Math.min(4, parseInt(q.answer, 10) || 0)),
      why: str(q.why, 300),
    })).filter((q) => q.q && q.options.length >= 2);
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const uid = await verifyUser(req.headers.authorization);
    if (!uid) return res.status(401).json({ error: 'login_required' });
    if (rateLimited(uid)) return res.status(429).json({ error: 'You have reached the hourly limit. Please try again a little later.' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY' });

    const b = req.body || {};
    const mode = ['topic', 'exam', 'homework', 'followup'].includes(b.mode) ? b.mode : 'topic';
    const lang = b.lang === 'hi' ? 'hi' : 'en';
    const prompt = String(b.prompt || '').slice(0, 2000);

    const content = [];
    for (const f of (Array.isArray(b.files) ? b.files : []).slice(0, 4)) {
      if (f.kind === 'image' && /^image\/(jpeg|png|webp|gif)$/.test(f.mime) && f.data) {
        content.push({ type: 'image', source: { type: 'base64', media_type: f.mime, data: f.data } });
      } else if (f.kind === 'pdf' && f.data) {
        content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data } });
      } else if (f.kind === 'text' && f.text) {
        content.push({ type: 'text', text: `FILE "${String(f.name).slice(0, 80)}":\n${String(f.text).slice(0, 20000)}` });
      }
    }
    if (b.url) {
      try {
        content.push({ type: 'text', text: `WEB PAGE ${b.url}:\n${await fetchPage(String(b.url))}` });
      } catch (e) {
        return res.status(400).json({ error: 'Link problem: ' + e.message });
      }
    }
    let userText = prompt || (content.length ? 'Teach me what is in the material above.' : '');
    if (mode === 'followup') userText = `LESSON SO FAR:\n${String(b.context || '').slice(0, 6000)}\n\nSTUDENT'S DOUBT: ${prompt}`;
    if (!userText) return res.status(400).json({ error: 'Please type a topic or attach something.' });
    content.push({ type: 'text', text: userText });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 6000,
        system: buildSystem(mode, lang),
        messages: [{ role: 'user', content }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error('Anthropic error', r.status, t.slice(0, 500));
      return res.status(502).json({ error: 'The AI is busy right now. Please try again.' });
    }
    const j = await r.json();
    const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    let lesson;
    try { lesson = clean(extractJson(text), mode); }
    catch (e) { console.error('Bad JSON', e.message); return res.status(502).json({ error: 'Could not build the lesson. Please try again.' }); }
    return res.status(200).json(lesson);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

module.exports.config = { maxDuration: 60 };
