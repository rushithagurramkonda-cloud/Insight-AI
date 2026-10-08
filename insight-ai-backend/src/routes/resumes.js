import { Router } from 'express';
import { Comparison, JobMatch, Resume, User } from '../models/index.js';
import { asyncHandler, HttpError } from '../utils/errors.js';
import { findOwned } from '../utils/misc.js';
import { assertPdfBuffer, uploadPdf } from '../middleware/upload.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { extractPdfText } from '../services/pdfText.js';
import { generateJson } from '../services/gemini.js';
import { resumePrompt } from '../services/prompts.js';
import { normalizeResume, resumeTags } from '../services/normalize.js';
import { notify, runPipeline } from '../services/notify.js';
import { removeFile, saveFile } from '../services/cleanup.js';
import { resumeItem } from '../services/dto.js';
import { buildSingle } from '../services/pdfBuilder.js';

const router = Router();

async function analyze(user, text, fileName) {
  const raw = await runPipeline(user, 'resume', `Resume analysis for ${fileName}`, () => generateJson(resumePrompt(text)));
  const analysis = normalizeResume(raw);
  return { analysis, score: analysis.scores.resume, ats: analysis.scores.ats, tags: resumeTags(analysis) };
}

router.get('/', asyncHandler(async (req, res) => {
  const list = await Resume.find({ userId: req.user._id }).select('-extractedText -analysis').sort({ createdAt: -1 });
  res.json(list.map(resumeItem));
}));

router.post('/', aiLimiter, (req, res, next) => uploadPdf(req, res, (err) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'This file is larger than 5 MB. Compress it and try again.', 'TOO_LARGE'));
  next(err);
}), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a PDF file to upload.', 'NO_FILE');
  assertPdfBuffer(req.file.buffer);
  const text = await extractPdfText(req.file.buffer);

  const count = await Resume.countDocuments({ userId: req.user._id });
  const given = String(req.body?.label || '').trim().slice(0, 80);
  const label = given || `Resume v${count + 1} - ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const result = await analyze(req.user, text, req.file.originalname);
  const resume = new Resume({
    userId: req.user._id, label, fileName: req.file.originalname.slice(0, 120), extractedText: text.slice(0, 60000),
    ...result, isDefault: count === 0,
  });
  resume.filePath = await saveFile('resumes', req.user._id, `${resume._id}.pdf`, req.file.buffer);
  await resume.save();
  if (count === 0) await User.updateOne({ _id: req.user._id }, { defaultResumeId: resume._id });

  notify(req.user._id, 'resume', `Resume "${label}" analyzed with a score of ${resume.score}`, '/resume-analysis');
  res.status(201).json(resumeItem(resume));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const r = await findOwned(Resume, req.params.id, req.user._id, 'Resume');
  res.json({ ...resumeItem(r), analysis: r.analysis });
}));

router.get('/:id/pdf', asyncHandler(async (req, res) => {
  const resume = await findOwned(Resume, req.params.id, req.user._id, 'Resume');
  const buf = await buildSingle('resume', { user: req.user, resume });
  res.type('application/pdf').send(buf);
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const r = await findOwned(Resume, req.params.id, req.user._id, 'Resume');
  const { label, isDefault } = req.body || {};
  if (label !== undefined) {
    const l = String(label).trim();
    if (!l || l.length > 80) throw new HttpError(400, 'Enter a version label up to 80 characters.', 'BAD_INPUT');
    r.label = l;
  }
  if (isDefault === true) {
    await Resume.updateMany({ userId: req.user._id }, { isDefault: false });
    r.isDefault = true;
    await User.updateOne({ _id: req.user._id }, { defaultResumeId: r._id });
  }
  await r.save();
  res.json(resumeItem(r));
}));

router.post('/:id/rerun', aiLimiter, asyncHandler(async (req, res) => {
  const r = await findOwned(Resume, req.params.id, req.user._id, 'Resume');
  Object.assign(r, await analyze(req.user, r.extractedText, r.fileName));
  await r.save();
  res.json(resumeItem(r));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const r = await findOwned(Resume, req.params.id, req.user._id, 'Resume');
  await Promise.all([Comparison.deleteMany({ resumeId: r._id }), JobMatch.deleteMany({ resumeId: r._id }), removeFile(r.filePath)]);
  await r.deleteOne();
  if (r.isDefault) {
    const next = await Resume.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
      await User.updateOne({ _id: req.user._id }, { defaultResumeId: next._id });
    } else await User.updateOne({ _id: req.user._id }, { $unset: { defaultResumeId: 1 } });
  }
  res.json({ ok: true });
}));

export default router;
