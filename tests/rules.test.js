import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage, burstVelocities, formation, ENEMIES, canBurst, MAX_BURST_BULLETS, divePosition } from '../src/rules.js';
test('armor absorbs damage before health, with overflow passed through', () => {
  assert.deepEqual(applyDamage({ armor: 3, health: 4 }), { armor: 2, health: 4 });
  assert.deepEqual(applyDamage({ armor: 1, health: 4 }, 3), { armor: 0, health: 2 });
  assert.deepEqual(applyDamage({ armor: 0, health: 1 }, 2), { armor: 0, health: 0 });
});
test('chain burst has exactly eight equally spaced projectiles', () => {
  const velocities = burstVelocities(); assert.equal(velocities.length, 8);
  velocities.forEach((v, i) => { assert.ok(Math.abs(Math.hypot(v.x, v.y) - 330) < 1e-9); assert.ok(Math.abs(v.x - Math.cos(i * Math.PI / 4) * 330) < 1e-9); });
});
test('all three waves use only the three ship types and fit inside the arena', () => {
  for (let wave = 1; wave <= 3; wave++) {
    const fleet = formation(wave); assert.equal(fleet.length, 24);
    fleet.forEach(ship => { assert.ok(['flyer', 'drone', 'heavy'].includes(ship.type)); assert.ok(ship.x - 105 - ENEMIES[ship.type].width / 2 > 20); assert.ok(ship.x + 105 + ENEMIES[ship.type].width / 2 < 1260); });
  }
});

test('requested hit counts include heavy armor', () => {
  for (const [type, hits] of Object.entries({ flyer: 2, drone: 4, heavy: 5, boss: 50 })) {
    let enemy = { ...ENEMIES[type] };
    for (let i = 1; i <= hits; i++) {
      enemy = applyDamage(enemy);
      assert.equal(enemy.health === 0, i === hits, `${type} should die on hit ${hits}, not ${i}`);
    }
  }
});

test('only direct player kills burst, and the fragment cap reserves a full set of eight', () => {
  assert.equal(canBurst(9000, 1000, 'player', 0), true);
  assert.equal(canBurst(9000, 1000, 'burst', 0), false);
  assert.equal(canBurst(9000, 1000, 'player', MAX_BURST_BULLETS - 8), true);
  assert.equal(canBurst(9000, 1000, 'player', MAX_BURST_BULLETS - 7), false);
  assert.equal(canBurst(9000, 9000, 'player', 0), false);
});
test('dive path zigzags down and returns exactly to the moving formation', () => {
  const origin = { x: 350, y: 145 }, home = { x: 395, y: 147 };
  assert.deepEqual(divePosition(origin, home, 0, 1), origin);
  assert.deepEqual(divePosition(origin, home, 1, 1), home);
  assert.ok(divePosition(origin, home, .7, 1).y > 540);
  let turns = 0, previousDX = 0, previous = origin;
  for (let i = 1; i <= 72; i++) {
    const p = divePosition(origin, home, i / 100, 1);
    if (previousDX && Math.sign(p.x - previous.x) !== Math.sign(previousDX)) turns++;
    previousDX = p.x - previous.x; previous = p;
  }
  assert.ok(turns >= 3, 'multiple lateral direction changes during descent');
});
