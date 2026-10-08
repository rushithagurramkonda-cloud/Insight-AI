import fs from 'fs';
import { Router } from 'express';
import { Comparison, GithubAnalysis, JobDescription, JobMatch, Report, Resume } from '../models/index.js';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { findOwned, isId, safeName } from '../utils/misc.js';
import { removeFile, saveFile } from '../services/cleanup.js';
import { buildReport } from '../services/pdfBuilder.js';
import { notify } from '../services/notify.js';
import { reportItem } from '../services/dto.js';

const router = Router();
const ALL = ['identity', 'resume', 'github', 'comparison', 'match', 'annex'];
const COMPLETE = ['identity', 'resume', 'github', 'comparison', 'match'];

router.get('/', asyncHandler(async (req, res) => {
  const list = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(list.map(reportItem));
}));

router.post('/', asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sections = ALL.filter((s) => Array.isArray(req.body?.sections) && req.body.sections.includes(s));
  if (!sections.includes('identity')) sections.unshift('identity');
  if (sections.length < 2) throw new HttpError(400, 'Choose at least one section besides the header.', 'BAD_INPUT');

  const pick = async (Model, id, fallbackSort = { createdAt: -1 }) => (isId(id) ? Model.findOne({ _id: id, userId }) : null) || Model.findOne({ userId }).sort(fallbackSort);
  const needs = (...s) => s.some((x) => sections.includes(x));

  let resume = null;
  if (needs('resume', 'annex')) {
    if (isId(req.body?.resumeId)) resume = await Resume.findOne({ _id: req.body.resumeId, userId });
    resume ||= (await Resume.findOne({ userId, isDefault: true })) || (await Resume.findOne({ userId }).sort({ createdAt: -1 }));
  }
  const github = needs('github') ? await pick(GithubAnalysis, req.body?.githubAnalysisId, { fetchedAt: -1 }) : null;
  const job = needs('match') ? await pick(JobDescription, req.body?.jobId) : null;
  let match = null;
  if (needs('match')) {
    if (job) match = await JobMatch.findOne({ userId, jobId: job._id }).sort({ createdAt: -1 });
    match ||= await JobMatch.findOne({ userId }).sort({ createdAt: -1 });
  }
  const comparison = needs('comparison') ? await Comparison.findOne({ userId }).sort({ createdAt: -1 }) : null;

  const missing = [
    needs('resume', 'annex') && !resume && 'Resume analysis (upload a resume first)',
    needs('github') && !github && 'GitHub analysis (analyze your GitHub first)',
    needs('comparison') && !comparison && 'Cross-verification (run a Comparison first)',
    needs('match') && !match && 'Role compatibility (run a Job Match first)',
  ].filter(Boolean);
  if (missing.length) throw new HttpError(400, `Your report includes sections that have no data yet: ${missing.join('; ')}.`, 'MISSING_DATA');

  const matchJob = match ? await JobDescription.findOne({ _id: match.jobId, userId }) : job;
  const { buffer, pages } = await buildReport({ user: req.user, sections, resume, github, comparison, match, job: matchJob });

  const report = new Report({
    userId, name: `${safeName(req.user.name)}_Developer_Profile_${new Date().toISOString().slice(0, 10)}.pdf`, pages, sizeBytes: buffer.length, sections,
    badge: COMPLETE.every((s) => sections.includes(s)) ? 'Complete dossier' : `Partial (${sections.length} sections)`,
  });
  report.filePath = await saveFile('reports', userId, `${report._id}.pdf`, buffer);
  await report.save();
  notify(userId, 'report', `Your report is ready: ${report.name}`, '/reports');
  res.status(201).json(reportItem(report));
}));

router.get('/:id/download', asyncHandler(async (req, res) => {
  const r = await findOwned(Report, req.params.id, req.user._id, 'Report');
  if (!r.filePath || !fs.existsSync(r.filePath)) throw new HttpError(404, 'The report file is missing. Generate it again.', 'NOT_FOUND');
  res.download(r.filePath, r.name);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const r = await findOwned(Report, req.params.id, req.user._id, 'Report');
  await removeFile(r.filePath);
  await r.deleteOne();
  res.json({ ok: true });
}));

export default router;
