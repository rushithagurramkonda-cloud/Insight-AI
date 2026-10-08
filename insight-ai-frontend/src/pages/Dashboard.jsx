import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar as RBar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight, Briefcase, CheckCircle2, ChevronDown, Circle, FileBarChart, FileText, GitCompare, Github, Lightbulb, Plus, Target, Upload,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatDate, useFetch } from '../lib/hooks.js';
import { Badge, Button, Card, ErrorState, PageHeader, PageLoader, SectionTitle, useCountUp, cx, Tip } from '../components/ui.jsx';

const TONE_HEX = { green: '#10B981', amber: '#F59E0B', red: '#EF4444' };
const LANG_COLORS = ['#00404E', '#0B7285', '#5B8DEF', '#A5B4FC', '#CBD5E1'];

const FEATURE_INTRO = [
  { icon: FileText, title: 'Resume Analysis', text: 'Upload a PDF to get a score, an ATS check and suggestions.', to: '/resume-analysis' },
  { icon: Github, title: 'GitHub Analysis', text: 'Scan your repositories for what you really built.', to: '/github-analysis' },
  { icon: Briefcase, title: 'Job Description', text: 'Paste a posting to extract skills and a learning roadmap.', to: '/job-description' },
  { icon: GitCompare, title: 'Comparison', text: 'Check which resume claims your code supports.', to: '/comparison' },
  { icon: Target, title: 'Job Match', text: 'Score your fit for a role and get a gap plan.', to: '/job-match' },
  { icon: FileBarChart, title: 'Reports', text: 'Download a formal PDF with the sections you choose.', to: '/reports' },
];

