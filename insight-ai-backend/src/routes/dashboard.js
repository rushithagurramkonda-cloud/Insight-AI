import { Router } from 'express';
import { Comparison, GithubAnalysis, JobDescription, JobMatch, Report, Resume } from '../models/index.js';
import { asyncHandler } from '../utils/errors.js';
import { timeAgo } from '../utils/time.js';
import { toneForScore } from '../services/normalize.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const latest = (M, extra = '') => M.findOne({ userId }).sort({ createdAt: -1 }).select(extra);
  const [nResumes, nMatches, nJobs, nGithub, resume, gh, job, match, comparison, reports] = await Promise.all([
    Resume.countDocuments({ userId }),
    JobMatch.countDocuments({ userId }),
    JobDescription.countDocuments({ userId }),
    GithubAnalysis.countDocuments({ userId }),
    latest(Resume, '-extractedText'),
    latest(GithubAnalysis),
    latest(JobDescription, '-rawText'),
    latest(JobMatch),
    latest(Comparison),
    Report.find({ userId }).sort({ createdAt: -1 }).limit(1),
  ]);

  // ---- Latest suggestion ----
  const topSuggestion = resume?.analysis?.suggestions?.find((s) => s.priority === 'High') || resume?.analysis?.suggestions?.[0];
  const latestSuggestion = topSuggestion
    ? { text: topSuggestion.title, priority: topSuggestion.priority === 'High' ? 'High priority' : `${topSuggestion.priority} priority`, link: '/resume-analysis' }
    : { text: 'Upload your resume to get your first suggestion', priority: 'Getting started', link: '/resume-analysis' };

  // ---- Skill coverage vs the latest target role ----
  let coverage = [];
  if (match) {
    coverage = match.data.categories.map((c) => ({ name: c.name, covered: c.score, tone: toneForScore(c.score) }));
  } else if (job && resume) {
    const have = new Set([
      ...resume.analysis.skills.flatMap((g) => g.items),
      ...(gh ? [...gh.data.frameworks, ...gh.data.infra, ...gh.data.automation, ...gh.data.languages.map((l) => l.name)] : []),
    ].map((s) => s.toLowerCase()));
    coverage = job.analysis.skills.filter((s) => s.importance === 'must').slice(0, 6).map((s) => {
      const key = s.name.toLowerCase();
      const hit = [...have].some((h) => h === key || h.includes(key) || key.includes(h));
      return { name: s.name, covered: hit ? 90 : 20, tone: hit ? 'green' : 'red' };
    });
  }

  // ---- GitHub snapshot (always an object: the page reads github.username) ----
  const github = gh
    ? {
        username: gh.target, repos: gh.data.repos.length, topLanguage: gh.data.languages[0]?.name || '',
        summary: gh.data.profile.text || gh.data.profile.headline, languages: gh.data.languages,
      }
    : { username: req.user.githubUsername, repos: 0, topLanguage: '', summary: 'No GitHub analysis yet. Run one to see your languages and repository quality here.', languages: [] };

  // ---- Recent activity (newest first) ----
  const events = [
    resume && { at: resume.createdAt, text: `Resume ${resume.label} analyzed with a score of ${resume.score}`, link: '/resume-analysis' },
    gh && { at: gh.fetchedAt, text: `GitHub analysis finished for ${gh.target} (${gh.data.repos.length} repositories)`, link: '/github-analysis' },
    job && { at: job.createdAt, text: `Job description saved: ${job.name}`, link: '/job-description' },
    comparison && { at: comparison.createdAt, text: 'Resume and GitHub comparison completed', link: '/comparison' },
    match && { at: match.createdAt, text: `Job match completed: ${match.data.overall}% compatibility`, link: '/job-match' },
    reports[0] && { at: reports[0].createdAt, text: `Report generated: ${reports[0].name}`, link: '/reports' },
  ].filter(Boolean).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6).map((e) => ({ text: e.text, time: timeAgo(e.at), link: e.link }));

  // ---- Priority actions drawn from the latest analyses ----
  const priorityActions = [
    ...(resume?.analysis?.suggestions || []).filter((s) => s.priority === 'High').slice(0, 2).map((s) => ({ text: s.title, tag: 'Resume', link: '/resume-analysis' })),
    ...(comparison?.data?.takeaways || []).slice(0, 1).map((t) => ({ text: t.title, tag: 'GitHub', link: '/comparison' })),
    ...(match?.data?.plan || []).slice(0, 1).map((p) => ({ text: p.title, tag: 'Learning', link: '/job-match' })),
  ].slice(0, 4);

  res.json({
    stats: { resumes: nResumes, matches: nMatches, latest: latestSuggestion },
    checklist: [
      { id: 'resume', label: 'Upload your resume', desc: 'Add a PDF to start the analysis.', done: nResumes > 0, link: '/resume-analysis' },
      { id: 'github', label: 'Analyze your GitHub', desc: 'Scan repositories for real evidence.', done: nGithub > 0, link: '/github-analysis' },
      { id: 'job', label: 'Add a job description', desc: 'Paste the role you are targeting.', done: nJobs > 0, link: '/job-description' },
      { id: 'match', label: 'Run a job match', desc: 'See your compatibility score.', done: nMatches > 0, link: '/job-match' },
    ],
    coverage,
    github,
    activity: events,
    priorityActions,
  });
}));

export default router;
