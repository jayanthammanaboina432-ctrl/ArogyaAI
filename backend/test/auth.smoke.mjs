// Batch 1 smoke test: spins up an in-memory MongoDB, exercises the auth flow.
// Run: node test/auth.smoke.mjs
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'smoke-secret';
process.env.JWT_EXPIRATION = '1h';

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri(), { dbName: 'arogyaai_test' });

const { createApp } = await import('../src/app.js');
const app = createApp();
const server = app.listen(0);
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
}
const j = (r) => r.json();

// health
check('health returns ok', (await fetch(`${base}/api/health`).then(j)).status === 'ok');

// register
const reg = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Asha Rao', email: 'Asha@Example.com', phone: '999', password: 'secret1' }),
});
const regBody = await reg.json();
check('register -> 201', reg.status === 201);
check('register returns token', typeof regBody.token === 'string' && regBody.token.length > 20);
check('register lowercases email', regBody.user.email === 'asha@example.com');
check('register never returns passwordHash', !('passwordHash' in regBody.user));

// duplicate email
const dup = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'X', email: 'asha@example.com', password: 'secret1' }),
});
check('duplicate email -> 409', dup.status === 409);
check('duplicate email message', (await dup.json()).error === 'Email already registered.');

// short password
const shortPw = await fetch(`${base}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Y', email: 'y@example.com', password: '123' }),
});
check('short password -> 400', shortPw.status === 400);

// login wrong password
const badLogin = await fetch(`${base}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'asha@example.com', password: 'wrong' }),
});
check('wrong password -> 401', badLogin.status === 401);
check('wrong password message', (await badLogin.json()).error === 'Invalid email or password.');

// login correct (case-insensitive email)
const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'ASHA@example.com', password: 'secret1' }),
});
const loginBody = await login.json();
check('login -> 200', login.status === 200);
check('login returns token', typeof loginBody.token === 'string');

// /me without token
check('me without token -> 401', (await fetch(`${base}/api/auth/me`)).status === 401);

// /me with token
const meRes = await fetch(`${base}/api/auth/me`, {
  headers: { Authorization: `Bearer ${loginBody.token}` },
});
const meBody = await meRes.json();
check('me with token -> 200', meRes.status === 200);
check('me returns correct user', meBody.user.email === 'asha@example.com');

// bcrypt: stored hash is not plaintext
const stored = await mongoose.connection.collection('users').findOne({ email: 'asha@example.com' });
check('password stored hashed (bcrypt)', /^\$2[aby]\$/.test(stored.passwordHash) && stored.passwordHash !== 'secret1');

// unknown route
check('unknown route -> 404', (await fetch(`${base}/api/nope`)).status === 404);

await server.close();
await mongoose.disconnect();
await mongod.stop();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
