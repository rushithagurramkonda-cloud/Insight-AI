import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';

let model;
const getModel = () => {
  if (!model) {
    const genAI = new GoogleGenerativeAI(config.gemini.key);
    model = genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 8192 },
    });
  }
  return model;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('Gemini timed out'), { timeout: true })), ms))]);

export function parseJson(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to the outermost {...} block.
    const s = cleaned.indexOf('{');
    const e = cleaned.lastIndexOf('}');
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1));
    throw new Error('Gemini returned invalid JSON');
  }
}

const busy = () => new HttpError(503, 'The AI service is busy. Please try again in a moment.', 'AI_BUSY');

// The ONLY place the backend talks to Gemini. Retries once, then returns a clear error.
export async function generateJson(prompt) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await withTimeout(getModel().generateContent(prompt), 90_000);
      return parseJson(result.response.text());
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      const retryable = err.timeout || [429, 500, 502, 503, 504].includes(status) || /invalid JSON|fetch failed|ECONN|ETIMEDOUT/i.test(err.message);
      if (!retryable) break;
      if (attempt === 0) await sleep(1500);
    }
  }
  console.error('Gemini error:', lastErr?.message);
  const status = lastErr?.status;
  if (status === 400 || status === 401 || status === 403) {
    throw new HttpError(502, 'The AI service rejected the request. Check the server GEMINI_API_KEY and model name.', 'AI_CONFIG');
  }
  throw busy();
}
