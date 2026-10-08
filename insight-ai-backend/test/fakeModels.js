// Minimal in-memory stand-in for the Mongoose models, used ONLY by the local test run
// (no MongoDB binary can be downloaded in the sandbox). It exercises the route logic, not Mongoose itself.
import mongoose from 'mongoose';

const ObjectId = mongoose.Types.ObjectId;
const sid = (v) => (v && v._id ? String(v._id) : String(v));
const isObjId = (v) => v instanceof ObjectId || (v && v._bsontype === 'ObjectId');

function getPath(obj, path) {
  let cur = [obj];
  for (const part of path.split('.')) {
    cur = cur.flatMap((c) => (c == null ? [] : Array.isArray(c) ? c.map((x) => x?.[part]) : [c[part]])).flat();
  }
  return cur;
}

function matchValue(actual, cond) {
  const eq = (a, b) => (isObjId(a) || isObjId(b) ? sid(a) === sid(b) : a === b);
  if (cond instanceof RegExp) return actual.some((a) => cond.test(String(a ?? '')));
  if (cond && typeof cond === 'object' && !isObjId(cond) && !(cond instanceof Date) && Object.keys(cond).some((k) => k.startsWith('$'))) {
    return Object.entries(cond).every(([op, v]) => {
      const a = actual[0];
      if (op === '$lt') return a < v;
      if (op === '$gt') return a > v;
      if (op === '$gte') return a >= v;
      if (op === '$in') return v.some((x) => actual.some((y) => eq(y, x)));
      throw new Error(`fake: unsupported op ${op}`);
    });
  }
  return actual.some((a) => eq(a, cond));
}

function matches(doc, filter) {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === '$or') return cond.some((f) => matches(doc, f));
    return matchValue(getPath(doc, k), cond);
  });
}

class Query {
  constructor(rows, wrap) { this.rows = rows; this.wrap = wrap; this.single = false; this.ops = {}; }
  select() { return this; }
  sort(s) { this.ops.sort = s; return this; }
  limit(n) { this.ops.limit = n; return this; }
  populate(field) { this.ops.populate = field; return this; }
  then(res, rej) { return this.exec().then(res, rej); }
  async exec() {
    let rows = [...this.rows];
    if (this.ops.sort) {
      const [[k, dir]] = Object.entries(this.ops.sort);
      rows.sort((a, b) => ((a[k] > b[k]) - (a[k] < b[k])) * dir);
    }
    if (this.ops.limit) rows = rows.slice(0, this.ops.limit);
    if (this.ops.populate) {
      const User = registry.User;
      rows = rows.map((r) => { const c = r; c.userId = User.store.find((u) => sid(u) === sid(r.userId)) || null; return c; });
    }
    return this.single ? rows[0] || null : rows;
  }
}

const registry = {};

export function makeModel(name, defaults = {}) {
  class M {
    constructor(init = {}) {
      Object.assign(this, JSON.parse(JSON.stringify(defaults)), init);
      this._id ||= new ObjectId();
      this.createdAt ||= new Date();
      this.updatedAt = new Date();
    }
    async save() {
      this.updatedAt = new Date();
      if (!M.store.includes(this)) M.store.push(this);
      return this;
    }
    async deleteOne() { M.store = M.store.filter((d) => d !== this); return { deletedCount: 1 }; }
    static find(f = {}) { return new Query(M.store.filter((d) => matches(d, f))); }
    static findOne(f = {}) { const q = new Query(M.store.filter((d) => matches(d, f))); q.single = true; return q; }
    static findById(id) { return M.findOne({ _id: id }); }
    static async create(doc) { const d = new M(doc); await d.save(); return d; }
    static async countDocuments(f = {}) { return M.store.filter((d) => matches(d, f)).length; }
    static async deleteMany(f = {}) { const before = M.store.length; M.store = M.store.filter((d) => !matches(d, f)); return { deletedCount: before - M.store.length }; }
    static async deleteOne(f = {}) { const d = M.store.find((x) => matches(x, f)); if (d) M.store = M.store.filter((x) => x !== d); return {}; }
    static async updateOne(f, u) { const d = M.store.find((x) => matches(x, f)); if (d) apply(d, u); return {}; }
    static async updateMany(f, u) { M.store.filter((x) => matches(x, f)).forEach((d) => apply(d, u)); return {}; }
    static async findOneAndUpdate(f, u, opts = {}) {
      let d = M.store.find((x) => matches(x, f));
      if (!d && opts.upsert) {
        const eqFields = Object.fromEntries(Object.entries(f).filter(([, v]) => !(v && typeof v === 'object' && !isObjId(v))));
        if (M.store.some((x) => matches(x, eqFields))) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
        d = new M({ ...eqFields, count: 0 });
        M.store.push(d);
      }
      if (d) apply(d, u);
      return d || null;
    }
    static async aggregate(pipe) {
      const g = pipe[0].$group;
      if (g.avg || g.n === undefined) {
        const rows = M.store;
        if (!rows.length) return [];
        return [{ _id: null, avg: rows.reduce((s, r) => s + r.overall, 0) / rows.length }];
      }
      const out = {};
      M.store.forEach((r) => { out[sid(r.userId)] = (out[sid(r.userId)] || 0) + 1; });
      return Object.entries(out).map(([id, n]) => ({ _id: id, n }));
    }
  }
  M.store = [];
  M.modelName = name;
  registry[name] = M;
  return M;
}

function apply(d, u) {
  if (u.$set) Object.assign(d, u.$set);
  if (u.$unset) Object.keys(u.$unset).forEach((k) => delete d[k]);
  if (u.$inc) Object.entries(u.$inc).forEach(([k, v]) => { d[k] = (d[k] || 0) + v; });
  Object.entries(u).filter(([k]) => !k.startsWith('$')).forEach(([k, v]) => { d[k] = v; });
}

export const models = {
  User: makeModel('User', { role: 'user', suspended: false, tokenScope: '', tourCompleted: false }),
  Resume: makeModel('Resume', { isDefault: false, tags: [] }),
  GithubAnalysis: makeModel('GithubAnalysis'),
  JobDescription: makeModel('JobDescription', { match: null }),
  Comparison: makeModel('Comparison'),
  JobMatch: makeModel('JobMatch'),
  Report: makeModel('Report', { sections: [] }),
  Notification: makeModel('Notification', { read: false }),
  UsageCounter: makeModel('UsageCounter', { count: 0 }),
  AuditLog: makeModel('AuditLog'),
  PipelineLog: makeModel('PipelineLog'),
};
