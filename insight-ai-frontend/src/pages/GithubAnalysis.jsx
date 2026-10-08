import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { ClipboardCopy, Download, FolderGit2, GitBranch, Github, RefreshCw, ScanSearch, Star } from 'lucide-react';
import { api } from '../lib/api.js';
import { copyText, useFetch } from '../lib/hooks.js';
import { downloadAnalysisPdf } from '../lib/download.js';
import { useApp } from '../context/AppContext.jsx';
import {
  Badge, Bar, Button, Card, Chip, EmptyState, ErrorState, Expandable, PageHeader, PageLoader, ProgressSteps, ScoreRing, SectionTitle,
  Tip, Toggle, cx, toneBox, toneText,
} from '../components/ui.jsx';

const STEPS = ['Fetching profile and repositories', 'Reading README and file structure', 'Reading dependency files', 'Running AI analysis', 'Saving results'];
const COLORS = ['#00404E', '#0B7285', '#5B8DEF', '#A5B4FC', '#CBD5E1'];

export default function GithubAnalysis() {
  const { toast, user } = useApp();
  const usage = useFetch('/api/github-repositories/usage', { silent: true });
  const list = useFetch('/api/github-repositories', { silent: true });
  const latestId = list.data?.[0]?._id;
  const latest = useFetch(latestId ? `/api/github-repositories/${latestId}` : null, { skip: !latestId });

  const [target, setTarget] = useState(user?.githubUsername || '');
  const [priv, setPriv] = useState(!!user?.privateRepos);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  const used = usage.data?.used ?? 0;
  const limit = usage.data?.limit ?? 15;
  const atLimit = used >= limit;
  const data = result || latest.data;

  const validTarget = (v) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(v) || /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(v);

  const run = async (t = target) => {
    setError('');
    const value = t.trim();
    if (!validTarget(value)) {
      setError('Enter a GitHub username (like octocat) or a repository URL (like https://github.com/owner/repo).');
      return;
    }
    if (atLimit) return;
    setBusy(true);
    setStep(0);
    const timers = [1, 2, 3, 4].map((n) => setTimeout(() => setStep(n), n * 1100));
    try {
      const res = await api.post('/api/github-repositories/analyze', { target: value, includePrivate: priv });
      setResult(res);
      toast(res.cached ? 'Loaded the saved analysis.' : 'GitHub analysis finished.', 'success');
      usage.reload();
    } catch (e) {
      setError(e.message);
      toast(e.message, 'error');
    } finally {
      timers.forEach(clearTimeout);
      setBusy(false);
    }
  };

  const togglePrivate = (v) => {
    setPriv(v);
    if (v) toast('Private repositories need extra GitHub permission. Approve it from Profile, under Preferences.', 'info');
  };

  const copySummary = async () => {
    if (!data) return;
    const text = [`GitHub analysis: ${data.target}`, data.profile.headline, data.profile.text, '', ...data.repos.map((r) => `${r.name}: ${r.solves}`)].join('\n');
    toast((await copyText(text)) ? 'Summary copied.' : 'Could not copy. Select the text manually.', 'success');
  };

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await downloadAnalysisPdf({ path: `/api/github-repositories/${data._id}/pdf`, kind: 'github', title: `GitHub Analysis: ${data.target}`, filename: `github-analysis-${data.target}.pdf` });
    } catch (e) { toast(e.message, 'error'); } finally { setPdfBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GitHub Codebase & Profile Analysis"
        subtitle="Enter a username or repository URL to see what your code solves, how it is built and how well it is documented."
        actions={data && (
          <>
            <Button variant="secondary" size="sm" icon={ClipboardCopy} onClick={copySummary}>Copy summary</Button>
            <Button variant="secondary" size="sm" icon={Download} loading={pdfBusy} onClick={pdf}>Download PDF</Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => run(data.target)} disabled={busy || atLimit}>Re-run analysis</Button>
          </>
        )}
      />

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="gh-target">GitHub username or repository URL</label>
            <div className="relative">
              <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
              <input
                id="gh-target" className="input pl-9" value={target} placeholder="octocat or https://github.com/owner/repo"
                onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && run()}
                aria-invalid={!!error} aria-describedby={error ? 'gh-err' : undefined}
              />
            </div>
          </div>
          <Button onClick={() => run()} loading={busy} disabled={atLimit || !target.trim()} icon={ScanSearch}>Analyze Repository</Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs">
          <label className="flex items-center gap-2 text-ink-soft">
            <Toggle checked={priv} onChange={togglePrivate} label="Include private repositories" />
            Include private repositories
            <Tip text="Private access asks GitHub for the extra repo permission. Public repositories only need read access." />
          </label>
          <div className="flex min-w-[220px] items-center gap-3">
            <span className="text-ink-soft"><b className="text-ink">{used} / {limit}</b> analyses used today</span>
            <div className="w-24"><Bar value={(used / limit) * 100} tone={atLimit ? 'red' : used / limit > 0.7 ? 'amber' : 'brand'} /></div>
            <Tip text="You can run 15 GitHub analyses per day. The count resets at midnight. Saved results open instantly and do not count." />
          </div>
        </div>
        {atLimit && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">You have used all 15 analyses for today. The limit resets at midnight, and your saved results are still available.</p>}
        {error && <p id="gh-err" role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </Card>

      {busy && <ProgressSteps steps={STEPS} current={step} title="Analyzing GitHub" />}
      {busy && <p className="-mt-3 text-xs text-ink-mute">You can leave this page. We will notify you when it finishes.</p>}

      {!busy && (latest.loading || list.loading) && !data && <PageLoader label="Loading your latest analysis" />}
      {!busy && !data && !latest.loading && !list.loading && (
        <EmptyState icon={FolderGit2} title="No GitHub analysis yet" text="Enter your username above to see your languages, frameworks and repository quality." />
      )}
      {!busy && latest.error && !data && <ErrorState error={latest.error} onRetry={latest.reload} />}

      {data && !busy && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-mute">
            <Badge tone={data.cached ? 'slate' : 'green'}>{data.cached ? 'Saved result' : 'Fresh analysis'}</Badge>
            <span>{data.target} · updated {data.fetchedAt}</span>
          </div>

          {/* Technologies */}
          <section>
            <SectionTitle hint="Combined across every analyzed repository">Extracted technologies and infrastructure</SectionTitle>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs font-semibold text-ink-soft">Languages</p>
                <div className="mt-2 h-28">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.languages} dataKey="pct" nameKey="name" innerRadius={30} outerRadius={50} paddingAngle={2} stroke="none" animationDuration={900}>
                        {data.languages.map((l, i) => <Cell key={l.name} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RTooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ borderRadius: 10, border: '1px solid #E5E8F3', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-1 space-y-0.5 text-[11px] text-ink-soft">
                  {data.languages.slice(0, 3).map((l, i) => <li key={l.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />{l.name} {l.pct}%</li>)}
                </ul>
              </Card>
              {[['Frameworks and libraries', data.frameworks], ['Data and infrastructure', data.infra], ['Automation and CI/CD', data.automation]].map(([t, items]) => (
                <Card key={t} className="p-4">
                  <p className="text-xs font-semibold text-ink-soft">{t}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{items.map((i) => <Chip key={i}>{i}</Chip>)}</div>
                </Card>
              ))}
            </div>
          </section>

          {/* Profile summary */}
          <Card className="p-6">
            <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
              <div>
                <Badge tone="brand">Profile summary</Badge>
                <h2 className="mt-2 text-xl font-bold text-ink">{data.profile.headline}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{data.profile.text}</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {data.profile.stats.map((s) => (
                    <div key={s.k} className="rounded-lg bg-surface px-3 py-2.5"><dt className="text-[11px] text-ink-mute">{s.k}</dt><dd className="text-sm font-semibold text-ink">{s.v}</dd></div>
                  ))}
                </dl>
              </div>
              <div className="flex flex-col items-center gap-3">
                <ScoreRing value={data.quality} label="Profile quality" sub="Across all repositories" tone="green" />
                <div className="w-40 space-y-2">
                  {data.profile.breakdown.map((b) => (
                    <div key={b.k}><div className="mb-0.5 flex justify-between text-[11px] text-ink-soft"><span>{b.k}</span><span>{b.v}%</span></div><Bar value={b.v} tone="green" height="h-1.5" /></div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Repositories */}
          <section className="space-y-3">
            <SectionTitle hint={`${data.repos.length} repositories inspected`}>Inspected codebase telemetry</SectionTitle>
            {data.repos.map((r, idx) => (
              <Expandable
                key={r.name}
                defaultOpen={idx === 0}
                title={<span className="flex flex-wrap items-center gap-2">{r.name}<span className="flex items-center gap-1 text-xs font-normal text-ink-mute"><Star className="h-3 w-3" />{r.stars}</span></span>}
                icon={GitBranch}
                badge={<span className="hidden gap-1 sm:flex">{r.tags.slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}</span>}
              >
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">What the project solves</p>
                    <p className="mt-1 text-sm text-ink">{r.solves}</p>
                    <p className="mt-4 text-xs font-semibold text-ink-soft">Technologies used</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">{r.tech.map((t) => <Chip key={t} tone="brand">{t}</Chip>)}</div>
                    <p className="mt-4 text-xs font-semibold text-ink-soft">How it is implemented</p>
                    <ul className="mt-1.5 space-y-2">
                      {r.implementation.map((i) => (
                        <li key={i.label} className="text-sm text-ink-soft"><b className="text-ink">{i.label}.</b> {i.text}</li>
                      ))}
                    </ul>
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-500/10 p-3 text-sm text-ink"><b>Suggested improvement.</b> {r.improvement}</div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink-soft">Quality scorecard</p>
                    <ul className="space-y-2">
                      {r.quality.map((q) => (
                        <li key={q.k} className={cx('flex items-center justify-between rounded-lg border px-3 py-2 text-sm', toneBox[q.tone])}>
                          <span className="text-ink-soft">{q.k}</span>
                          <b className={toneText[q.tone]}>{q.v}</b>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Expandable>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
