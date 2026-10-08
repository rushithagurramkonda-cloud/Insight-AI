import { Router } from 'express';
import { JobDescription, JobMatch } from '../models/index.js';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { findOwned } from '../utils/misc.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { generateJson } from '../services/gemini.js';
import { jobPrompt } from '../services/prompts.js';
import { normalizeJob } from '../services/normalize.js';
import { notify, runPipeline } from '../services/notify.js';
import { jobItem } from '../services/dto.js';
import { buildSingle } from '../services/pdfBuilder.js';

const router = Router();
const LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Lead'];

const analyze = async (user, job) => {
  const raw = await runPipeline(user, 'job', `Job analysis for ${job.title}`, () => generateJson(jobPrompt(job)));
  return normalizeJob(raw);
};

router.get('/', asyncHandler(async (req, res) => {
  const list = await JobDescription.find({ userId: req.user._id }).select('-rawText -analysis').sort({ createdAt: -1 });
  res.json(list.map(jobItem));
}));

router.post('/', aiLimiter, asyncHandler(async (req, res) => {
  const title = String(req.body?.title || '').trim().slice(0, 120);
  const company = String(req.body?.company || '').trim().slice(0, 120);
  const rawText = String(req.body?.rawText || '').trim();
  const level = LEVELS.includes(req.body?.level) ? req.body.level : 'Senior';
  if (!title) throw new HttpError(400, 'Enter the job title.', 'BAD_INPUT');
  if (rawText.length < 40) throw new HttpError(400, 'Paste the full job description so the analysis is useful.', 'BAD_INPUT');
  if (rawText.length > 20000) throw new HttpError(400, 'The job description is too long (20,000 characters maximum).', 'BAD_INPUT');
  const name = String(req.body?.name || '').trim().slice(0, 120) || `${title}${company ? ` - ${company}` : ''}`;

  const analysis = await analyze(req.user, { title, company, level, rawText });
  const job = await JobDescription.create({ userId: req.user._id, name, title, company, level, rawText, analysis });
  notify(req.user._id, 'job', `Job description saved: ${name}`, '/job-description');
  res.status(201).json({ ...jobItem(job), analysis });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const j = await findOwned(JobDescription, req.params.id, req.user._id, 'Job description');
  res.json({ ...jobItem(j), analysis: j.analysis });
}));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const job = await findOwned(JobDescription, req.params.id, req.user._id, 'Job description');
  res.type('application/pdf').send(await buildSingle('job', { user: req.user, job }));
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const j = await findOwned(JobDescription, req.params.id, req.user._id, 'Job description');
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 120) throw new HttpError(400, 'Enter a name up to 120 characters.', 'BAD_INPUT');
  j.name = name;
  await j.save();
  res.json(jobItem(j));
}));

router.post('/:id/rerun', aiLimiter, asyncHandler(async (req, res) => {
  const j = await findOwned(JobDescription, req.params.id, req.user._id, 'Job description');
  j.analysis = await analyze(req.user, j);
  await j.save();
  res.json({ ...jobItem(j), analysis: j.analysis });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const j = await findOwned(JobDescription, req.params.id, req.user._id, 'Job description');
  await JobMatch.deleteMany({ jobId: j._id });
  await j.deleteOne();
  res.json({ ok: true });
}));

export default router;
