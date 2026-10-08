import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { HttpError } from './utils/errors.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import resumeRoutes from './routes/resumes.js';
import githubRoutes from './routes/github.js';
import jobRoutes from './routes/jobs.js';
import comparisonRoutes from './routes/comparisons.js';
import matchRoutes from './routes/matches.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind the Vite dev proxy / a reverse proxy
  app.disable('x-powered-by');
  app.use(helmet());
  // In dev the Vite proxy makes everything same-origin, so CORS is only a safety net for the frontend origin.
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/auth', authRoutes);

  app.use('/api', apiLimiter);
  // Every /api route below requires a signed-in user (this includes /api/github-repositories/analyze).
  app.use('/api', requireAuth);
  app.use('/api/me', meRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/github-repositories', githubRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/comparisons', comparisonRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/admin', requireAdmin, adminRoutes);

  app.use('/api', (req, res, next) => next(new HttpError(404, 'That endpoint does not exist.', 'NOT_FOUND')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.name === 'MulterError') {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'This file is larger than 5 MB. Compress it and try again.' : 'The upload could not be processed.';
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message, code: err.code });
    }
    if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ message: 'The request body is not valid JSON.', code: 'BAD_JSON' });
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, code: err.code });
    if (err.name === 'CastError' || err.name === 'ValidationError') return res.status(400).json({ message: 'Some of the submitted data is invalid.', code: 'BAD_INPUT' });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong on the server. Please try again.', code: 'SERVER_ERROR' });
  });

  return app;
}
