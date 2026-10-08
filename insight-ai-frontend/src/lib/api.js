// Single place where the frontend talks to the backend.
// In demo mode every request is answered locally from lib/demo.js (no network at all).
import { demoRequest } from './demo.js';

export const DEMO_KEY = 'insight_demo';
export const isDemo = () => localStorage.getItem(DEMO_KEY) === '1';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body, { form = false } = {}) {
  if (isDemo()) return demoRequest(method, path, body);

  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: form || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection or switch to demo mode.', 0, 'NETWORK');
  }

  if (res.status === 401) {
    window.dispatchEvent(new Event('insight:unauthorized'));
    throw new ApiError('Your session has expired. Please sign in again.', 401, 'UNAUTHORIZED');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || 'Something went wrong. Please try again.', res.status, data.code);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b ?? {}),
  del: (p) => request('DELETE', p),
  upload: (p, formData) => request('POST', p, formData, { form: true }),
};
