// Demo mode: sample data + an in-memory fake API.
// Nothing here touches the network, GitHub, Gemini or MongoDB, and nothing is persisted.
// The route shapes mirror the real backend API (see the spec, section 9), so switching
// demo mode off just sends the same requests to the real server.

const clone = (x) => JSON.parse(JSON.stringify(x));
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export const demoUser = {
  _id: 'demo-user',
  name: 'Elena Rostova',
  githubUsername: 'elena-rostova',
  username: 'elena.rostova',
  title: 'Senior Platform Engineer',
  organization: 'Northwind Labs',
  role: 'admin',
  avatarUrl: '',
  defaultResumeId: 'r1',
  tourCompleted: false,
  privateRepos: false,
  memberSince: 'Mar 2025',
};

const store = {
  resumes: [
    { _id: 'r1', label: 'ML-Engineer-v2.pdf', fileName: 'ML-Engineer-v2.pdf', date: '2026-10-02', score: 91, ats: 94, isDefault: true, tags: ['PyTorch', 'Kubernetes', 'Distributed Systems'] },
    { _id: 'r2', label: 'Senior-Platform-v1.pdf', fileName: 'Senior-Platform-v1.pdf', date: '2026-09-18', score: 84, ats: 88, isDefault: false, tags: ['Terraform', 'Go', 'Observability'] },
    { _id: 'r3', label: 'Backend-Generalist-v1.pdf', fileName: 'Backend-Generalist-v1.pdf', date: '2026-08-30', score: 77, ats: 81, isDefault: false, tags: ['Node.js', 'PostgreSQL'] },
  ],
  jobs: [
    { _id: 'j1', name: 'Senior ML Platform Engineer', title: 'Senior ML Platform Engineer', company: 'Helix Systems', level: 'Senior', date: '2026-10-05', match: 86 },
    { _id: 'j2', name: 'Staff Inference Systems Engineer', title: 'Staff Inference Systems Engineer', company: 'Corvid AI', level: 'Staff', date: '2026-10-03', match: 79 },
    { _id: 'j3', name: 'Lead Distributed Storage Engineer', title: 'Lead Distributed Storage Engineer', company: 'Orbital Data', level: 'Lead', date: '2026-09-27', match: 68 },
  ],
  reports: [
    { _id: 'rp1', name: 'Rostova_ML_Platform_Executive_Dossier_2026.pdf', date: '2026-10-05', pages: 14, size: '2.4 MB', sections: ['Identity', 'Resume', 'GitHub', 'Cross-verification', 'Role compatibility'], badge: 'Complete dossier' },
    { _id: 'rp2', name: 'Rostova_Kafka_Engineering_Audit_2026.pdf', date: '2026-09-29', pages: 9, size: '1.6 MB', sections: ['Identity', 'GitHub', 'Cross-verification'], badge: 'Partial (3 sections)' },
    { _id: 'rp3', name: 'Rostova_Hiring_Sprint_Resume_Digest.pdf', date: '2026-09-12', pages: 5, size: '0.9 MB', sections: ['Identity', 'Resume'], badge: 'Partial (2 sections)' },
  ],
  notifications: [
    { _id: 'n1', type: 'match', message: 'Job match finished: Senior ML Platform Engineer (86%)', link: '/job-match', read: false, time: '12 min ago' },
    { _id: 'n2', type: 'github', message: 'GitHub analysis finished for elena-rostova', link: '/github-analysis', read: false, time: '2 h ago' },
    { _id: 'n3', type: 'report', message: 'Your executive dossier is ready to download', link: '/reports', read: true, time: 'Yesterday' },
    { _id: 'n4', type: 'limit', message: 'Daily GitHub analysis limit resets at midnight', link: '/github-analysis', read: true, time: 'Yesterday' },
  ],
  githubUsed: 7,
};

