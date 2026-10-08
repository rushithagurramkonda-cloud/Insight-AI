import 'dotenv/config';
import { fileURLToPath } from 'url';

const list = (v) => (v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  tokenKey: process.env.TOKEN_ENC_KEY || process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5173/auth/github/callback',
    token: process.env.GITHUB_TOKEN || '',
    dailyLimit: Number(process.env.GITHUB_DAILY_LIMIT) || 15,
    maxRepos: Math.min(10, Number(process.env.GITHUB_MAX_REPOS) || 5),
  },
  adminUsernames: list(process.env.ADMIN_GITHUB_USERNAMES),
  gemini: { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash' },
  storageDir: fileURLToPath(new URL('../storage/', import.meta.url)), // works on Windows too
};

export function assertConfig() {
  const missing = [
    ['MONGODB_URI', config.mongoUri],
    ['JWT_SECRET', config.jwtSecret],
    ['GITHUB_CLIENT_ID', config.github.clientId],
    ['GITHUB_CLIENT_SECRET', config.github.clientSecret],
    ['GEMINI_API_KEY', config.gemini.key],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`\nMissing required environment variables: ${missing.join(', ')}\nCopy .env.example to .env and fill them in.\n`);
    process.exit(1);
  }
  if (config.jwtSecret.length < 24) {
    console.error('\nJWT_SECRET is too short. Use at least 24 random characters.\n');
    process.exit(1);
  }
}
