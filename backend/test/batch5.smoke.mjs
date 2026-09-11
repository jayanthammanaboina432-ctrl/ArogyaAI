// Batch 5 smoke test: emergency config, security headers, and rate limiting.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'smoke-secret';
process.env.JWT_EXPIRATION = '1h';
process.env.EMERGENCY_SERVICE_NUMBER = '112';
process.env.EMERGENCY_CONTACT_NUMBER = '9990001111';

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri(), { dbName: 'arogyaai_test' });

const { createApp } = await import('../src/app.js');
const app = createApp();
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
}

const reg = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'B5', email: 'b5@test.com', password: 'secret1' }),
});
const { token } = await reg.json();
const H = { Authorization: `Bearer ${token}` };

// --- Emergency config ---
check(
  'emergency config without token -> 401',
  (await fetch(`${base}/api/emergency/config`)).status === 401
);

const cfg = await fetch(`${base}/api/emergency/config`, { headers: H });
const cfgBody = await cfg.json();
check('emergency config -> 200', cfg.status === 200);
check('emergency service number from env', cfgBody.emergencyServiceNumber === '112');
check('emergency contact number from env', cfgBody.emergencyContactNumber === '9990001111');

// --- Security headers (helmet) ---
check(
  'helmet sets X-Content-Type-Options',
  cfg.headers.get('x-content-type-options') === 'nosniff'
);
check(
  'X-Powered-By is not leaked',
  cfg.headers.get('x-powered-by') === null
);

// --- Rate limiting ---
// authLimiter: limit 20 per 15 min on /api/auth/login. Fire enough bad
// logins to trip it without waiting on the real window.
let sawLimit = false;
for (let i = 0; i < 25; i++) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@test.com', password: 'wrong' }),
  });
  if (r.status === 429) {
    sawLimit = true;
    const body = await r.json();
    check('rate limit message is user-friendly', typeof body.error === 'string');
    break;
  }
}
check('auth rate limiter trips after repeated attempts', sawLimit);

await server.close();
await mongoose.disconnect();
await mongod.stop();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