const dashboard = {
  stats: {
    resumes: 4,
    matches: 12,
    latest: { text: 'Highlight distributed-systems and Kubernetes alignment in your summary', priority: 'High priority', link: '/resume-analysis' },
  },
  checklist: [
    { id: 'resume', label: 'Upload your resume', desc: 'Add a PDF to start the analysis.', done: true, link: '/resume-analysis' },
    { id: 'github', label: 'Analyze your GitHub', desc: 'Scan repositories for real evidence.', done: true, link: '/github-analysis' },
    { id: 'job', label: 'Add a job description', desc: 'Paste the role you are targeting.', done: true, link: '/job-description' },
    { id: 'match', label: 'Run a job match', desc: 'See your compatibility score.', done: false, link: '/job-match' },
  ],
  coverage: [
    { name: 'ML Systems & Distributed Training', covered: 92, tone: 'green' },
    { name: 'Python / Deep Learning Frameworks', covered: 88, tone: 'green' },
    { name: 'Data Engineering & Stream Systems', covered: 71, tone: 'amber' },
    { name: 'Kubernetes & Cloud Infrastructure', covered: 64, tone: 'amber' },
    { name: 'GPU Kernel Optimization', covered: 38, tone: 'red' },
    { name: 'Compliance & Security (SOC2/PCI)', covered: 22, tone: 'red' },
  ],
  github: {
    username: 'elena-rostova',
    repos: 12,
    topLanguage: 'Python',
    summary: 'Distributed systems and ML infrastructure with consistent CI and documentation habits.',
    languages: [{ name: 'Python', pct: 52 }, { name: 'Go', pct: 21 }, { name: 'TypeScript', pct: 14 }, { name: 'Rust', pct: 8 }, { name: 'Other', pct: 5 }],
  },
  activity: [
    { text: 'Job match completed: Senior ML Platform Engineer, 86%', time: '12 min ago', link: '/job-match' },
    { text: 'Resume ML-Engineer-v2.pdf analyzed with a score of 91', time: '2 days ago', link: '/resume-analysis' },
    { text: 'GitHub profile elena-rostova analyzed (12 repositories)', time: '2 days ago', link: '/github-analysis' },
    { text: 'Job description saved: Staff Inference Systems Engineer', time: '4 days ago', link: '/job-description' },
  ],
  priorityActions: [
    { text: 'Add a quantified result to your Kafka migration bullet', tag: 'Resume', link: '/resume-analysis' },
    { text: 'Publish a TensorFlow-based project to back the skill on your resume', tag: 'GitHub', link: '/comparison' },
    { text: 'Start the GPU kernel profiling track from your roadmap', tag: 'Learning', link: '/job-description' },
  ],
};

