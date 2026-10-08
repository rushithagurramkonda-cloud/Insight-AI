import { assertConfig, config } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';

assertConfig();
await connectDb(); // exits the process if MongoDB is unreachable
createApp().listen(config.port, () => {
  console.log(`Insight AI API listening on http://localhost:${config.port}`);
  console.log(`GitHub OAuth callback expected at ${config.github.callbackUrl}`);
});
