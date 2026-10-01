import test from 'node:test';
import assert from 'node:assert/strict';
import { getMode } from '../src/modes.js';
import { ScoreBoard } from '../src/scores.js';
import { AudioDirector } from '../src/audio.js';
import { titleFrame } from '../src/menu-title.js';

test('Drowned changes pressure without changing Normal defaults', () => {
  const normal = getMode('normal'), drowned = getMode('drowned');
  assert.equal(normal.lives, 3); assert.equal(drowned.lives, 2);
  assert.ok(drowned.projectileSpeed > normal.projectileSpeed);
  assert.ok(drowned.diveInterval < normal.diveInterval);
  assert.ok(drowned.bossRecovery < normal.bossRecovery);
  assert.ok(drowned.powerDuration < normal.powerDuration);
  assert.equal(getMode('unknown'), normal);
});
test('Drowned scores cannot displace existing Normal scores', () => {
  const data = new Map(), storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  new ScoreBoard(storage).save({ id: 'normal-run', score: 100, name: 'N', wave: 1 });
  new ScoreBoard(storage, 'drowned').save({ id: 'drowned-run', score: 900, name: 'D', wave: 2 });
  assert.equal(new ScoreBoard(storage).scores[0].id, 'normal-run');
  assert.equal(new ScoreBoard(storage, 'drowned').scores[0].id, 'drowned-run');
});
test('music slows and restores the same element without restarting or changing volume', async () => {
  const audio = new AudioDirector();
  const loop = { playbackRate: 1, currentTime: 42, preservesPitch: true };
  audio.loop = loop;
  audio.setMode('drowned');
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(loop.playbackRate, .95); assert.equal(loop.preservesPitch, false);
  audio.setMode('normal'); audio.setMode('drowned'); audio.setMode('normal');
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(loop.playbackRate, 1); assert.equal(audio.loop, loop);
  assert.equal(loop.currentTime, 42); assert.equal(audio.settings.music, 40);
});
test('updated rust animation reaches its final frame and holds it', () => {
  assert.equal(titleFrame(0), 0); assert.equal(titleFrame(3000), 24);
  assert.equal(titleFrame(5875), 47); assert.equal(titleFrame(20000), 47);
  assert.equal(titleFrame(0, true), 47);
});