const resumeAnalysis = {
  scores: { resume: 91, ats: 94 },
  sections: [
    { name: 'Summary', score: 92, label: 'Strong' },
    { name: 'Skills', score: 95, label: 'Excellent' },
    { name: 'Experience', score: 90, label: 'Strong' },
    { name: 'Projects', score: 88, label: 'Strong' },
    { name: 'Education', score: 80, label: 'Good' },
    { name: 'Formatting', score: 96, label: 'Excellent' },
  ],
  summary: {
    text: 'Platform engineer with 7+ years building ML infrastructure and distributed data systems. Strong evidence of ownership across training pipelines, streaming ingestion and Kubernetes-based serving, with quantified outcomes in latency and cost.',
    facts: [
      { k: 'Target role', v: 'Senior ML Platform Engineer' },
      { k: 'Years of experience', v: '7+ years' },
      { k: 'Primary focus', v: 'ML infrastructure' },
    ],
  },
  skills: [
    { category: 'Programming Languages', items: ['Python', 'Go', 'TypeScript', 'SQL', 'Rust'] },
    { category: 'Frameworks & Libraries', items: ['PyTorch', 'FastAPI', 'Ray', 'TensorFlow', 'React'] },
    { category: 'Databases', items: ['PostgreSQL', 'Redis', 'ClickHouse'] },
    { category: 'Tools & Platforms', items: ['Kubernetes', 'Terraform', 'Kafka', 'AWS', 'Docker', 'GitHub Actions'] },
    { category: 'Concepts', items: ['Distributed training', 'Model serving', 'Observability', 'Data pipelines'] },
    { category: 'Soft Skills', items: ['Technical leadership', 'Mentoring', 'Cross-team delivery'] },
  ],
  experience: [
    { title: 'Staff Platform Engineer', org: 'Northwind Labs', tag: 'Verified impact', tone: 'green', text: 'Led a multi-region inference platform serving 18k requests per second. Reduced p99 latency by 41% with request batching and GPU autoscaling.' },
    { title: 'Kafka Streaming Migration', org: 'Project', tag: 'Verified impact', tone: 'green', text: 'Migrated nightly batch ingestion to Kafka and Flink with exactly-once delivery, cutting data freshness from 24 hours to 90 seconds.' },
    { title: 'Cost Optimization Program', org: 'Northwind Labs', tag: 'Needs numbers', tone: 'amber', text: 'Worked on reducing cloud spend for training workloads.', suggestion: 'State the saving. For example: "Cut GPU spend by 28% ($410k per year) with spot scheduling and checkpointing."' },
  ],
  strengths: [
    { title: 'Scale ownership', text: 'Clear numbers at production scale: requests per second, latency and uptime.' },
    { title: 'Cost efficiency', text: 'Repeated evidence of reducing infrastructure spend without hurting reliability.' },
    { title: 'Modern ML stack', text: 'PyTorch, Ray and Kubernetes appear consistently across roles and projects.' },
    { title: 'Leadership signals', text: 'Mentoring, design reviews and cross-team delivery are all mentioned.' },
  ],
  suggestions: [
    { title: 'Add a compliance line', priority: 'High', text: 'Target roles ask for SOC2 or PCI exposure. Mention any audits, access reviews or encryption work you contributed to.' },
    { title: 'Quantify the cost program', priority: 'High', text: 'The cost optimization bullet has no figure. Add the percentage or amount saved.' },
    { title: 'Move Education below Experience', priority: 'Medium', text: 'You have 7+ years of experience, so recruiters scan work history first.' },
    { title: 'Reduce skill list repetition', priority: 'Low', text: 'Docker and Kubernetes are listed in both Skills and Tools. Keep one group.' },
  ],
};

const githubAnalysis = {
  _id: 'g1',
  target: 'elena-rostova',
  type: 'profile',
  cached: true,
  fetchedAt: '2 days ago',
  quality: 94,
  languages: [{ name: 'Python', pct: 52 }, { name: 'Go', pct: 21 }, { name: 'TypeScript', pct: 14 }, { name: 'Rust', pct: 8 }, { name: 'Other', pct: 5 }],
  frameworks: ['PyTorch', 'FastAPI', 'Ray', 'gRPC', 'React'],
  infra: ['Kubernetes', 'Terraform', 'Kafka', 'Redis', 'PostgreSQL'],
  automation: ['GitHub Actions', 'Docker', 'Helm', 'pre-commit'],
  profile: {
    headline: 'Distributed Systems & Machine Learning Engineer',
    text: 'Public work centers on inference serving, streaming data pipelines and developer tooling. Repositories show steady maintenance, tests on core modules and readable documentation.',
    stats: [
      { k: 'Commit cadence', v: '4.2 per week' },
      { k: 'Doc coverage', v: '82% of repos' },
      { k: 'Dominant domain', v: 'ML serving' },
    ],
    breakdown: [{ k: 'Maintenance', v: 92 }, { k: 'Documentation', v: 82 }],
  },
  repos: [
    {
      name: 'inference-serving-pipeline', stars: 214, tags: ['Python', 'Ray', 'Kubernetes'],
      solves: 'Serves large models with dynamic batching so GPU utilization stays high under bursty traffic.',
      tech: ['Python', 'Ray Serve', 'FastAPI', 'Helm', 'Prometheus'],
      implementation: [
        { label: 'Dynamic GPU batching', text: 'Requests are grouped within a short time window and padded to the nearest bucket size before dispatch.' },
        { label: 'Zero-downtime rollout', text: 'Helm charts use readiness probes and weighted traffic shifting between model versions.' },
        { label: 'Observability', text: 'Latency histograms and queue depth are exported to Prometheus with ready-made dashboards.' },
      ],
      improvement: 'Add an integration test that simulates a burst of 10k requests, and document the batching parameters in the README.',
      quality: [{ k: 'README quality', v: 'Excellent', tone: 'green' }, { k: 'Test coverage', v: '84%', tone: 'green' }, { k: 'Structure', v: 'Clean', tone: 'green' }, { k: 'CI/CD', v: 'Present', tone: 'green' }],
    },
    {
      name: 'vector-stream-indexer', stars: 96, tags: ['Go', 'Kafka', 'PostgreSQL'],
      solves: 'Keeps a vector index fresh by consuming change events from Kafka and updating embeddings incrementally.',
      tech: ['Go', 'Kafka', 'pgvector', 'Docker'],
      implementation: [
        { label: 'Incremental indexing', text: 'Consumers batch upserts and commit offsets only after the index write is confirmed.' },
        { label: 'Backpressure', text: 'A bounded worker pool slows consumption when the database falls behind.' },
      ],
      improvement: 'Tests only cover the happy path. Add failure tests for broker disconnects and partial writes.',
      quality: [{ k: 'README quality', v: 'Good', tone: 'green' }, { k: 'Test coverage', v: '51%', tone: 'amber' }, { k: 'Structure', v: 'Clean', tone: 'green' }, { k: 'CI/CD', v: 'Present', tone: 'green' }],
    },
    {
      name: 'rag-eval-toolkit', stars: 41, tags: ['Python', 'TypeScript'],
      solves: 'Scores retrieval-augmented generation pipelines against a golden dataset and tracks regressions.',
      tech: ['Python', 'TypeScript', 'React', 'SQLite'],
      implementation: [
        { label: 'Metric suite', text: 'Faithfulness, context recall and answer relevance are computed per query and aggregated per run.' },
      ],
      improvement: 'No continuous integration found. Add a workflow that runs the evaluation on pull requests.',
      quality: [{ k: 'README quality', v: 'Needs work', tone: 'amber' }, { k: 'Test coverage', v: '33%', tone: 'red' }, { k: 'Structure', v: 'Okay', tone: 'amber' }, { k: 'CI/CD', v: 'Missing', tone: 'red' }],
    },
  ],
};

