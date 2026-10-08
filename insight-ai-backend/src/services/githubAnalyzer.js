import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';
import { clamp } from '../utils/misc.js';
import { generateJson } from './gemini.js';
import { githubPrompt } from './prompts.js';
import { gh } from './githubApi.js';
import { arr, oneOf, ratingTone, str, strs } from './normalize.js';

const MANIFESTS = ['package.json', 'requirements.txt', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'Gemfile', 'composer.json', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'];
const DAY = 86400000;

async function inspectRepo(r, token) {
  const base = `/repos/${r.full_name}`;
  const since = new Date(Date.now() - 90 * DAY).toISOString();
  const [langs, readme, root, workflows, commits] = await Promise.all([
    gh(`${base}/languages`, { token, allow404: true }),
    gh(`${base}/readme`, { token, raw: true, allow404: true }),
    gh(`${base}/contents`, { token, allow404: true }),
    gh(`${base}/contents/.github/workflows`, { token, allow404: true }),
    gh(`${base}/commits?since=${since}&per_page=100`, { token, allow404: true }),
  ]);

  const files = Array.isArray(root) ? root : [];
  const names = files.map((f) => f.name);
  const manifestFiles = files.filter((f) => f.type === 'file' && MANIFESTS.includes(f.name)).slice(0, 5);
  const manifests = {};
  await Promise.all(manifestFiles.map(async (f) => {
    const text = await gh(`${base}/contents/${encodeURIComponent(f.name)}`, { token, raw: true, allow404: true });
    if (text) manifests[f.name] = String(text).slice(0, 2500);
  }));

  return {
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    stars: r.stargazers_count || 0,
    pushedAt: r.pushed_at,
    languages: langs || {},
    readme: String(readme || '').slice(0, 5000),
    readmeLength: String(readme || '').length,
    rootFiles: names.slice(0, 60),
    manifests,
    hasTests: names.some((n) => /^(tests?|__tests__|spec|e2e)$/i.test(n) || /(\.test\.|_test\.|\.spec\.|^test_)/i.test(n)),
    hasCI: Array.isArray(workflows) && workflows.length > 0,
    commits90d: Array.isArray(commits) ? commits.length : 0,
  };
}

function pickRepos(all, max) {
  const now = Date.now();
  return all
    .filter((r) => !r.fork && !r.archived && !r.disabled)
    .map((r) => ({ r, score: (r.stargazers_count || 0) * 2 + (now - new Date(r.pushed_at).getTime() < 180 * DAY ? 10 : 0) + (r.description ? 2 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.r);
}

const qualityScore = (q) =>
  ({ Excellent: 35, Good: 28, 'Needs work': 14, Missing: 0 }[q.readme] ?? 14) +
  ({ Clean: 25, Okay: 15, Messy: 5 }[q.structure] ?? 15) + (q.hasTests ? 20 : 0) + (q.hasCI ? 20 : 0);

// Returns the analysis payload stored in GithubAnalysis.data (same shape the frontend reads).
export async function analyzeGithub({ parsed, user, token, includePrivate }) {
  const max = config.github.maxRepos;
  let repos;

  if (parsed.type === 'repo') {
    repos = [await gh(`/repos/${parsed.owner}/${parsed.repo}`, { token })];
  } else {
    const own = includePrivate && token && user.githubUsername.toLowerCase() === parsed.owner.toLowerCase() && /\brepo\b/.test(user.tokenScope || '');
    const list = own
      ? await gh('/user/repos?per_page=100&sort=pushed&affiliation=owner&visibility=all', { token })
      : await gh(`/users/${encodeURIComponent(parsed.owner)}/repos?per_page=100&sort=pushed&type=owner`, { token });
    repos = pickRepos(arr(list), max);
    if (!repos.length) throw new HttpError(404, 'No public original repositories were found for this user.', 'NO_REPOS');
  }

  // Inspect in small batches to stay gentle with GitHub's rate limits.
  const inspected = [];
  for (let i = 0; i < repos.length; i += 2) {
    inspected.push(...(await Promise.all(repos.slice(i, i + 2).map((r) => inspectRepo(r, token)))));
  }

  const ai = await generateJson(githubPrompt({
    target: parsed.target,
    repos: inspected.map((r) => ({
      name: r.name, description: r.description, stars: r.stars, languages: Object.keys(r.languages).slice(0, 6),
      readmeExcerpt: r.readme.slice(0, 2500), rootFiles: r.rootFiles, manifests: r.manifests, hasTests: r.hasTests, hasCI: r.hasCI,
    })),
  }));

  // ---- Server-measured facts (never trusted to the model) ----
  const bytes = {};
  inspected.forEach((r) => Object.entries(r.languages).forEach(([l, b]) => { bytes[l] = (bytes[l] || 0) + b; }));
  const totalBytes = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
  const languages = sorted.slice(0, 4).map(([name, b]) => ({ name, pct: Math.round((b / totalBytes) * 100) }));
  const rest = 100 - languages.reduce((s, l) => s + l.pct, 0);
  if (sorted.length > 4 && rest > 0) languages.push({ name: 'Other', pct: rest });

  const commits = inspected.reduce((s, r) => s + r.commits90d, 0);
  const perWeek = (commits / (90 / 7)).toFixed(1);
  const docCoverage = Math.round((inspected.filter((r) => r.readmeLength > 500).length / inspected.length) * 100);
  const maintenance = Math.round((inspected.filter((r) => Date.now() - new Date(r.pushedAt).getTime() < 90 * DAY).length / inspected.length) * 100);

  const aiRepos = arr(ai.repos);
  const outRepos = inspected.map((r) => {
    const a = aiRepos.find((x) => str(x?.name).toLowerCase() === r.name.toLowerCase()) || {};
    const readme = r.readmeLength === 0 ? 'Missing' : r.readmeLength < 200 ? 'Needs work' : oneOf(str(a.readme), ['Excellent', 'Good', 'Needs work'], 'Good');
    const structure = oneOf(str(a.structure), ['Clean', 'Okay', 'Messy'], 'Okay');
    const q = { readme, structure, hasTests: r.hasTests, hasCI: r.hasCI };
    const tags = Object.entries(r.languages).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([l]) => l);
    return {
      repo: {
        name: r.name,
        stars: r.stars,
        tags,
        solves: str(a.solves, r.description || 'No description available.'),
        tech: strs(a.tech, 10).length ? strs(a.tech, 10) : tags,
        implementation: arr(a.implementation).slice(0, 4).map((i) => ({ label: str(i?.label, 'Overview'), text: str(i?.text) })).filter((i) => i.text),
        improvement: str(a.improvement, 'Add more documentation and tests.'),
        quality: [
          { k: 'README quality', v: readme, tone: ratingTone[readme] },
          { k: 'Tests', v: r.hasTests ? 'Present' : 'Not found', tone: r.hasTests ? 'green' : 'red' },
          { k: 'Structure', v: structure, tone: ratingTone[structure] },
          { k: 'CI/CD', v: r.hasCI ? 'Present' : 'Missing', tone: r.hasCI ? 'green' : 'red' },
        ],
      },
      score: qualityScore(q),
    };
  });

  const quality = clamp(outRepos.reduce((s, x) => s + x.score, 0) / outRepos.length);
  return {
    quality,
    languages,
    frameworks: strs(ai.frameworks, 12),
    infra: strs(ai.infra, 12),
    automation: strs(ai.automation, 12),
    profile: {
      headline: str(ai.profile?.headline, 'Software Engineer'),
      text: str(ai.profile?.text),
      stats: [
        { k: 'Commit cadence', v: `${perWeek} per week` },
        { k: 'Doc coverage', v: `${docCoverage}% of repos` },
        { k: 'Dominant domain', v: str(ai.profile?.domain, 'General software') },
      ],
      breakdown: [{ k: 'Maintenance', v: maintenance }, { k: 'Documentation', v: docCoverage }],
    },
    repos: outRepos.map((x) => x.repo),
  };
}
