// Batch 4 smoke test: chatbot + prescription reader (wiring, auth, validation).
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

const reg = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'B4', email: 'b4@test.com', password: 'secret1' }),
});
const { token } = await reg.json();
const authH = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

// --- Chat ---
check(
  'chat without token -> 401',
  (await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status === 401
);

const emptyMsg = await fetch(`${base}/api/chat`, { method: 'POST', headers: authH, body: JSON.stringify({ message: '  ' }) });
check('empty message -> 400', emptyMsg.status === 400);
check('empty message text', (await emptyMsg.json()).error === 'Please enter a message.');

const tooLong = await fetch(`${base}/api/chat`, { method: 'POST', headers: authH, body: JSON.stringify({ message: 'x'.repeat(2001) }) });
check('over-length message -> 400', tooLong.status === 400);

const noKey = await fetch(`${base}/api/chat`, { method: 'POST', headers: authH, body: JSON.stringify({ message: 'What causes fever?' }) });
check('chat w/o AI key -> 503', noKey.status === 503);

check(
  'sessions list without token -> 401',
  (await fetch(`${base}/api/chat/sessions`)).status === 401
);
const sessions = await fetch(`${base}/api/chat/sessions`, { headers: authH });
check('sessions list -> 200 empty', sessions.status === 200 && (await sessions.json()).sessions.length === 0);

check(
  'get unknown session -> 404',
  (await fetch(`${base}/api/chat/sessions/000000000000000000000000`, { headers: authH })).status === 404
);
check(
  'get malformed session id -> 404 not 500',
  (await fetch(`${base}/api/chat/sessions/not-an-id`, { headers: authH })).status === 404
);

// --- Prescriptions ---
check(
  'prescriptions without token -> 401',
  (await fetch(`${base}/api/prescriptions/analyze`, { method: 'POST' })).status === 401
);

const noFile = await fetch(`${base}/api/prescriptions/analyze`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` },
});
check('no file -> 400', noFile.status === 400);
check('no file message', (await noFile.json()).error === 'Please upload a prescription image.');

// Unsupported file type
const badTypeForm = new FormData();
badTypeForm.append('image', new Blob(['not really an image'], { type: 'text/plain' }), 'note.txt');
const badType = await fetch(`${base}/api/prescriptions/analyze`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: badTypeForm,
});
check('unsupported file type -> 400', badType.status === 400);

// Valid image type but no Gemini key -> 503, not a crash
const okTypeForm = new FormData();
okTypeForm.append('image', new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'rx.jpg');
const okType = await fetch(`${base}/api/prescriptions/analyze`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: okTypeForm,
});
const okTypeBody = await okType.json();
check('valid type w/o AI key -> 503', okType.status === 503);
check('503 is user-friendly', typeof okTypeBody.error === 'string' && !/stack|Error:/i.test(okTypeBody.error));

// Oversized file -> 400
const bigForm = new FormData();
bigForm.append('image', new Blob([Buffer.alloc(6 * 1024 * 1024)], { type: 'image/jpeg' }), 'big.jpg');
const big = await fetch(`${base}/api/prescriptions/analyze`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: bigForm,
});
check('oversized file -> 400', big.status === 400);

await server.close();
await mongoose.disconnect();
await mongod.stop();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
