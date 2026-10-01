import { getMode } from './modes.js';
import Phaser from 'phaser';
import { registerAssets, animate, installOverviewPipeline, styleOverview, preloadActors, actorSprite, preloadWaves, registerWaves } from './assets.js';
import { ENEMIES, BURST_LIFETIME, canBurst, applyDamage, burstVelocities, formation, divePosition } from './rules.js';
import { BossFight } from './boss.js';
import { Juice } from './juice.js';
const W = 1280, H = 720;
export class OceanScene extends Phaser.Scene {
  constructor(ui, audio) { super('ocean'); this.ui = ui; this.audio = audio; this.runMode = getMode('normal'); }
  preload() { preloadActors(this); preloadWaves(this); this.load.image('overview', '/assets/asset-overview.png'); this.load.on('loaderror', () => { document.querySelector('#loading').textContent = 'ASSET LOAD FAILED — PLEASE RELOAD'; }); }
  create() {
    registerAssets(this); registerWaves(this);
    installOverviewPipeline(this, Phaser);
    this.buildOcean();
    this.combat = this.add.container(0, 0).setDepth(5);
    this.effects = this.add.container(0, 0).setDepth(8);
    this.juice = new Juice(this);
    this.bars = this.add.graphics().setDepth(10);
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D,SPACE,ESC,ENTER');
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.input.keyboard.on('keydown-ESC', () => this.ui.escape());
    this.input.keyboard.on('keydown-ENTER', event => { if (this.ui.screen === 'menu' && !(event.target instanceof HTMLButtonElement)) this.ui.start(); });
    this.input.keyboard.on('keydown-SPACE', event => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return; event.preventDefault(); });
    this.menuShip = actorSprite(this, 640, 340, 'player', 2).setDepth(5);
    this.tweens.add({ targets: this.menuShip, y: 348, yoyo: true, repeat: -1, duration: 1500, ease: 'Sine.easeInOut' });
    this.touch = { left: false, right: false, fire: false };
    this.mode = 'menu'; this.ui.ready(this);
  }
  buildOcean() {
    this.cameras.main.setBackgroundColor('#001520');
    const g = this.add.graphics();
    this.city = g;
    // A fixed seed keeps the skyline consistent between reloads.
    const rng = new Phaser.Math.RandomDataGenerator(['rapture']);
    for (let layer = 0; layer < 3; layer++) {
      const colors = [0x07313e, 0x052630, 0x00121d];
      for (let x = -20; x < W; x += rng.between(46, 90)) {
        const height = rng.between(65, 210) + (layer === 0 ? 80 : 0), width = rng.between(30, 72);
        const y = H - height;
        g.fillStyle(colors[layer], 1); g.fillRect(x, y, width, height);
        g.fillRect(x + width * .2, y - 15, width * .6, 20); g.fillRect(x + width * .4, y - 34, width * .2, 28);
        g.lineStyle(1, 0x126071, .25); g.lineBetween(x + 5, y + 10, x + 5, H);
        for (let wy = y + 20; wy < H - 10; wy += 25) for (let wx = x + 11; wx < x + width - 6; wx += 13) {
          if (rng.frac() > .5) { g.fillStyle(rng.frac() > .6 ? 0x82774b : 0x10505a, .42); g.fillRect(wx, wy, 3, 8); }
        }
      }
    }
    // Stepped Art Deco towers frame the open play area.
    for (const x of [166, 1080]) {
      g.fillStyle(0x032b38); g.fillRect(x, 380, 64, 340); g.fillRect(x + 12, 350, 40, 40); g.fillRect(x + 22, 325, 20, 30); g.fillRect(x + 29, 295, 6, 35);
      for (let y = 411; y < 680; y += 32) { g.fillStyle(0x8f864d, .38); g.fillRect(x + 22, y, 5, 14); g.fillRect(x + 36, y, 5, 14); }
    }
    this.bubbles = Array.from({ length: 38 }, () => ({ x: rng.between(30, 1250), y: rng.between(20, 710), speed: rng.between(8, 30), size: rng.between(1, 3) }));
    this.water = this.add.graphics();
    const scanlines = this.add.graphics().setDepth(30);
    scanlines.lineStyle(1, 0x00070d, .12); for (let y = 0; y < H; y += 4) scanlines.lineBetween(0, y, W, y);
  }
  showMenu(showShip = true) {
    this.time.paused = false; this.mode = 'menu'; this.clearCombat(); this.menuShip.anims.resume(); this.menuShip.setVisible(showShip);
  }
  clearCombat() {
    this.bossFight?.destroy(); this.bossFight = null;
    this.time.removeAllEvents(); this.cameras.main.resetFX();
    this.announcement?.destroy(); this.announcement = null;
    this.endObjects?.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); }); this.endObjects = [];
    for (const child of [...this.combat.list, ...this.effects.list]) this.tweens.killTweensOf(child);
    this.combat.removeAll(true); this.effects.removeAll(true); this.bars.clear();
    this.enemies = []; this.bullets = []; this.pickups = []; this.particles = [];
  }
  startRun(mode = 'normal') {
    this.runMode = getMode(mode);
    this.time.paused = false; this.clearCombat(); this.menuShip.setVisible(false); this.mode = 'play';
    this.elapsed = 0; this.score = 0; this.lives = this.runMode.lives; this.wave = 0; this.kills = 0; this.shotAt = 0; this.hurtUntil = 1500;
    this.hitStop = 0; this.thrustAt = 0; this.nextDiveAt = 2400; this.ending = false;
    this.power = { shield: 0, triple: 0, chain: 0 }; this.transitionAt = 0; this.dropIndex = 0;
    this.spawnPlayer();
    this.nextWave(); this.ui.updateHUD(this);
  }
  spawnPlayer() {
    this.player = actorSprite(this, 640, 626, 'player');
    this.combat.add(this.player);
    this.hurtUntil = this.elapsed + 2200;
    this.juice.ring(640, 626, 0x8ff9f2, 100, 600);
  }
  nextWave() {
    this.wave++; this.transitionAt = 0; this.mode = 'transition';
    this.bullets.forEach(b => b.sprite.destroy()); this.bullets = []; this.bars.clear();
    // Hold combat and power-up timers while the supplied 32-frame counter plays.
    const key = `announcement-${this.wave === 4 ? 'boss' : `wave-${this.wave}`}`;
    this.announcement = this.add.sprite(640, 304, key).setDepth(20).play(key);
    this.announcement.once('animationcomplete', () => {
      this.announcement.destroy(); this.announcement = null;
      this.beginWave();
    });
    this.juice.ring(640, 304, 0x91e3dc, 680, 1800);
    this.ui.updateHUD(this);
  }
  beginWave() {
    this.mode = 'play'; this.nextDiveAt = this.elapsed + 2200;
    if (this.wave === 4) this.spawnEnemy('boss', 640, 220);
    else formation(this.wave).forEach(e => this.spawnEnemy(e.type, e.x, e.y));
    this.hurtUntil = Math.max(this.hurtUntil, this.elapsed + 1200);
  }
  banner(title, subtitle) {
    const text = this.add.text(640, 397, title, { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffe6ad', align: 'center' }).setOrigin(.5);
    const small = this.add.text(640, 433, subtitle, { fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#78bcbe' }).setOrigin(.5);
    text.setScale(.8); this.tweens.add({ targets: text, scale: 1, duration: 450, ease: 'Back.easeOut' });
    const rule = this.add.rectangle(640, 415, 4, 2, 0xc69b53); this.effects.add(rule);
    this.tweens.add({ targets: rule, scaleX: 100, alpha: 0, duration: 1800, onComplete: () => rule.destroy() });
    this.effects.add([text, small]); this.tweens.add({ targets: [text, small], alpha: 0, delay: 1300, duration: 500, onComplete: () => { text.destroy(); small.destroy(); } });
  }
  spawnEnemy(type, x, y) {
    const config = { ...ENEMIES[type], ...(type === 'boss' ? { armor: this.runMode.bossArmor } : {}) };
    const sprite = actorSprite(this, x, y - 140, type);
    this.combat.add(sprite);
    this.enemies.push({ type, sprite, x, y, health: config.health, armor: config.armor, phase: Math.random() * 6.28, state: 'formation', recoil: 0, flashUntil: 0, maxHealth: config.health, maxArmor: config.armor, entryAt: this.elapsed, diveAt: 0, fireAt: this.elapsed + 1900 + Math.random() * config.fireDelay, ...config });
    if (type === 'boss') this.bossFight = new BossFight(this, this.enemies.at(-1));
  }
  fire(x, y, vx, vy, friendly, chain = false) {
    if (!friendly) { vx *= this.runMode.projectileSpeed; vy *= this.runMode.projectileSpeed; }
    const color = friendly ? (chain ? 0xe39afa : 0x7eedff) : 0xffb84d;
    const sprite = this.add.rectangle(x, y, chain ? 5 : 4, chain ? 5 : 12, color).setBlendMode(Phaser.BlendModes.ADD);
    this.combat.add(sprite); sprite.rotation = Math.atan2(vy, vx) + Math.PI / 2;
    this.bullets.push({ sprite, vx, vy, friendly, chain, source: friendly ? (chain ? 'burst' : 'player') : 'enemy', born: this.elapsed, trailAt: 0, radius: chain ? 5 : 4 });
  }
  shoot() {
    if (this.elapsed < this.shotAt) return;
    this.shotAt = this.elapsed + 165;
    const spread = this.power.triple > this.elapsed ? [-.2, 0, .2] : [0];
    animate(this.player, 'player', 'shoot', () => {
      if (this.mode !== 'play') return;
      spread.forEach(angle => this.fire(this.player.x, this.player.y - 23, Math.sin(angle) * 680, -Math.cos(angle) * 680, true));
      this.audio.tone('shoot'); this.explode(this.player.x, this.player.y - 24, 0x95faff, 5);
      this.player.y = Math.min(H - 48, this.player.y + 2);
    });
  }
  attack(enemy) {
    const { x, y } = enemy.sprite;
    if (enemy.type === 'boss') return; // BossFight exclusively owns boss attacks.
    const angles = enemy.type === 'drone' ? [-.17, 0, .17] : [0];
    const aim = Phaser.Math.Clamp(Math.atan2(this.player.x - x, this.player.y - y), -.55, .55);
    animate(enemy.sprite, enemy.type, 'attack', () => {
      if (this.mode !== 'play' || !this.enemies.includes(enemy)) return;
      angles.forEach(angle => this.fire(enemy.sprite.x, enemy.sprite.y + ENEMIES[enemy.type].height * .38, Math.sin(aim + angle) * 215, Math.cos(aim + angle) * 215, false));
      this.explode(enemy.sprite.x, enemy.sprite.y + enemy.height * .4, 0xffb654, 5);
    });
    enemy.fireAt = this.elapsed + (ENEMIES[enemy.type].fireDelay + Math.random() * 450) * this.runMode.fireInterval;
  }
  explode(x, y, color = 0xffb650, count = 15) {
    for (let i = 0; i < count; i++) {
      const sprite = this.add.rectangle(x, y, Phaser.Math.Between(2, 5), Phaser.Math.Between(2, 5), color).setBlendMode(Phaser.BlendModes.ADD);
      this.effects.add(sprite); const angle = Math.random() * Math.PI * 2, speed = 40 + Math.random() * 140;
      this.particles.push({ sprite, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 450 + Math.random() * 250 });
    }
  }
  hitEnemy(enemy, source = 'player') {
    if (!this.enemies.includes(enemy)) return;
    const armored = enemy.armor > 0;
    Object.assign(enemy, applyDamage(enemy)); this.juice.hit(enemy, armored);
    if (armored && !enemy.armor) { this.juice.label(enemy.sprite.x, enemy.sprite.y - 45, 'ARMOR BREAK', '#8af1ff', 9); this.juice.ring(enemy.sprite.x, enemy.sprite.y, 0x8af1ff, 85); }
    if (enemy.health > 0) return;
    const { x, y } = enemy.sprite;
    enemy.sprite.clearTint().setAngle(0); animate(enemy.sprite, enemy.type, 'die');
    this.explode(x, y, 0xffb654, enemy.type === 'boss' ? 100 : 24); this.juice.kill(enemy);
    this.audio.tone('boom'); this.score += enemy.score; this.kills++;
    const burstCount = this.bullets.filter(b => b.chain && b.sprite.active).length;
    if (canBurst(this.power.chain, this.elapsed, source, burstCount)) {
      burstVelocities().forEach(v => this.fire(x, y, v.x, v.y, true, true));
      this.juice.ring(x, y, 0xd39bff, 120); this.juice.label(x, y + 25, 'BURST', '#e7b4ff', 10);
    }
    if (this.kills % 5 === 0 && enemy.type !== 'boss') this.dropPower(x, y);
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
    this.ui.updateHUD(this);
    if (enemy.type === 'boss') this.finish(true);
    else if (!this.enemies.length) this.transitionAt = this.elapsed + 1800;
  }
  dropPower(x, y) {
    const type = ['shield', 'triple', 'chain'][this.dropIndex++ % 3];
    const sprite = this.add.sprite(x, y, 'overview', type).setDisplaySize(28, 28).setBlendMode(Phaser.BlendModes.ADD);
    styleOverview(sprite);
    this.combat.add(sprite); this.pickups.push({ sprite, type });
  }
  collect(pickup) {
    this.juice.ring(this.player.x, this.player.y, 0x91ffeb, 140, 700);
    this.juice.label(this.player.x, this.player.y - 55, { shield: 'INVINCIBLE', triple: 'TRIPLE SHOT', chain: 'BURST READY' }[pickup.type], '#adfff2', 12);
    this.power[pickup.type] = this.elapsed + this.runMode.powerDuration;
    this.audio.tone('pickup'); animate(this.player, 'player', 'consume'); this.explode(this.player.x, this.player.y, 0x81edec, 30);
    pickup.sprite.destroy(); this.pickups.splice(this.pickups.indexOf(pickup), 1); this.ui.updateHUD(this);
  }
  hurt() {
    if (this.elapsed < this.hurtUntil || this.power.shield > this.elapsed) return;
    this.bossFight?.interrupt();
    this.lives--; this.hurtUntil = this.elapsed + 2200;
    this.explode(this.player.x, this.player.y, 0xffa860, 35); this.audio.tone('hit');
    if (!this.juice.reduced) { this.cameras.main.shake(220, .006); this.cameras.main.flash(100, 130, 40, 20); }
    this.juice.ring(this.player.x, this.player.y, 0xff956a, 100); this.ui.updateHUD(this);
    this.player.clearTint().setAlpha(1).setAngle(0); animate(this.player, 'player', 'die');
    if (this.lives <= 0) { this.finish(false); return; }
    this.mode = 'respawning';
    this.bullets.forEach(b => b.sprite.destroy()); this.bullets = [];
    this.time.delayedCall(650, () => {
      this.spawnPlayer(); this.mode = 'play';
      this.juice.label(640, 550, 'HULL RESTORED', '#a8f5ed', 12);
    });
  }
  finish(won) {
    if (this.ending) return;
    this.bossFight?.destroy(); this.bossFight = null;
    this.ending = true; this.mode = 'ending'; this.bars.clear();
    this.bullets.forEach(b => b.sprite.destroy()); this.bullets = [];
    // Let the actor death finish before the sonar signal fades into the score board.
    this.time.delayedCall(600, () => {
      const shade = this.add.rectangle(640, 360, 1280, 720, 0x001019, 0).setDepth(16);
      const title = this.add.text(640, 300, won ? 'RAPTURE SAVED' : 'GAME OVER', { fontFamily: '"Press Start 2P"', fontSize: '46px', color: won ? '#ffe1a0' : '#eebc81' }).setOrigin(.5).setDepth(18).setAlpha(0);
      const subtitle = this.add.text(640, 365, won ? 'THE CITY REMEMBERS' : 'BATHYSPHERE SIGNAL LOST', { fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#81b9b9' }).setOrigin(.5).setDepth(18).setAlpha(0);
      // Track these in the scene cleanup container while preserving display depth.
      this.endObjects = [shade, title, subtitle];
      this.tweens.add({ targets: shade, fillAlpha: .85, duration: 650 });
      this.tweens.add({ targets: [title, subtitle], alpha: 1, y: '-=12', duration: 550, ease: 'Cubic.easeOut' });
      this.audio.tone(won ? 'pickup' : 'boom');
      this.juice.ring(640, 340, won ? 0xe7ba63 : 0x538a91, 480, 1600);
    });
    this.time.delayedCall(2850, () => {
      this.mode = 'over'; this.endObjects?.forEach(o => o.destroy()); this.endObjects = [];
      this.ui.finish(won, this.score, this.wave);
    });
  }
  pause() {
    if (!['play', 'transition', 'respawning', 'ending'].includes(this.mode)) return;
    this.resumeMode = this.mode; this.mode = 'paused'; this.tweens.pauseAll(); this.time.paused = true;
    this.announcement?.anims.pause();
    for (const child of this.combat.list) child.anims?.pause();
  }
  resume() {
    if (this.mode !== 'paused') return;
    this.mode = this.resumeMode || 'play'; this.tweens.resumeAll(); this.time.paused = false;
    this.announcement?.anims.resume();
    for (const child of this.combat.list) child.anims?.resume();
  }
  beginDive(enemy) {
    enemy.state = 'warning'; enemy.diveAt = this.elapsed + 500;
    enemy.origin = { x: enemy.sprite.x, y: enemy.sprite.y };
    enemy.direction = enemy.sprite.x < 640 ? 1 : -1;
    enemy.fireAt = enemy.diveAt + 800;
    this.juice.ring(enemy.sprite.x, enemy.sprite.y, 0xffab55, 42, 500);
    this.audio.tone('dive');
  }
  updateEnemy(e, dt) {
    const home = { x: e.x + Math.sin(this.elapsed / 1900) * 80, y: e.y + Math.sin(this.elapsed / 900 + e.phase) * 5 };
    if (e.type === 'boss') {
      const phase = this.bossFight?.phase ?? 1;
      const braced = this.bossFight && this.bossFight.state !== 'recovery';
      const targetX = e.x + Math.sin(this.elapsed / (phase === 3 ? 1150 : 1700)) * 330;
      home.x = Phaser.Math.Linear(e.sprite.x, braced ? this.bossFight.anchorX ?? e.sprite.x : targetX, Math.min(1, dt / 180));
      home.y = e.y + Math.sin(this.elapsed / 750) * (braced ? 4 : 18);
      if (this.bossFight) this.bossFight.anchorX = braced ? home.x : undefined;
    } else {
      if (e.state === 'warning' && this.elapsed >= e.diveAt) e.state = 'diving';
      if (e.state === 'diving') {
        const progress = (this.elapsed - e.diveAt) / 4000;
        if (progress >= 1) { e.state = 'formation'; e.sprite.angle = 0; }
        else {
          const pos = divePosition(e.origin, home, progress, e.direction);
          e.sprite.angle = Phaser.Math.Clamp((pos.x - e.sprite.x) * 2.5, -24, 24);
          e.sprite.setPosition(pos.x, pos.y);
          if (progress > .15 && progress < .62 && this.elapsed >= e.fireAt) this.attack(e);
        }
      }
    }
    if (e.state !== 'diving') {
      const entrance = Math.max(0, 1 - (this.elapsed - e.entryAt) / 1000);
      e.sprite.setPosition(home.x, home.y - entrance * entrance * 140 + e.recoil);
      e.sprite.angle = Math.sin(this.elapsed / 800 + e.phase) * (e.type === 'boss' ? 2 : 3);
    }
    e.recoil *= Math.pow(.82, dt / 16);
    if (this.elapsed >= e.flashUntil) e.sprite.setTint(e.sprite.baseTint);
    this.drawEnemyBars(e);
  }
  drawEnemyBars(e) {
    const boss = e.type === 'boss', width = boss ? 500 : Math.max(36, e.width * .78);
    const x = boss ? 390 : e.sprite.x - width / 2;
    const y = boss ? 90 : e.sprite.y - e.height / 2 - (e.type === 'heavy' ? 16 : 10);
    const height = boss ? 8 : 4, armorRow = e.maxArmor > 0;
    const armorOffset = boss ? 12 : 6;
    const healthY = y + (armorRow ? armorOffset : 0);
    this.bars.fillStyle(0x001018, .9).fillRect(x - 2, y - 2, width + 4, height + 4 + (armorRow ? armorOffset : 0));
    if (armorRow) {
      this.bars.fillStyle(0x17353d).fillRect(x, y, width, height);
      this.bars.fillStyle(0x76dbe8).fillRect(x, y, width * e.armor / e.maxArmor, height);
    }
    this.bars.fillStyle(0x3f3431).fillRect(x, healthY, width, height);
    this.bars.fillStyle(boss ? 0xe67950 : e.health === 1 ? 0xf7b369 : 0x98d38f).fillRect(x, healthY, width * e.health / e.maxHealth, height);
    if (!boss) for (let i = 1; i < ENEMIES[e.type].health; i++) {
      this.bars.fillStyle(0x001018, .6).fillRect(x + i * width / ENEMIES[e.type].health, healthY, 1, height);
    }
    if (e.state === 'warning') { this.bars.lineStyle(2, 0xffb85f, .5 + Math.sin(this.elapsed / 60) * .3); this.bars.strokeCircle(e.sprite.x, e.sprite.y, e.width * .6); }
  }
  update(time, rawDelta) {
    const dt = Math.min(rawDelta, 40), seconds = dt / 1000;
    if (this.mode === 'paused') return;
    this.juice.update(dt);
    this.city.x = Math.sin(this.juice.clock / 5000) * 3 + (this.mode === 'play' ? (640 - this.player.x) * .008 : 0);
    this.water.clear();
    this.bubbles.forEach(b => { b.y -= b.speed * seconds; if (b.y < 0) b.y = H; this.water.lineStyle(1, 0x277887, .35); this.water.strokeRect(Math.round(b.x), Math.round(b.y), b.size * 2, b.size * 2); });
    if (!this.particles) return;
    this.particles = this.particles.filter(p => { p.life -= dt; p.sprite.x += p.vx * seconds; p.sprite.y += p.vy * seconds; p.sprite.alpha = p.life / 700; if (p.life <= 0) { p.sprite.destroy(); return false; } return true; });
    if (this.mode !== 'play') return;
    if (this.hitStop > 0) { this.hitStop -= dt; return; }
    this.elapsed += dt;
    const k = this.keys;
    let dx = Number(k.RIGHT.isDown || k.D.isDown || this.touch.right) - Number(k.LEFT.isDown || k.A.isDown || this.touch.left);
    let dy = Number(k.DOWN.isDown || k.S.isDown) - Number(k.UP.isDown || k.W.isDown);
    const norm = Math.hypot(dx, dy) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + dx / norm * 370 * seconds, 48, W - 48);
    this.player.y = Phaser.Math.Clamp(this.player.y + dy / norm * 370 * seconds, 415, H - 48);
    this.player.alpha = this.elapsed < this.hurtUntil ? (Math.sin(this.elapsed / 130) > 0 ? .35 : 1) : 1;
    this.player.angle = Phaser.Math.Linear(this.player.angle, dx * 12, .12);
    if (this.elapsed > this.thrustAt) {
      this.thrustAt = this.elapsed + 45;
      for (const side of [-10, 10]) {
        const spark = this.add.rectangle(this.player.x + side, this.player.y + 20, 3, 7, 0x69e6ff).setBlendMode(Phaser.BlendModes.ADD); this.effects.add(spark);
        this.particles.push({ sprite: spark, vx: -dx * 35, vy: 90, life: 260 });
      }
    }
    if (k.SPACE.isDown || this.touch.fire) this.shoot();
    this.bars.clear();
    if (this.power.shield > this.elapsed) { this.bars.lineStyle(2, 0x7aeeff, .8); this.bars.strokeCircle(this.player.x, this.player.y, 34); }
    const activeDivers = this.enemies.filter(e => e.state !== 'formation' && e.type !== 'boss');
    if (this.wave <= 3 && this.elapsed >= this.nextDiveAt && activeDivers.length < (this.wave === 1 ? 2 : 3) + this.runMode.extraDivers) {
      const available = this.enemies.filter(e => e.state === 'formation');
      if (available.length) this.beginDive(Phaser.Utils.Array.GetRandom(available));
      this.nextDiveAt = this.elapsed + (this.wave === 1 ? 1800 : 1250) * this.runMode.diveInterval;
    }
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.bossFight?.update();
    if (this.mode !== 'play') return;
    // Snapshot so chain-burst bullets created during a hit start moving on the next frame.
    for (const b of [...this.bullets]) {
      if (!b.sprite.active) continue;
      if (b.chain && this.elapsed - b.born > BURST_LIFETIME) { b.sprite.destroy(); continue; }
      if (this.elapsed > b.trailAt) {
        b.trailAt = this.elapsed + 45;
        const trail = this.add.rectangle(b.sprite.x, b.sprite.y, 2, 5, b.chain ? 0xce83f4 : b.friendly ? 0x64e7ff : 0xe4a153).setRotation(b.sprite.rotation).setBlendMode(Phaser.BlendModes.ADD);
        this.effects.add(trail); this.particles.push({ sprite: trail, vx: 0, vy: 0, life: 160 });
      }
      b.sprite.x += b.vx * seconds; b.sprite.y += b.vy * seconds;
      if (b.sprite.x < 20 || b.sprite.x > W - 20 || b.sprite.y < 72 || b.sprite.y > H - 20) { b.sprite.destroy(); continue; }
      if (b.friendly) {
        const e = this.enemies.find(e => Math.abs(e.sprite.x - b.sprite.x) < ENEMIES[e.type].width * .39 + b.radius && Math.abs(e.sprite.y - b.sprite.y) < ENEMIES[e.type].height * .39 + b.radius);
        if (e) { b.sprite.destroy(); this.hitEnemy(e, b.source); }
      } else if (Math.hypot(b.sprite.x - this.player.x, b.sprite.y - this.player.y) < 18) { b.sprite.destroy(); this.hurt(); }
      if (this.mode !== 'play') break;
    }
    this.bullets = this.bullets.filter(b => b.sprite.active);
    for (const p of [...this.pickups]) {
      p.sprite.y += 95 * seconds; p.sprite.angle = Math.sin(this.elapsed / 200) * 9;
      if (Math.hypot(p.sprite.x - this.player.x, p.sprite.y - this.player.y) < 35) this.collect(p);
      else if (p.sprite.y > 740) { p.sprite.destroy(); this.pickups.splice(this.pickups.indexOf(p), 1); }
    }
    if (this.transitionAt && this.elapsed >= this.transitionAt && this.mode === 'play') this.nextWave();
    this.ui.updateHUD(this);
  }
}
