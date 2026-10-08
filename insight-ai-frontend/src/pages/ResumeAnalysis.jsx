import { useEffect, useRef, useState } from 'react';
import { Award, Briefcase, ClipboardCopy, Download, FileText, Lightbulb, Pencil, RefreshCw, Sparkles, Star, Trash2, UploadCloud, Wrench } from 'lucide-react';
import { api } from '../lib/api.js';
import { copyText, formatDate, useFetch } from '../lib/hooks.js';
import { downloadAnalysisPdf } from '../lib/download.js';
import { useApp } from '../context/AppContext.jsx';
import {
  Badge, Bar, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorState, Expandable, Modal, PageHeader, PageLoader,
  ProgressSteps, ScoreRing, SectionTitle, Tip, cx, scoreTone, toneBox,
} from '../components/ui.jsx';

const STEPS = ['Reading PDF', 'Analyzing with AI', 'Saving results'];
const MAX = 5 * 1024 * 1024;

export default function ResumeAnalysis() {
  const { toast } = useApp();
  const list = useFetch('/api/resumes');
  const [selected, setSelected] = useState(null);
  const detail = useFetch(selected ? `/api/resumes/${selected}` : null, { skip: !selected });

  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [fileError, setFileError] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [rename, setRename] = useState(null);
  const [del, setDel] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (list.data?.length && !selected) setSelected((list.data.find((r) => r.isDefault) || list.data[0])._id);
    if (list.data && !list.data.length) setSelected(null);
  }, [list.data, selected]);

  const validate = (f) => {
    if (!f) return 'Choose a PDF file.';
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are supported. Export your resume as a PDF and try again.';
    if (f.size > MAX) return 'This file is larger than 5 MB. Compress it and try again.';
    return '';
  };

  const pick = (f) => {
    const err = validate(f);
    setFileError(err);
    setFile(err ? null : f);
  };

  const analyze = async () => {
    const err = validate(file);
    if (err) return setFileError(err);
    setBusy(true);
    setStep(0);
    const t1 = setTimeout(() => setStep(1), 900);
    const t2 = setTimeout(() => setStep(2), 2600);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (label.trim()) fd.append('label', label.trim());
      const created = await api.upload('/api/resumes', fd);
      toast('Resume analyzed and saved as a new version.', 'success');
      setFile(null);
      setLabel('');
      // Show the new version immediately, then refresh the list from the server.
      list.setData((d) => [created, ...(d || []).filter((x) => x._id !== created._id)]);
      setSelected(created._id);
      list.reload();
    } catch (e) {
      toast(e.message, 'error');
      setFileError(e.message);
      // The server may have saved the resume even though the reply was lost, so always refresh the list.
      list.reload();
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setBusy(false);
    }
  };

  const setDefault = async (id) => {
    try {
      await api.patch(`/api/resumes/${id}`, { isDefault: true });
      toast('Default resume updated. Comparison and Job Match will use it.', 'success');
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };

  const rerun = async (id) => {
    try {
      await api.post(`/api/resumes/${id}/rerun`);
      toast('Analysis re-run.', 'success');
      detail.reload();
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };

  const doRename = async () => {
    try {
      await api.patch(`/api/resumes/${rename.id}`, { label: rename.label });
      toast('Version renamed.', 'success');
      setRename(null);
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };

  const doDelete = async () => {
    try {
      await api.del(`/api/resumes/${del._id}`);
      toast('Resume deleted.', 'success');
      if (selected === del._id) setSelected(null);
      setDel(null);
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };

  const a = detail.data?.analysis;
  const current = list.data?.find((r) => r._id === selected);

  const copyAll = async () => {
    if (!a) return;
    const text = [
      `Resume analysis: ${current?.label}`,
      `Resume score ${a.scores.resume}/100, ATS score ${a.scores.ats}/100`,
      '', 'Summary', a.summary.text,
      '', 'Skills', ...a.skills.map((s) => `${s.category}: ${s.items.join(', ')}`),
      '', 'Suggestions', ...a.suggestions.map((s) => `- ${s.title}: ${s.text}`),
    ].join('\n');
    toast((await copyText(text)) ? 'Copied to clipboard.' : 'Could not copy. Select the text manually.', 'success');
  };

  const pdf = async () => {
    setPdfBusy(true);
    try {
      await downloadAnalysisPdf({ path: `/api/resumes/${selected}/pdf`, kind: 'resume', title: `Resume Analysis: ${current?.label}`, filename: `resume-analysis-${selected}.pdf` });
    } catch (e) { toast(e.message, 'error'); } finally { setPdfBusy(false); }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Resume Analysis" subtitle="Upload a PDF resume for a score, ATS check and suggestions. Every upload is saved as a version." />

      {/* Upload */}
      <Card className="p-5">
        <div className="grid gap-5 md:grid-cols-[1fr_300px]">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload resume PDF"
            className={cx('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors', drag ? 'border-brand bg-brand-soft' : 'border-line bg-surface/50 hover:bg-surface')}
          >
            <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            <UploadCloud className="h-8 w-8 text-brand" />
            {file ? (
              <p className="mt-2 text-sm font-medium text-ink">{file.name} <span className="font-normal text-ink-mute">({(file.size / 1024).toFixed(0)} KB)</span></p>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Drag and drop your resume here, or <span className="font-medium text-brand">browse files</span></p>
            )}
            <p className="mt-1 text-xs text-ink-mute">PDF only, up to 5 MB</p>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label" htmlFor="v-label">Version label (optional)</label>
              <input id="v-label" className="input" placeholder="e.g. ML-focused v2" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <p className="text-[11px] leading-4 text-ink-mute">Scanned PDFs without selectable text cannot be read. Export from your editor instead of scanning.</p>
            <Button onClick={analyze} loading={busy} disabled={!file} icon={Sparkles} className="mt-auto">Analyze Resume</Button>
          </div>
        </div>
        {fileError && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{fileError}</p>}
      </Card>

      {busy && <ProgressSteps steps={STEPS} current={step} title="Analyzing your resume" />}

      {/* Versions */}
      <section>
        <SectionTitle hint="Select a version to view its analysis" right={<Badge tone="brand">{list.data?.length || 0} saved</Badge>}>Resume versions</SectionTitle>
        {list.loading ? <PageLoader /> : list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data.length ? (
          <EmptyState icon={FileText} title="No resumes yet" text="Upload your first PDF above to get your score and suggestions." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.data.map((r) => (
              <Card key={r._id} className={cx('p-4 transition-shadow', selected === r._id && 'ring-2 ring-brand/60')}>
                <button className="block w-full text-left" onClick={() => setSelected(r._id)} aria-pressed={selected === r._id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{r.label}</p>
                      <p className="text-xs text-ink-mute">Uploaded {formatDate(r.date)}</p>
                    </div>
                    {r.isDefault && <Badge tone="brand"><Star className="h-3 w-3" /> Default</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{r.tags.map((t) => <Chip key={t}>{t}</Chip>)}</div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-ink-soft">
                    <span>Score <b className="text-ink">{r.score}</b></span>
                    <span>ATS <b className="text-ink">{r.ats}</b></span>
                  </div>
                </button>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
                  {!r.isDefault && <Button size="sm" variant="ghost" onClick={() => setDefault(r._id)}>Set as default</Button>}
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setRename({ id: r._id, label: r.label })} aria-label={`Rename ${r.label}`}>Rename</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={() => setDel(r)} aria-label={`Delete ${r.label}`}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Results */}
      {selected && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-ink">Analysis results: {current?.label}</h2>
              <p className="text-xs text-ink-mute">Generated by AI from the text of your PDF</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={ClipboardCopy} onClick={copyAll} disabled={!a}>Copy</Button>
              <Button variant="secondary" size="sm" icon={Download} onClick={pdf} loading={pdfBusy} disabled={!a}>Download PDF</Button>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => rerun(selected)}>Re-run</Button>
            </div>
          </div>

          {detail.loading ? <PageLoader label="Loading analysis" /> : detail.error ? <ErrorState error={detail.error} onRetry={detail.reload} /> : a && (
            <>
              <Card className="p-6">
                <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
                  <div className="flex justify-center gap-8">
                    <ScoreRing value={a.scores.resume} label="Resume score" sub="Content quality" tone={scoreTone(a.scores.resume)} />
                    <ScoreRing value={a.scores.ats} label="ATS score" sub="Machine readability" tone={scoreTone(a.scores.ats)} />
                  </div>
                  <div>
                    <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ink">Section ratings <Tip text="ATS means applicant tracking system. A high score means automated parsers can read your resume correctly." /></p>
                    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      {a.sections.map((s) => (
                        <li key={s.name}>
                          <div className="mb-1 flex justify-between text-xs"><span className="text-ink-soft">{s.name}</span><span className="font-medium text-ink">{s.score}% · {s.label}</span></div>
                          <Bar value={s.score} tone={scoreTone(s.score)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>

              <Expandable title="1. Executive summary" icon={FileText} defaultOpen>
                <p className="text-sm leading-6 text-ink-soft">{a.summary.text}</p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  {a.summary.facts.map((f) => (
                    <div key={f.k} className="rounded-lg bg-surface px-3 py-2.5">
                      <dt className="text-[11px] text-ink-mute">{f.k}</dt>
                      <dd className="text-sm font-semibold text-ink">{f.v}</dd>
                    </div>
                  ))}
                </dl>
              </Expandable>

              <Expandable title="2. Skills, categorized" icon={Wrench}>
                <div className="grid gap-5 sm:grid-cols-2">
                  {a.skills.map((g) => (
                    <div key={g.category}>
                      <p className="mb-2 text-xs font-semibold text-ink-soft">{g.category}</p>
                      <div className="flex flex-wrap gap-1.5">{g.items.map((i) => <Chip key={i}>{i}</Chip>)}</div>
                    </div>
                  ))}
                </div>
              </Expandable>

              <Expandable title="3. Experience and project deep dive" icon={Briefcase}>
                <ul className="space-y-3">
                  {a.experience.map((e) => (
                    <li key={e.title} className={cx('rounded-xl border p-4', toneBox[e.tone])}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{e.title} <span className="font-normal text-ink-mute">· {e.org}</span></p>
                        <Badge tone={e.tone}>{e.tag}</Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-ink-soft">{e.text}</p>
                      {e.suggestion && <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-ink"><b>Suggestion:</b> {e.suggestion}</p>}
                    </li>
                  ))}
                </ul>
              </Expandable>

              <Expandable title="4. Strengths and high-impact points" icon={Award}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {a.strengths.map((s) => (
                    <div key={s.title} className="rounded-xl border border-emerald-200 bg-emerald-500/10 p-4">
                      <p className="text-sm font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
                    </div>
                  ))}
                </div>
              </Expandable>

              <Expandable title="5. Suggestions and future recommendations" icon={Lightbulb} defaultOpen>
                <ul className="space-y-3">
                  {a.suggestions.map((s) => (
                    <li key={s.title} className="flex gap-3 rounded-xl border border-line p-4">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-ink">{s.title}</p>
                          <Badge tone={s.priority === 'High' ? 'red' : s.priority === 'Medium' ? 'amber' : 'slate'}>{s.priority}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Expandable>
            </>
          )}
        </section>
      )}

      <Modal
        open={!!rename}
        onClose={() => setRename(null)}
        title="Rename version"
        footer={<><Button variant="secondary" onClick={() => setRename(null)}>Cancel</Button><Button onClick={doRename} disabled={!rename?.label.trim()}>Save name</Button></>}
      >
        <label className="label" htmlFor="rn">Version label</label>
        <input id="rn" className="input" value={rename?.label || ''} onChange={(e) => setRename((r) => ({ ...r, label: e.target.value }))} />
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={doDelete}
        title="Delete this resume?"
        text={`“${del?.label}” and its analysis will be removed. Comparisons and matches that use it will need a different resume.`}
      />
    </div>
  );
}