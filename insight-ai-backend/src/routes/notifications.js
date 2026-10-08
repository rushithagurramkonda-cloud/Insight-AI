import { Router } from 'express';
import { Notification } from '../models/index.js';
import { asyncHandler } from '../utils/errors.js';
import { timeAgo } from '../utils/time.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json(list.map((n) => ({ _id: String(n._id), type: n.type, message: n.message, link: n.link || '/dashboard', read: n.read, time: timeAgo(n.createdAt) })));
}));

router.patch('/read', asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}));

export default router;
