import { Router } from 'express';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { userDto } from '../services/dto.js';
import { purgeUser } from '../services/cleanup.js';
import { clearSessionCookie } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => res.json(userDto(req.user)));

router.patch('/', asyncHandler(async (req, res) => {
  const { name, privateRepos } = req.body || {};
  if (name !== undefined) {
    const n = String(name).trim();
    if (!n || n.length > 80) throw new HttpError(400, 'Enter a display name up to 80 characters.', 'BAD_INPUT');
    req.user.name = n;
  }
  if (privateRepos === false) {
    // Turning private access off only forgets the extra scope on our side. GitHub keeps the grant until revoked there.
    req.user.tokenScope = (req.user.tokenScope || '').split(/[ ,]+/).filter((s) => s && s !== 'repo').join(' ');
  } else if (privateRepos === true && !/\brepo\b/.test(req.user.tokenScope || '')) {
    throw new HttpError(409, 'Private repository access has not been approved on GitHub yet. Use the approval link in Profile.', 'SCOPE_NEEDED');
  }
  await req.user.save();
  res.json(userDto(req.user));
}));

router.delete('/data', asyncHandler(async (req, res) => {
  await purgeUser(req.user._id, { keepAccount: true });
  res.json({ ok: true });
}));

router.delete('/', asyncHandler(async (req, res) => {
  await purgeUser(req.user._id, { keepAccount: false });
  clearSessionCookie(res);
  res.json({ ok: true });
}));

export default router;
