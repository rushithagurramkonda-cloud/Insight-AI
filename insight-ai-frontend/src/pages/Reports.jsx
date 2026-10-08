import { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart, FileText, Trash2 } from 'lucide-react';
import { api, isDemo } from '../lib/api.js';
import { formatDate, useFetch } from '../lib/hooks.js';
import { demoPdfLines } from '../lib/demo.js';
import { downloadBlob, makePdfBlob } from '../lib/pdf.js';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, ErrorState, Logo, PageHeader, PageLoader, SectionTitle, cx } from '../components/ui.jsx';

const SECTIONS = [
  { id: 'identity', title: 'Candidate identification and header', desc: 'Name, GitHub username and report date.', pages: 1, locked: true },
  { id: 'resume', title: 'Resume analysis digest', desc: 'Scores, skills, experience, strengths and suggestions.', pages: 3, source: 'resume' },
  { id: 'github', title: 'GitHub codebase telemetry', desc: 'Repositories, languages, dependencies and quality notes.', pages: 3, source: 'github' },
  { id: 'comparison', title: 'Cross-verification and truth matrix', desc: 'Matched technologies and consistency results.', pages: 2, source: 'github' },
  { id: 'match', title: 'Role compatibility radar and gap plan', desc: 'Compatibility score, strengths, missing skills and recommendations.', pages: 3, source: 'job' },
  { id: 'annex', title: 'Annex: ATS ingestion metrics', desc: 'Detailed parser and formatting checks.', pages: 2 },
];

