// Local end-to-end test: real Express app + real route code, with the database, Gemini and GitHub faked.
// Every response is also shape-checked against the frontend's own demo data (src/lib/demo.js).
import { mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';

Object.assign(process.env, {
  MONGODB_URI: 'mongodb://fake', JWT_SECRET: 'test-secret-test-secret-test-secret', GITHUB_CLIENT_ID: 'cid', GITHUB_CLIENT_SECRET: 'sec',
  GEMINI_API_KEY: 'k', ADMIN_GITHUB_USERNAMES: 'adminuser', GITHUB_DAILY_LIMIT: '2', GITHUB_MAX_REPOS: '5',
});

const { models } = await import('./fakeModels.js');
mock.module(new URL('../src/models/index.js', import.meta.url).href, { namedExports: models });

/* ---------- canned Gemini ---------- */
const prompts = [];
mock.module(new URL('../src/services/gemini.js', import.meta.url).href, {
  namedExports: {
    generateJson: async (prompt) => {
      prompts.push(prompt);
      if (prompt.includes('Task: analyze this resume')) return {
        scores: { resume: '91.4', ats: 120 },
        sections: [{ name: 'summary', score: 92 }, { name: 'Skills', score: 95 }, { name: 'Experience', score: 88 }],
        summary: { text: 'Platform engineer.', facts: [{ k: 'Target role', v: 'ML Platform' }] },
        skills: [{ category: 'Programming Languages', items: ['Python', 'Go'] }, { category: 'Tools & Platforms', items: ['Kubernetes', 'Kafka'] }, { category: 'Empty', items: [] }],
        experience: [{ title: 'Staff Engineer', org: 'Acme', text: 'Cut latency 41%.', tone: 'GREEN', tag: 'Verified impact' }, { title: 'Cost program', org: 'Acme', text: 'Reduced spend.', tone: 'amber', suggestion: 'Add the saving.' }],
        strengths: [{ title: 'Scale', text: 'Big numbers.' }],
        suggestions: [{ title: 'Add compliance line', priority: 'urgent', text: 'Mention SOC2.' }, { title: 'Quantify', priority: 'High', text: 'Add numbers.' }],
      };
      if (prompt.includes('Task: analyze this job posting')) return {
        summary: { headline: 'Core mandate', text: 'Own the ML platform.', metrics: [{ k: 'Stack', v: 'Python' }] },
        skills: [{ name: 'Python', importance: 'must' }, { name: 'Kubernetes', importance: 'must' }, { name: 'CUDA', importance: 'nice' }],
        responsibilities: [{ title: 'Orchestration', text: 'Schedule workloads.' }],
        experience: ['7+ years'], qualifications: ['BS in CS'],
        roadmap: [{ title: 'Terraform', priority: 'Critical', text: 'Learn IaC.', resource: 'HashiCorp', duration: '3 weeks' }],
      };
      if (prompt.includes('Task: analyze the public GitHub work')) return {
        profile: { headline: 'Distributed Systems Engineer', text: 'Builds serving systems.', domain: 'ML serving' },
        frameworks: ['FastAPI'], infra: ['Kubernetes'], automation: ['GitHub Actions'],
        repos: [
          { name: 'alpha', solves: 'Serves models.', tech: ['Python', 'FastAPI'], implementation: [{ label: 'Batching', text: 'Groups requests.' }], improvement: 'Add tests.', readme: 'Excellent', structure: 'Clean' },
          { name: 'beta', solves: 'Indexes vectors.', tech: ['Go'], implementation: [], improvement: 'Add CI.', readme: 'weird', structure: 'Okay' },
        ],
      };
      if (prompt.includes('Task: cross-verify')) return {
        synthesis: 'Python and Kubernetes are backed by code. TensorFlow is not.',
        table: [
          { skill: 'Python', claim: 'Core skill', evidence: 'In 2 repos', status: 'verified', details: 'alpha, beta' },
          { skill: 'Terraform', claim: 'IaC', evidence: 'README only', status: 'partial', details: 'alpha/README.md' },
          { skill: 'TensorFlow', claim: 'Training', evidence: 'None', status: 'unverified', details: '' },
          { skill: 'Rust', claim: 'Not on resume', evidence: '8% of code', status: 'missing', details: 'beta' },
          { skill: 'Weird', claim: 'x', evidence: 'y', status: 'bogus', details: 'z' },
        ],
        projects: [{ resume: { name: 'Inference Platform', desc: 'Serving.' }, repo: { name: 'alpha', desc: 'Serves models.' }, level: 'Strong', reason: 'Same purpose.' }, { resume: { name: 'Cost program', desc: 'Spot.' }, repo: null, level: 'None', reason: '' }],
        takeaways: [{ title: 'Back up TensorFlow', text: 'Publish a project.' }],
      };
      if (prompt.includes('Task: score how well this candidate fits')) return {
        categories: { skills: 90, tech: 80, exp: 100, projects: 60, edu: 70, soft: 'x' },
        summary: { text: 'Strong match.', strengths: ['Python', 'Kubernetes'], missing: ['CUDA'] },
        matched: [{ title: 'Serving', tone: 'green', resume: 'Led serving.', github: 'alpha' }, { title: 'CUDA', tone: 'red', resume: 'None', github: 'None' }],
        plan: [{ title: 'Learn Triton', detail: 'Do tutorials.', project: 'Project idea: profile.', timeline: '5 weeks' }],
        suggestions: [{ section: 'Summary', text: 'Lead with ML platform.' }],
      };
      if (prompt.includes('Task: quickly score')) {
        const hi = prompt.includes('Alpha Job');
        return { categories: { skills: hi ? 90 : 50, tech: hi ? 90 : 50, exp: hi ? 90 : 50, projects: 80, edu: 80, soft: 80 }, strength: 'Python depth', gap: 'CUDA' };
      }
      throw new Error('unexpected prompt');
    },
  },
});

/* ---------- fake GitHub ---------- */
const realFetch = globalThis.fetch;
const repo = (name, extra = {}) => ({ name, full_name: `octo/${name}`, description: `${name} repo`, stargazers_count: 5, pushed_at: new Date().toISOString(), fork: false, archived: false, ...extra });
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (!u.startsWith('https://api.github.com')) return realFetch(url, init);
  const path = u.replace('https://api.github.com', '');
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  const text = (b, s = 200) => new Response(b, { status: s });
  if (/^\/users\/ghost\//.test(path)) return json({ message: 'Not Found' }, 404);
  if (/^\/users\/[^/]+\/repos/.test(path)) return json([repo('alpha', { stargazers_count: 50 }), repo('beta'), repo('forky', { fork: true })]);
  if (/\/languages$/.test(path)) return json({ Python: 8000, Go: 2000 });
  if (/\/readme$/.test(path)) return text('# Project\n' + 'Detailed docs. '.repeat(60));
  if (/\/contents\/\.github\/workflows$/.test(path)) return path.includes('alpha') ? json([{ name: 'ci.yml' }]) : json({ message: 'Not Found' }, 404);
  if (/\/contents\/package\.json$/.test(path)) return text('{"dependencies":{"express":"^4"}}');
  if (/\/contents$/.test(path)) return json([{ name: 'src', type: 'dir' }, { name: 'tests', type: 'dir' }, { name: 'package.json', type: 'file' }, { name: 'README.md', type: 'file' }]);
  if (/\/commits/.test(path)) return json(Array.from({ length: 13 }, (_, i) => ({ sha: String(i) })));
  return json({ message: 'unmocked ' + path }, 500);
};

/* ---------- start the real app ---------- */
const { createApp } = await import('../src/app.js');
const server = createApp().listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
// If the frontend folder sits next to this one, every response is also checked against its demo.js data.
let demoRequest = async () => null;
try {
  ({ demoRequest } = await import(process.env.FRONTEND_DEMO || '../../insight-ai-frontend/src/lib/demo.js'));
} catch {
  console.log('(frontend folder not found next to the backend: contract shape checks are skipped)');
}

const mkUser = async (name, username, extra = {}) => {
  const u = await models.User.create({ githubId: username, githubUsername: username, name, ...extra });
  return { user: u, cookie: `insight_token=${jwt.sign({ sub: String(u._id) }, process.env.JWT_SECRET)}` };
};
const call = async (who, method, path, body, { form } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(who ? { Cookie: who.cookie } : {}), ...(body && !form ? { 'Content-Type': 'application/json' } : {}) },
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
};

