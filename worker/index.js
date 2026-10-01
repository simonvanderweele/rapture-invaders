import { database, topScores } from './database.js';
import { cleanName } from '../src/scores.js';
import { ENEMIES, formation } from '../src/rules.js';
const modes = ['normal', 'drowned'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export function validScore(entry) {
  if (!entry || !modes.includes(entry.mode) || !uuid.test(entry.id) || !uuid.test(entry.token) || typeof entry.name !== 'string' || entry.name.length > 12) return false;
  if (!Number.isInteger(entry.wave) || entry.wave < 1 || entry.wave > 4 || !Number.isInteger(entry.score) || entry.score < 0 || entry.score % 50 !== 0) return false;
  let maximum = entry.wave === 4 ? ENEMIES.boss.score : 0;
  for (let wave = 1; wave <= Math.min(entry.wave, 3); wave++) maximum += formation(wave).reduce((sum, enemy) => sum + ENEMIES[enemy.type].score, 0);
  return entry.score <= maximum;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/scores') {
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(request);
    }
    try {
      const db = database(env);
      if (request.method === 'GET') {
        const mode = url.searchParams.get('mode') ?? 'normal';
        if (!modes.includes(mode)) return json({ error: 'Invalid mode' }, 400);
        return json({ scores: await topScores(db, mode) });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross-site submission denied' }, 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
      // Bound body consumption, including chunked requests without Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Missing score' }, 400);
      let body = '', bytes = 0; const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 1024) { await reader.cancel(); return json({ error: 'Score too large' }, 413); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      let entry; try { entry = JSON.parse(body); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!validScore(entry)) return json({ error: 'Invalid score' }, 400);
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entry.token));
      const tokenHash = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
      // Idempotent retries; only this run's token can change its display name.
      const result = await db.prepare(`INSERT INTO scores (id, token_hash, mode, name, score, wave, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
        WHERE scores.token_hash = excluded.token_hash AND scores.mode = excluded.mode
          AND scores.score = excluded.score AND scores.wave = excluded.wave`)
        .bind(entry.id, tokenHash, entry.mode, cleanName(entry.name), entry.score, entry.wave, Date.now()).run();
      if (!result.meta.changes) return json({ error: 'Run already submitted with different details' }, 409);
      return json({ scores: await topScores(db, entry.mode), saved: entry.id });
    } catch (error) {
      console.error('Leaderboard request failed', error.message);
      return json({ error: 'Leaderboard unavailable. Please retry.' }, 503);
    }
  },
};
