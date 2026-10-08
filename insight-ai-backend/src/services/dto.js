// Converts database documents into the exact JSON the frontend reads.
import { timeAgo } from '../utils/time.js';

export const userDto = (u) => ({
  _id: String(u._id),
  name: u.name,
  githubUsername: u.githubUsername,
  username: u.githubUsername,
  title: u.title || '',
  organization: u.organization || '',
  role: u.role,
  avatarUrl: u.avatarUrl || '',
  defaultResumeId: u.defaultResumeId ? String(u.defaultResumeId) : '',
  tourCompleted: !!u.tourCompleted,
  privateRepos: /\brepo\b/.test(u.tokenScope || ''),
  memberSince: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
});

export const resumeItem = (r) => ({
  _id: String(r._id),
  label: r.label,
  fileName: r.fileName,
  date: r.createdAt,
  score: r.score,
  ats: r.ats,
  isDefault: !!r.isDefault,
  tags: r.tags || [],
});

export const jobItem = (j) => ({
  _id: String(j._id),
  name: j.name,
  title: j.title,
  company: j.company || 'Unknown',
  level: j.level || '',
  date: j.createdAt,
  match: j.match ?? null,
});

export const githubDto = (g, { cached }) => ({
  _id: String(g._id),
  target: g.target,
  type: g.type,
  cached,
  fetchedAt: timeAgo(g.fetchedAt),
  ...g.data,
});

export const githubItem = (g) => ({ _id: String(g._id), target: g.target, repos: g.data?.repos?.length || 0, date: g.fetchedAt });

export const comparisonDto = (c) => ({ _id: String(c._id), ...c.data });
export const matchDto = (m) => ({ _id: String(m._id), ...m.data });

export const reportItem = (r) => ({
  _id: String(r._id),
  name: r.name,
  date: r.createdAt,
  pages: r.pages,
  size: r.sizeBytes >= 1024 * 1024 ? `${(r.sizeBytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(r.sizeBytes / 1024))} KB`,
  sections: r.sections,
  badge: r.badge,
});
