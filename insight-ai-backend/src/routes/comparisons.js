import { Router } from 'express';
import { Comparison, GithubAnalysis, Resume } from '../models/index.js';
import { asyncHandler } from '../utils/errors.js';
import { findOwned } from '../utils/misc.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { generateJson } from '../services/gemini.js';
import { comparisonPrompt } from '../services/prompts.js';
import { normalizeComparison } from '../services/normalize.js';
import { notify, runPipeline } from '../services/notify.js';
import { comparisonDto } from '../services/dto.js';
import { buildSingle } from '../services/pdfBuilder.js';

const router = Router();

// Compact views keep the prompt small.
export const resumeBrief = (r) => ({
  skills: r.analysis.skills,
  experience: r.analysis.experience.map((e) => ({ title: e.title, org: e.org, text: e.text })),
  summary: r.analysis.summary.text,
});
export const githubBrief = (g) => ({
  target: g.target,
  headline: g.data.profile.headline,
  languages: g.data.languages,
  frameworks: g.data.frameworks,
  infra: g.data.infra,
  automation: g.data.automation,
  repos: g.data.repos.map((r) => ({ name: r.name, solves: r.solves, tech: r.tech, quality: r.quality.map((q) => `${q.k}: ${q.v}`) })),
});

router.post('/', aiLimiter, asyncHandler(async (req, res) => {
  const resume = await findOwned(Resume, req.body?.resumeId, req.user._id, 'Resume');
  const github = await findOwned(GithubAnalysis, req.body?.githubAnalysisId, req.user._id, 'GitHub analysis');
  const raw = await runPipeline(req.user, 'comparison', `Comparison of ${resume.label} and ${github.target}`, () =>
    generateJson(comparisonPrompt({ resume: resumeBrief(resume), github: githubBrief(github) })));
  const data = normalizeComparison(raw);
  const doc = await Comparison.create({ userId: req.user._id, resumeId: resume._id, githubAnalysisId: github._id, data });
  notify(req.user._id, 'comparison', `Comparison finished: ${resume.label} vs ${github.target}`, '/comparison');
  res.status(201).json(comparisonDto(doc));
}));

router.get('/', asyncHandler(async (req, res) => {
  const list = await Comparison.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json(list.map(comparisonDto));
}));

router.get('/:id', asyncHandler(async (req, res) => res.json(comparisonDto(await findOwned(Comparison, req.params.id, req.user._id, 'Comparison')))));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const comparison = await findOwned(Comparison, req.params.id, req.user._id, 'Comparison');
  res.type('application/pdf').send(await buildSingle('comparison', { user: req.user, comparison }));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const c = await findOwned(Comparison, req.params.id, req.user._id, 'Comparison');
  await c.deleteOne();
  res.json({ ok: true });
}));

export default router;
