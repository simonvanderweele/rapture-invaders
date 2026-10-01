import Phaser from 'phaser';
import { animate } from './assets.js';
import { armoredBossPhase, bossTiming, boltLanes, chargeTargets, radialShots, insideBolt } from './boss-rules.js';
export class BossFight {
  constructor(scene, enemy) {
    this.scene = scene; this.enemy = enemy; this.phase = 1; this.index = 0;
    this.state = 'recovery'; this.until = scene.elapsed + 1300; this.mines = [];
    this.graphics = scene.add.graphics().setDepth(4);
  }
  cue(attack) {
    const s = this.scene;
    this.attack = attack; this.attackPhase = this.phase; this.state = 'warning';
    this.started = s.elapsed; this.until = s.elapsed + bossTiming(this.phase).warning;
    this.lanes = boltLanes(s.player.x, this.phase); this.targets = chargeTargets(s.player, this.phase);
    s.audio.tone('dive'); s.juice.ring(this.enemy.sprite.x, this.enemy.sprite.y, attack === 'bolt' ? 0x78dfff : 0xffb36b, 115, 600);
  }
  activate() {
    const s = this.scene;
    this.state = 'active'; this.started = s.elapsed;
    this.until = s.elapsed + (this.attack === 'bolt' ? 1050 : this.attack === 'charges' ? 2450 : 2100);
    this.nextVolley = s.elapsed;
    animate(this.enemy.sprite, 'boss', 'attack');
    if (this.attack === 'charges') {
      this.mines = this.targets.map((target, i) => ({ ...target, origin: { x: this.enemy.sprite.x, y: this.enemy.sprite.y + 55 }, launched: s.elapsed, detonates: s.elapsed + 950 + i * 230 }));
    }
    if (this.attack === 'bolt') {
      s.audio.tone('armor'); s.juice.light = 1;
      if (!s.juice.reduced) s.cameras.main.shake(200, .003);
    }
  }
  recover() {
    this.state = 'recovery'; this.until = this.scene.elapsed + bossTiming(this.phase).recovery * this.scene.runMode.bossRecovery;
  }
  update() {
    const s = this.scene, e = this.enemy, now = s.elapsed, g = this.graphics;
    g.clear();
    const nextPhase = armoredBossPhase(e);
    if (nextPhase > this.phase) {
      this.phase = nextPhase; s.juice.ring(e.sprite.x, e.sprite.y, 0xff8d57, 210, 1000);
      s.audio.tone('boom'); s.juice.light = .8;
    }
    if (now >= this.until) {
      if (this.state === 'recovery') this.cue(['bolt', 'charges', 'barrage'][this.index++ % 3]);
      else if (this.state === 'warning') this.activate();
      else this.recover();
    }
    const charging = this.state === 'warning', active = this.state === 'active';
    if (charging && this.attack !== 'bolt') {
      const progress = 1 - (this.until - now) / bossTiming(this.attackPhase).warning;
      g.lineStyle(3, this.attack === 'bolt' ? 0x77ddff : 0xffaa66, .8);
      g.beginPath(); g.arc(e.sprite.x, e.sprite.y, 112, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); g.strokePath();
    }
    if (this.attack === 'bolt' && (charging || active)) {
      const width = 52 + this.attackPhase * 8;
      for (const x of this.lanes) {
        if (charging) {
          const progress = 1 - (this.until - now) / bossTiming(this.attackPhase).warning;
          const left = Math.round(x - width / 2), right = Math.round(x + width / 2);
          // Quiet, square Art Deco corners frame the exact danger footprint.
          g.fillStyle(0x6ac6d5, .035 + progress * .065).fillRect(left, 365, width, 335);
          g.lineStyle(1, 0x659aa1, .25 + progress * .2);
          g.lineBetween(left, 377, left, 688); g.lineBetween(right, 377, right, 688);
          g.lineStyle(2, 0xc69b53, .65 + progress * .3);
          for (const [edge, direction] of [[left, 1], [right, -1]]) {
            g.lineBetween(edge, 377, edge, 365); g.lineBetween(edge, 365, edge + direction * 12, 365);
            g.lineBetween(edge, 688, edge, 700); g.lineBetween(edge, 700, edge + direction * 12, 700);
          }
        } else {
          g.fillStyle(0x62dfff, .18).fillRect(x - width / 2, 365, width, 335);
          g.lineStyle(width * .5, 0x74d7ff, .28); g.lineBetween(x, 365, x, 700);
          g.lineStyle(4, 0xdaffff, .95); g.beginPath(); g.moveTo(e.sprite.x, e.sprite.y + 50); g.lineTo(x, 365);
          for (let y = 365; y <= 700; y += 20) g.lineTo(x + Math.sin(y * .11 + now / 35) * 11, y);
          g.strokePath();
        }
      }
      if (active && insideBolt(s.player, this.lanes, width)) s.hurt();
    }
    if (this.attack === 'charges' && charging) {
      for (const target of this.targets) this.drawTarget(target.x, target.y, 28, .65);
    }
    if (this.attack === 'charges' && active) {
      for (const mine of [...this.mines]) {
        if (now >= mine.detonates) {
          for (const v of radialShots(this.attackPhase, .2)) s.fire(mine.x, mine.y, v.x * s.runMode.bossProjectileSpeed, v.y * s.runMode.bossProjectileSpeed, false);
          s.explode(mine.x, mine.y, 0xffb653, 22); s.juice.ring(mine.x, mine.y, 0xffb653, 100, 450); s.audio.tone('boom');
          this.mines.splice(this.mines.indexOf(mine), 1);
        } else {
          const t = Math.min(1, (now - mine.launched) / 500);
          const x = Phaser.Math.Linear(mine.origin.x, mine.x, t), y = Phaser.Math.Linear(mine.origin.y, mine.y, t);
          this.drawTarget(mine.x, mine.y, 31, .65);
          g.fillStyle(0xb98849).fillCircle(x, y, 10); g.lineStyle(2, 0xffdc93).strokeCircle(x, y, 10);
          g.fillStyle(0xff8b48, .6 + Math.sin(now / 45) * .4).fillCircle(x, y, 4);
          g.lineStyle(2, 0xffad66, .6).strokeCircle(mine.x, mine.y, 12 + Math.max(0, mine.detonates - now) / 35);
        }
      }
    }
    if (this.attack === 'barrage' && charging) {
      const origin = e.sprite;
      g.lineStyle(1, 0xffb25d, .35);
      for (const angle of [-.8, 0, .8]) g.lineBetween(origin.x, origin.y + 60, origin.x + Math.sin(angle) * 430, origin.y + 60 + Math.cos(angle) * 430);
    }
    if (this.attack === 'barrage' && active && now >= this.nextVolley) {
      this.nextVolley = now + (this.attackPhase === 3 ? 150 : 200) * s.runMode.bossVolleyInterval;
      const p = (now - this.started) / 2100, angle = -.85 + p * 1.7;
      const speed = bossTiming(this.attackPhase).speed * s.runMode.bossProjectileSpeed;
      for (const offset of this.attackPhase === 1 ? [-.12, .12] : [-.2, 0, .2]) {
        s.fire(e.sprite.x, e.sprite.y + 65, Math.sin(angle + offset) * speed, Math.cos(angle + offset) * speed, false);
      }
      animate(e.sprite, 'boss', 'attack'); s.explode(e.sprite.x, e.sprite.y + 65, 0xffc16b, 4);
      s.audio.tone('shoot');
    }
  }
  drawTarget(x, y, radius, alpha) {
    const g = this.graphics;
    g.lineStyle(2, 0xffbe68, alpha).strokeCircle(x, y, radius);
    g.lineBetween(x - radius - 7, y, x + radius + 7, y); g.lineBetween(x, y - radius - 7, x, y + radius + 7);
  }
  interrupt() {
    this.mines = []; this.graphics.clear(); this.recover();
    this.until = this.scene.elapsed + 2500;
  }
  destroy() { this.graphics.destroy(); this.mines = []; }
}
