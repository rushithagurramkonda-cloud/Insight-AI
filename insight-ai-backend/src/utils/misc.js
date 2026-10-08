import mongoose from 'mongoose';
import { HttpError } from './errors.js';

export const isId = (id) => mongoose.isValidObjectId(id);

// Loads a document owned by the user, or throws 404. Every query filters by userId.
export async function findOwned(Model, id, userId, what = 'Item') {
  if (!isId(id)) throw new HttpError(404, `${what} not found.`, 'NOT_FOUND');
  const doc = await Model.findOne({ _id: id, userId });
  if (!doc) throw new HttpError(404, `${what} not found.`, 'NOT_FOUND');
  return doc;
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(Number(n) || 0)));
export const safeName = (s) => String(s || 'user').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'user';
