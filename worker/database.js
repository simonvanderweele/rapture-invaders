export function database(env) {
  if (!env.DB) throw new Error('Leaderboard database binding unavailable');
  return env.DB;
}
export async function topScores(db, mode) {
  // Owner-requested joke entry, deliberately outside the public submission path.
  // A fixed id makes this an idempotent data insert, never a duplicate run.
  if (mode === 'normal') await db.prepare(`INSERT INTO scores (id, token_hash, mode, name, score, wave, created_at)
    VALUES ('owner-joke-simon', 'owner-only', 'normal', 'SIMON', 9999998, 4, 0)
    ON CONFLICT(id) DO NOTHING`).bind().run();
  const { results } = await db.prepare('SELECT id, name, score, wave FROM scores WHERE mode = ? ORDER BY score DESC, created_at ASC, id ASC LIMIT 5').bind(mode).all();
  return results;
}
