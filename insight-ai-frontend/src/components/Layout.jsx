import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Briefcase, CheckCircle2, ChevronsLeft, ChevronsRight, FileBarChart, FileText, GitCompare, Github,
  LayoutDashboard, Menu, Search, ShieldCheck, Target, X, AlertCircle, Info, LogOut, FlaskConical,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../lib/api.js';
import { Avatar, Badge, Button, Logo, PageLoader, cx } from './ui.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, tour: 'nav-dashboard' },
  { to: '/resume-analysis', label: 'Resume Analysis', icon: FileText, tour: 'nav-resume' },
  { to: '/github-analysis', label: 'GitHub Analysis', icon: Github, tour: 'nav-github' },
  { to: '/job-description', label: 'Job Description', icon: Briefcase, tour: 'nav-job' },
  { to: '/comparison', label: 'Comparison', icon: GitCompare, tour: 'nav-comparison' },
  { to: '/job-match', label: 'Job Match', icon: Target, tour: 'nav-match' },
  { to: '/reports', label: 'Reports', icon: FileBarChart, tour: 'nav-reports' },
];

const CRUMBS = {
  '/dashboard': 'Dashboard',
  '/resume-analysis': 'Resume Analysis',
  '/github-analysis': 'GitHub Analysis',
  '/job-description': 'Job Description',
  '/comparison': 'Comparison',
  '/job-match': 'Job Match',
  '/reports': 'Reports',
  '/profile': 'Profile & Settings',
  '/admin': 'Admin',
};

/* ---------- Route guards ---------- */

export function ProtectedRoute() {
  const { user, loading } = useApp();
  const loc = useLocation();
  if (loading) return <PageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <AppShell />;
}

export function AdminOnly({ children }) {
  const { user } = useApp();
  if (user?.role !== 'admin') return <Navigate to="/403" replace />;
  return children;
}

/* ---------- Shell ---------- */

function AppShell() {
  const { demo, exitDemo, collapsed } = useApp();
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => setDrawer(false), [loc.pathname]);

  return (
    <div className="flex h-full bg-surface">
      {drawer && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setDrawer(false)} aria-hidden />}
      <Sidebar drawer={drawer} closeDrawer={() => setDrawer(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {demo && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900">
            <FlaskConical className="h-3.5 w-3.5" /> Demo mode: showing sample data. Nothing is saved.
            <button
              className="ml-2 underline underline-offset-2"
              onClick={() => {
                exitDemo();
                navigate('/');
              }}
            >
              Exit demo
            </button>
          </div>
        )}
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="scroll-thin flex-1 overflow-y-auto" id="main">
          <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
      <Tour />
    </div>
  );
}

/* ---------- Sidebar ---------- */

