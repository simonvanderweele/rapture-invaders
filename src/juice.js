import Phaser from 'phaser';
export class Juice {
  constructor(scene) {
    this.scene = scene;
    this.ambient = scene.add.graphics().setDepth(1);
    this.light = 0;
    this.clock = 0;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  update(delta) {
    this.clock += delta; this.light = Math.max(0, this.light - delta / 800);
    const g = this.ambient, t = this.clock / 1000;
    g.clear();
    // Slowly shifting shafts of light, with illumination that responds to kills.
    for (let i = 0; i < 4; i++) {
      const x = 100 + i * 360 + Math.sin(t * .16 + i) * 85;
      g.fillStyle(0x5fcacc, .025 + this.light * .022);
      g.fillTriangle(x, 0, x - 210, 720, x + 90, 720);
      g.fillStyle(0x9beae2, .012); g.fillTriangle(x + 12, 0, x - 75, 720, x + 35, 720);
    }
    // Distant schools of fish drift behind the combat plane.
    for (let school = 0; school < 3; school++) for (let i = 0; i < 6; i++) {
      const x = ((t * (school % 2 ? -13 : 10) + school * 480 + i * 23) % 1420 + 1420) % 1420 - 70;
      const y = 475 + school * 80 + Math.sin(t * .8 + i) * 9 + i % 3 * 7;
      g.fillStyle(0x257181, .18); g.fillEllipse(x, y, 10, 3); g.fillTriangle(x - 4, y, x - 9, y - 3, x - 9, y + 3);
    }
    // Soft sonar sweep, deliberately behind ships and bullets.
    const radius = (t * 43) % 930;
    g.lineStyle(1, 0x57c3c9, .07 * (1 - radius / 930)); g.strokeCircle(640, 640, radius);
  }
  ring(x, y, color = 0x83eced, radius = 75, duration = 450) {
    const s = this.scene;
    const ring = s.add.circle(x, y, 9).setStrokeStyle(2, color, .8).setBlendMode(Phaser.BlendModes.ADD);
    s.effects.add(ring);
    s.tweens.add({ targets: ring, radius, alpha: 0, duration, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }
  label(x, y, text, color = '#ffe6ad', size = 12) {
    const s = this.scene;
    const label = s.add.text(x, y, text, { fontFamily: '"Press Start 2P"', fontSize: `${size}px`, color, stroke: '#00151c', strokeThickness: 3 }).setOrigin(.5);
    s.effects.add(label);
    s.tweens.add({ targets: label, y: y - 38, alpha: 0, duration: 850, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }
  hit(enemy, armored) {
    const s = this.scene, sprite = enemy.sprite;
    sprite.setTintFill(armored ? 0x89f3ff : 0xfff0c7);
    enemy.flashUntil = s.elapsed + 70; enemy.recoil = 7;
    s.explode(sprite.x, sprite.y + enemy.height * .2, armored ? 0x71dcff : 0xffd28a, 8);
    this.ring(sprite.x, sprite.y, armored ? 0x66dfff : 0xffd887, 23, 160);
    s.audio.tone(armored ? 'armorHit' : 'impact');
  }
  kill(enemy) {
    const s = this.scene, { x, y } = enemy.sprite, big = enemy.type === 'boss';
    this.light = big ? 1 : .55;
    this.ring(x, y, 0xffc76c, big ? 260 : 65, big ? 1100 : 420);
    this.ring(x, y, 0x83dcd5, big ? 340 : 88, big ? 1500 : 650);
    this.label(x, y - 24, `+${enemy.score}`, '#ffdb91', big ? 24 : 12);
    if (!this.reduced) s.cameras.main.shake(big ? 500 : 100, big ? .008 : .0016);
    s.hitStop = big ? 110 : 28;
  }
}
