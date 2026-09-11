// Batch 3 smoke test: healthcare finder (hospitals/pharmacies by city, MongoDB-backed).
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET = 'smoke-secret';
process.env.JWT_EXPIRATION = '1h';

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri(), { dbName: 'arogyaai_test' });

const { HealthcarePlace } = await import('../src/models/HealthcarePlace.js');
const { createApp } = await import('../src/app.js');

await HealthcarePlace.insertMany([
  { name: 'Apollo Hospitals', type: 'hospital', city: 'Hyderabad', address: 'Jubilee Hills', phone: '111', openStatus: 'Open' },
  { name: 'MedPlus Pharmacy', type: 'pharmacy', city: 'Hyderabad', address: 'Madhapur', phone: '222', openStatus: 'Open' },
  { name: 'City Hospital', type: 'hospital', city: 'Chennai', address: 'Anna Nagar', phone: '333', openStatus: 'Closed' },
]);

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
  body: JSON.stringify({ name: 'B3', email: 'b3@test.com', password: 'secret1' }),
});
const { token } = await reg.json();
const H = { Authorization: `Bearer ${token}` };

// auth required
check(
  'search without token -> 401',
  (await fetch(`${base}/api/healthcare/search?city=Hyderabad`)).status === 401
);

// missing city -> 400
const noCity = await fetch(`${base}/api/healthcare/search?type=hospital`, { headers: H });
check('missing city -> 400', noCity.status === 400);
check('missing city message', (await noCity.json()).error === 'Please enter a city to search.');

// invalid type -> 400
check(
  'invalid type -> 400',
  (await fetch(`${base}/api/healthcare/search?city=Hyderabad&type=clinic`, { headers: H })).status === 400
);

// case-insensitive + extra spaces, hospital filter
const hosp = await fetch(`${base}/api/healthcare/search?city=${encodeURIComponent('  hYderabad  ')}&type=hospital`, { headers: H });
const hospBody = await hosp.json();
check('hospital filter -> 200', hosp.status === 200);
check('hospital filter returns 1', hospBody.results.length === 1 && hospBody.results[0].name === 'Apollo Hospitals');

// pharmacy filter
const pharm = await fetch(`${base}/api/healthcare/search?city=Hyderabad&type=pharmacy`, { headers: H });
check('pharmacy filter returns 1', (await pharm.json()).results.length === 1);

// all filter
const all = await fetch(`${base}/api/healthcare/search?city=Hyderabad&type=all`, { headers: H });
check('all filter returns 2', (await all.json()).results.length === 2);

// default type (no type param) behaves like "all"
const defaultType = await fetch(`${base}/api/healthcare/search?city=Hyderabad`, { headers: H });
check('default type returns 2', (await defaultType.json()).results.length === 2);

// no results for unknown city
const none = await fetch(`${base}/api/healthcare/search?city=Nowhereville`, { headers: H });
const noneBody = await none.json();
check('unknown city -> 200 empty', none.status === 200 && noneBody.results.length === 0);

// locality search (not a city itself, but named in the address) still matches
const locality = await fetch(`${base}/api/healthcare/search?city=Jubilee Hills`, { headers: H });
const localityBody = await locality.json();
check(
  'locality search matches address',
  locality.status === 200 && localityBody.results.some((r) => r.name === 'Apollo Hospitals')
);

// get by id
const id = hospBody.results[0].id;
const byId = await fetch(`${base}/api/healthcare/${id}`, { headers: H });
check('get by id -> 200', byId.status === 200);

// get by bad id -> 404, not a crash
check(
  'bad id -> 404',
  (await fetch(`${base}/api/healthcare/not-a-valid-id`, { headers: H })).status === 404
);

await server.close();
await mongoose.disconnect();
await mongod.stop();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
