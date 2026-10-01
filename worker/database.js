export function database(env) {
  if (!env.DB) throw new Error('Leaderboard database binding unavailable');
  return env.DB;
}
export async function topScores(db, mode) {
  const { results } = await db.prepare('SELECT id, name, score, wave FROM scores WHERE mode = ? ORDER BY score DESC, created_at ASC, id ASC LIMIT 5').bind(mode).all();
  return results;
}
