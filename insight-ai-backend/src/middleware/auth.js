import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/index.js';
import { HttpError, asyncHandler } from '../utils/errors.js';
import { isId } from '../utils/misc.js';

export const COOKIE = 'insight_token';

export function setSessionCookie(res, userId, remember) {
  const token = jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: remember ? '30d' : '24h' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    // "Remember me" = 30-day cookie. Otherwise a session cookie that ends when the browser closes.
    ...(remember ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
    path: '/',
  });
}

export const clearSessionCookie = (res) => res.clearCookie(COOKIE, { path: '/' });

// Every /api route except the OAuth endpoints goes through this.
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHORIZED');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    clearSessionCookie(res);
    throw new HttpError(401, 'Your session has expired. Please sign in again.', 'UNAUTHORIZED');
  }
  if (!isId(payload.sub)) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHORIZED');
  const user = await User.findById(payload.sub);
  if (!user) {
    clearSessionCookie(res);
    throw new HttpError(401, 'Your account no longer exists. Please sign in again.', 'UNAUTHORIZED');
  }
  if (user.suspended) throw new HttpError(403, 'This account has been suspended.', 'SUSPENDED');
  // Touch lastActiveAt at most once every 5 minutes.
  if (!user.lastActiveAt || Date.now() - user.lastActiveAt.getTime() > 5 * 60 * 1000) {
    user.lastActiveAt = new Date();
    user.save().catch(() => {});
  }
  req.user = user;
  next();
});

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new HttpError(403, 'Administrator access required.', 'FORBIDDEN'));
  next();
};