const jobAnalysis = {
  summary: {
    headline: 'Core Mandate & Operational Thesis',
    text: 'Own the platform that trains, evaluates and serves large models for internal product teams. The role blends distributed systems, GPU efficiency and compliance-ready operations.',
    metrics: [{ k: 'Throughput', v: '18k+ QPS' }, { k: 'Fleet', v: '5,000+ GPUs' }, { k: 'Stack', v: 'vLLM / Triton' }, { k: 'Seniority', v: 'Staff+' }],
  },
  skills: [
    { name: 'Python', importance: 'must' }, { name: 'Kubernetes', importance: 'must' }, { name: 'Distributed training', importance: 'must' },
    { name: 'Model serving (vLLM / Triton)', importance: 'must' }, { name: 'Terraform', importance: 'must' },
    { name: 'CUDA / kernel profiling', importance: 'nice' }, { name: 'SOC2 / PCI-DSS', importance: 'nice' }, { name: 'Rust or C++', importance: 'nice' }, { name: 'Technical writing', importance: 'nice' },
  ],
  responsibilities: [
    { title: 'Systems orchestration', text: 'Design scheduling and autoscaling for mixed training and inference workloads.' },
    { title: 'Reliability engineering', text: 'Define SLOs, run incident reviews and reduce time to recovery.' },
    { title: 'Technical leadership', text: 'Set direction across teams, review designs and mentor senior engineers.' },
    { title: 'Efficiency and cost', text: 'Track GPU utilization and remove idle capacity.' },
  ],
  experience: ['7+ years building production distributed systems', '3+ years with ML training or serving infrastructure', 'Experience leading cross-team technical projects'],
  qualifications: ['Bachelor’s degree in Computer Science or equivalent experience', 'Prior on-call and incident leadership experience'],
  roadmap: [
    { title: 'Terraform & Cloud Infrastructure Automation', priority: 'Critical', text: 'Codify clusters, networks and IAM so environments are reproducible.', resource: 'HashiCorp Terraform Associate path', duration: '3 weeks' },
    { title: 'Kernel-Level Profiling & Triton Serving', priority: 'High', text: 'Learn to read GPU traces and tune inference kernels.', resource: 'NVIDIA Nsight + Triton tutorials', duration: '5 weeks' },
    { title: 'Payment Data Compliance (PCI-DSS & SOC2)', priority: 'Medium', text: 'Understand controls, evidence collection and audit preparation.', resource: 'Vanta / Drata public guides', duration: '2 weeks' },
  ],
};

