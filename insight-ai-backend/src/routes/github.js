import { Router } from 'express';
import { config } from '../config.js';
import { GithubAnalysis, UsageCounter, Comparison, JobMatch } from '../models/index.js';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { findOwned } from '../utils/misc.js';
import { dayKey } from '../utils/time.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { parseTarget } from '../services/githubApi.js';
import { analyzeGithub } from '../services/githubAnalyzer.js';
import { githubToken, notify, runPipeline } from '../services/notify.js';
import { githubDto, githubItem } from '../services/dto.js';
import { buildSingle } from '../services/pdfBuilder.js';

const router = Router();
const LIMIT = config.github.dailyLimit;

const usageOf = async (userId) => (await UsageCounter.findOne({ userId, day: dayKey() }))?.count || 0;

// Atomically reserves one analysis for today. Refunded if the analysis fails.
async function reserve(userId) {
  try {
    const doc = await UsageCounter.findOneAndUpdate(
      { userId, day: dayKey(), count: { $lt: LIMIT } },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    return doc;
  } catch (e) {
    if (e.code === 11000) return null; // upsert collided with an existing doc at the limit
    throw e;
  }
}
const refund = (userId) => UsageCounter.updateOne({ userId, day: dayKey(), count: { $gt: 0 } }, { $inc: { count: -1 } });

router.get('/usage', asyncHandler(async (req, res) => res.json({ used: await usageOf(req.user._id), limit: LIMIT })));

router.get('/', asyncHandler(async (req, res) => {
  const list = await GithubAnalysis.find({ userId: req.user._id }).sort({ fetchedAt: -1 }).limit(50);
  res.json(list.map(githubItem));
}));

router.post('/analyze', aiLimiter, asyncHandler(async (req, res) => {
  const parsed = parseTarget(req.body?.target);
  if (!parsed) throw new HttpError(400, 'Enter a GitHub username (like octocat) or a repository URL (like https://github.com/owner/repo).', 'BAD_INPUT');
  const includePrivate = !!req.body?.includePrivate;

  // Double-click protection: the same target analyzed in the last 60 seconds returns the saved result and costs nothing.
  const recent = await GithubAnalysis.findOne({
    userId: req.user._id, target: parsed.target, includePrivate, fetchedAt: { $gt: new Date(Date.now() - 60 * 1000) },
  });
  if (recent) return res.json(githubDto(recent, { cached: true }));

  const slot = await reserve(req.user._id);
  if (!slot) {
    notify(req.user._id, 'limit', `You have used all ${LIMIT} GitHub analyses for today. The limit resets at midnight.`, '/github-analysis');
    throw new HttpError(429, `Daily limit reached (${LIMIT} analyses per day). It resets at midnight.`, 'DAILY_LIMIT');
  }

  try {
    const token = githubToken(req.user);
    const data = await runPipeline(req.user, 'github', `GitHub scan of ${parsed.target}`, () => analyzeGithub({ parsed, user: req.user, token, includePrivate }));
    const doc = await GithubAnalysis.create({ userId: req.user._id, target: parsed.target, type: parsed.type, includePrivate, data, fetchedAt: new Date() });
    notify(req.user._id, 'github', `GitHub analysis finished for ${parsed.target}`, '/github-analysis');
    res.json(githubDto(doc, { cached: false }));
  } catch (err) {
    await refund(req.user._id).catch(() => {});
    notify(req.user._id, 'error', `GitHub analysis for ${parsed.target} failed: ${err.message}`, '/github-analysis');
    throw err;
  }
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(githubDto(await findOwned(GithubAnalysis, req.params.id, req.user._id, 'GitHub analysis'), { cached: true }));
}));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const github = await findOwned(GithubAnalysis, req.params.id, req.user._id, 'GitHub analysis');
  res.type('application/pdf').send(await buildSingle('github', { user: req.user, github }));
}));

router.post('/:id/rerun', (req, res, next) => next(new HttpError(400, 'Use Re-run analysis on the page, which starts a fresh analysis.', 'USE_ANALYZE')));

router.delete('/:id', asyncHandler(async (req, res) => {
  const g = await findOwned(GithubAnalysis, req.params.id, req.user._id, 'GitHub analysis');
  await Promise.all([Comparison.deleteMany({ githubAnalysisId: g._id }), JobMatch.deleteMany({ githubAnalysisId: g._id })]);
  await g.deleteOne();
  res.json({ ok: true });
}));

export default router;
