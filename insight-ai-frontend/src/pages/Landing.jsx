import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Briefcase, FileBarChart, FileText, GitCompare, Github, Target } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Button, Logo } from '../components/ui.jsx';

const FEATURES = [
  { icon: FileText, title: 'Resume Analysis', text: 'Upload a PDF and get a score, an ATS check and section ratings, with skills grouped by category.' },
  { icon: Github, title: 'GitHub Analysis', text: 'Scan a profile or repository to see what each project solves, how it is built and how well it is documented.' },
  { icon: Briefcase, title: 'Job Description Analysis', text: 'Paste a posting to extract must-have skills, responsibilities and a learning roadmap.' },
  { icon: GitCompare, title: 'Resume–GitHub Comparison', text: 'See which resume claims your code backs up, and which ones cannot be verified.' },
  { icon: Target, title: 'Job Match Analysis', text: 'Combine resume, GitHub and a job posting into a radar chart with adjustable weights and a gap plan.' },
  { icon: FileBarChart, title: 'Dashboard & Reports', text: 'Track progress in one place and export a formal PDF report with the sections you choose.' },
];

const STEPS = [
  ['Sign in with GitHub', 'Authorize read-only access. Your account is created on first sign-in.'],
  ['Upload your resume (PDF)', 'Each upload is saved as a version you can compare later.'],
  ['Analyze your GitHub profile or repository', 'Enter a username or repository URL. You get 15 analyses per day.'],
  ['Paste a job description and save it', 'Name it so you can find it again, for example “Google ML Intern”.'],
  ['Run the Comparison and the Job Match', 'Check your claims against your code, then score your fit for the role.'],
  ['Review recommendations on the dashboard', 'Follow the priority actions and the learning roadmap.'],
  ['Generate and download your report', 'Choose the sections to include and download a formal PDF.'],
];

export default function Landing() {
  const { enterDemo } = useApp();
  const navigate = useNavigate();
  const demo = () => {
    enterDemo();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line/70 bg-white/85 px-4 backdrop-blur sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <Link to="/privacy" className="hover:text-ink">Privacy</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={demo}>Try demo mode</Button>
          <Link to="/login"><Button size="sm" icon={Github}>Continue with GitHub</Button></Link>
        </div>
      </header>

      <section className="bg-grid relative overflow-hidden px-4 pb-20 pt-16 text-center sm:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-teal-100/50 blur-3xl" aria-hidden />
        <h1 className="relative mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-brand sm:text-6xl">
          Know exactly how your resume, GitHub and dream job line up.
        </h1>
        <p className="relative mx-auto mt-5 max-w-xl text-base text-ink-soft">
          Insight AI bridges the gap between what you claim on paper, what you actually built in code, and what the job requires.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/login"><Button icon={Github} className="px-5 py-2.5">Continue with GitHub</Button></Link>
          <Button variant="secondary" onClick={demo} className="px-5 py-2.5">Try Demo Mode</Button>
        </div>

        {/* Product preview */}
        <div className="relative mx-auto mt-14 max-w-3xl rounded-2xl border border-line bg-white p-4 text-left shadow-pop">
          <div className="mb-3 flex items-center justify-between text-[11px] text-ink-mute">
            <span>insight-ai / job-match / senior-ml-platform</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Sample data</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs font-medium text-ink-mute">Resume</p>
              <p className="mt-1 text-sm font-semibold">Resume Analysis</p>
              <div className="mt-3 flex items-center gap-2 text-xs"><span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">91 / 100</span><span className="text-ink-mute">ATS 94</span></div>
            </div>
            <div className="rounded-xl border-2 border-brand/20 bg-brand-soft/50 p-4 text-center">
              <p className="text-xs font-medium text-ink-mute">Job compatibility</p>
              <p className="my-1 text-4xl font-bold text-brand">88%</p>
              <p className="text-xs text-ink-soft">Strong match</p>
            </div>
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs font-medium text-ink-mute">Target role</p>
              <p className="mt-1 text-sm font-semibold">ML Platform Engineer</p>
              <div className="mt-3 flex items-center gap-2 text-xs"><span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">2 gaps</span><span className="text-ink-mute">7 matched</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Six precise modules to demystify engineering candidacy</h2>
          <p className="mt-3 text-sm text-ink-soft">Comprehensive verification and alignment tools built for software engineers and the people hiring them.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl border border-line bg-surface/60 p-5 transition-colors hover:bg-white hover:shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon className="h-[18px] w-[18px]" /></span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-ink-soft">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer id="how-it-works" className="scroll-mt-16 border-t border-line bg-surface px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink">How to use Insight AI</h2>
            <p className="mt-2 text-sm text-ink-soft">A linear, guided workflow designed to bridge profile discrepancies in minutes.</p>
          </div>
          <ol className="mt-10 space-y-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4 rounded-xl border border-line bg-white p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-ink-mute">
            <Logo />
            <span>© {new Date().getFullYear()} Insight AI</span>
            <Link to="/privacy" className="hover:text-ink">Privacy & Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