const comparison = {
  synthesis: {
    text: 'Seven of nine resume skills are backed by repository evidence. Python, PyTorch, Kubernetes and Kafka appear in code, dependencies and CI files. TensorFlow is listed on the resume, but none of the analyzed repositories uses it.',
    verified: 7, partial: 1, unverified: 1, score: 'Strong consistency',
  },
  table: [
    { skill: 'Python & PyTorch', claim: 'Core skill, 7 years', evidence: 'In 9 of 12 repositories, imports found in model code', status: 'verified', details: 'inference-serving-pipeline, rag-eval-toolkit' },
    { skill: 'Kubernetes', claim: 'Production cluster operations', evidence: 'Helm charts and manifests in 4 repositories', status: 'verified', details: 'inference-serving-pipeline/helm' },
    { skill: 'Kafka Event Streaming', claim: 'Led a batch-to-stream migration', evidence: 'Consumer code and docker-compose files found', status: 'verified', details: 'vector-stream-indexer' },
    { skill: 'Terraform', claim: 'Infrastructure as code', evidence: 'Only mentioned in one README, no .tf files', status: 'partial', details: 'rag-eval-toolkit/README.md' },
    { skill: 'TensorFlow', claim: 'Model training', evidence: 'No repository shows TensorFlow usage', status: 'unverified', details: 'Cannot be verified on GitHub' },
    { skill: 'Rust', claim: 'Not on resume', evidence: '8% of public code is Rust', status: 'missing', details: 'Consider adding Rust to your skills' },
  ],
  projects: [
    { resume: { name: 'Realtime Inference Platform', desc: 'Multi-region model serving with dynamic batching.' }, repo: { name: 'inference-serving-pipeline', desc: 'Ray Serve based inference with GPU batching.' }, level: 'Strong', reason: 'Both describe batching on GPUs for model serving and use Ray and Kubernetes.' },
    { resume: { name: 'Streaming Vector Search', desc: 'Keeps embeddings in sync with source data.' }, repo: { name: 'vector-stream-indexer', desc: 'Kafka consumer that updates a pgvector index.' }, level: 'Strong', reason: 'The project goals and technologies line up closely, though the names differ.' },
    { resume: { name: 'Cost Optimization Program', desc: 'Spot scheduling and checkpointing for training.' }, repo: null, level: 'None', reason: 'No matching repository found.' },
  ],
  takeaways: [
    { title: 'Back up the TensorFlow claim', text: 'Publish a small TensorFlow project, or remove the skill if you do not use it.' },
    { title: 'Add Rust to your resume', text: 'You have meaningful public Rust code that recruiters cannot see on your resume.' },
    { title: 'Show Terraform code', text: 'Push the Terraform modules you describe so the claim becomes verifiable.' },
  ],
};

const matchWeights = [
  { key: 'skills', name: 'Technical Skills', weight: 30, score: 90 },
  { key: 'tech', name: 'Technologies', weight: 20, score: 84 },
  { key: 'exp', name: 'Experience', weight: 20, score: 88 },
  { key: 'projects', name: 'Projects', weight: 20, score: 86 },
  { key: 'edu', name: 'Education', weight: 5, score: 72 },
  { key: 'soft', name: 'Soft Skills', weight: 5, score: 80 },
];

