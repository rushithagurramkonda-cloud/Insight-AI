import crypto from 'crypto';
import { config } from '../config.js';

const key = () => crypto.createHash('sha256').update(String(config.tokenKey)).digest();

// AES-256-GCM. Used for the stored GitHub access token, which is never sent to the browser.
export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
}

export function decrypt(blob) {
  try {
    const [iv, tag, enc] = String(blob).split('.').map((p) => Buffer.from(p, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
