import mongoose from 'mongoose';
import { config } from './config.js';
  import dns from 'dns';
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  
export async function connectDb() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB connected');
  } catch (err) {
    // The server must NOT continue without a database: users, resumes and reports need persistence.
    console.error('\nCould not connect to MongoDB:', err.message);
    if (/querySrv|ENOTFOUND|ECONNREFUSED/.test(err.message) && config.mongoUri?.startsWith('mongodb+srv')) {
      console.error('  - Your network may block SRV DNS lookups (common on campus Wi-Fi).');
      console.error('    Use the non-SRV connection string from Atlas, switch DNS to 8.8.8.8, or use a hotspot.');
    }
    if (/127\.0\.0\.1|localhost/.test(config.mongoUri || '')) console.error('  - MONGODB_URI points to a local MongoDB that is not running. Use your Atlas URI.');
    if (/Authentication failed|bad auth/i.test(err.message)) console.error('  - Wrong database user or password (URL-encode special characters).');
    if (/whitelist|IP|timed out|Server selection/i.test(err.message)) console.error('  - In Atlas > Network Access, allow your current IP address.');
    process.exit(1);
  }
}
