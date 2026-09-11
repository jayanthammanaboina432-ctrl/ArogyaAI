// Batch 2 smoke test: symptom + medicine endpoints (wiring, auth, validation).
// Uses an in-memory MongoDB. A stub Gemini can be injected via GEMINI_STUB.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'smoke-secret';
process.env.JWT_EXPIRATION = '1h';
delete process.env.GEMINI_API_KEY; // exercise the "not configured" path

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

// get a token
const reg = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'B2', email: 'b2@test.com', password: 'secret1' }),
});
const { token } = await reg.json();
const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

// health reports AI config flag
const health = await fetch(`${base}/api/health`).then((r) => r.json());
check('health has aiConfigured=false', health.aiConfigured === false);

// symptoms: auth required
check(
  'symptoms/analyze without token -> 401',
  (await fetch(`${base}/api/symptoms/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status === 401
);

// symptoms: empty input -> 400 with plan's message
const empty = await fetch(`${base}/api/symptoms/analyze`, {
  method: 'POST', headers: authH, body: JSON.stringify({ symptoms: '   ' }),
});
check('empty symptoms -> 400', empty.status === 400);
check('empty symptoms message', (await empty.json()).error === 'Please enter at least one symptom.');

// symptoms: valid input but no Gemini key -> 503, not a crash / stack trace
const noKey = await fetch(`${base}/api/symptoms/analyze`, {
  method: 'POST', headers: authH, body: JSON.stringify({ symptoms: 'fever, cough' }),
});
const noKeyBody = await noKey.json();
check('symptoms w/o AI key -> 503', noKey.status === 503);
check('symptoms 503 is user-friendly', typeof noKeyBody.error === 'string' && !/stack|Error:/i.test(noKeyBody.error));

// medicines: auth required
check(
  'medicines/search without token -> 401',
  (await fetch(`${base}/api/medicines/search?query=paracetamol`)).status === 401
);

// medicines: empty query -> 400
const medEmpty = await fetch(`${base}/api/medicines/search`, { headers: authH });
check('empty medicine query -> 400', medEmpty.status === 400);

// medicines: valid query but no key -> 503
check(
  'medicines w/o AI key -> 503',
  (await fetch(`${base}/api/medicines/search?query=paracetamol`, { headers: authH })).status === 503
);

await server.close();
await mongoose.disconnect();
await mongod.stop();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
