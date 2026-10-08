import rateLimit from 'express-rate-limit';

const json = (message) => ({ message, code: 'RATE_LIMITED' });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('Too many requests. Please slow down and try again shortly.'),
});

// Limits expensive AI calls per signed-in user. Mount AFTER requireAuth.
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => String(req.user?._id || req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: json('You have reached the hourly AI analysis limit. Try again later.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: json('Too many sign-in attempts. Try again in a few minutes.'),
});
