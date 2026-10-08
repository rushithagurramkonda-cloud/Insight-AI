import multer from 'multer';
import { HttpError } from '../utils/errors.js';

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    cb(ok ? null : new HttpError(400, 'Only PDF files are supported. Export your resume as a PDF and try again.', 'BAD_FILE'), ok);
  },
});

export const uploadPdf = uploader.single('file');

// The first bytes of a real PDF are "%PDF". Checked in addition to the file name and MIME type.
export function assertPdfBuffer(buf) {
  if (!buf || buf.length < 8 || buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new HttpError(400, 'This file is not a valid PDF.', 'BAD_FILE');
  }
}
