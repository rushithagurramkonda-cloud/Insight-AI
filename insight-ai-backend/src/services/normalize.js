// Gemini output is never trusted. These functions force every response into EXACTLY the shape the
// frontend expects (see src/lib/demo.js in the frontend), with safe defaults, so a page never crashes.
import { clamp } from '../utils/misc.js';

const str = (v, d = '') => (typeof v === 'string' ? v.trim() : v == null ? d : String(v).trim());
const arr = (v) => (Array.isArray(v) ? v : []);
const strs = (v, max = 30) => arr(v).map((x) => str(x)).filter(Boolean).slice(0, max);
const oneOf = (v, opts, d) => (opts.includes(v) ? v : d);
const num = (v, d) => (v !== null && v !== '' && Number.isFinite(Number(v)) ? clamp(v) : d);
const toneOf = (v, d = 'amber') => oneOf(str(v).toLowerCase(), ['green', 'amber', 'red'], d);

export const labelFor = (s) => (s >= 90 ? 'Excellent' : s >= 75 ? 'Strong' : s >= 60 ? 'Good' : 'Needs work');
export const toneForScore = (s) => (s >= 80 ? 'green' : s >= 55 ? 'amber' : 'red');

export const SECTION_NAMES = ['Summary', 'Skills', 'Experience', 'Projects', 'Education', 'Formatting'];
export const CATEGORIES = [
  { key: 'skills', name: 'Technical Skills', weight: 30 },
  { key: 'tech', name: 'Technologies', weight: 20 },
  { key: 'exp', name: 'Experience', weight: 20 },
  { key: 'projects', name: 'Projects', weight: 20 },
  { key: 'edu', name: 'Education', weight: 5 },
  { key: 'soft', name: 'Soft Skills', weight: 5 },
];

/* ---------- Resume ---------- */
export function normalizeResume(raw = {}) {
  const resume = num(raw.scores?.resume, 70);
  const ats = num(raw.scores?.ats, resume);
  const sections = SECTION_NAMES.map((name) => {
    const f = arr(raw.sections).find((s) => str(s?.name).toLowerCase() === name.toLowerCase());
    const score = num(f?.score, resume);
    return { name, score, label: labelFor(score) };
  });
  const skills = arr(raw.skills)
    .map((g) => ({ category: str(g?.category), items: strs(g?.items, 24) }))
    .filter((g) => g.category && g.items.length);
  const experience = arr(raw.experience).slice(0, 8).map((e) => {
    const tone = toneOf(e?.tone, 'green');
    const out = {
      title: str(e?.title, 'Experience'),
      org: str(e?.org, 'Resume'),
      tone,
      tag: str(e?.tag, tone === 'green' ? 'Verified impact' : tone === 'amber' ? 'Needs numbers' : 'Weak'),
      text: str(e?.text),
    };
    if (tone !== 'green' && str(e?.suggestion)) out.suggestion = str(e.suggestion);
    return out;
  });
  const facts = arr(raw.summary?.facts).slice(0, 3).map((f) => ({ k: str(f?.k), v: str(f?.v, 'Not stated') })).filter((f) => f.k);
  return {
    scores: { resume, ats },
    sections,
    summary: { text: str(raw.summary?.text, 'No summary was produced.'), facts },
    skills,
    experience,
    strengths: arr(raw.strengths).slice(0, 6).map((s) => ({ title: str(s?.title), text: str(s?.text) })).filter((s) => s.title),
    suggestions: arr(raw.suggestions).slice(0, 8).map((s) => ({
      title: str(s?.title), priority: oneOf(str(s?.priority), ['High', 'Medium', 'Low'], 'Medium'), text: str(s?.text),
    })).filter((s) => s.title),
  };
}

export function resumeTags(analysis) {
  const pick = ['Frameworks & Libraries', 'Tools & Platforms', 'Programming Languages', 'Concepts'];
  const out = [];
  for (const cat of pick) {
    const g = analysis.skills.find((s) => s.category === cat);
    for (const i of g?.items || []) if (out.length < 3 && !out.includes(i)) out.push(i);
  }
  return out.slice(0, 3);
}

/* ---------- Job ---------- */
export function normalizeJob(raw = {}) {
  const metrics = arr(raw.summary?.metrics).slice(0, 4).map((m) => ({ k: str(m?.k), v: str(m?.v, '-') })).filter((m) => m.k);
  return {
    summary: { headline: str(raw.summary?.headline, 'Role overview'), text: str(raw.summary?.text), metrics },
    skills: arr(raw.skills).slice(0, 20).map((s) => ({ name: str(s?.name), importance: oneOf(str(s?.importance).toLowerCase(), ['must', 'nice'], 'must') })).filter((s) => s.name),
    responsibilities: arr(raw.responsibilities).slice(0, 6).map((r) => ({ title: str(r?.title), text: str(r?.text) })).filter((r) => r.title),
    experience: strs(raw.experience, 6),
    qualifications: strs(raw.qualifications, 6),
    roadmap: arr(raw.roadmap).slice(0, 6).map((r) => ({
      title: str(r?.title), priority: oneOf(str(r?.priority), ['Critical', 'High', 'Medium'], 'Medium'),
      text: str(r?.text), resource: str(r?.resource, 'Official documentation'), duration: str(r?.duration, '2 weeks'),
    })).filter((r) => r.title),
  };
}

