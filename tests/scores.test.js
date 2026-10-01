import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoreBoard, rankScores, cleanName } from '../src/scores.js';
const memoryStorage = () => ({ value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } });
test('top five scores sort descending and invalid records are ignored', () => {
  const records = Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: 'diver', score: i * 100, wave: 1 }));
  assert.deepEqual(rankScores([...records, null, { id: 'bad', score: -1 }]).map(s => s.score), [600, 500, 400, 300, 200]);
});
test('renaming updates the same run and scores survive a new session', () => {
  const storage = memoryStorage(), board = new ScoreBoard(storage);
  board.save({ id: 'run1', name: 'DIVER', score: 1500, wave: 2 });
  board.save({ id: 'run1', name: 'atlas', score: 1500, wave: 2 });
  const restored = new ScoreBoard(storage);
  assert.equal(restored.scores.length, 1); assert.equal(restored.scores[0].name, 'ATLAS');
});
test('malformed storage and denied writes retain usable session scores', () => {
  const board = new ScoreBoard({ getItem: () => '{broken', setItem: () => { throw new Error('unavailable'); } });
  assert.deepEqual(board.scores, []);
  board.save({ id: 'run1', name: '', score: 100, wave: 1 });
  assert.equal(board.scores[0].name, 'DIVER'); assert.equal(board.persisted, false);
  assert.equal(cleanName('abcdefghijklmnop'), 'ABCDEFGHIJKL');
});
