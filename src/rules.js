export const ENEMIES = {
  flyer: { width: 64, height: 36, health: 2, armor: 0, score: 100, fireDelay: 850 },
  drone: { width: 56, height: 48, health: 4, armor: 0, score: 200, fireDelay: 950 },
  heavy: { width: 72, height: 56, health: 3, armor: 2, score: 450, fireDelay: 1100 },
  boss: { width: 200, height: 200, health: 50, armor: 0, score: 5000, fireDelay: 1500 },
};
export const POWER_DURATION = 9000;
export const BURST_LIFETIME = 650;
export const MAX_BURST_BULLETS = 24;
export function canBurst(powerUntil, now, source, activeCount) {
  return powerUntil > now && source === 'player' && activeCount + 8 <= MAX_BURST_BULLETS;
}
export function applyDamage(target, amount = 1) {
  const absorbed = Math.min(target.armor, amount);
  return { armor: target.armor - absorbed, health: Math.max(0, target.health - (amount - absorbed)) };
}
export function burstVelocities(speed = 330) {
  return Array.from({ length: 8 }, (_, i) => ({ x: Math.cos(i * Math.PI / 4) * speed, y: Math.sin(i * Math.PI / 4) * speed }));
}
export function formation(wave) {
  return Array.from({ length: 24 }, (_, i) => ({
    type: i < 8 ? (wave > 1 && i % 2 === 0 ? 'heavy' : 'drone') : 'flyer',
    x: 265 + (i % 8) * 106, y: 145 + Math.floor(i / 8) * 76,
  }));
}
// Four seconds: three seconds of zigzag descent, then a curved return to station.
export function divePosition(origin, home, progress, direction) {
  const t = Math.max(0, Math.min(1, progress));
  const bottom = { x: Math.max(110, Math.min(1170, origin.x + direction * 100)), y: 560 };
  if (t < .72) {
    const p = t / .72;
    return { x: origin.x + (bottom.x - origin.x) * p + Math.sin(p * Math.PI * 4) * 105 * Math.sin(p * Math.PI), y: origin.y + (bottom.y - origin.y) * p };
  }
  const p = (t - .72) / .28, ease = p * p * (3 - 2 * p);
  return { x: bottom.x + (home.x - bottom.x) * ease + direction * Math.sin(p * Math.PI) * 100, y: bottom.y + (home.y - bottom.y) * ease };
}