function Stat({ label, value, sub, to }) {
  const n = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-ink-mute">{label}</p>
      <p className="mt-2 text-4xl font-bold tracking-tight text-ink">{typeof value === 'number' ? n : value}</p>
      <p className="mt-1 text-xs text-ink-mute">{sub}</p>
      {to && <Link to={to} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>}
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useApp();
  const { data, loading, error, reload } = useFetch('/api/dashboard');
  const resumes = useFetch('/api/resumes', { silent: true });
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);

  const first = user?.name?.split(' ')[0] || 'there';

  if (loading) return <PageLoader label="Loading your dashboard" />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;

  const { stats, checklist, coverage, github, activity, priorityActions } = data;
  const isNew = stats.resumes === 0 && stats.matches === 0;
  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${first}`}
        subtitle="Here is your resume and technical portfolio alignment overview."
        actions={
          <>
            <Button variant="secondary" icon={Upload} onClick={() => navigate('/resume-analysis')}>Upload Resume</Button>
            <div className="relative">
              <Button icon={Plus} onClick={() => setMenu((m) => !m)}>New Analysis <ChevronDown className="h-3.5 w-3.5" /></Button>
              {menu && (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-pop" onMouseLeave={() => setMenu(false)}>
                  {[['Resume analysis', '/resume-analysis'], ['GitHub analysis', '/github-analysis'], ['Job description', '/job-description'], ['Comparison', '/comparison'], ['Job match', '/job-match']].map(([l, to]) => (
                    <Link key={to} to={to} className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface">{l}</Link>
                  ))}
                </div>
              )}
            </div>
          </>
        }
      />

      {isNew ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_INTRO.map(({ icon: Icon, title, text, to }) => (
              <Link key={title} to={to}>
                <Card className="h-full p-5 transition-shadow hover:shadow-pop">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon className="h-[18px] w-[18px]" /></span>
                  <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{text}</p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Resumes analyzed" value={stats.resumes} sub="Versions saved in your workspace" to="/resume-analysis" />
          <Stat label="Job matches" value={stats.matches} sub="Across all saved job descriptions" to="/job-match" />
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-mute">Latest suggestion</p>
              <Badge tone="amber">{stats.latest.priority}</Badge>
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-ink">{stats.latest.text}</p>
            <Link to={stats.latest.link} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">Open analysis <ArrowRight className="h-3 w-3" /></Link>
          </Card>
        </div>
      )}

      {done < checklist.length && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle hint="Complete these four steps to unlock your full report">Getting-started checklist</SectionTitle>
            <span className="text-xs font-medium text-ink-mute">{done} of {checklist.length} done</span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${(done / checklist.length) * 100}%` }} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {checklist.map((c) => (
              <Link key={c.id} to={c.link} className={cx('flex gap-3 rounded-xl border p-3 transition-colors', c.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-line hover:bg-surface')}>
                {c.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                <span>
                  <span className={cx('block text-sm font-medium', c.done ? 'text-ink-soft line-through decoration-slate-300' : 'text-ink')}>{c.label}</span>
                  <span className="text-xs text-ink-mute">{c.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {!isNew && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <SectionTitle hint="How well your skills cover the latest target role" right={<Tip text="Covered percentage is how much of the job's requirement in that area is backed by your resume and GitHub." />}>
              Skill coverage vs. target role
            </SectionTitle>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverage} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <RTooltip cursor={{ fill: 'rgba(0,64,78,.05)' }} formatter={(v) => [`${v}% covered`, '']} separator="" contentStyle={{ borderRadius: 10, border: '1px solid #E5E8F3', fontSize: 12 }} />
                  <RBar dataKey="covered" radius={[0, 6, 6, 0]} barSize={14} animationDuration={900} background={{ fill: '#F1F3F9', radius: 6 }}>
                    {coverage.map((c) => <Cell key={c.name} fill={TONE_HEX[c.tone]} />)}
                  </RBar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <SectionTitle hint={`@${github.username} · ${github.repos} repositories`} right={<Link to="/github-analysis" className="text-xs font-medium text-brand hover:underline">Open</Link>}>GitHub snapshot</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="h-28 w-28 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={github.languages} dataKey="pct" nameKey="name" innerRadius={34} outerRadius={52} paddingAngle={2} stroke="none" animationDuration={900}>
                      {github.languages.map((l, i) => <Cell key={l.name} fill={LANG_COLORS[i % LANG_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1 text-xs">
                {github.languages.map((l, i) => (
                  <li key={l.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />
                    <span className="flex-1 text-ink-soft">{l.name}</span>
                    <span className="font-medium text-ink">{l.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-sm text-ink-soft">{github.summary}</p>
          </Card>
        </div>
      )}

      {!isNew && (
        <Card className="p-5">
          <SectionTitle hint="Your saved versions, newest first" right={<Link to="/resume-analysis" className="text-xs font-medium text-brand hover:underline">Manage versions</Link>}>Previous resumes</SectionTitle>
          <ul className="divide-y divide-line">
            {(resumes.data || []).slice(0, 3).map((r) => (
              <li key={r._id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand"><FileText className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{r.label}</p><p className="text-xs text-ink-mute">{formatDate(r.date)} · Score {r.score} · ATS {r.ats}</p></div>
                {r.isDefault && <Badge tone="brand">Default</Badge>}
                <Link to="/resume-analysis"><Button size="sm" variant="secondary">View</Button></Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!isNew && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle hint="Quick links back to your latest work">Recent activity</SectionTitle>
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.text}>
                  <Link to={a.link} className="flex items-start gap-3 py-3 hover:bg-surface/60">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                    <span className="flex-1 text-sm text-ink">{a.text}</span>
                    <span className="shrink-0 text-xs text-ink-mute">{a.time}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle hint="Highest-impact next steps">Priority actions</SectionTitle>
            <ul className="space-y-2.5">
              {priorityActions.map((p) => (
                <li key={p.text}>
                  <Link to={p.link} className="flex items-start gap-3 rounded-lg border border-line p-3 transition-colors hover:bg-surface">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span className="flex-1 text-sm text-ink">{p.text}</span>
                    <Badge tone="brand">{p.tag}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
