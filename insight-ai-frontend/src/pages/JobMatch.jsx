import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { ClipboardCopy, Download, FileText, ListOrdered, RotateCcw, Sliders, Target, TrendingUp } from 'lucide-react';
import { api } from '../lib/api.js';
import { copyText, useFetch } from '../lib/hooks.js';
import { downloadAnalysisPdf } from '../lib/download.js';
import { demoMatchWeights } from '../lib/demo.js';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, Checkbox, EmptyState, PageHeader, PageLoader, ScoreRing, SectionTitle, Tip, cx, scoreTone, toneBox, toneText } from '../components/ui.jsx';

const DEFAULTS = Object.fromEntries(demoMatchWeights.map((w) => [w.key, w.weight]));
const LABELS = Object.fromEntries(demoMatchWeights.map((w) => [w.key, w.name]));

function rebalance(weights, key, value) {
  const others = Object.keys(weights).filter((k) => k !== key);
  const restTotal = others.reduce((s, k) => s + weights[k], 0);
  const remain = 100 - value;
  const next = { [key]: value };
  others.forEach((k) => {
    next[k] = restTotal ? (weights[k] / restTotal) * remain : remain / others.length;
  });
  const rounded = Object.fromEntries(Object.entries(next).map(([k, v]) => [k, Math.round(v)]));
  const diff = 100 - Object.values(rounded).reduce((a, b) => a + b, 0);
  rounded[others[0]] += diff;
  return rounded;
}

