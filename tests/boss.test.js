import test from 'node:test';
import assert from 'node:assert/strict';
import { bossPhase, bossTiming, boltLanes, chargeTargets, radialShots, insideBolt } from '../src/boss-rules.js';
test('boss escalates at 60% and 30% health with a readable warning floor', () => {
  assert.deepEqual([50,31,30,16,15,1].map(bossPhase), [1,1,2,2,3,3]);
  for (const phase of [1,2,3]) { assert.ok(bossTiming(phase).warning >= 900); assert.ok(bossTiming(phase).recovery >= 900); }
  assert.ok(bossTiming(3).speed > bossTiming(1).speed);
});
test('electric lanes leave reachable safe space even at arena edges', () => {
  for (const phase of [1,2,3]) for (const x of [48,130,640,1150,1232]) {
    const lanes=boltLanes(x,phase),width=52+phase*8;
    assert.ok(lanes.length<=3); assert.ok(lanes.every(v=>v>=80&&v<=1200));
    const safe=Array.from({length:119},(_,i)=>48+i*10).filter(candidate=>!insideBolt({x:candidate,y:620},lanes,width));
    assert.ok(safe.length>60);
    assert.ok(safe.some(candidate=>Math.abs(candidate-x)<370*bossTiming(phase).warning/1000));
  }
});
test('mines stay inside playable area and emit finite outward volleys', () => {
  for (const phase of [1,2,3]) {
    const targets=chargeTargets({x:1232,y:672},phase);
    assert.equal(targets.length,phase+1);
    assert.ok(targets.every(p=>p.x>=95&&p.x<=1185&&p.y>=440&&p.y<=620));
    const shots=radialShots(phase);assert.equal(shots.length,8+phase*2);
    assert.ok(shots.every(v=>Math.abs(Math.hypot(v.x,v.y)-(135+phase*15))<1e-8));
  }
});
