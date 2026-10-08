import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';

const API = 'https://api.github.com';

// NOTE: errors from GitHub are mapped to 404/429/502, NEVER 401. A 401 would make the frontend log the user out.
export async function gh(path, { token, raw = false, allow404 = false } = {}) {
  const headers = {
    'User-Agent': 'insight-ai',
    'X-GitHub-Api-Version': '2022-11-28',
    Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
  };
  const t = token || config.github.token;
  if (t) headers.Authorization = `Bearer ${t}`;

  let res;
  try {
    res = await fetch(`${API}${path}`, { headers });
  } catch {
    throw new HttpError(502, 'Could not reach GitHub. Check your connection and try again.', 'GITHUB_DOWN');
  }

  if (res.ok) return raw ? res.text() : res.json();
  if (res.status === 404) {
    if (allow404) return null;
    throw new HttpError(404, 'That GitHub user or repository was not found, or it is private.', 'GITHUB_NOT_FOUND');
  }
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
    const when = reset ? new Date(reset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'a little later';
    throw new HttpError(429, `GitHub rate limit reached. Try again at ${when}.`, 'GITHUB_RATE');
  }
  if (res.status === 401) throw new HttpError(502, 'GitHub rejected the access token. Sign out and sign in with GitHub again.', 'GITHUB_TOKEN');
  throw new HttpError(502, `GitHub returned an error (${res.status}). Try again in a moment.`, 'GITHUB_ERROR');
}

// Parses "octocat", "@octocat", "https://github.com/octocat" or "https://github.com/owner/repo(.git)".
export function parseTarget(input) {
  const v = String(input || '').trim().replace(/\.git$/, '').replace(/\/+$/, '');
  const url = v.match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)(?:\/([\w.-]+))?(?:\/.*)?$/i);
  if (url) return url[2] ? { type: 'repo', owner: url[1], repo: url[2], target: `${url[1]}/${url[2]}` } : { type: 'profile', owner: url[1], target: url[1] };
  const user = v.replace(/^@/, '');
  if (/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(user)) return { type: 'profile', owner: user, target: user };
  return null;
}
