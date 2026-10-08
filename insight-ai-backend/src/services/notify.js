import { Notification, PipelineLog } from '../models/index.js';
import { decrypt } from '../utils/crypto.js';

export async function notify(userId, type, message, link) {
  try {
    await Notification.create({ userId, type, message, link });
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}

// Wraps an AI/GitHub job: records duration and status for the admin pipeline log.
export async function runPipeline(user, kind, text, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    PipelineLog.create({ userId: user._id, kind, text, status: 'Completed', ms: Date.now() - t0 }).catch(() => {});
    return out;
  } catch (err) {
    PipelineLog.create({ userId: user._id, kind, text: `${text} failed: ${err.message}`.slice(0, 200), status: 'Failed', ms: Date.now() - t0 }).catch(() => {});
    throw err;
  }
}

export const githubToken = (user) => (user.tokenEnc ? decrypt(user.tokenEnc) : null);