/* ---------- Comparison ---------- */
export function normalizeComparison(raw = {}) {
  const table = arr(raw.table).slice(0, 12).map((t) => {
    const status = oneOf(str(t?.status).toLowerCase(), ['verified', 'partial', 'missing', 'unverified'], 'unverified');
    return {
      skill: str(t?.skill), claim: str(t?.claim, '-'), evidence: str(t?.evidence, '-'), status,
      details: status === 'unverified' ? str(t?.details) || 'Cannot be verified on GitHub' : str(t?.details, '-'),
    };
  }).filter((t) => t.skill);
  const verified = table.filter((t) => t.status === 'verified').length;
  const partial = table.filter((t) => t.status === 'partial').length;
  const unverified = table.filter((t) => t.status === 'unverified').length;
  const claimed = verified + partial + unverified;
  const ratio = claimed ? verified / claimed : 0;
  return {
    synthesis: {
      text: str(raw.synthesis, 'No consistency summary was produced.'), verified, partial, unverified,
      score: ratio >= 0.75 ? 'Strong consistency' : ratio >= 0.5 ? 'Moderate consistency' : 'Low consistency',
    },
    table,
    projects: arr(raw.projects).slice(0, 8).map((p) => {
      const hasRepo = p?.repo && str(p.repo.name);
      const level = hasRepo ? oneOf(str(p?.level), ['Strong', 'Partial', 'None'], 'Partial') : 'None';
      return {
        resume: { name: str(p?.resume?.name, 'Project'), desc: str(p?.resume?.desc) },
        repo: hasRepo ? { name: str(p.repo.name), desc: str(p.repo.desc) } : null,
        level: level === 'None' ? 'None' : level,
        reason: str(p?.reason, hasRepo ? '' : 'No matching repository found.'),
      };
    }),
    takeaways: arr(raw.takeaways).slice(0, 5).map((t) => ({ title: str(t?.title), text: str(t?.text) })).filter((t) => t.title),
  };
}

/* ---------- Job match ---------- */
export function normalizeWeights(input) {
  const base = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.weight]));
  if (!input || typeof input !== 'object') return base;
  const raw = Object.fromEntries(CATEGORIES.map((c) => [c.key, Math.max(0, Number(input[c.key]))]));
  if (Object.values(raw).some((v) => !Number.isFinite(v))) return base;
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) return base;
  const out = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Math.round((v / sum) * 100)]));
  const diff = 100 - Object.values(out).reduce((a, b) => a + b, 0);
  const biggest = Object.keys(out).sort((a, b) => out[b] - out[a])[0];
  out[biggest] += diff;
  return out;
}

export function scoreCategories(rawCategories = {}, weights) {
  const categories = CATEGORIES.map((c) => ({ key: c.key, name: c.name, weight: weights[c.key], score: num(rawCategories[c.key], 50) }));
  const overall = clamp(categories.reduce((s, c) => s + c.score * c.weight, 0) / 100);
  return { categories, overall };
}

export function normalizeMatch(raw = {}, weights) {
  const { categories, overall } = scoreCategories(raw.categories, weights);
  return {
    overall,
    categories,
    summary: {
      text: str(raw.summary?.text, 'No verdict was produced.'),
      strengths: strs(raw.summary?.strengths, 5),
      missing: strs(raw.summary?.missing, 5),
    },
    matched: arr(raw.matched).slice(0, 10).map((m) => ({
      title: str(m?.title), tone: toneOf(m?.tone), resume: str(m?.resume, '-'), github: str(m?.github, '-'),
    })).filter((m) => m.title),
    plan: arr(raw.plan).slice(0, 5).map((p) => ({
      title: str(p?.title), detail: str(p?.detail), project: str(p?.project), timeline: str(p?.timeline, '2 weeks'),
    })).filter((p) => p.title),
    suggestions: arr(raw.suggestions).slice(0, 6).map((s) => ({ section: str(s?.section, 'Resume'), text: str(s?.text) })).filter((s) => s.text),
  };
}

/* ---------- GitHub ---------- */
export const ratingTone = { Excellent: 'green', Good: 'green', 'Needs work': 'amber', Missing: 'red', Clean: 'green', Okay: 'amber', Messy: 'red' };
export { str, arr, strs, oneOf, toneOf };
