// unpdf wraps a current build of pdf.js, so it reads modern PDFs that older parsers choke on.
import { extractText, getDocumentProxy } from 'unpdf';
import { HttpError } from '../utils/errors.js';

export async function extractPdfText(buffer) {
  let text;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    if (pdf.numPages > 12) throw new HttpError(422, 'This PDF has more than 12 pages. Upload a shorter resume.', 'PDF_TOO_LONG');
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(422, 'We could not read this PDF. It may be corrupted or password protected.', 'PDF_UNREADABLE');
  }
  text = String(text || '').replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 80) {
    throw new HttpError(422, 'No selectable text was found. Scanned PDFs are not supported. Export your resume from your editor as a PDF instead.', 'PDF_NO_TEXT');
  }
  return text;
}
