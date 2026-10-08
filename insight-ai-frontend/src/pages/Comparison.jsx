import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ClipboardCopy, Download, GitCompare, Lightbulb, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';
import { copyText, useFetch } from '../lib/hooks.js';
import { downloadAnalysisPdf } from '../lib/download.js';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PageLoader, SectionTitle, Tip, cx, toneBox, toneText } from '../components/ui.jsx';

const STATUS = {
  verified: { label: 'Verified', tone: 'green' },
  partial: { label: 'Partially supported', tone: 'amber' },
  missing: { label: 'Missing from resume', tone: 'red' },
  unverified: { label: "Can't be verified on GitHub", tone: 'slate' },
};
const LEVEL = { Strong: 'green', Partial: 'amber', None: 'slate' };

export default function Comparison() {
  const { toast } = useApp();
  const resumes = useFetch('/api/resumes');
  const gh = useFetch('/api/github-repositories');
  const [resumeId, setResumeId] = useState('');
  const [ghId, setGhId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState({});
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (resumes.data?.length && !resumeId) setResumeId((resumes.data.find((r) => r.isDefault) || resumes.data[0])._id);
  }, [resumes.data, resumeId]);
  useEffect(() => {
    if (gh.data?.length && !ghId) setGhId(gh.data[0]._id);
  }, [gh.data, ghId]);

  const ready = resumeId && ghId;
  const run = async () => {
    setBusy(true);
    try {
      setResult(await api.post('/api/comparisons', { resumeId, githubAnalysisId: ghId }));
      toast('Comparison finished.', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const copyAll = async () => {
    const text = [result.synthesis.text, '', ...result.table.map((t) => `${t.skill}: ${STATUS[t.status].label}. ${t.evidence}`)].join('\n');
    toast((await copyText(text)) ? 'Copied to clipboard.' : 'Could not copy. Select the text manually.', 'success');
  };
  const pdf = async () => {
    setPdfBusy(true);
    try { await downloadAnalysisPdf({ path: `/api/comparisons/${result._id || 'latest'}/pdf`, kind: 'comparison', title: 'Resume to GitHub Comparison', filename: 'comparison.pdf' }); }
    catch (e) { toast(e.message, 'error'); } finally { setPdfBusy(false); }
  };

  const loading = resumes.loading || gh.loading;
  const missingInputs = !loading && (!resumes.data?.length || !gh.data?.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-Verification: Resume Claims vs. GitHub Code Reality"
        subtitle="See which skills on your resume are backed by evidence in your repositories."
        actions={result && (
          <>
            <Button variant="secondary" size="sm" icon={ClipboardCopy} onClick={copyAll}>Copy</Button>
            <Button variant="secondary" size="sm" icon={Download} loading={pdfBusy} onClick={pdf}>Download PDF</Button>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={run} loading={busy}>Re-run</Button>
          </>
        )}
      />

      <Card className="p-5">
        {loading ? <PageLoader /> : missingInputs ? (
          <EmptyState icon={GitCompare} title="You need a resume and a GitHub analysis first" text="Upload a resume and analyze your GitHub profile, then come back to compare them."
            action={<div className="flex gap-2"><Link to="/resume-analysis"><Button variant="secondary">Upload resume</Button></Link><Link to="/github-analysis"><Button>Analyze GitHub</Button></Link></div>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label className="label" htmlFor="c-r">Resume version</label>
              <select id="c-r" className="input" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.data.map((r) => <option key={r._id} value={r._id}>{r.label}{r.isDefault ? ' (default)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-g">GitHub analysis</label>
              <select id="c-g" className="input" value={ghId} onChange={(e) => setGhId(e.target.value)}>
                {gh.data.map((g) => <option key={g._id} value={g._id}>{g.target} ({g.repos} repositories)</option>)}
              </select>
            </div>
            <Button onClick={run} loading={busy} disabled={!ready} icon={GitCompare}>Run Comparison</Button>
          </div>
        )}
      </Card>

      {busy && <PageLoader label="Comparing your resume with your repositories" />}

      {!busy && !result && !missingInputs && !loading && (
        <EmptyState icon={GitCompare} title="No comparison yet" text="Choose a resume and a GitHub analysis, then run the comparison." />
      )}

      {!busy && result && (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone="brand">Consistency analysis</Badge>
                <h2 className="mt-2 text-lg font-bold text-ink">{result.synthesis.score}</h2>
              </div>
              <div className="flex gap-2 text-center text-xs">
                <div className={cx('rounded-lg border px-3 py-2', toneBox.green)}><div className="text-lg font-bold text-emerald-700">{result.synthesis.verified}</div>Verified</div>
                <div className={cx('rounded-lg border px-3 py-2', toneBox.amber)}><div className="text-lg font-bold text-amber-700">{result.synthesis.partial}</div>Partial</div>
                <div className={cx('rounded-lg border px-3 py-2', toneBox.slate)}><div className="text-lg font-bold text-slate-600">{result.synthesis.unverified}</div>Unverified</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{result.synthesis.text}</p>
          </Card>

          <section>
            <SectionTitle hint="Each row compares one skill from your resume with evidence in your code"
              right={<Tip text="“Can't be verified on GitHub” is neutral. It only means no public code shows the skill, not that the claim is false." />}>
              Technology and skill truth matrix
            </SectionTitle>
            <Card className="overflow-hidden">
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-line bg-surface text-xs text-ink-mute">
                    <tr>
                      <th className="px-4 py-3 font-medium">Skill / technology</th>
                      <th className="px-4 py-3 font-medium">In resume</th>
                      <th className="px-4 py-3 font-medium">On GitHub</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="w-10 px-2 py-3"><span className="sr-only">Details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.table.map((t) => {
                      const s = STATUS[t.status];
                      const isOpen = open[t.skill];
                      return (
                        <Fragment key={t.skill}>
                          <tr className={cx('border-b border-line/70', { green: 'bg-emerald-500/[.07]', amber: 'bg-amber-500/[.08]', red: 'bg-red-500/[.07]', slate: '' }[s.tone])}>
                            <td className="px-4 py-3 font-semibold text-ink">{t.skill}</td>
                            <td className="px-4 py-3 text-ink-soft">{t.claim}</td>
                            <td className="px-4 py-3 text-ink-soft">{t.evidence}</td>
                            <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                            <td className="px-2 py-3">
                              <button onClick={() => setOpen((o) => ({ ...o, [t.skill]: !o[t.skill] }))} aria-expanded={!!isOpen} aria-label={`Evidence for ${t.skill}`} className="rounded p-1 text-ink-mute hover:bg-white">
                                <ChevronDown className={cx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-line/70 bg-surface/60"><td colSpan={5} className="px-4 py-3 text-xs text-ink-soft"><b className="text-ink">Evidence:</b> {t.details}</td></tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section>
            <SectionTitle hint="Matched by what the projects do, so names can differ">Project-to-repository similarity mapping</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              {result.projects.map((p) => (
                <Card key={p.resume.name} className={cx('p-4', p.level !== 'None' && '')}>
                  <div className="mb-3 flex items-center justify-between">
                    <Badge tone={LEVEL[p.level]}>{p.level === 'None' ? 'No match' : `${p.level} match`}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-surface p-3"><p className="text-[11px] text-ink-mute">Resume project</p><p className="text-sm font-semibold text-ink">{p.resume.name}</p><p className="mt-1 text-xs text-ink-soft">{p.resume.desc}</p></div>
                    <div className={cx('rounded-lg border p-3', p.repo ? toneBox[LEVEL[p.level]] : 'border-dashed border-line')}>
                      <p className="text-[11px] text-ink-mute">GitHub repository</p>
                      {p.repo ? <><p className="text-sm font-semibold text-ink">{p.repo.name}</p><p className="mt-1 text-xs text-ink-soft">{p.repo.desc}</p></> : <p className="text-sm text-ink-soft">No matching repository found</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-ink-soft"><b className="text-ink">Why:</b> {p.reason}</p>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle hint="Small changes that make your profile more convincing">Actionable takeaways</SectionTitle>
            <div className="grid gap-3 md:grid-cols-3">
              {result.takeaways.map((t) => (
                <Card key={t.title} className="p-4">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <p className="mt-2 text-sm font-semibold text-ink">{t.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{t.text}</p>
                </Card>
              ))}
            </div>
            <div className="mt-4"><Link to="/job-match"><Button icon={ArrowRight}>Continue to Job Match</Button></Link></div>
          </section>
        </>
      )}
    </div>
  );
}
