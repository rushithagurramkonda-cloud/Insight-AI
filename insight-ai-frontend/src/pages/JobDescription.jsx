import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Briefcase, ClipboardCopy, Download, Map, Pencil, RefreshCw, Sparkles, Target, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { copyText, formatDate, useFetch } from '../lib/hooks.js';
import { downloadAnalysisPdf } from '../lib/download.js';
import { useApp } from '../context/AppContext.jsx';
import {
  Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, PageLoader, ProgressSteps, SectionTitle, Tip, cx,
} from '../components/ui.jsx';

const STEPS = ['Reading the posting', 'Extracting skills and responsibilities', 'Building your learning roadmap'];
const LEVELS = ['Intern', 'Junior', 'Mid-level', 'Senior', 'Staff', 'Lead'];
const PRIORITY = { Critical: 'red', High: 'amber', Medium: 'slate' };

export default function JobDescription() {
  const { toast } = useApp();
  const list = useFetch('/api/jobs');
  const [selected, setSelected] = useState(null);
  const detail = useFetch(selected ? `/api/jobs/${selected}` : null, { skip: !selected });

  const [form, setForm] = useState({ title: '', company: '', level: 'Senior', name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [rename, setRename] = useState(null);
  const [del, setDel] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (list.data?.length && !selected) setSelected(list.data[0]._id);
    if (list.data && !list.data.length) setSelected(null);
  }, [list.data, selected]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const er = {};
    if (!form.title.trim()) er.title = 'Enter the job title.';
    if (form.description.trim().length < 40) er.description = 'Paste the full job description (at least a few sentences) so the analysis is useful.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 900);
    const t2 = setTimeout(() => setStep(2), 2200);
    try {
      const name = form.name.trim() || `${form.title.trim()}${form.company.trim() ? ` – ${form.company.trim()}` : ''}`;
      const created = await api.post('/api/jobs', { title: form.title.trim(), company: form.company.trim(), level: form.level, name, rawText: form.description });
      toast('Job description analyzed and saved.', 'success');
      setForm({ title: '', company: '', level: 'Senior', name: '', description: '' });
      await list.reload();
      setSelected(created._id);
    } catch (e) { toast(e.message, 'error'); } finally {
      clearTimeout(t1); clearTimeout(t2); setBusy(false);
    }
  };

  const doRename = async () => {
    try {
      await api.patch(`/api/jobs/${rename.id}`, { name: rename.name });
      toast('Job renamed.', 'success');
      setRename(null);
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const doDelete = async () => {
    try {
      await api.del(`/api/jobs/${del._id}`);
      toast('Job description deleted.', 'success');
      if (selected === del._id) setSelected(null);
      setDel(null);
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };
  const rerun = async (id) => {
    try { await api.post(`/api/jobs/${id}/rerun`); toast('Analysis re-run.', 'success'); detail.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const a = detail.data?.analysis;
  const job = list.data?.find((j) => j._id === selected);
  const must = a?.skills.filter((s) => s.importance === 'must') || [];
  const nice = a?.skills.filter((s) => s.importance === 'nice') || [];

  const copyAll = async () => {
    const text = [`${job?.name}`, a.summary.text, '', 'Must-have', ...must.map((s) => `- ${s.name}`), '', 'Nice-to-have', ...nice.map((s) => `- ${s.name}`), '', 'Roadmap', ...a.roadmap.map((r) => `- ${r.title} (${r.duration})`)].join('\n');
    toast((await copyText(text)) ? 'Copied to clipboard.' : 'Could not copy. Select the text manually.', 'success');
  };
  const pdf = async () => {
    setPdfBusy(true);
    try { await downloadAnalysisPdf({ path: `/api/jobs/${selected}/pdf`, kind: 'job', title: `Job Analysis: ${job?.name}`, filename: `job-analysis-${selected}.pdf` }); }
    catch (e) { toast(e.message, 'error'); } finally { setPdfBusy(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Target Role & Job Description Analysis" subtitle="Paste a job posting to extract the skills, responsibilities and a roadmap for what to learn." />

      {/* Saved jobs */}
      <section>
        <SectionTitle hint="Saved job specifications feed Comparison and Job Match" right={<Badge tone="brand">{list.data?.length || 0} saved</Badge>}>Recent job specifications</SectionTitle>
        {list.loading ? <PageLoader /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data.length ? (
          <EmptyState icon={Briefcase} title="No saved jobs yet" text="Paste a job description below. We will save it with a name you can find later." />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {list.data.map((j) => (
              <Card key={j._id} className={cx('p-4', selected === j._id && 'ring-2 ring-brand/60')}>
                <button className="block w-full text-left" onClick={() => setSelected(j._id)} aria-pressed={selected === j._id}>
                  <p className="truncate text-sm font-semibold text-ink">{j.name}</p>
                  <p className="text-xs text-ink-mute">{j.company} · {j.level} · {formatDate(j.date)}</p>
                  {j.match != null && <Badge tone={j.match >= 80 ? 'green' : 'amber'} className="mt-2">{j.match}% match</Badge>}
                </button>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setRename({ id: j._id, name: j.name })} aria-label={`Rename ${j.name}`}>Rename</Button>
                  <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => rerun(j._id)} aria-label={`Re-run ${j.name}`}>Re-run</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={() => setDel(j)} aria-label={`Delete ${j.name}`}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <Card className="h-fit p-5">
          <h2 className="text-base font-semibold text-ink">Specification ingestion</h2>
          <p className="mb-4 text-xs text-ink-mute">Paste text only. Links to job boards are not supported.</p>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="jt">Job title</label>
              <input id="jt" className="input" value={form.title} onChange={set('title')} placeholder="Machine Learning Engineer" aria-invalid={!!errors.title} />
              {errors.title && <p role="alert" className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="jc">Company (optional)</label><input id="jc" className="input" value={form.company} onChange={set('company')} placeholder="Helix Systems" /></div>
              <div><label className="label" htmlFor="jl">Target level</label><select id="jl" className="input" value={form.level} onChange={set('level')}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
            </div>
            <div>
              <label className="label" htmlFor="jn">Save as (optional)</label>
              <input id="jn" className="input" value={form.name} onChange={set('name')} placeholder="Google ML Intern" />
            </div>
            <div>
              <label className="label" htmlFor="jd">Job description</label>
              <textarea id="jd" rows={9} className="input resize-y" value={form.description} onChange={set('description')} placeholder="We are looking for a Machine Learning Engineer with experience in Python, PyTorch, TensorFlow…" aria-invalid={!!errors.description} />
              {errors.description && <p role="alert" className="mt-1 text-xs text-red-600">{errors.description}</p>}
            </div>
            <Button onClick={submit} loading={busy} icon={Sparkles} className="w-full">Analyze job description</Button>
          </div>
        </Card>

        {/* Results */}
        <div className="min-w-0 space-y-5">
          {busy && <ProgressSteps steps={STEPS} current={step} title="Analyzing the job description" />}
          {!busy && selected && detail.loading && <PageLoader label="Loading analysis" />}
          {!busy && detail.error && <ErrorState error={detail.error} onRetry={detail.reload} />}
          {!busy && !selected && !list.loading && <EmptyState icon={Target} title="No analysis to show" text="Analyze a job description and the breakdown appears here." />}

          {!busy && a && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">{job?.name}</h2>
                  <p className="text-xs text-ink-mute">{job?.company} · {job?.level}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" icon={ClipboardCopy} onClick={copyAll}>Copy</Button>
                  <Button variant="secondary" size="sm" icon={Download} loading={pdfBusy} onClick={pdf}>Download PDF</Button>
                  <Link to="/comparison"><Button size="sm" icon={ArrowRight}>Compare against resume</Button></Link>
                </div>
              </div>

              <Card className="p-5">
                <Badge tone="brand">Job summary</Badge>
                <h3 className="mt-2 text-base font-semibold text-ink">{a.summary.headline}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{a.summary.text}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {a.summary.metrics.map((m) => <div key={m.k} className="rounded-lg bg-surface px-3 py-2.5"><dt className="text-[11px] text-ink-mute">{m.k}</dt><dd className="text-sm font-bold text-ink">{m.v}</dd></div>)}
                </dl>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-1.5 text-base font-semibold text-ink">Required skills <Tip text="Must-have skills are stated as requirements in the posting. Nice-to-have skills are listed as preferred or a plus." /></h3>
                <div className="space-y-4">
                  <div><p className="mb-2 text-xs font-semibold text-red-700">Must-have</p><div className="flex flex-wrap gap-1.5">{must.map((s) => <Chip key={s.name} tone="red">{s.name}</Chip>)}</div></div>
                  <div><p className="mb-2 text-xs font-semibold text-ink-soft">Nice-to-have</p><div className="flex flex-wrap gap-1.5">{nice.map((s) => <Chip key={s.name} tone="slate">{s.name}</Chip>)}</div></div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-base font-semibold text-ink">Responsibilities and experience blueprint</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {a.responsibilities.map((r) => <div key={r.title} className="rounded-xl border border-line p-3.5"><p className="text-sm font-semibold text-ink">{r.title}</p><p className="mt-1 text-sm text-ink-soft">{r.text}</p></div>)}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><p className="mb-1.5 text-xs font-semibold text-ink-soft">Experience requirements</p><ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">{a.experience.map((e) => <li key={e}>{e}</li>)}</ul></div>
                  <div><p className="mb-1.5 text-xs font-semibold text-ink-soft">Qualifications</p><ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">{a.qualifications.map((e) => <li key={e}>{e}</li>)}</ul></div>
                </div>
              </Card>

              <section>
                <SectionTitle hint="Ordered by importance" right={<Badge tone="brand">{a.roadmap.length} learning tracks</Badge>}>Tailored preparation and up-skilling roadmap</SectionTitle>
                <ol className="space-y-3">
                  {a.roadmap.map((r, i) => (
                    <li key={r.title}>
                      <Card className="flex gap-4 p-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold text-brand">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink">{r.title}</p>
                            <Badge tone={PRIORITY[r.priority] || 'slate'}>{r.priority}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-ink-soft">{r.text}</p>
                          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-mute"><span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{r.resource}</span><span className="flex items-center gap-1"><Map className="h-3 w-3" />About {r.duration}</span></p>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </div>

      <Modal open={!!rename} onClose={() => setRename(null)} title="Rename job description"
        footer={<><Button variant="secondary" onClick={() => setRename(null)}>Cancel</Button><Button onClick={doRename} disabled={!rename?.name.trim()}>Save name</Button></>}>
        <label className="label" htmlFor="jrn">Name</label>
        <input id="jrn" className="input" value={rename?.name || ''} onChange={(e) => setRename((r) => ({ ...r, name: e.target.value }))} />
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={doDelete} title="Delete this job description?"
        text={`“${del?.name}” will be removed. Job matches that use it will also need a different job description.`} />
    </div>
  );
}