function Sidebar({ drawer, closeDrawer }) {
  const { user, collapsed, toggleCollapsed, logout } = useApp();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const items = isAdmin ? [...NAV, { to: '/admin', label: 'Admin', icon: ShieldCheck, tour: 'nav-admin', badge: 'Admin' }] : NAV;
  const narrow = collapsed && !drawer; // icons only (desktop collapsed)

  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-white transition-all duration-300 lg:static lg:translate-x-0',
        drawer ? 'translate-x-0' : '-translate-x-full',
        narrow ? 'w-[68px]' : 'w-[232px]'
      )}
      aria-label="Main navigation"
    >
      <div className={cx('flex h-14 items-center border-b border-line px-4', narrow && 'justify-center px-0')}>
        {narrow ? (
          <Link to="/dashboard" aria-label="Insight AI home">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l5-5 4 4 7-8" /><path d="M15 8h5v5" /></svg>
            </span>
          </Link>
        ) : (
          <Link to="/dashboard"><Logo /></Link>
        )}
        <button onClick={closeDrawer} className="ml-auto text-ink-mute lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>

      <nav className="scroll-thin flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {items.map(({ to, label, icon: Icon, tour, badge }) => (
          <NavLink
            key={to}
            to={to}
            data-tour={tour}
            title={narrow ? label : undefined}
            aria-label={label}
            className={({ isActive }) =>
              cx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                narrow && 'justify-center px-0',
                isActive ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-surface hover:text-ink'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r bg-brand" />}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!narrow && <span className="flex-1 truncate">{label}</span>}
                {!narrow && badge && <Badge tone="amber">{badge}</Badge>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-2.5">
        <button
          onClick={toggleCollapsed}
          className="mb-2 hidden w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs text-ink-mute hover:bg-surface lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
        </button>
        <Link
          to="/profile"
          data-tour="nav-profile"
          title={narrow ? user?.name : undefined}
          className={cx('flex items-center gap-2.5 rounded-lg p-2 hover:bg-surface', narrow && 'justify-center')}
        >
          <Avatar name={user?.name} size={32} />
          {!narrow && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold text-ink">{user?.name}</span>
              <span className="block truncate text-[11px] text-ink-mute">@{user?.githubUsername}</span>
            </span>
          )}
        </Link>
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className={cx('mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-mute hover:bg-surface hover:text-ink', narrow && 'justify-center')}
          aria-label="Log out"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!narrow && 'Log out'}
        </button>
      </div>
    </aside>
  );
}

/* ---------- Top bar ---------- */

