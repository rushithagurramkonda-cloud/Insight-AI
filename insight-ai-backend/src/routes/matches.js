import { Router } from 'express';
import { GithubAnalysis, JobDescription, JobMatch, Resume } from '../models/index.js';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { findOwned, isId } from '../utils/misc.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { generateJson } from '../services/gemini.js';
import { matchLightPrompt, matchPrompt } from '../services/prompts.js';
import { normalizeMatch, normalizeWeights, scoreCategories, str } from '../services/normalize.js';
import { notify, runPipeline } from '../services/notify.js';
import { matchDto } from '../services/dto.js';
import { buildSingle } from '../services/pdfBuilder.js';
import { githubBrief, resumeBrief } from './comparisons.js';

const router = Router();
const jobBrief = (j) => ({ title: j.title, company: j.company, level: j.level, ...j.analysis });

router.post('/rank', aiLimiter, asyncHandler(async (req, res) => {
  const ids = [...new Set(Array.isArray(req.body?.jobIds) ? req.body.jobIds.map(String) : [])];
  if (ids.length < 2) throw new HttpError(400, 'Select at least two job descriptions to rank.', 'BAD_INPUT');
  if (ids.length > 5) throw new HttpError(400, 'You can rank up to 5 job descriptions at a time.', 'BAD_INPUT');
  if (!ids.every(isId)) throw new HttpError(404, 'One of the selected jobs was not found.', 'NOT_FOUND');

  const resume = await findOwned(Resume, req.body?.resumeId, req.user._id, 'Resume');
  const github = await findOwned(GithubAnalysis, req.body?.githubAnalysisId, req.user._id, 'GitHub analysis');
  const jobs = await JobDescription.find({ _id: { $in: ids }, userId: req.user._id });
  if (jobs.length !== ids.length) throw new HttpError(404, 'One of the selected jobs was not found.', 'NOT_FOUND');
  const weights = normalizeWeights(req.body?.weights);

  const scored = [];
  for (let i = 0; i < jobs.length; i += 2) {
    const batch = await Promise.all(jobs.slice(i, i + 2).map(async (job) => {
      const raw = await runPipeline(req.user, 'rank', `Ranking score for ${job.name}`, () =>
        generateJson(matchLightPrompt({ resume: resumeBrief(resume), github: githubBrief(github), job: jobBrief(job) })));
      const { overall } = scoreCategories(raw.categories, weights);
      return { job: job.name, company: job.company || 'Unknown', score: overall, strength: str(raw.strength, '-'), gap: str(raw.gap, '-') };
    }));
    scored.push(...batch);
  }
  scored.sort((a, b) => b.score - a.score);
  res.json(scored.map((s, i) => ({ rank: i + 1, ...s })));
}));

router.post('/', aiLimiter, asyncHandler(async (req, res) => {
  const resume = await findOwned(Resume, req.body?.resumeId, req.user._id, 'Resume');
  const github = await findOwned(GithubAnalysis, req.body?.githubAnalysisId, req.user._id, 'GitHub analysis');
  const job = await findOwned(JobDescription, req.body?.jobId, req.user._id, 'Job description');
  const weights = normalizeWeights(req.body?.weights);

  const raw = await runPipeline(req.user, 'match', `Job match for ${job.name}`, () =>
    generateJson(matchPrompt({ resume: resumeBrief(resume), github: githubBrief(github), job: jobBrief(job) })));
  const data = normalizeMatch(raw, weights);
  const doc = await JobMatch.create({ userId: req.user._id, resumeId: resume._id, githubAnalysisId: github._id, jobId: job._id, weights, overall: data.overall, data });
  job.match = data.overall;
  await job.save();
  notify(req.user._id, 'match', `Job match finished: ${job.name} (${data.overall}%)`, '/job-match');
  res.status(201).json(matchDto(doc));
}));

router.get('/', asyncHandler(async (req, res) => {
  const list = await JobMatch.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(list.map(matchDto));
}));

router.get('/:id', asyncHandler(async (req, res) => res.json(matchDto(await findOwned(JobMatch, req.params.id, req.user._id, 'Job match')))));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const match = await findOwned(JobMatch, req.params.id, req.user._id, 'Job match');
  const job = await JobDescription.findOne({ _id: match.jobId, userId: req.user._id });
  res.type('application/pdf').send(await buildSingle('match', { user: req.user, match, job }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const m = await findOwned(JobMatch, req.params.id, req.user._id, 'Job match');
  await m.deleteOne();
  res.json({ ok: true });
}));

export default router;