export default function Reports() {
  const { toast, user } = useApp();
  const reports = useFetch('/api/reports');
  const resumes = useFetch('/api/resumes', { silent: true });
  const gh = useFetch('/api/github-repositories', { silent: true });
  const jobs = useFetch('/api/jobs', { silent: true });

  const [checked, setChecked] = useState({ identity: true, resume: true, github: true, comparison: true, match: true, annex: false });
  const [src, setSrc] = useState({ resume: '', github: '', job: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [dl, setDl] = useState(null);

  useEffect(() => {
    setSrc((s) => ({
      resume: s.resume || (resumes.data?.find((r) => r.isDefault) || resumes.data?.[0])?._id || '',
      github: s.github || gh.data?.[0]?._id || '',
      job: s.job || jobs.data?.[0]?._id || '',
    }));
  }, [resumes.data, gh.data, jobs.data]);

  const chosen = SECTIONS.filter((s) => checked[s.id]);
  const pages = chosen.reduce((n, s) => n + s.pages, 1);
  const selectedIds = chosen.map((s) => s.id);

  const sourceOptions = { resume: resumes.data, github: gh.data, job: jobs.data };
  const optionLabel = (kind, o) => (kind === 'resume' ? o.label : kind === 'github' ? o.target : o.name);

  const generate = async () => {
    if (selectedIds.length < 2) return toast('Choose at least one section besides the header.', 'error');
    setBusy(true);
    try {
      const rep = await api.post('/api/reports', { sections: selectedIds, resumeId: src.resume, githubAnalysisId: src.github, jobId: src.job });
      toast('Report generated.', 'success');
      reports.reload();
      return rep;
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const download = async (r) => {
    setDl(r._id);
    try {
      if (isDemo()) downloadBlob(makePdfBlob('Developer Profile Analysis', demoPdfLines.report({ ...r, sections: r.sections })), r.name);
      else {
        const res = await fetch(`/api/reports/${r._id}/download`, { credentials: 'include' });
        if (!res.ok) throw new Error('Could not download the report. Try again in a moment.');
        downloadBlob(await res.blob(), r.name);
      }
    } catch (e) { toast(e.message, 'error'); } finally { setDl(null); }
  };

  const remove = async () => {
    try { await api.del(`/api/reports/${del._id}`); toast('Report deleted.', 'success'); setDel(null); reports.reload(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const today = useMemo(() => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }), []);

  return (
    <div className="space-y-8">
      <PageHeader title="Audit Reports & Executive Dossiers" subtitle="Choose the sections to include and download a formal PDF report." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <SectionTitle hint="Tick the sections you want in the report">Dossier composition</SectionTitle>
          <ul className="space-y-2.5">
            {SECTIONS.map((s) => (
              <li key={s.id} className={cx('rounded-xl border p-3.5 transition-colors', checked[s.id] ? 'border-brand/30 bg-brand-soft/40' : 'border-line')}>
                <label className="flex cursor-pointer items-start gap-3">
                  <span className="mt-0.5"><Checkbox checked={!!checked[s.id]} onChange={(v) => !s.locked && setChecked((c) => ({ ...c, [s.id]: v }))} label={s.title} /></span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-ink">{s.title}</span><Badge tone="slate">{s.pages} {s.pages === 1 ? 'page' : 'pages'}</Badge></span>
                    <span className="mt-0.5 block text-xs text-ink-soft">{s.desc}{s.locked && ' Always included.'}</span>
                  </span>
                </label>
                {s.source && checked[s.id] && sourceOptions[s.source]?.length > 0 && (
                  <div className="ml-7 mt-2.5 max-w-xs">
                    <label className="label" htmlFor={`src-${s.id}`}>{s.source === 'resume' ? 'Resume version' : s.source === 'github' ? 'GitHub analysis' : 'Job description'}</label>
                    <select id={`src-${s.id}`} className="input py-1.5" value={src[s.source]} onChange={(e) => setSrc((x) => ({ ...x, [s.source]: e.target.value }))}>
                      {sourceOptions[s.source].map((o) => <option key={o._id} value={o._id}>{optionLabel(s.source, o)}</option>)}
                    </select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold text-ink-soft">Preview</p>
            <div className="rounded-lg border border-line bg-white p-5 shadow-card" style={{ aspectRatio: '1 / 1.2' }}>
              <Logo />
              <p className="mt-4 font-serif text-base font-bold text-ink">Developer Profile Analysis</p>
              <p className="mt-0.5 text-[11px] text-ink-mute">{user?.name} · @{user?.githubUsername}</p>
              <p className="text-[11px] text-ink-mute">{today}</p>
              <ol className="mt-4 space-y-1 font-serif text-xs text-ink-soft">
                {chosen.map((s, i) => <li key={s.id}>{i + 1}. {s.title}</li>)}
              </ol>
            </div>
          </Card>
          <Button onClick={generate} loading={busy} icon={FileBarChart} className="w-full py-2.5">Generate PDF dossier ({pages} pages)</Button>
          <p className="text-center text-[11px] text-ink-mute">The report is saved to your history below.</p>
        </div>
      </div>

      <section>
        <SectionTitle hint="Saved reports can be downloaded again or deleted" right={<Badge tone="brand">{reports.data?.length || 0} saved</Badge>}>Generated reports</SectionTitle>
        {reports.loading ? <PageLoader /> : reports.error ? <ErrorState error={reports.error} onRetry={reports.reload} /> : !reports.data.length ? (
          <EmptyState icon={FileText} title="No reports yet" text="Choose your sections above and generate your first report." />
        ) : (
          <Card className="divide-y divide-line">
            {reports.data.map((r) => (
              <div key={r._id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"><FileText className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                  <p className="text-xs text-ink-mute">{formatDate(r.date)} · {r.pages} pages · {r.size}</p>
                </div>
                <Badge tone={r.badge?.startsWith('Complete') ? 'green' : 'slate'}>{r.badge}</Badge>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" icon={Download} loading={dl === r._id} onClick={() => download(r)}>Download PDF</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={() => setDel(r)} aria-label={`Delete ${r.name}`}>Delete</Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete this report?" text={`“${del?.name}” will be removed from your history. You can generate it again at any time.`} />
    </div>
  );
}
