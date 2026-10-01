import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';
import { HostedScoreBoard } from '../src/scores.js';
function environment() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../drizzle/0000_tense_roulette.sql', import.meta.url), 'utf8'));
  return { DB: { prepare(query) { return { bind(...values) { return { async all() { return { results: sql.prepare(query).all(...values) }; }, async run() { return { meta: sql.prepare(query).run(...values) }; } }; } }; } } };
}
const entry = (overrides = {}) => ({ id: crypto.randomUUID(), token: crypto.randomUUID(), mode: 'normal', name: 'DIVER', wave: 1, score: 100, ...overrides });
const submit = (env, data) => worker.fetch(new Request('https://game.test/api/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }), env);
const read = (env, mode = 'normal') => worker.fetch(new Request(`https://game.test/api/scores?mode=${mode}`), env).then(r => r.json());
test('hosted rankings persist between clients, separate modes, and return top five', async () => {
  const env = environment();
  for (let i = 1; i <= 6; i++) assert.equal((await submit(env, entry({ score: i * 100 }))).status, 200);
  await submit(env, entry({ mode: 'drowned', score: 1500 }));
  assert.deepEqual((await read(env)).scores.map(s => s.score), [600, 500, 400, 300, 200]);
  const drowned = (await read(env, 'drowned')).scores;
  assert.equal(drowned.length, 1); assert.equal(drowned[0].score, 1500);
  assert.equal('token_hash' in drowned[0], false);
});
test('retry is idempotent and another token cannot rename or change a score', async () => {
  const env = environment(), score = entry();
  await submit(env, score); await submit(env, score);
  assert.equal((await read(env)).scores.length, 1);
  assert.equal((await submit(env, { ...score, name: 'ATLAS' })).status, 200);
  assert.equal((await submit(env, { ...score, token: crypto.randomUUID(), name: 'FAKE' })).status, 409);
  assert.equal((await submit(env, { ...score, score: 1000 })).status, 409);
  assert.equal((await read(env)).scores[0].name, 'ATLAS');
});
test('rejects malformed, impossible and cross-site submissions', async () => {
  const env = environment();
  for (const data of [entry({ score: -1 }), entry({ score: 999999 }), entry({ score: 101 }), entry({ mode: 'fake' }), entry({ wave: 5 }), entry({ id: 'bad' })]) assert.equal((await submit(env, data)).status, 400);
  const request = new Request('https://game.test/api/scores', { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }, body: JSON.stringify(entry()) });
  assert.equal((await worker.fetch(request, env)).status, 403);
  assert.equal((await submit(env, entry({ name: 'x'.repeat(2000) }))).status, 413);
});
test('client keeps run identity for safe save retries and never reports a failed save as success', async () => {
  const env = environment(), score = entry(); let fail = true;
  const board = new HostedScoreBoard('normal', async (url, options) => {
    if (fail) return new Response('Unavailable', { status: 503 });
    return worker.fetch(new Request(`https://game.test${url}`, options), env);
  });
  await assert.rejects(board.save(score)); assert.deepEqual(board.scores, []);
  fail = false; await board.save(score); await board.save(score);
  const otherClient = new HostedScoreBoard('normal', (url, options) => worker.fetch(new Request(`https://game.test${url}`, options), env));
  await otherClient.load(); assert.equal(otherClient.scores[0].id, score.id);
});
