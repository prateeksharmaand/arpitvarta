// Thin Gemini client. The API key lives only in the backend env
// (GEMINI_API_KEY) — never ship it to the web bundle or the mobile apps.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Used for the last retry when the primary model is overloaded.
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';

const isConfigured = () => Boolean(GEMINI_API_KEY);

async function generateJson(prompt, { temperature = 0.4, maxOutputTokens = 2048 } = {}) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens },
  });

  // Gemini intermittently answers 429/500/503 ("high demand"); retry with
  // backoff, using the fallback model on the last attempt.
  const MAX_ATTEMPTS = 3;
  let response;
  let data;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const model = attempt === MAX_ATTEMPTS && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL ? GEMINI_FALLBACK_MODEL : GEMINI_MODEL;
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body,
    });
    data = await response.json().catch(() => ({}));
    if (response.ok || ![429, 500, 503].includes(response.status) || attempt === MAX_ATTEMPTS) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed with status ${response.status}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON');
  }
}

module.exports = { generateJson, isConfigured };
