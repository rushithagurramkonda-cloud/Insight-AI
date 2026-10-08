import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleUserRound, Github, Info } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Button, Checkbox, Logo, Tip, cx } from '../components/ui.jsx';

export default function Login({ mode = 'signin' }) {
  const { user, loading, enterDemo, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [remember, setRemember] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const oauthError = params.get('error');

  useEffect(() => {
    if (oauthError) toast('GitHub sign-in was cancelled or failed. Try again.', 'error');
  }, [oauthError, toast]);

  if (!loading && user) return <Navigate to={location.state?.from || '/dashboard'} replace />;

  const signIn = () => {
    setRedirecting(true);
    // The backend handles the OAuth redirect and sets the session cookie.
    window.location.href = `/auth/github?remember=${remember ? 1 : 0}`;
  };

  const tryDemo = () => {
    enterDemo();
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="flex h-14 items-center justify-between border-b border-line/60 bg-white/80 px-6 backdrop-blur">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-soft sm:flex">
          <Link to="/" className="hover:text-ink">Back to Platform</Link>
          <Link to="/#how-it-works" className="hover:text-ink">Documentation</Link>
        </nav>
        <CircleUserRound className="h-8 w-8 text-brand" aria-hidden />
      </header>

      <main className="bg-grid relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-10 bottom-10 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" aria-hidden />

        <div className="relative w-full max-w-[334px]">
          <div className="rounded-xl border border-line bg-white p-6 shadow-pop animate-fadeIn">
            <div className="flex items-start justify-between">
              <h1 className="text-lg font-bold text-ink">Insight <span className="text-brand-mid">AI</span></h1>
              <span className="rounded-full bg-lavender px-2 py-0.5 text-[11px] font-medium text-indigo-700">v2.4.0</span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-ink-soft">
              Sign in to <span className="text-brand-mid">bridge</span> the gap between your resume claims, GitHub codebase reality, and target job specs.
            </p>

            <div role="tablist" className="mt-5 grid grid-cols-2 rounded-lg bg-lavender p-1 text-[13px] font-medium">
              {[['signin', 'Sign In', '/login'], ['register', 'Create Account', '/register']].map(([k, label, to]) => (
                <Link
                  key={k}
                  to={to}
                  role="tab"
                  aria-selected={mode === k}
                  className={cx('rounded-md py-1.5 text-center transition-colors', mode === k ? 'bg-white text-brand shadow-card' : 'text-ink-soft hover:text-ink')}
                >
                  {label}
                </Link>
              ))}
            </div>

            {mode === 'register' && (
              <p className="mt-3 text-xs text-ink-mute">New here? Signing in with GitHub creates your account automatically.</p>
            )}

            <Button onClick={signIn} loading={redirecting} icon={Github} className="mt-4 w-full py-2.5">
              Continue with GitHub
            </Button>

            <p className="mt-3 text-center text-[11px] leading-4 text-ink-mute">
              Requests read-only access to public repositories and profile data. Private repository access is only requested if you enable it later in Profile.
            </p>

            <div className="mt-4 flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
                <Checkbox checked={remember} onChange={setRemember} label="Remember me" />
                Remember me
              </label>
              <Tip text="Stay signed in for 30 days on this device. Otherwise your session ends when you close the browser." />
            </div>

            <button onClick={tryDemo} className="mt-4 w-full rounded-lg border border-line py-2 text-xs font-medium text-ink-soft hover:bg-surface">
              Try demo mode with sample data
            </button>

            <div className="mt-4 flex items-center justify-center gap-3 border-t border-line pt-4 text-[11px] text-ink-mute">
              <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-ink">Terms of Service</Link>
              <span>•</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> System Status</span>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-mute">
            <Info className="h-3 w-3" /> Your resume and repository content is analyzed by AI on our server only.
          </p>
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 bg-lavender/60 px-6 py-4 text-[11px] text-ink-mute">
        <span>© {new Date().getFullYear()} Insight AI. Engineering intelligence platform.</span>
        <span className="flex gap-5">
          <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link>
          <Link to="/privacy" className="hover:text-ink">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-ink">Security Overview</Link>
        </span>
      </footer>
    </div>
  );
}
