import { isDemo } from './api.js';
import { demoPdfLines } from './demo.js';
import { downloadBlob, makePdfBlob } from './pdf.js';

// Downloads a single-analysis PDF.
//  - Normal mode: GET {path} on the backend (PDFKit) and save the blob.
//  - Demo mode:   builds a small PDF locally from sample data, no network.
export async function downloadAnalysisPdf({ path, kind, title, filename, extra }) {
  if (isDemo()) {
    const lines = demoPdfLines[kind](extra);
    downloadBlob(makePdfBlob(title, lines), filename);
    return;
  }
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not generate the PDF. Try again in a moment.');
  downloadBlob(await res.blob(), filename);
}
