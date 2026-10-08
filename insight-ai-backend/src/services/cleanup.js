import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';
import { Comparison, GithubAnalysis, JobDescription, JobMatch, Notification, Report, Resume, UsageCounter, User } from '../models/index.js';

// Deletes everything a user owns. `keepAccount` = "Delete all my data"; otherwise also removes the account.
export async function purgeUser(userId, { keepAccount }) {
  await Promise.all([
    Resume.deleteMany({ userId }), GithubAnalysis.deleteMany({ userId }), JobDescription.deleteMany({ userId }),
    Comparison.deleteMany({ userId }), JobMatch.deleteMany({ userId }), Report.deleteMany({ userId }),
    Notification.deleteMany({ userId }), UsageCounter.deleteMany({ userId }),
  ]);
  await Promise.all(['resumes', 'reports'].map((d) => fs.rm(path.join(config.storageDir, d, String(userId)), { recursive: true, force: true })));
  if (keepAccount) await User.updateOne({ _id: userId }, { $unset: { defaultResumeId: 1 } });
  else await User.deleteOne({ _id: userId });
}

export async function removeFile(filePath) {
  if (!filePath) return;
  try {
    await fs.rm(filePath, { force: true });
  } catch {
    /* already gone */
  }
}

export async function saveFile(dir, userId, name, buffer) {
  const folder = path.join(config.storageDir, dir, String(userId));
  await fs.mkdir(folder, { recursive: true });
  const full = path.join(folder, name);
  await fs.writeFile(full, buffer);
  return full;
}