function Topbar({ onMenu }) {
  const { user } = useApp();
  const loc = useLocation();
  const title = CRUMBS[loc.pathname] || 'Workspace';

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onMenu} className="rounded-lg p-1.5 text-ink-soft hover:bg-surface lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-ink-mute md:flex">
        <span>Platform</span>
        <span>/</span>
        <span>Workspace</span>
        <span>/</span>
        <span className="font-medium text-ink">{title}</span>
      </nav>
      <h2 className="text-sm font-semibold text-ink md:hidden">{title}</h2>
      <div className="mx-auto hidden max-w-md flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <Notifications />
        <Link to="/profile" aria-label="Profile"><Avatar name={user?.name} size={30} /></Link>
      </div>
    </header>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const box = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onClick = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        setResults(await api.get(`/api/search?q=${encodeURIComponent(q.trim())}`));
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const groups = results.reduce((acc, r) => ((acc[r.type] ||= []).push(r), acc), {});

  return (
    <div className="relative" ref={box}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search resumes, repos, jobs, reports"
        aria-label="Global search"
        className="w-full rounded-lg border border-line bg-surface py-1.5 pl-9 pr-14 text-sm placeholder:text-ink-mute/80 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10px] text-ink-mute">Ctrl K</kbd>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-pop">
          {busy && <p className="px-3 py-2 text-xs text-ink-mute">Searching…</p>}
          {!busy && !results.length && <p className="px-3 py-2 text-xs text-ink-mute">No saved items match “{q}”.</p>}
          {Object.entries(groups).map(([type, items]) => (
            <div key={type} className="mb-1">
              <p className="px-3 pt-2 text-[11px] font-semibold text-ink-mute">{type}</p>
              {items.map((it) => (
                <button
                  key={it.title}
                  onClick={() => {
                    navigate(it.link);
                    setOpen(false);
                    setQ('');
                  }}
                  className="block w-full truncate rounded-lg px-3 py-1.5 text-left text-sm text-ink hover:bg-surface"
                >
                  {it.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const box = useRef(null);
  const navigate = useNavigate();
  const { demo } = useApp();

  const load = useCallback(async () => {
    try {
      setItems(await api.get('/api/notifications'));
    } catch {
      /* the bell fails quietly */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load, demo]);

  useEffect(() => {
    const onClick = (e) => !box.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((n) => !n.read).length;
  const markAll = async () => {
    await api.patch('/api/notifications/read');
    setItems((s) => s.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={box} data-tour="bell">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-ink-soft hover:bg-surface" aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <button onClick={markAll} disabled={!unread} className="text-xs font-medium text-brand disabled:text-ink-mute">Mark all as read</button>
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {!items.length && <li className="px-4 py-6 text-center text-sm text-ink-mute">You are all caught up.</li>}
            {items.map((n) => (
              <li key={n._id}>
                <button
                  onClick={() => {
                    navigate(n.link);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface"
                >
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-300' : 'bg-brand')} />
                  <span>
                    <span className="block text-sm text-ink">{n.message}</span>
                    <span className="text-xs text-ink-mute">{n.time}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- Toasts ---------- */

function Toaster() {
  const { toasts, dismissToast } = useApp();
  const icon = { success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, error: <AlertCircle className="h-4 w-4 text-red-600" />, info: <Info className="h-4 w-4 text-brand" /> };
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex animate-toastIn items-start gap-2.5 rounded-xl border border-line bg-white p-3 shadow-pop">
          <span className="mt-0.5">{icon[t.type] || icon.info}</span>
          <p className="flex-1 text-sm text-ink">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="text-ink-mute hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Product tour (spotlight) ---------- */

const TOUR = [
  { sel: '[data-tour="nav-dashboard"]', title: 'Your dashboard', text: 'See progress, recent activity and what to do next.' },
  { sel: '#main input, header input[aria-label="Global search"]', title: 'Global search', text: 'Find any saved resume, repository, job, match or report. Press Ctrl K from anywhere.' },
  { sel: '[data-tour="bell"]', title: 'Notifications', text: 'Long analyses keep running in the background and ping you here when they finish.' },
  { sel: '[data-tour="nav-resume"]', title: 'Resume Analysis', text: 'Upload a PDF to get scores, skills and suggestions. Every upload is saved as a version.' },
  { sel: '[data-tour="nav-github"]', title: 'GitHub Analysis', text: 'Analyze a username or repository. You get 15 analyses per day.' },
  { sel: '[data-tour="nav-job"]', title: 'Job Description', text: 'Paste a job posting to extract skills, responsibilities and a learning roadmap.' },
  { sel: '[data-tour="nav-comparison"]', title: 'Comparison', text: 'Check which resume claims are backed up by your GitHub code.' },
  { sel: '[data-tour="nav-match"]', title: 'Job Match', text: 'Combine resume, GitHub and a job to get a compatibility score and gap plan.' },
  { sel: '[data-tour="nav-reports"]', title: 'Reports', text: 'Pick sections and download a formal PDF dossier.' },
];

function Tour() {
  const { tourOpen, finishTour } = useApp();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  const step = TOUR[i];
  useLayoutEffect(() => {
    if (!tourOpen) return;
    const place = () => {
      const el = [...document.querySelectorAll(step.sel)].find((e) => e.offsetParent !== null);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [tourOpen, i, step.sel]);

  if (!tourOpen) return null;
  const last = i === TOUR.length - 1;
  const pop = rect
    ? { top: Math.min(window.innerHeight - 190, Math.max(12, rect.top)), left: Math.min(window.innerWidth - 320, rect.right + 14) }
    : { top: 96, left: 24 };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-label="Product tour">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-white transition-all duration-300"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: '0 0 0 9999px rgba(17,24,39,.55)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-ink/55" />
      )}
      <div className="absolute w-[300px] animate-fadeIn rounded-xl bg-white p-4 shadow-pop" style={pop}>
        <p className="text-xs text-ink-mute">Step {i + 1} of {TOUR.length}</p>
        <h3 className="mt-1 text-sm font-semibold text-ink">{step.title}</h3>
        <p className="mt-1 text-sm text-ink-soft">{step.text}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => { finishTour(); setI(0); }} className="text-xs text-ink-mute hover:text-ink">Skip tour</button>
          <div className="flex gap-2">
            {i > 0 && <Button size="sm" variant="secondary" onClick={() => setI(i - 1)}>Back</Button>}
            <Button size="sm" onClick={() => (last ? (finishTour(), setI(0)) : setI(i + 1))}>{last ? 'Finish' : 'Next'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
