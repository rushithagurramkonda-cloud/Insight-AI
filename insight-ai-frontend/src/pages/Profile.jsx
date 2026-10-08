import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { api } from '../lib/api.js';
import { useFetch } from '../lib/hooks.js';
import { useApp } from '../context/AppContext.jsx';
import {
  Avatar, Badge, Button, Card, ConfirmDialog, ErrorState, PageHeader, PageLoader, SectionTitle, Tip, Toggle, cx,
} from '../components/ui.jsx';

export default function Profile({ adminView = false }) {
  const { user, setUser, toast, logout, setTourOpen, demo } = useApp();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState(adminView && isAdmin ? 'admin' : 'profile');
  useEffect(() => { setTab(adminView && isAdmin ? 'admin' : 'profile'); }, [adminView, isAdmin]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Profile Settings & System Administration' : 'Profile settings'}
        subtitle="Manage your account, preferences and your data."
      />
      {isAdmin && (
        <div role="tablist" className="inline-flex rounded-lg bg-lavender p-1 text-sm font-medium">
          {[['profile', 'Profile and preferences', UserRound], ['admin', 'Admin overview', ShieldCheck]].map(([k, l, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cx('flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors', tab === k ? 'bg-white text-brand shadow-card' : 'text-ink-soft hover:text-ink')}>
              <Icon className="h-4 w-4" /> {l}
            </button>
          ))}
        </div>
      )}
      {tab === 'admin' && isAdmin ? <AdminPanel /> : <ProfilePanel user={user} setUser={setUser} toast={toast} logout={logout} setTourOpen={setTourOpen} demo={demo} />}
    </div>
  );
}

/* ---------------- Profile ---------------- */