/* ---------- shape check vs the frontend demo data ---------- */
const OPTIONAL = new Set(['suggestion']);
function template(list) {
  const out = {};
  for (const item of list) if (item && typeof item === 'object' && !Array.isArray(item)) for (const [k, v] of Object.entries(item)) if (!(k in out) || out[k] === null) out[k] = v;
  return out;
}
function diff(actual, expected, path = '$') {
  if (expected == null || actual == null) return [];
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${path}: expected array`];
    if (!expected.length) return [];
    const t = typeof expected[0] === 'object' ? template(expected) : expected[0];
    return actual.flatMap((a, i) => diff(a, t, `${path}[${i}]`));
  }
  if (typeof expected === 'object') {
    if (typeof actual !== 'object') return [`${path}: expected object`];
    return Object.keys(expected).flatMap((k) => (k in actual ? diff(actual[k], expected[k], `${path}.${k}`) : OPTIONAL.has(k) ? [] : [`${path}.${k}: missing`]));
  }
  return typeof actual === typeof expected ? [] : [`${path}: type ${typeof actual}, frontend expects ${typeof expected}`];
}
let checks = 0;
const same = async (label, actual, method, path, body) => {
  const expected = await demoRequest(method, path, body);
  const errs = diff(actual, expected);
  assert.deepEqual(errs, [], `${label} does not match the frontend contract:\n${errs.join('\n')}`);
  checks++;
  console.log(`  ok  ${label}`);
};
const ok = (cond, label) => { assert.ok(cond, label); console.log(`  ok  ${label}`); };

const pdfBuffer = () => new Promise((resolve) => {
  const d = new PDFDocument(); const c = [];
  d.on('data', (x) => c.push(x)); d.on('end', () => resolve(Buffer.concat(c)));
  d.fontSize(12).text('Jane Doe. Platform engineer with seven years of experience building ML infrastructure, Kubernetes clusters, Kafka pipelines, Python services and Go tooling. Led inference serving at Acme and cut p99 latency by 41 percent across regions.');
  d.end();
});

try {
  console.log('\nPublic and auth');
  ok((await call(null, 'GET', '/api/health')).data.ok, 'health endpoint works without a session');
  let r = await call(null, 'GET', '/api/me');
  ok(r.status === 401 && r.data.code === 'UNAUTHORIZED', 'GET /api/me without a cookie -> 401');
  r = await call(null, 'POST', '/api/github-repositories/analyze', { target: 'octocat' });
  ok(r.status === 401, '/api/github-repositories/analyze requires auth');
  r = await fetch(`${base}/auth/github?remember=1&scope=repo`, { redirect: 'manual' });
  const loc = new URL(r.headers.get('location'));
  ok(r.status === 302 && loc.host === 'github.com' && loc.searchParams.get('scope') === 'read:user repo' && loc.searchParams.get('state'), 'OAuth redirect has state + private scope when asked');
  ok(loc.searchParams.get('redirect_uri') === 'http://localhost:5173/auth/github/callback', 'OAuth callback points at the frontend origin (proxy)');
  r = await fetch(`${base}/auth/github/callback?code=x&state=bad`, { redirect: 'manual' });
  ok(r.headers.get('location') === '/login?error=state', 'callback rejects a bad state');

  const me = await mkUser('Elena Rostova', 'elena');
  const other = await mkUser('Other Person', 'otherperson');
  const admin = await mkUser('Admin User', 'adminuser', { role: 'admin' });

  r = await call(me, 'GET', '/api/me');
  await same('GET /api/me', r.data, 'GET', '/api/me');

  console.log('\nResumes');
  let fd = new FormData(); fd.append('file', new Blob(['hello'], { type: 'application/msword' }), 'cv.docx');
  r = await call(me, 'POST', '/api/resumes', fd, { form: true });
  ok(r.status === 400 && /Only PDF/.test(r.data.message), 'non-PDF upload rejected with a clear message');
  fd = new FormData(); fd.append('file', new Blob(['not really a pdf at all, just text'], { type: 'application/pdf' }), 'fake.pdf');
  r = await call(me, 'POST', '/api/resumes', fd, { form: true });
  ok(r.status === 400 && /not a valid PDF/.test(r.data.message), 'fake PDF (bad magic bytes) rejected');
  fd = new FormData(); fd.append('file', new Blob([Buffer.alloc(5.5 * 1024 * 1024, 1)], { type: 'application/pdf' }), 'big.pdf');
  r = await call(me, 'POST', '/api/resumes', fd, { form: true });
  ok(r.status === 413, 'file over 5 MB -> 413');
  const goodPdf = await pdfBuffer();
  fd = new FormData(); fd.append('file', new Blob([goodPdf], { type: 'application/pdf' }), 'ML-Engineer-v2.pdf'); fd.append('label', 'ML-Engineer-v2');
  r = await call(me, 'POST', '/api/resumes', fd, { form: true });
  ok(r.status === 201 && r.data.label === 'ML-Engineer-v2' && r.data.isDefault === true, 'PDF upload analyzed; first resume becomes default ' + r.status + JSON.stringify(r.data).slice(0,300));
  await same('POST /api/resumes', r.data, 'POST', '/api/resumes', new FormData());
  const r1 = r.data._id;
  ok(r.data.score === 91 && r.data.ats === 100, 'scores clamped/coerced from messy Gemini output (91.4 -> 91, 120 -> 100)');
  fd = new FormData(); fd.append('file', new Blob([goodPdf], { type: 'application/pdf' }), 'second.pdf');
  r = await call(me, 'POST', '/api/resumes', fd, { form: true });
  ok(r.data.isDefault === false && /^Resume v2/.test(r.data.label), 'second upload is a new non-default version with an auto label');
  const r2 = r.data._id;
  r = await call(me, 'GET', '/api/resumes');
  ok(r.data.length === 2, 'list returns both versions');
  await same('GET /api/resumes', r.data, 'GET', '/api/resumes');
  r = await call(me, 'GET', `/api/resumes/${r1}`);
  await same('GET /api/resumes/:id (full analysis)', r.data, 'GET', '/api/resumes/r1');
  ok(r.data.analysis.sections.length === 6 && r.data.analysis.sections[0].name === 'Summary', 'all six section ratings present even when Gemini omitted some');
  ok(r.data.analysis.experience[0].tone === 'green' && r.data.analysis.suggestions[0].priority === 'Medium', 'enums normalized (GREEN -> green, urgent -> Medium)');
  r = await call(other, 'GET', `/api/resumes/${r1}`);
  ok(r.status === 404, "another user cannot read this user's resume (ownership enforced)");
  r = await call(me, 'PATCH', `/api/resumes/${r2}`, { isDefault: true });
  ok(r.status === 200 && (await call(me, 'GET', '/api/resumes')).data.filter((x) => x.isDefault).length === 1, 'set default keeps exactly one default');
  r = await call(me, 'PATCH', `/api/resumes/${r2}`, { label: 'Renamed' });
  ok(r.data.label === 'Renamed', 'rename works');
  r = await call(me, 'POST', `/api/resumes/${r2}/rerun`);
  ok(r.status === 200, 'rerun works');
  r = await call(me, 'GET', `/api/resumes/${r1}/pdf`);
  ok(r.data.subarray(0, 5).toString() === '%PDF-', 'single-resume PDF download is a real PDF');

  console.log('\nJob descriptions');
  r = await call(me, 'POST', '/api/jobs', { title: '', rawText: 'x' });
  ok(r.status === 400, 'empty job title/description rejected');
  const jobBody = { title: 'Alpha Job', company: 'Helix', level: 'Senior', name: 'Alpha Job', rawText: 'We are looking for a Machine Learning Engineer with Python, Kubernetes and CUDA experience.' };
  r = await call(me, 'POST', '/api/jobs', jobBody);
  ok(r.status === 201 && r.data.analysis.skills.length === 3, 'job analyzed and saved');
  await same('POST /api/jobs', r.data, 'POST', '/api/jobs', { title: 'T' });
  const j1 = r.data._id;
  r = await call(me, 'POST', '/api/jobs', { ...jobBody, title: 'Beta Job', name: 'Beta Job', company: 'Corvid' });
  const j2 = r.data._id;
  r = await call(me, 'GET', '/api/jobs');
  await same('GET /api/jobs', r.data, 'GET', '/api/jobs');
  r = await call(me, 'GET', `/api/jobs/${j1}`);
  await same('GET /api/jobs/:id', r.data, 'GET', '/api/jobs/j1');
  r = await call(me, 'PATCH', `/api/jobs/${j2}`, { name: 'Beta renamed' });
  ok(r.data.name === 'Beta renamed', 'job rename works');
  r = await call(me, 'GET', `/api/jobs/${j1}/pdf`);
  ok(r.data.subarray(0, 5).toString() === '%PDF-', 'job PDF download works');

  console.log('\nGitHub analysis');
  r = await call(me, 'POST', '/api/github-repositories/analyze', { target: 'not a user!!' });
  ok(r.status === 400, 'invalid target rejected');
  r = await call(me, 'POST', '/api/github-repositories/analyze', { target: 'ghost' });
  ok(r.status === 404 && /not found/i.test(r.data.message), 'unknown GitHub user -> 404 (not 401)');
  ok((await call(me, 'GET', '/api/github-repositories/usage')).data.used === 0, 'failed analysis does not consume the daily limit');
  r = await call(me, 'POST', '/api/github-repositories/analyze', { target: 'octo' });
  ok(r.status === 200 && r.data.cached === false, 'analysis runs');
  await same('POST /api/github-repositories/analyze', r.data, 'POST', '/api/github-repositories/analyze', { target: 'x' });
  const g1 = r.data._id;
  ok(r.data.repos.length === 2 && r.data.repos.every((x) => x.name !== 'forky'), 'forks are skipped');
  ok(r.data.languages[0].name === 'Python' && r.data.languages.reduce((s, l) => s + l.pct, 0) === 100, 'language shares are measured server-side and sum to 100');
  const beta = r.data.repos.find((x) => x.name === 'beta');
  ok(beta.quality.find((q) => q.k === 'README quality').v === 'Good' && beta.quality.find((q) => q.k === 'CI/CD').v === 'Missing', 'quality scorecard combines AI rating + measured CI/tests');
  ok(r.data.profile.stats[0].v === '2.0 per week', 'commit cadence computed from 26 commits / 90 days (2 repos x 13)');
  r = await call(me, 'POST', '/api/github-repositories/analyze', { target: 'octo' });
  ok(r.data.cached === true && (await call(me, 'GET', '/api/github-repositories/usage')).data.used === 1, 'repeat within 60 seconds returns the saved result without using the limit');
  r = await call(me, 'GET', '/api/github-repositories');
  await same('GET /api/github-repositories', r.data, 'GET', '/api/github-repositories');
  r = await call(me, 'GET', `/api/github-repositories/${g1}`);
  ok(r.data.cached === true, 'saved analysis opens as cached');
  await same('GET /api/github-repositories/:id', r.data, 'GET', '/api/github-repositories/g1');
  await call(me, 'POST', '/api/github-repositories/analyze', { target: 'hubot' });
  r = await call(me, 'POST', '/api/github-repositories/analyze', { target: 'thirduser' });
  ok(r.status === 429 && /Daily limit/.test(r.data.message), '3rd fresh analysis today -> 429 with a clear message');
  r = await call(me, 'GET', '/api/github-repositories/usage');
  await same('GET usage', r.data, 'GET', '/api/github-repositories/usage');
  ok(r.data.used === 2 && r.data.limit === 2, 'usage counter correct');
  r = await call(me, 'GET', `/api/github-repositories/${g1}/pdf`);
  ok(r.data.subarray(0, 5).toString() === '%PDF-', 'GitHub PDF download works');

  console.log('\nComparison and match');
  r = await call(me, 'POST', '/api/comparisons', { resumeId: r1, githubAnalysisId: g1 });
  ok(r.status === 201, 'comparison created');
  await same('POST /api/comparisons', r.data, 'POST', '/api/comparisons');
  const cmpId = r.data._id;
  ok(r.data.synthesis.verified === 1 && r.data.synthesis.partial === 1 && r.data.synthesis.unverified === 2, 'counts computed from statuses (bogus status -> unverified)');
  ok(r.data.table.find((t) => t.skill === 'TensorFlow').details === 'Cannot be verified on GitHub', 'unverified rows always say "Cannot be verified on GitHub"');
  r = await call(me, 'GET', `/api/comparisons/${cmpId}/pdf`);
  ok(r.data.subarray(0, 5).toString() === '%PDF-', 'comparison PDF works');

  const weights = { skills: 50, tech: 10, exp: 10, projects: 10, edu: 10, soft: 10 };
  r = await call(me, 'POST', '/api/matches', { resumeId: r1, githubAnalysisId: g1, jobId: j1, weights });
  ok(r.status === 201, 'match created');
  await same('POST /api/matches', r.data, 'POST', '/api/matches', { weights });
  ok(r.data.overall === 81 && r.data.categories.find((c) => c.key === 'skills').weight === 50, 'overall = weighted average computed on the server (81; a garbage category score falls back to 50), weights respected');
  const matchId = r.data._id;
  ok((await call(me, 'GET', '/api/jobs')).data.find((j) => j._id === j1).match === 81, 'job list shows the latest match score');
  r = await call(me, 'POST', '/api/matches', { resumeId: r1, githubAnalysisId: g1, jobId: j1, weights: { skills: 'a' } });
  ok(r.status === 201 && r.data.categories.reduce((s, c) => s + c.weight, 0) === 100, 'invalid weights fall back to defaults totaling 100');
  r = await call(me, 'POST', '/api/matches/rank', { resumeId: r1, githubAnalysisId: g1, jobIds: [j1] });
  ok(r.status === 400, 'rank needs at least two jobs');
  r = await call(me, 'POST', '/api/matches/rank', { resumeId: r1, githubAnalysisId: g1, jobIds: [j1, j2] });
  await same('POST /api/matches/rank', r.data, 'POST', '/api/matches/rank');
  ok(r.data[0].job === 'Alpha Job' && r.data[0].rank === 1 && r.data[0].score > r.data[1].score, 'ranking sorted by score');
  r = await call(me, 'GET', `/api/matches/${matchId}/pdf`);
  ok(r.data.subarray(0, 5).toString() === '%PDF-', 'match PDF works');

  console.log('\nDashboard, notifications, search');
  r = await call(me, 'GET', '/api/dashboard');
  await same('GET /api/dashboard', r.data, 'GET', '/api/dashboard');
  ok(r.data.stats.matches === 2 && r.data.checklist.every((c) => c.done), 'dashboard counts + checklist reflect real data');
  const fresh = await mkUser('Brand New', 'brandnew');
  r = await call(fresh, 'GET', '/api/dashboard');
  await same('GET /api/dashboard (new user: no nulls that would crash the page)', r.data, 'GET', '/api/dashboard');
  ok(r.data.stats.resumes === 0 && r.data.github.languages.length === 0, 'new-user dashboard is safe');
  r = await call(me, 'GET', '/api/notifications');
  await same('GET /api/notifications', r.data, 'GET', '/api/notifications');
  ok(r.data.length >= 5 && r.data.every((n) => n.read === false), 'notifications were created by the analyses');
  await call(me, 'PATCH', '/api/notifications/read');
  ok((await call(me, 'GET', '/api/notifications')).data.every((n) => n.read), 'mark all as read works');
  r = await call(me, 'GET', '/api/search?q=alpha');
  await same('GET /api/search', r.data, 'GET', '/api/search?q=a');
  ok(r.data.some((x) => x.type === 'GitHub analyses' && x.title === 'alpha') && r.data.some((x) => x.type === 'Job descriptions'), 'search finds repos and jobs');
  ok((await call(other, 'GET', '/api/search?q=alpha')).data.length === 0, "search never returns other users' items");

  console.log('\nReports');
  r = await call(fresh, 'POST', '/api/reports', { sections: ['identity', 'resume'] });
  ok(r.status === 400 && /no data yet/.test(r.data.message), 'report with no data -> friendly 400');
  r = await call(me, 'POST', '/api/reports', { sections: ['identity', 'resume', 'github', 'comparison', 'match', 'annex'], resumeId: r1, githubAnalysisId: g1, jobId: j1 });
  ok(r.status === 201 && r.data.badge === 'Complete dossier' && r.data.pages >= 3, 'full report generated (multi-page) ' + r.status + JSON.stringify(r.data).slice(0,400));
  await same('POST /api/reports', r.data, 'POST', '/api/reports', { sections: ['a', 'b', 'c', 'd', 'e'] });
  const rep = r.data;
  const dl = await call(me, 'GET', `/api/reports/${rep._id}/download`);
  ok(dl.data.subarray(0, 5).toString() === '%PDF-' && /pdf/.test(dl.headers.get('content-type')), 'report downloads as application/pdf');
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdfDoc = await getDocumentProxy(new Uint8Array(dl.data));
  const parsed = { numpages: pdfDoc.numPages, text: (await extractText(pdfDoc, { mergePages: true })).text };
  ok(parsed.numpages === rep.pages && /Developer Profile Analysis/.test(parsed.text) && /Role compatibility/.test(parsed.text) && /Elena Rostova/.test(parsed.text), 'PDF text contains title, candidate name and sections; page count matches');
  ok(/Page 1 of /.test(parsed.text), 'PDF has page numbers');
  r = await call(me, 'POST', '/api/reports', { sections: ['identity', 'resume'] });
  ok(r.data.badge === 'Partial (2 sections)', 'partial badge text matches the frontend format');
  r = await call(me, 'GET', '/api/reports');
  await same('GET /api/reports', r.data, 'GET', '/api/reports');
  ok((await call(other, 'GET', `/api/reports/${rep._id}/download`)).status === 404, "other users cannot download this user's report");

  console.log('\nAdmin');
  ok((await call(me, 'GET', '/api/admin/stats')).status === 403, 'non-admin gets 403');
  r = await call(admin, 'GET', '/api/admin/stats');
  await same('GET /api/admin/stats', r.data, 'GET', '/api/admin/stats');
  r = await call(admin, 'GET', '/api/admin/users');
  await same('GET /api/admin/users', r.data, 'GET', '/api/admin/users');
  ok(r.data.find((u) => u.handle === 'elena').analyses > 5, 'admin user list counts analyses per user');
  r = await call(admin, 'GET', '/api/admin/analyses');
  await same('GET /api/admin/analyses', r.data, 'GET', '/api/admin/analyses');
  r = await call(admin, 'PATCH', '/api/admin/users/otherperson', { suspended: true });
  ok(r.status === 200, 'admin can suspend a user');
  ok((await call(other, 'GET', '/api/me')).status === 403, 'suspended user is blocked');
  ok((await call(admin, 'PATCH', '/api/admin/users/adminuser', { suspended: true })).status === 400, 'admin cannot suspend self');
  ok((await call(admin, 'DELETE', '/api/admin/users/otherperson')).status === 200 && models.AuditLog.store.length === 2, 'admin delete works and both admin actions are audit-logged');

  console.log('\nProfile and deletion');
  r = await call(me, 'PATCH', '/api/me', { name: 'Elena R.' });
  ok(r.data.name === 'Elena R.', 'profile rename works');
  r = await call(me, 'PATCH', '/api/me', { privateRepos: true });
  ok(r.status === 409, 'private repos cannot be flagged on without GitHub approval');
  r = await call(me, 'DELETE', `/api/resumes/${r2}`);
  ok(r.status === 200, 'delete resume');
  r = await call(me, 'DELETE', `/api/jobs/${j2}`);
  ok(r.status === 200, 'delete job');
  r = await call(me, 'DELETE', '/api/me/data');
  ok(r.status === 200 && models.Resume.store.filter((x) => String(x.userId) === String(me.user._id)).length === 0, 'Delete all my data removes everything');
  ok((await call(me, 'GET', '/api/me')).status === 200, '...but keeps the account');
  r = await call(me, 'DELETE', '/api/me');
  ok(r.status === 200 && (await call(me, 'GET', '/api/me')).status === 401, 'Delete account removes the user');
  r = await call(admin, 'GET', '/api/nope');
  ok(r.status === 404 && r.data.message, 'unknown API route -> JSON 404');
  r = await call(admin, 'GET', '/api/resumes/not-an-id');
  ok(r.status === 404, 'malformed id -> 404, not a crash');

  ok(prompts.every((p) => p.includes('<data>') && p.includes('untrusted')), 'every Gemini prompt wraps user content in <data> and warns about injection');
  console.log(`\nALL PASSED (${checks} frontend-contract shape checks)`);
} catch (e) {
  console.error('\nFAILED:', e.message);
  process.exitCode = 1;
} finally {
  server.close();
  process.exit(process.exitCode || 0);
}
