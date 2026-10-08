import PDFDocument from 'pdfkit';

// Formal, academic style: Times fonts, numbered headings, plain bordered tables, page numbers.
// Built-in PDF fonts only cover Latin-1, so text is cleaned first.
export const clean = (s) =>
  String(s ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u00B7\u25CF]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '');

const STATUS = { verified: 'Verified', partial: 'Partially supported', missing: 'Missing from resume', unverified: "Can't be verified on GitHub" };
const TONE_LABEL = { green: 'Matches', amber: 'Partial', red: 'Does not match' };
const M = { top: 72, bottom: 64, left: 64, right: 64 };

export function createDoc(title) {
  const doc = new PDFDocument({ size: 'A4', margins: M, bufferPages: true, info: { Title: clean(title), Author: 'Insight AI' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

const W = (doc) => doc.page.width - M.left - M.right;
const room = (doc, need) => {
  if (doc.y + need > doc.page.height - M.bottom) doc.addPage();
};

export function titleBlock(doc, title, lines = []) {
  doc.font('Times-Bold').fontSize(22).fillColor('#000').text(clean(title), { align: 'left' });
  doc.moveDown(0.3);
  doc.moveTo(M.left, doc.y).lineTo(doc.page.width - M.right, doc.y).lineWidth(1).strokeColor('#000').stroke();
  doc.moveDown(0.5);
  doc.font('Times-Roman').fontSize(11).fillColor('#333');
  lines.forEach((l) => doc.text(clean(l)));
  doc.moveDown(0.8);
}

const h1 = (doc, text, n) => {
  room(doc, 60);
  doc.moveDown(0.9).font('Times-Bold').fontSize(15).fillColor('#000').text(`${n ? `${n}. ` : ''}${clean(text)}`);
  doc.moveTo(M.left, doc.y + 2).lineTo(doc.page.width - M.right, doc.y + 2).lineWidth(0.5).strokeColor('#666').stroke();
  doc.moveDown(0.6);
};
const h2 = (doc, text) => {
  room(doc, 40);
  doc.moveDown(0.5).font('Times-Bold').fontSize(12).fillColor('#000').text(clean(text));
  doc.moveDown(0.2);
};
const p = (doc, text) => {
  if (!text) return;
  room(doc, 30);
  doc.font('Times-Roman').fontSize(11).fillColor('#000').text(clean(text), { align: 'justify', lineGap: 2 });
  doc.moveDown(0.4);
};
const bullets = (doc, items) => {
  (items || []).filter(Boolean).forEach((t) => {
    room(doc, 24);
    doc.font('Times-Roman').fontSize(11).fillColor('#000').text(`-  ${clean(t)}`, { indent: 10, lineGap: 2 });
  });
  doc.moveDown(0.4);
};
const kv = (doc, label, value) => {
  room(doc, 20);
  doc.font('Times-Bold').fontSize(11).fillColor('#000').text(`${clean(label)}: `, { continued: true }).font('Times-Roman').text(clean(value));
};

// Plain bordered table. widths are fractions of the content width.
function table(doc, headers, rows, widths) {
  const total = W(doc);
  const cols = widths.map((w) => w * total);
  const pad = 5;
  const heightOf = (cells, font) => {
    doc.font(font).fontSize(10);
    return Math.max(...cells.map((c, i) => doc.heightOfString(clean(c), { width: cols[i] - pad * 2 }))) + pad * 2;
  };
  const drawRow = (cells, font, fill) => {
    const h = heightOf(cells, font);
    room(doc, h + 2);
    const y = doc.y;
    let x = M.left;
    cells.forEach((c, i) => {
      if (fill) doc.rect(x, y, cols[i], h).fillAndStroke(fill, '#444');
      else doc.rect(x, y, cols[i], h).lineWidth(0.5).stroke('#444');
      doc.fillColor('#000').font(font).fontSize(10).text(clean(c), x + pad, y + pad, { width: cols[i] - pad * 2 });
      x += cols[i];
    });
    doc.x = M.left;
    doc.y = y + h;
  };
  drawRow(headers, 'Times-Bold', '#E8E8E8');
  rows.forEach((r) => drawRow(r, 'Times-Roman'));
  doc.moveDown(0.6);
  doc.x = M.left;
}

/* ---------------- Sections ---------------- */

export function writeIdentity(doc, user, n) {
  h1(doc, 'Candidate identification', n);
  table(doc, ['Field', 'Value'], [
    ['Name', user.name],
    ['GitHub username', `@${user.githubUsername}`],
    ['Report date', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['Prepared by', 'Insight AI'],
  ], [0.3, 0.7]);
}

export function writeResume(doc, resume, n) {
  const a = resume.analysis;
  h1(doc, 'Resume analysis', n);
  kv(doc, 'Resume', resume.label);
  kv(doc, 'Resume score', `${a.scores.resume} / 100`);
  kv(doc, 'ATS score', `${a.scores.ats} / 100`);
  doc.moveDown(0.5);
  h2(doc, 'Section ratings');
  table(doc, ['Section', 'Score', 'Rating'], a.sections.map((s) => [s.name, `${s.score}`, s.label]), [0.5, 0.2, 0.3]);
  h2(doc, 'Executive summary');
  p(doc, a.summary.text);
  a.summary.facts.forEach((f) => kv(doc, f.k, f.v));
  h2(doc, 'Skills');
  table(doc, ['Category', 'Skills'], a.skills.map((g) => [g.category, g.items.join(', ')]), [0.3, 0.7]);
  h2(doc, 'Experience and projects');
  a.experience.forEach((e) => {
    p(doc, `${e.title} (${e.org}), ${e.tag}. ${e.text}${e.suggestion ? ` Suggestion: ${e.suggestion}` : ''}`);
  });
  h2(doc, 'Strengths');
  bullets(doc, a.strengths.map((s) => `${s.title}: ${s.text}`));
  h2(doc, 'Suggestions');
  bullets(doc, a.suggestions.map((s) => `[${s.priority}] ${s.title}: ${s.text}`));
}

export function writeGithub(doc, g, n) {
  const d = g.data;
  h1(doc, 'GitHub codebase analysis', n);
  kv(doc, 'Target', g.target);
  kv(doc, 'Profile quality', `${d.quality} / 100`);
  doc.moveDown(0.4);
  h2(doc, d.profile.headline);
  p(doc, d.profile.text);
  table(doc, ['Metric', 'Value'], d.profile.stats.map((s) => [s.k, s.v]), [0.4, 0.6]);
  h2(doc, 'Languages');
  table(doc, ['Language', 'Share'], d.languages.map((l) => [l.name, `${l.pct}%`]), [0.6, 0.4]);
  h2(doc, 'Technologies and infrastructure');
  kv(doc, 'Frameworks and libraries', d.frameworks.join(', ') || 'None found');
  kv(doc, 'Data and infrastructure', d.infra.join(', ') || 'None found');
  kv(doc, 'Automation', d.automation.join(', ') || 'None found');
  d.repos.forEach((r) => {
    h2(doc, `Repository: ${r.name} (${r.stars} stars)`);
    kv(doc, 'Problem solved', r.solves);
    kv(doc, 'Technologies', r.tech.join(', '));
    doc.moveDown(0.3);
    bullets(doc, r.implementation.map((i) => `${i.label}: ${i.text}`));
    table(doc, ['Quality check', 'Result'], r.quality.map((q) => [q.k, q.v]), [0.6, 0.4]);
    p(doc, `Suggested improvement: ${r.improvement}`);
  });
}

export function writeComparison(doc, c, n) {
  const d = c.data;
  h1(doc, 'Resume and GitHub cross-verification', n);
  kv(doc, 'Consistency', d.synthesis.score);
  p(doc, d.synthesis.text);
  h2(doc, 'Technology and skill truth matrix');
  table(doc, ['Skill', 'Resume claim', 'GitHub evidence', 'Status'], d.table.map((t) => [t.skill, t.claim, t.evidence, STATUS[t.status]]), [0.2, 0.28, 0.32, 0.2]);
  h2(doc, 'Project to repository mapping');
  table(doc, ['Resume project', 'Repository', 'Match'], d.projects.map((x) => [x.resume.name, x.repo ? x.repo.name : 'No matching repository found', x.level]), [0.4, 0.4, 0.2]);
  h2(doc, 'Takeaways');
  bullets(doc, d.takeaways.map((t) => `${t.title}: ${t.text}`));
}

export function writeMatch(doc, m, job, n) {
  const d = m.data;
  h1(doc, 'Role compatibility and gap plan', n);
  kv(doc, 'Target role', job ? `${job.name}${job.company ? `, ${job.company}` : ''}` : 'Not available');
  kv(doc, 'Overall compatibility', `${d.overall}%`);
  doc.moveDown(0.4);
  table(doc, ['Category', 'Weight', 'Score'], d.categories.map((c) => [c.name, `${c.weight}%`, `${c.score}`]), [0.5, 0.25, 0.25]);
  p(doc, d.summary.text);
  h2(doc, 'Strengths');
  bullets(doc, d.summary.strengths);
  h2(doc, 'Missing skills');
  bullets(doc, d.summary.missing);
  h2(doc, 'Competency triangulation');
  table(doc, ['Area', 'Result', 'Resume evidence', 'GitHub evidence'], d.matched.map((x) => [x.title, TONE_LABEL[x.tone], x.resume, x.github]), [0.22, 0.14, 0.32, 0.32]);
  h2(doc, 'Skill-gap plan');
  bullets(doc, d.plan.map((x) => `${x.title} (${x.timeline}): ${x.detail} ${x.project}`));
  h2(doc, 'Resume suggestions for this job');
  bullets(doc, d.suggestions.map((s) => `${s.section}: ${s.text}`));
}

export function writeJob(doc, job, n) {
  const a = job.analysis;
  h1(doc, 'Job description analysis', n);
  kv(doc, 'Role', `${job.name}${job.company ? `, ${job.company}` : ''}`);
  h2(doc, a.summary.headline);
  p(doc, a.summary.text);
  table(doc, ['Key fact', 'Value'], a.summary.metrics.map((x) => [x.k, x.v]), [0.4, 0.6]);
  h2(doc, 'Required skills');
  kv(doc, 'Must-have', a.skills.filter((s) => s.importance === 'must').map((s) => s.name).join(', ') || 'None listed');
  kv(doc, 'Nice-to-have', a.skills.filter((s) => s.importance === 'nice').map((s) => s.name).join(', ') || 'None listed');
  h2(doc, 'Responsibilities');
  bullets(doc, a.responsibilities.map((r) => `${r.title}: ${r.text}`));
  h2(doc, 'Experience requirements');
  bullets(doc, a.experience);
  h2(doc, 'Qualifications');
  bullets(doc, a.qualifications);
  h2(doc, 'Learning roadmap');
  table(doc, ['Track', 'Priority', 'Resource', 'Time'], a.roadmap.map((r) => [r.title, r.priority, r.resource, r.duration]), [0.4, 0.15, 0.3, 0.15]);
}

export function writeAnnex(doc, resume, n) {
  const a = resume.analysis;
  h1(doc, 'Annex: ATS ingestion metrics', n);
  p(doc, 'These checks estimate how reliably an applicant tracking system can parse the resume.');
  table(doc, ['Check', 'Score'], [['ATS score', `${a.scores.ats} / 100`], ...a.sections.filter((s) => ['Formatting', 'Skills', 'Experience'].includes(s.name)).map((s) => [`${s.name} clarity`, `${s.score} / 100`])], [0.7, 0.3]);
}

/* ---------------- Finish: header and page numbers ---------------- */

export function finish(doc, { title }) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    const top = doc.page.margins.top;
    doc.page.margins.bottom = 0; // allow drawing in the footer area without triggering a new page
    doc.page.margins.top = 0;
    doc.font('Times-Bold').fontSize(9).fillColor('#444').text('Insight AI', M.left, 32, { lineBreak: false });
    doc.font('Times-Roman').text(clean(title), M.left, 32, { width: W(doc), align: 'right', lineBreak: false });
    doc.moveTo(M.left, 48).lineTo(doc.page.width - M.right, 48).lineWidth(0.4).strokeColor('#999').stroke();
    doc.font('Times-Roman').fontSize(9).fillColor('#444').text(`Page ${i + 1} of ${range.count}`, M.left, doc.page.height - 40, { width: W(doc), align: 'center', lineBreak: false });
    doc.page.margins.bottom = bottom;
    doc.page.margins.top = top;
  }
  doc.end();
  return range.count;
}

/* ---------------- Builders ---------------- */

export async function buildReport({ user, sections, resume, github, comparison, match, job }) {
  const title = 'Developer Profile Analysis';
  const { doc, done } = createDoc(title);
  titleBlock(doc, title, [`Candidate: ${user.name} (@${user.githubUsername})`, `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
  let n = 0;
  const next = () => ++n;
  if (sections.includes('identity')) writeIdentity(doc, user, next());
  if (sections.includes('resume')) writeResume(doc, resume, next());
  if (sections.includes('github')) writeGithub(doc, github, next());
  if (sections.includes('comparison')) writeComparison(doc, comparison, next());
  if (sections.includes('match')) writeMatch(doc, match, job, next());
  if (sections.includes('annex')) writeAnnex(doc, resume, next());
  const pages = finish(doc, { title });
  return { buffer: await done, pages };
}

export async function buildSingle(kind, { user, resume, github, job, comparison, match }) {
  const titles = { resume: 'Resume Analysis', github: 'GitHub Analysis', job: 'Job Description Analysis', comparison: 'Resume and GitHub Comparison', match: 'Job Match Analysis' };
  const title = titles[kind];
  const { doc, done } = createDoc(title);
  titleBlock(doc, title, [`Candidate: ${user.name} (@${user.githubUsername})`, `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`]);
  if (kind === 'resume') writeResume(doc, resume, 1);
  if (kind === 'github') writeGithub(doc, github, 1);
  if (kind === 'job') writeJob(doc, job, 1);
  if (kind === 'comparison') writeComparison(doc, comparison, 1);
  if (kind === 'match') writeMatch(doc, match, job, 1);
  finish(doc, { title });
  return done;
}
