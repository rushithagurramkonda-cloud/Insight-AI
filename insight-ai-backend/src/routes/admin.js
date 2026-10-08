import { Router } from 'express';
import {
  AuditLog, Comparison, GithubAnalysis, JobDescription, JobMatch, PipelineLog, Report, Resume, User,
} from '../models/index.js';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { startOfToday, timeAgo } from '../utils/time.js';
import { purgeUser } from '../services/cleanup.js';

const router = Router();
const MODELS = [Resume, GithubAnalysis, JobDescription, Comparison, JobMatch, Report];

router.get('/stats', asyncHandler(async (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const today = startOfToday();
  const [users, newUsers, perModelToday, done, failed, avg] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    Promise.all(MODELS.map((M) => M.countDocuments({ createdAt: { $gte: today } }))),
    PipelineLog.countDocuments({ status: 'Completed', createdAt: { $gte: monthAgo } }),
    PipelineLog.countDocuments({ status: 'Failed', createdAt: { $gte: monthAgo } }),
    JobMatch.aggregate([{ $group: { _id: null, avg: { $avg: '$overall' } } }]),
  ]);
  const runs = done + failed;
  res.json([
    { k: 'Total customers', v: users.toLocaleString('en-US'), sub: `+${newUsers} this week` },
    { k: 'Analyses today', v: String(perModelToday.reduce((a, b) => a + b, 0)), sub: 'across all tools' },
    { k: 'Pipeline uptime', v: runs ? `${((done / runs) * 100).toFixed(1)}%` : 'No runs yet', sub: 'last 30 days' },
    { k: 'Avg. match score', v: avg[0] ? `${Math.round(avg[0].avg)}%` : 'No matches yet', sub: 'all users' },
  ]);
}));

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find().sort({ lastActiveAt: -1 }).limit(200);
  const counts = await Promise.all(MODELS.map((M) => M.aggregate([{ $group: { _id: '$userId', n: { $sum: 1 } } }])));
  const totals = {};
  counts.flat().forEach((c) => { totals[String(c._id)] = (totals[String(c._id)] || 0) + c.n; });
  res.json(users.map((u) => ({
    name: u.name, handle: u.githubUsername, role: u.role === 'admin' ? 'Admin' : 'User',
    analyses: totals[String(u._id)] || 0, active: u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'Never', status: u.suspended ? 'Suspended' : 'Active',
  })));
}));

async function targetUser(req) {
  const u = await User.findOne({ githubUsername: new RegExp(`^${req.params.handle.replace(/[^\w-]/g, '')}$`, 'i') });
  if (!u) throw new HttpError(404, 'User not found.', 'NOT_FOUND');
  if (String(u._id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own account from the admin panel.', 'SELF');
  return u;
}

router.patch('/users/:handle', asyncHandler(async (req, res) => {
  const u = await targetUser(req);
  if (typeof req.body?.suspended !== 'boolean') throw new HttpError(400, 'Nothing to update.', 'BAD_INPUT');
  u.suspended = req.body.suspended;
  await u.save();
  await AuditLog.create({ adminId: req.user._id, action: u.suspended ? 'suspend_user' : 'unsuspend_user', targetHandle: u.githubUsername });
  res.json({ ok: true });
}));

router.delete('/users/:handle', asyncHandler(async (req, res) => {
  const u = await targetUser(req);
  await purgeUser(u._id, { keepAccount: false });
  await AuditLog.create({ adminId: req.user._id, action: 'delete_user', targetHandle: u.githubUsername });
  res.json({ ok: true });
}));

router.get('/analyses', asyncHandler(async (req, res) => {
  const logs = await PipelineLog.find().sort({ createdAt: -1 }).limit(15).populate('userId', 'githubUsername');
  res.json(logs.map((l) => ({
    text: l.text, by: l.userId?.githubUsername || 'deleted-user', time: timeAgo(l.createdAt), status: l.status, ms: `${(l.ms / 1000).toFixed(1)} s`,
  })));
}));

export default router;
