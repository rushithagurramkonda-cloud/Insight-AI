import crypto from 'crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/errors.js';
import { encrypt } from '../utils/crypto.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js';

const router = Router();
const tmp = (res, name, value) =>
  res.cookie(name, value, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 10 * 60 * 1000, path: '/auth' });

// Step 1: send the browser to GitHub. Default scope is read-only. "?scope=repo" asks for private repo access.
router.get('/github', authLimiter, (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const wantsPrivate = req.query.scope === 'repo';
  tmp(res, 'oauth_state', state);
  tmp(res, 'oauth_remember', req.query.remember === '1' ? '1' : '0');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', config.github.clientId);
  url.searchParams.set('redirect_uri', config.github.callbackUrl);
  url.searchParams.set('scope', wantsPrivate ? 'read:user repo' : 'read:user');
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

// Step 2: GitHub sends the user back here with a code. The client secret never reaches the browser.
router.get('/github/callback', authLimiter, asyncHandler(async (req, res) => {
  const fail = (reason) => res.redirect(`/login?error=${encodeURIComponent(reason)}`);
  const { code, state, error } = req.query;
  const expected = req.cookies?.oauth_state;
  const remember = req.cookies?.oauth_remember === '1';
  res.clearCookie('oauth_state', { path: '/auth' });
  res.clearCookie('oauth_remember', { path: '/auth' });

  if (error || !code) return fail('cancelled');
  if (!state || !expected || state !== expected) return fail('state');

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: config.github.clientId, client_secret: config.github.clientSecret, code, redirect_uri: config.github.callbackUrl }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenJson.access_token) return fail('token');

  const profileRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}`, 'User-Agent': 'insight-ai', Accept: 'application/vnd.github+json' },
  });
  if (!profileRes.ok) return fail('profile');
  const profile = await profileRes.json();

  const username = profile.login;
  const isAdmin = config.adminUsernames.includes(username.toLowerCase());
  let user = await User.findOne({ githubId: String(profile.id) });
  if (user?.suspended) return fail('suspended');

  if (!user) {
    user = new User({ githubId: String(profile.id), githubUsername: username, name: profile.name || username, avatarUrl: profile.avatar_url });
  } else {
    user.githubUsername = username; // GitHub usernames can change
    user.avatarUrl = profile.avatar_url;
  }
  if (isAdmin) user.role = 'admin';
  if (profile.company && !user.organization) user.organization = String(profile.company).replace(/^@/, '');
  user.tokenEnc = encrypt(tokenJson.access_token);
  user.tokenScope = tokenJson.scope || '';
  user.lastActiveAt = new Date();
  await user.save();

  setSessionCookie(res, user._id, remember);
  res.redirect('/dashboard');
}));

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