const match = {
  overall: 86,
  categories: matchWeights,
  summary: {
    text: 'Strong match for the role. Core platform skills and leadership are well supported, and the main gaps are GPU kernel work and compliance exposure.',
    strengths: ['Production inference at scale with measurable latency gains', 'Kubernetes, Kafka and Ray evidenced in public code', 'Mentoring and cross-team delivery'],
    missing: ['CUDA or kernel profiling', 'SOC2 or PCI-DSS exposure', 'Terraform code in public repositories'],
  },
  matched: [
    { title: 'Distributed model serving', tone: 'green', resume: 'Led a multi-region inference platform serving 18k requests per second.', github: 'inference-serving-pipeline implements dynamic batching on Ray Serve.' },
    { title: 'Streaming data systems', tone: 'green', resume: 'Migrated batch ingestion to Kafka with exactly-once delivery.', github: 'vector-stream-indexer consumes Kafka events and commits offsets safely.' },
    { title: 'Infrastructure as code', tone: 'amber', resume: 'Terraform listed as a core tool.', github: 'No Terraform files found, only a README mention.' },
    { title: 'GPU kernel optimization', tone: 'red', resume: 'No mention.', github: 'No CUDA or Triton code found.' },
    { title: 'Compliance (SOC2 / PCI)', tone: 'red', resume: 'No mention.', github: 'Not applicable to public repositories.' },
  ],
  plan: [
    { title: 'Learn Triton kernel profiling', detail: 'Complete the Nsight tutorials, then profile one of your own serving models.', project: 'Project idea: publish a before-and-after profile of your batching code.', timeline: '5 weeks' },
    { title: 'Codify your clusters with Terraform', detail: 'Convert one environment into reusable modules and push them publicly.', project: 'Project idea: a Terraform module for a GPU node pool.', timeline: '3 weeks' },
    { title: 'Prepare compliance talking points', detail: 'Review SOC2 controls and note where your past work already satisfied them.', project: 'Project idea: write an internal-style runbook as a public gist.', timeline: '2 weeks' },
  ],
  suggestions: [
    { section: 'Summary', text: 'Lead with "ML platform" and "Kubernetes" to match the posting’s first two requirements.' },
    { section: 'Experience', text: 'Add one bullet that names the audit or compliance process you supported.' },
    { section: 'Skills', text: 'Move Terraform and Triton to the top of the Tools group.' },
  ],
};

const ranked = [
  { rank: 1, job: 'Senior ML Platform Engineer', company: 'Helix Systems', score: 86, strength: 'Inference at scale', gap: 'Kernel profiling' },
  { rank: 2, job: 'Staff Inference Systems Engineer', company: 'Corvid AI', score: 79, strength: 'Kubernetes and Ray', gap: 'CUDA experience' },
  { rank: 3, job: 'Lead Distributed Storage Engineer', company: 'Orbital Data', score: 68, strength: 'Streaming systems', gap: 'Storage internals' },
];

const admin = {
  stats: [
    { k: 'Total customers', v: '1,428', sub: '+38 this week' },
    { k: 'Analyses today', v: '342', sub: 'across all tools' },
    { k: 'Pipeline uptime', v: '99.8%', sub: 'last 30 days' },
    { k: 'Avg. match score', v: '86%', sub: 'all users' },
  ],
  users: [
    { name: 'Elena Rostova', handle: 'elena-rostova', role: 'Admin', analyses: 41, active: 'Just now', status: 'Active' },
    { name: 'Marcus Chen', handle: 'mchen-dev', role: 'User', analyses: 18, active: '2 h ago', status: 'Active' },
    { name: 'Sarah Lin', handle: 'sarahlin', role: 'User', analyses: 7, active: 'Yesterday', status: 'Active' },
    { name: 'Alex Carter', handle: 'alex-carter', role: 'User', analyses: 3, active: '6 days ago', status: 'Suspended' },
  ],
  log: [
    { text: 'Resume analysis for ML-Engineer-v2.pdf', by: 'elena-rostova', time: '12 min ago', status: 'Completed', ms: '8.2 s' },
    { text: 'GitHub scan of mchen-dev', by: 'mchen-dev', time: '1 h ago', status: 'Completed', ms: '41 s' },
    { text: 'Resume parse failed: scanned PDF with no text', by: 'sarahlin', time: '3 h ago', status: 'Failed', ms: '1.1 s' },
  ],
};

const searchIndex = () => [
  ...store.resumes.map((r) => ({ type: 'Resumes', title: r.label, link: '/resume-analysis' })),
  { type: 'GitHub analyses', title: 'elena-rostova', link: '/github-analysis' },
  { type: 'GitHub analyses', title: 'inference-serving-pipeline', link: '/github-analysis' },
  ...store.jobs.map((j) => ({ type: 'Job descriptions', title: j.name, link: '/job-description' })),
  { type: 'Comparisons', title: 'ML-Engineer-v2 vs elena-rostova', link: '/comparison' },
  ...store.jobs.map((j) => ({ type: 'Job matches', title: `${j.name} (${j.match}%)`, link: '/job-match' })),
  ...store.reports.map((r) => ({ type: 'Reports', title: r.name, link: '/reports' })),
];