export default function JobMatch() {
  const { toast } = useApp();
  const resumes = useFetch('/api/resumes');
  const gh = useFetch('/api/github-repositories');
  const jobs = useFetch('/api/jobs');

  const [resumeId, setResumeId] = useState('');
  const [ghId, setGhId] = useState('');
  const [jobId, setJobId] = useState('');
  const [weights, setWeights] = useState(DEFAULTS);
  const [ranWeights, setRanWeights] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [rankMode, setRankMode] = useState(false);
  const [picked, setPicked] = useState({});
  const [ranked, setRanked] = useState(null);
  const [rankBusy, setRankBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => { if (resumes.data?.length && !resumeId) setResumeId((resumes.data.find((r) => r.isDefault) || resumes.data[0])._id); }, [resumes.data, resumeId]);
  useEffect(() => { if (gh.data?.length && !ghId) setGhId(gh.data[0]._id); }, [gh.data, ghId]);
  useEffect(() => { if (jobs.data?.length && !jobId) setJobId(jobs.data[0]._id); }, [jobs.data, jobId]);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const ready = resumeId && ghId && jobId;
  const missing = [!resumeId && 'a resume', !ghId && 'a GitHub analysis', !jobId && 'a job description'].filter(Boolean);
  const stale = result && ranWeights && JSON.stringify(ranWeights) !== JSON.stringify(weights);

  const run = async () => {
    setBusy(true);
    try {
      const res = await api.post('/api/matches', { resumeId, githubAnalysisId: ghId, jobId, weights });
      setResult(res);
      setRanWeights(weights);
      toast('Job match finished.', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const runRank = async () => {
    const ids = Object.keys(picked).filter((k) => picked[k]);
    if (ids.length < 2) return toast('Select at least two job descriptions to rank.', 'error');
    setRankBusy(true);
    try {
      setRanked(await api.post('/api/matches/rank', { resumeId, githubAnalysisId: ghId, jobIds: ids, weights }));
      toast('Ranking ready.', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setRankBusy(false); }
  };

  const radarData = useMemo(() => result?.categories.map((c) => ({ name: c.name, score: c.score })) || [], [result]);

  const copyAll = async () => {
    const text = [`Job match: ${result.overall}%`, result.summary.text, '', 'Strengths', ...result.summary.strengths.map((s) => `- ${s}`), '', 'Missing', ...result.summary.missing.map((s) => `- ${s}`)].join('\n');
    toast((await copyText(text)) ? 'Copied to clipboard.' : 'Could not copy. Select the text manually.', 'success');
  };
  const pdf = async () => {
    setPdfBusy(true);
    try { await downloadAnalysisPdf({ path: `/api/matches/${result._id || 'latest'}/pdf`, kind: 'match', extra: result.overall, title: 'Job Match Analysis', filename: 'job-match.pdf' }); }
    catch (e) { toast(e.message, 'error'); } finally { setPdfBusy(false); }
  };

  const loading = resumes.loading || gh.loading || jobs.loading;
  const noData = !loading && (!resumes.data?.length || !gh.data?.length || !jobs.data?.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Source Job Match & Compatibility Analysis"
        subtitle="Combine your resume, your GitHub and a target job to see how well you fit and what to work on."
        actions={result && (
          <>
            <Button variant="secondary" size="sm" icon={ClipboardCopy} onClick={copyAll}>Copy</Button>
            <Button variant="secondary" size="sm" icon={Download} loading={pdfBusy} onClick={pdf}>Download PDF</Button>
          </>
        )}
      />

      {loading ? <PageLoader /> : noData ? (
        <EmptyState icon={Target} title="Job Match needs all three inputs" text="Upload a resume, analyze your GitHub and save a job description first."
          action={<div className="flex flex-wrap justify-center gap-2"><Link to="/resume-analysis"><Button variant="secondary">Resume</Button></Link><Link to="/github-analysis"><Button variant="secondary">GitHub</Button></Link><Link to="/job-description"><Button>Job description</Button></Link></div>} />
      ) : (
        <>
          <Card className="p-5">
            <h2 className="mb-3 text-base font-semibold text-ink">Three-way calibration</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div><label className="label" htmlFor="m-r">Resume</label><select id="m-r" className="input" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>{resumes.data.map((r) => <option key={r._id} value={r._id}>{r.label}</option>)}</select></div>
              <div><label className="label" htmlFor="m-g">GitHub analysis</label><select id="m-g" className="input" value={ghId} onChange={(e) => setGhId(e.target.value)}>{gh.data.map((g) => <option key={g._id} value={g._id}>{g.target}</option>)}</select></div>
              <div><label className="label" htmlFor="m-j">Job description</label><select id="m-j" className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>{jobs.data.map((j) => <option key={j._id} value={j._id}>{j.name}</option>)}</select></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-mute">{ready ? 'All three inputs selected.' : `Select ${missing.join(', ')} to continue.`}</p>
              <Button onClick={run} loading={busy} disabled={!ready} icon={TrendingUp}>Run Job Match</Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink"><Sliders className="h-4 w-4 text-brand" /> Adjustable scoring weights <Tip text="Weights decide how much each category counts in the overall score. They always add up to 100%." /></h2>
                <p className="text-xs text-ink-mute">Move a slider and the others adjust to keep the total at 100%.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={total === 100 ? 'green' : 'red'}>Total {total}%</Badge>
                <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setWeights(DEFAULTS)}>Reset to default</Button>
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(weights).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-xs"><label htmlFor={`w-${k}`} className="text-ink-soft">{LABELS[k]}</label><b className="text-ink">{weights[k]}%</b></div>
                  <input id={`w-${k}`} type="range" min={0} max={90} value={weights[k]} onChange={(e) => setWeights((w) => rebalance(w, k, Number(e.target.value)))} className="w-full accent-[#00404E]" />
                </div>
              ))}
            </div>
            {stale && <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Weights changed since the last run. Run the match again to update the score.</p>}
          </Card>

          {busy && <PageLoader label="Calculating compatibility" />}

          {!busy && result && (
            <>
              <div className="grid gap-6 lg:grid-cols-5">
                <Card className="p-5 lg:col-span-3">
                  <SectionTitle hint="Each axis is one scoring category from 0 to 100">Six-dimension compatibility radar</SectionTitle>
                  <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                    <div className="h-80">
                      <ResponsiveContainer>
                        <RadarChart data={radarData} outerRadius="72%">
                          <PolarGrid stroke="#D8DDEE" />
                          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} />
                          <Radar dataKey="score" stroke="#00404E" strokeWidth={2} fill="#00404E" fillOpacity={0.25} animationDuration={1100} />
                          <RTooltip formatter={(v) => [`${v} / 100`, 'Score']} contentStyle={{ borderRadius: 10, border: '1px solid #E5E8F3', fontSize: 12 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <ScoreRing value={result.overall} size={120} label="Overall match" tone={scoreTone(result.overall)} suffix="%" />
                  </div>
                  <ul className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                    {result.categories.map((c) => <li key={c.key} className="flex justify-between border-b border-line/70 py-1"><span className="text-ink-soft">{c.name} <span className="text-ink-mute">({c.weight}%)</span></span><b className="text-ink">{c.score}</b></li>)}
                  </ul>
                </Card>

                <Card className="p-5 lg:col-span-2">
                  <Badge tone="brand">Role compatibility summary</Badge>
                  <p className="mt-3 text-sm leading-6 text-ink-soft">{result.summary.text}</p>
                  <p className="mb-1.5 mt-4 text-xs font-semibold text-emerald-700">Strengths</p>
                  <ul className="space-y-1.5">{result.summary.strengths.map((s) => <li key={s} className={cx('rounded-lg border px-3 py-2 text-sm text-ink', toneBox.green)}>{s}</li>)}</ul>
                  <p className="mb-1.5 mt-4 text-xs font-semibold text-red-700">Missing skills</p>
                  <ul className="space-y-1.5">{result.summary.missing.map((s) => <li key={s} className={cx('rounded-lg border px-3 py-2 text-sm text-ink', toneBox.red)}>{s}</li>)}</ul>
                </Card>
              </div>

              <section>
                <SectionTitle hint="What matches and what does not, with the evidence from each source">Detailed competency triangulation</SectionTitle>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.matched.map((m) => (
                    <div key={m.title} className={cx('rounded-xl border p-4', toneBox[m.tone])}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{m.title}</p>
                        <Badge tone={m.tone}>{{ green: 'Matches', amber: 'Partial', red: 'Does not match' }[m.tone]}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-ink-soft"><b className="text-ink">Resume:</b> {m.resume}</p>
                      <p className="mt-1 text-xs text-ink-soft"><b className="text-ink">GitHub:</b> {m.github}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section>
                  <SectionTitle hint="Ordered by impact on your score">Tailored preparation and skill-gap plan</SectionTitle>
                  <ol className="space-y-3">
                    {result.plan.map((p, i) => (
                      <li key={p.title}><Card className="p-4">
                        <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-ink">{i + 1}. {p.title}</p><Badge tone="slate">{p.timeline}</Badge></div>
                        <p className="mt-1 text-sm text-ink-soft">{p.detail}</p>
                        <p className="mt-2 text-xs text-brand">{p.project}</p>
                      </Card></li>
                    ))}
                  </ol>
                </section>
                <section>
                  <SectionTitle hint="Specific edits for this job, not rewritten text">Targeted resume suggestions</SectionTitle>
                  <ul className="space-y-3">
                    {result.suggestions.map((s) => (
                      <li key={s.section}><Card className="flex gap-3 p-4"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand" /><div><p className="text-sm font-semibold text-ink">{s.section}</p><p className="mt-1 text-sm text-ink-soft">{s.text}</p></div></Card></li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}

          {/* Ranking */}
          <section>
            <SectionTitle hint="Compare your fit across several saved jobs"
              right={<Button variant={rankMode ? 'secondary' : 'primary'} size="sm" icon={ListOrdered} onClick={() => setRankMode((m) => !m)}>{rankMode ? 'Hide ranking' : 'Rank multiple jobs'}</Button>}>
              Ranked target job specifications
            </SectionTitle>
            {rankMode && (
              <Card className="p-5">
                <p className="mb-3 text-sm text-ink-soft">Select two or more saved job descriptions. Your selected resume and GitHub analysis are used for each one.</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {jobs.data.map((j) => (
                    <li key={j._id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 hover:bg-surface">
                        <Checkbox checked={!!picked[j._id]} onChange={(v) => setPicked((p) => ({ ...p, [j._id]: v }))} label={j.name} />
                        <span className="min-w-0 text-sm"><span className="block truncate font-medium text-ink">{j.name}</span><span className="text-xs text-ink-mute">{j.company}</span></span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-4"><Button onClick={runRank} loading={rankBusy} icon={ListOrdered}>Rank selected jobs</Button></div>

                {ranked && (
                  <div className="scroll-thin mt-5 overflow-x-auto rounded-xl border border-line">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="bg-surface text-xs text-ink-mute"><tr><th className="px-4 py-3 font-medium">Rank</th><th className="px-4 py-3 font-medium">Job</th><th className="px-4 py-3 font-medium">Compatibility</th><th className="px-4 py-3 font-medium">Top strength</th><th className="px-4 py-3 font-medium">Top gap</th></tr></thead>
                      <tbody>
                        {ranked.map((r) => (
                          <tr key={r.job} className="border-t border-line">
                            <td className="px-4 py-3 font-bold text-brand">#{r.rank}</td>
                            <td className="px-4 py-3"><span className="block font-semibold text-ink">{r.job}</span><span className="text-xs text-ink-mute">{r.company}</span></td>
                            <td className="px-4 py-3"><Badge tone={scoreTone(r.score)}>{r.score}%</Badge></td>
                            <td className="px-4 py-3 text-ink-soft">{r.strength}</td>
                            <td className={cx('px-4 py-3', toneText.red)}>{r.gap}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