function ProfilePanel({ user, setUser, toast, logout, setTourOpen, demo }) {
  const resumes = useFetch('/api/resumes', { silent: true });
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [priv, setPriv] = useState(!!user?.privateRepos);
  const [defaultId, setDefaultId] = useState(user?.defaultResumeId || '');
  const [dataDlg, setDataDlg] = useState(false);
  const [acctDlg, setAcctDlg] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = resumes.data?.find((r) => r.isDefault);
    if (d) setDefaultId(d._id);
  }, [resumes.data]);

  const save = async () => {
    if (!name.trim()) return toast('Enter a display name.', 'error');
    setSaving(true);
    try {
      await api.patch('/api/me', { name: name.trim() });
      setUser((u) => ({ ...u, name: name.trim() }));
      toast('Profile saved.', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  const changeDefault = async (id) => {
    setDefaultId(id);
    try {
      await api.patch(`/api/resumes/${id}`, { isDefault: true });
      toast('Default resume updated.', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const changePrivate = async (v) => {
    setPriv(v);
    if (v && !demo) {
      toast('Redirecting to GitHub to approve private repository access…', 'info');
      setTimeout(() => { window.location.href = '/auth/github?scope=repo'; }, 900);
    } else {
      try { await api.patch('/api/me', { privateRepos: v }); setUser((u) => ({ ...u, privateRepos: v })); } catch (e) { toast(e.message, 'error'); }
    }
  };

  const purge = async () => {
    setBusy(true);
    try { await api.del('/api/me/data'); toast('All your analyses, resumes, jobs, matches and reports were deleted.', 'success'); setDataDlg(false); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const removeAccount = async () => {
    setBusy(true);
    try { await api.del('/api/me'); toast('Account deleted.', 'success'); await logout(); window.location.href = '/'; }
    catch (e) { toast(e.message, 'error'); setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card className="h-fit p-6 text-center">
        <Avatar name={user?.name} size={84} className="mx-auto" />
        <h2 className="mt-4 text-lg font-bold text-ink">{user?.name}</h2>
        <p className="mt-1 text-xs text-ink-mute">@{user?.username}</p>
        <p className="text-xs text-ink-mute">GitHub: @{user?.githubUsername}</p>
        {user?.role === 'admin' && <Badge tone="amber" className="mt-3">Administrator</Badge>}
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-left text-xs">
          {user?.title && <div className="flex justify-between"><dt className="text-ink-mute">Role</dt><dd className="font-medium text-ink">{user.title}</dd></div>}
          {user?.organization && <div className="flex justify-between"><dt className="text-ink-mute">Organization</dt><dd className="font-medium text-ink">{user.organization}</dd></div>}
          {user?.memberSince && <div className="flex justify-between"><dt className="text-ink-mute">Member since</dt><dd className="font-medium text-ink">{user.memberSince}</dd></div>}
        </dl>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <SectionTitle hint="Your name and GitHub username come from GitHub">Account</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="p-name">Display name</label><input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="label" htmlFor="p-gh">GitHub username</label><input id="p-gh" className="input bg-surface" value={user?.githubUsername || ''} readOnly /></div>
          </div>
          <div className="mt-4 flex justify-end"><Button onClick={save} loading={saving} disabled={name.trim() === user?.name}>Save changes</Button></div>
        </Card>

        <Card className="p-6">
          <SectionTitle hint="These settings apply across the whole workspace">Preferences</SectionTitle>
          <div className="space-y-5">
            <div>
              <label className="label" htmlFor="p-def">Default resume <Tip text="Comparison and Job Match use this resume unless you pick another one." /></label>
              <select id="p-def" className="input max-w-sm" value={defaultId} onChange={(e) => changeDefault(e.target.value)} disabled={!resumes.data?.length}>
                {!resumes.data?.length && <option value="">No resumes uploaded yet</option>}
                {resumes.data?.map((r) => <option key={r._id} value={r._id}>{r.label}</option>)}
              </select>
              {!resumes.data?.length && !resumes.loading && <p className="mt-1 text-xs text-ink-mute">Upload one on the <Link to="/resume-analysis" className="font-medium text-brand">Resume Analysis</Link> page.</p>}
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-line pt-4">
              <div><p className="text-sm font-medium text-ink">Include private repositories</p><p className="text-xs text-ink-mute">Asks GitHub for extra permission so private code can be analyzed.</p></div>
              <Toggle checked={priv} onChange={changePrivate} label="Include private repositories" />
            </div>
            <div className="flex items-start justify-between gap-4 border-t border-line pt-4">
              <div><p className="text-sm font-medium text-ink">Product tour</p><p className="text-xs text-ink-mute">Take the guided walkthrough of every feature again.</p></div>
              <Button variant="secondary" size="sm" onClick={() => setTourOpen(true)}>Replay tour</Button>
            </div>
          </div>
        </Card>

        <Card className="border-red-200 p-6">
          <SectionTitle hint="These actions cannot be undone"><span className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" /> Danger zone</span></SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-red-200 p-4">
              <p className="text-sm font-semibold text-ink">Delete all my data</p>
              <p className="mt-1 text-xs text-ink-soft">Removes every resume, analysis, job, match and report. Your account stays.</p>
              <Button variant="dangerOutline" size="sm" className="mt-3" icon={Trash2} onClick={() => setDataDlg(true)}>Delete all my data</Button>
            </div>
            <div className="rounded-xl border border-red-200 p-4">
              <p className="text-sm font-semibold text-ink">Delete account</p>
              <p className="mt-1 text-xs text-ink-soft">Removes your account and everything in it.</p>
              <Button variant="danger" size="sm" className="mt-3" icon={Trash2} onClick={() => setAcctDlg(true)}>Delete account</Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog open={dataDlg} onClose={() => setDataDlg(false)} onConfirm={purge} loading={busy} typeToConfirm="DELETE" confirmLabel="Delete all my data"
        title="Delete all your data?" text="Every resume, GitHub analysis, job description, comparison, match and report will be permanently deleted. Your account will remain." />
      <ConfirmDialog open={acctDlg} onClose={() => setAcctDlg(false)} onConfirm={removeAccount} loading={busy} typeToConfirm="DELETE" confirmLabel="Delete account"
        title="Delete your account?" text="Your account and all of its data will be permanently deleted. You can sign in again with GitHub to start fresh." />
    </div>
  );
}

/* ---------------- Admin ---------------- */

function AdminPanel() {
  const stats = useFetch('/api/admin/stats');
  const users = useFetch('/api/admin/users');
  const log = useFetch('/api/admin/analyses');
  const { toast } = useApp();
  const [filter, setFilter] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  if (stats.loading || users.loading) return <PageLoader label="Loading platform data" />;
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />;

  const rows = (users.data || []).filter((u) => (u.name + u.handle).toLowerCase().includes(filter.toLowerCase()));

  const act = async (kind) => {
    setBusy(true);
    try {
      if (kind === 'delete') await api.del(`/api/admin/users/${target.handle}`);
      else await api.patch(`/api/admin/users/${target.handle}`, { suspended: target.status !== 'Suspended' });
      toast(kind === 'delete' ? 'User deleted.' : 'User updated.', 'success');
      setTarget(null);
      users.reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle hint="Updated live from the analysis pipeline">Platform telemetry</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.data.map((s) => (
            <Card key={s.k} className="p-5"><p className="text-xs font-medium text-ink-mute">{s.k}</p><p className="mt-2 text-3xl font-bold text-ink">{s.v}</p><p className="mt-1 text-xs text-ink-mute">{s.sub}</p></Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle hint="Open any user's analyses in read-only view" right={<input className="input w-56" placeholder="Filter users" aria-label="Filter users" value={filter} onChange={(e) => setFilter(e.target.value)} />}>Platform users and analysis oversight</SectionTitle>
        <Card className="overflow-hidden">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs text-ink-mute"><tr><th className="px-4 py-3 font-medium">User</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Analyses</th><th className="px-4 py-3 font-medium">Last active</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.handle} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={u.name} size={28} /><span><span className="block font-semibold text-ink">{u.name}</span><span className="text-xs text-ink-mute">@{u.handle}</span></span></div></td>
                    <td className="px-4 py-3"><Badge tone={u.role === 'Admin' ? 'amber' : 'slate'}>{u.role}</Badge></td>
                    <td className="px-4 py-3 text-ink-soft">{u.analyses}</td>
                    <td className="px-4 py-3 text-ink-soft">{u.active}</td>
                    <td className="px-4 py-3"><Badge tone={u.status === 'Active' ? 'green' : 'red'}>{u.status}</Badge></td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setTarget(u)}>Manage</Button></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-mute">No users match “{filter}”.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle hint="Latest runs across all users">Recent analysis pipeline log</SectionTitle>
        <Card className="divide-y divide-line">
          {(log.data || []).map((l) => (
            <div key={l.text} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Badge tone={l.status === 'Completed' ? 'green' : 'red'}>{l.status}</Badge>
              <p className="min-w-0 flex-1 text-sm text-ink">{l.text}</p>
              <span className="text-xs text-ink-mute">@{l.by} · {l.time} · {l.ms}</span>
            </div>
          ))}
        </Card>
      </section>

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setTarget(null)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label={`Manage ${target.name}`} className="relative w-full max-w-md animate-fadeIn rounded-2xl bg-white p-6 shadow-pop">
            <h2 className="text-lg font-semibold text-ink">Manage {target.name}</h2>
            <p className="mt-1 text-sm text-ink-soft">@{target.handle} · {target.analyses} analyses · {target.status}</p>
            <p className="mt-3 text-xs text-ink-mute">Every admin action is recorded in the audit log.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setTarget(null)}>Close</Button>
              <Button variant="secondary" loading={busy} onClick={() => act('suspend')}>{target.status === 'Suspended' ? 'Unsuspend user' : 'Suspend user'}</Button>
              <Button variant="danger" loading={busy} onClick={() => act('delete')}>Delete user</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
