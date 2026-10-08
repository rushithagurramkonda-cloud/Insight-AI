import { Router } from 'express';
import { GithubAnalysis, JobDescription, JobMatch, Report, Resume } from '../models/index.js';
import { asyncHandler } from '../utils/errors.js';
import { escapeRegex } from '../utils/misc.js';

const router = Router();

// Searches only the signed-in user's own saved items.
router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (!q) return res.json([]);
  const rx = new RegExp(escapeRegex(q), 'i');
  const userId = req.user._id;
  const [resumes, gh, jobs, reports] = await Promise.all([
    Resume.find({ userId, $or: [{ label: rx }, { fileName: rx }] }).select('label').limit(4),
    GithubAnalysis.find({ userId, $or: [{ target: rx }, { 'data.repos.name': rx }] }).select('target data.repos.name').limit(4),
    JobDescription.find({ userId, $or: [{ name: rx }, { title: rx }, { company: rx }] }).select('name match').limit(4),
    Report.find({ userId, name: rx }).select('name').limit(4),
  ]);
  const jobIds = jobs.map((j) => j._id);
  const matches = jobIds.length ? await JobMatch.find({ userId, jobId: { $in: jobIds } }).select('overall jobId').limit(4) : [];

  const out = [
    ...resumes.map((r) => ({ type: 'Resumes', title: r.label, link: '/resume-analysis' })),
    ...gh.flatMap((g) => [
      { type: 'GitHub analyses', title: g.target, link: '/github-analysis' },
      ...(g.data?.repos || []).filter((r) => rx.test(r.name)).slice(0, 2).map((r) => ({ type: 'GitHub analyses', title: r.name, link: '/github-analysis' })),
    ]),
    ...jobs.map((j) => ({ type: 'Job descriptions', title: j.name, link: '/job-description' })),
    ...matches.map((m) => ({ type: 'Job matches', title: `${jobs.find((j) => String(j._id) === String(m.jobId))?.name} (${m.overall}%)`, link: '/job-match' })),
    ...reports.map((r) => ({ type: 'Reports', title: r.name, link: '/reports' })),
  ];
  const seen = new Set();
  res.json(out.filter((o) => !seen.has(o.type + o.title) && seen.add(o.type + o.title)).slice(0, 8));
}));

export default router;
