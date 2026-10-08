import mongoose from 'mongoose';

const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

export const User = mongoose.model('User', new Schema({
  githubId: { type: String, required: true, unique: true },
  githubUsername: { type: String, required: true, index: true },
  name: { type: String, required: true },
  avatarUrl: String,
  title: String,
  organization: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  suspended: { type: Boolean, default: false },
  defaultResumeId: ref('Resume'),
  tokenEnc: String,      // AES-256-GCM encrypted GitHub token
  tokenScope: { type: String, default: '' },
  tourCompleted: { type: Boolean, default: false },
  lastActiveAt: Date,
}, { timestamps: true }));

export const Resume = mongoose.model('Resume', new Schema({
  userId: { ...ref('User'), required: true, index: true },
  label: String,
  fileName: String,
  filePath: String,
  extractedText: String,
  score: Number,
  ats: Number,
  tags: [String],
  isDefault: { type: Boolean, default: false },
  analysis: Schema.Types.Mixed,
}, { timestamps: true }));

export const GithubAnalysis = mongoose.model('GithubAnalysis', new Schema({
  userId: { ...ref('User'), required: true, index: true },
  target: String,
  type: { type: String, enum: ['profile', 'repo'] },
  includePrivate: Boolean,
  data: Schema.Types.Mixed,
  fetchedAt: { type: Date, default: Date.now },
}, { timestamps: true }));

export const JobDescription = mongoose.model('JobDescription', new Schema({
  userId: { ...ref('User'), required: true, index: true },
  name: String,
  title: String,
  company: String,
  level: String,
  rawText: String,
  analysis: Schema.Types.Mixed,
  match: { type: Number, default: null },
}, { timestamps: true }));

export const Comparison = mongoose.model('Comparison', new Schema({
  userId: { ...ref('User'), required: true, index: true },
  resumeId: ref('Resume'),
  githubAnalysisId: ref('GithubAnalysis'),
  data: Schema.Types.Mixed,
}, { timestamps: true }));

export const JobMatch = mongoose.model('JobMatch', new Schema({
  userId: { ...ref('User'), required: true, index: true },
  resumeId: ref('Resume'),
  githubAnalysisId: ref('GithubAnalysis'),
  jobId: ref('JobDescription'),
  weights: Schema.Types.Mixed,
  overall: Number,
  data: Schema.Types.Mixed,
}, { timestamps: true }));

export const Report = mongoose.model('Report', new Schema({
  userId: { ...ref('User'), required: true, index: true },
  name: String,
  filePath: String,
  pages: Number,
  sizeBytes: Number,
  sections: [String],
  badge: String,
}, { timestamps: true }));

const notificationSchema = new Schema({
  userId: { ...ref('User'), required: true, index: true },
  type: String,
  message: String,
  link: String,
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // kept for 30 days
export const Notification = mongoose.model('Notification', notificationSchema);

const usageSchema = new Schema({ userId: ref('User'), day: String, count: { type: Number, default: 0 } });
usageSchema.index({ userId: 1, day: 1 }, { unique: true });
export const UsageCounter = mongoose.model('UsageCounter', usageSchema);

export const AuditLog = mongoose.model('AuditLog', new Schema({
  adminId: ref('User'),
  action: String,
  targetHandle: String,
  meta: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } }));

export const PipelineLog = mongoose.model('PipelineLog', new Schema({
  userId: ref('User'),
  kind: String,
  text: String,
  status: { type: String, enum: ['Completed', 'Failed'] },
  ms: Number,
}, { timestamps: { createdAt: true, updatedAt: false } }));