function recomputeOverall(weights) {
  const total = weights.reduce((s, w) => s + w.weight, 0) || 1;
  return Math.round(weights.reduce((s, w) => s + w.score * w.weight, 0) / total);
}

export async function demoRequest(method, path, body) {
  const [pathname, qs = ''] = path.split('?');
  const params = new URLSearchParams(qs);
  const m = (re) => pathname.match(re);
  await wait(method === 'GET' ? 350 : 900);

  if (pathname === '/api/me') return clone(demoUser);
  if (pathname === '/api/dashboard') return clone(dashboard);
  if (pathname === '/api/search') {
    const q = (params.get('q') || '').toLowerCase();
    return clone(searchIndex().filter((x) => x.title.toLowerCase().includes(q)).slice(0, 8));
  }
  if (pathname === '/api/notifications') {
    if (method === 'PATCH') {
      store.notifications.forEach((n) => (n.read = true));
      return { ok: true };
    }
    return clone(store.notifications);
  }

  // Resumes
  if (pathname === '/api/resumes' && method === 'GET') return clone(store.resumes);
  if (pathname === '/api/resumes' && method === 'POST') {
    const label = (body instanceof FormData && body.get('label')) || `Resume v${store.resumes.length + 1}`;
    const r = { _id: `r${Date.now()}`, label, fileName: label, date: new Date().toISOString().slice(0, 10), score: 88, ats: 90, isDefault: false, tags: ['PyTorch', 'Kubernetes'] };
    store.resumes.unshift(r);
    return clone(r);
  }
  let r = m(/^\/api\/resumes\/([^/]+)(\/rerun)?$/);
  if (r) {
    const [, id, rerun] = r;
    if (method === 'DELETE') {
      store.resumes = store.resumes.filter((x) => x._id !== id);
      return { ok: true };
    }
    if (method === 'PATCH') {
      const item = store.resumes.find((x) => x._id === id);
      if (body.isDefault) store.resumes.forEach((x) => (x.isDefault = x._id === id));
      if (item && body.label) item.label = body.label;
      return { ok: true };
    }
    if (rerun) return { ok: true };
    const item = store.resumes.find((x) => x._id === id) || store.resumes[0];
    return clone({ ...item, analysis: resumeAnalysis });
  }

  // GitHub
  if (pathname === '/api/github-repositories/usage') return { used: store.githubUsed, limit: 15 };
  if (pathname === '/api/github-repositories/analyze') {
    if (store.githubUsed >= 15) throw Object.assign(new Error('Daily limit reached (15 per day).'), { status: 429 });
    store.githubUsed += 1;
    return clone({ ...githubAnalysis, cached: false, fetchedAt: 'Just now', target: body.target || githubAnalysis.target });
  }
  if (pathname === '/api/github-repositories') return clone([{ _id: 'g1', target: 'elena-rostova', repos: 12, date: '2026-10-05' }]);
  if (m(/^\/api\/github-repositories\/[^/]+(\/rerun)?$/)) return clone(githubAnalysis);

  // Jobs
  if (pathname === '/api/jobs' && method === 'GET') return clone(store.jobs);
  if (pathname === '/api/jobs' && method === 'POST') {
    const j = { _id: `j${Date.now()}`, name: body.name || body.title, title: body.title, company: body.company || 'Unknown', level: body.level || 'Senior', date: new Date().toISOString().slice(0, 10), match: null };
    store.jobs.unshift(j);
    return clone({ ...j, analysis: jobAnalysis });
  }
  r = m(/^\/api\/jobs\/([^/]+)(\/rerun)?$/);
  if (r) {
    const [, id] = r;
    if (method === 'DELETE') {
      store.jobs = store.jobs.filter((x) => x._id !== id);
      return { ok: true };
    }
    if (method === 'PATCH') {
      const item = store.jobs.find((x) => x._id === id);
      if (item && body.name) item.name = body.name;
      return { ok: true };
    }
    const item = store.jobs.find((x) => x._id === id) || store.jobs[0];
    return clone({ ...item, analysis: jobAnalysis });
  }

  // Comparison, match
  if (pathname === '/api/comparisons') return clone(comparison);
  if (m(/^\/api\/comparisons\/[^/]+$/)) return clone(comparison);
  if (pathname === '/api/matches/rank') return clone(ranked);
  if (pathname === '/api/matches') {
    const weights = body?.weights
      ? matchWeights.map((w) => ({ ...w, weight: body.weights[w.key] ?? w.weight }))
      : matchWeights;
    return clone({ ...match, categories: weights, overall: recomputeOverall(weights) });
  }

  // Reports
  if (pathname === '/api/reports' && method === 'GET') return clone(store.reports);
  if (pathname === '/api/reports' && method === 'POST') {
    const rep = {
      _id: `rp${Date.now()}`,
      name: `Rostova_Developer_Profile_${new Date().toISOString().slice(0, 10)}.pdf`,
      date: new Date().toISOString().slice(0, 10),
      pages: 4 + (body.sections?.length || 1) * 2,
      size: '1.2 MB',
      sections: body.sections || [],
      badge: body.sections?.length >= 5 ? 'Complete dossier' : `Partial (${body.sections?.length || 0} sections)`,
    };
    store.reports.unshift(rep);
    return clone(rep);
  }
  r = m(/^\/api\/reports\/([^/]+)(\/download)?$/);
  if (r) {
    if (method === 'DELETE') {
      store.reports = store.reports.filter((x) => x._id !== r[1]);
      return { ok: true };
    }
    return { ok: true };
  }

  // Profile
  if (pathname === '/api/me/data' && method === 'DELETE') return { ok: true };
  if (pathname === '/api/admin/stats') return clone(admin.stats);
  if (pathname === '/api/admin/users') return clone(admin.users);
  if (pathname === '/api/admin/analyses') return clone(admin.log);

  return { ok: true };
}

