import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Info, Loader2, X, TrendingUp } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- Layout primitives ---------- */

export function Card({ className = '', children, ...p }) {
  return (
    <div className={cx('rounded-xl border border-line bg-white shadow-card', className)} {...p}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, hint, right }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-ink">{children}</h2>
        {hint && <p className="text-xs text-ink-mute">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Atoms ---------- */

const tones = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  brand: 'bg-brand-soft text-brand border-brand/15',
  lavender: 'bg-lavender text-indigo-700 border-indigo-100',
};

export const toneBox = {
  green: 'border-emerald-200 bg-emerald-500/10',
  amber: 'border-amber-200 bg-amber-500/10',
  red: 'border-red-200 bg-red-500/10',
  slate: 'border-slate-200 bg-slate-100/70',
};

export const toneText = { green: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700', slate: 'text-slate-600' };
export const toneBar = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', brand: 'bg-brand', slate: 'bg-slate-400' };

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Chip({ children, tone = 'lavender', className = '' }) {
  return (
    <span className={cx('inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium', tones[tone], className)}>{children}</span>
  );
}

export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden />;
}

const btn = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50',
  secondary: 'bg-white text-ink border border-line hover:bg-surface disabled:text-ink-mute',
  ghost: 'text-ink-soft hover:bg-lavender disabled:text-ink-mute',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  dangerOutline: 'border border-red-200 text-red-700 hover:bg-red-50',
};

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', disabled, ...p }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        btn[variant],
        className
      )}
      {...p}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Tip({ text }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button type="button" aria-label={text} className="rounded-full text-ink-mute hover:text-brand">
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-slate-300')}
    >
      <span className={cx('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
    </button>
  );
}

export function Checkbox({ checked, onChange, label, id }) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors', checked ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white')}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}

/* ---------- Motion helpers ---------- */

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useCountUp(target, duration = 900) {
  const [v, setV] = useState(reduced() ? target : 0);
  useEffect(() => {
    if (reduced()) {
      setV(target);
      return;
    }
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function ScoreRing({ value, size = 104, stroke = 9, label, sub, tone = 'brand', suffix = '' }) {
  const shown = useCountUp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  useEffect(() => {
    const t = setTimeout(() => setOffset(c * (1 - value / 100)), 60);
    return () => clearTimeout(t);
  }, [value, c]);
  const color = { brand: '#00404E', green: '#10B981', amber: '#F59E0B', red: '#EF4444' }[tone];
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9ECF6" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-ink">
          {shown}
          {suffix}
        </div>
      </div>
      {label && <div className="mt-2 text-sm font-semibold text-ink">{label}</div>}
      {sub && <div className="text-xs text-ink-mute">{sub}</div>}
    </div>
  );
}

export function Bar({ value, tone = 'brand', height = 'h-2' }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 60);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-slate-100', height)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full', toneBar[tone])} style={{ width: `${w}%`, transition: 'width .9s cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  );
}

export const scoreTone = (v) => (v >= 80 ? 'green' : v >= 55 ? 'amber' : 'red');

export function Expandable({ title, icon: Icon, badge, defaultOpen = false, children, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="flex-1 text-[15px] font-semibold text-ink">{title}</span>
        {badge}
        <ChevronDown className={cx('h-4 w-4 text-ink-mute transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cx('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-line px-5 py-4">{children}</div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Feedback ---------- */

export function ProgressSteps({ steps, current, title = 'Working on it' }) {
  const pct = Math.min(100, Math.round(((current + 1) / steps.length) * 100));
  return (
    <Card className="p-5" aria-live="polite">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Spinner /> {title}
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ol className="space-y-1.5 text-sm">
        {steps.map((s, i) => (
          <li key={s} className={cx('flex items-center gap-2', i < current ? 'text-ink-soft' : i === current ? 'font-medium text-ink' : 'text-ink-mute/60')}>
            {i < current ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : i === current ? <Spinner className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
            {s}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function EmptyState({ icon: Icon = TrendingUp, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-mute">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={cx('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-ink-mute" role="status">
      <Spinner className="h-5 w-5" /> {label}…
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      icon={X}
      title="Could not load this page"
      text={error?.message || 'Something went wrong. Try again in a moment.'}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}
    />
  );
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cx('relative w-full animate-fadeIn rounded-2xl bg-white p-6 shadow-pop', width)}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-ink-mute hover:text-ink">
          <X className="h-4 w-4" />
        </button>
        <h2 className="pr-6 text-lg font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-sm text-ink-soft">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// Confirm dialog. Pass `typeToConfirm="DELETE"` for destructive actions that need typing.
export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmLabel = 'Delete', typeToConfirm, loading }) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);
  const ok = !typeToConfirm || typed === typeToConfirm;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={!ok} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p>{text}</p>
      {typeToConfirm && (
        <div className="mt-4">
          <label className="label" htmlFor="confirm-type">Type {typeToConfirm} to confirm</label>
          <input id="confirm-type" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
      )}
    </Modal>
  );
}

export function Logo({ className = '', light = false }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <span className={cx('text-[17px] font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>
        Insight <span className={light ? 'text-teal-300' : 'text-brand-mid'}>AI</span>
      </span>
    </span>
  );
}

export function Avatar({ name = '', size = 32, className = '' }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
