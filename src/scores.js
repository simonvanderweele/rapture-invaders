const KEY = 'rapture-high-scores-v1';
export const cleanName = value => String(value ?? '').toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim().slice(0, 12) || 'DIVER';
export function rankScores(scores) {
  return scores.filter(s => s && typeof s.id === 'string' && Number.isFinite(s.score) && s.score >= 0)
    .map(s => ({ id: s.id, name: cleanName(s.name), score: Math.floor(s.score), wave: Math.max(1, Math.min(4, Number(s.wave) || 1)) }))
    .sort((a, b) => b.score - a.score).slice(0, 5);
}
export class ScoreBoard {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage; this.persisted = true;
    try { const saved = JSON.parse(storage.getItem(KEY) || '[]'); this.scores = rankScores(Array.isArray(saved) ? saved : []); }
    catch { this.scores = []; }
  }
  save(entry) {
    this.scores = rankScores([...this.scores.filter(s => s.id !== entry.id), entry]);
    try { this.storage.setItem(KEY, JSON.stringify(this.scores)); this.persisted = true; }
    catch { this.persisted = false; }
    return this.scores;
  }
}