// Content used when generating demo-mode PDFs on the client.
export const demoPdfLines = {
  resume: () => [
    'Resume Analysis',
    '',
    `Resume score: ${resumeAnalysis.scores.resume}/100   ATS score: ${resumeAnalysis.scores.ats}/100`,
    '',
    'Executive summary',
    resumeAnalysis.summary.text,
    '',
    'Skills',
    ...resumeAnalysis.skills.map((s) => `${s.category}: ${s.items.join(', ')}`),
    '',
    'Suggestions',
    ...resumeAnalysis.suggestions.map((s) => `- ${s.title}: ${s.text}`),
  ],
  github: () => [
    'GitHub Codebase & Profile Analysis',
    '',
    githubAnalysis.profile.headline,
    githubAnalysis.profile.text,
    '',
    ...githubAnalysis.repos.flatMap((r) => [`Repository: ${r.name}`, r.solves, `Improvement: ${r.improvement}`, '']),
  ],
  job: () => [
    'Job Description Analysis',
    '',
    jobAnalysis.summary.text,
    '',
    'Required skills',
    ...jobAnalysis.skills.map((s) => `- ${s.name} (${s.importance === 'must' ? 'must-have' : 'nice-to-have'})`),
  ],
  comparison: () => [
    'Resume to GitHub Comparison',
    '',
    comparison.synthesis.text,
    '',
    ...comparison.table.map((t) => `${t.skill}: ${t.status} - ${t.evidence}`),
  ],
  match: (overall = match.overall) => [
    'Job Match Analysis',
    '',
    `Overall compatibility: ${overall}%`,
    '',
    match.summary.text,
    '',
    'Missing skills',
    ...match.summary.missing.map((s) => `- ${s}`),
  ],
  report: (rep) => [
    'Developer Profile Analysis',
    '',
    `Candidate: ${demoUser.name} (@${demoUser.githubUsername})`,
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    `Sections included: ${(rep.sections || []).join(', ') || 'none'}`,
    '',
    resumeAnalysis.summary.text,
  ],
};

export const demoMatchWeights = matchWeights;
