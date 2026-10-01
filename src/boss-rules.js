export const bossPhase = health => health <= 15 ? 3 : health <= 30 ? 2 : 1;
export const bossTiming = phase => ({ warning: 1200 - phase * 100, recovery: 1550 - phase * 200, speed: 185 + phase * 30 });
export function boltLanes(playerX, phase) {
  const center = Math.max(130, Math.min(1150, playerX));
  const offsets = phase === 1 ? [0, center < 640 ? 300 : -300] : [-300, 0, 300];
  return [...new Set(offsets.map(offset => Math.max(80, Math.min(1200, center + offset))))];
}
export function chargeTargets(player, phase) {
  return Array.from({ length: phase + 1 }, (_, i) => ({
    x: Math.max(95, Math.min(1185, player.x + (i - phase / 2) * 210)),
    y: Math.max(440, Math.min(620, player.y - (i % 2) * 110)),
  }));
}
export function radialShots(phase, rotation = 0) {
  const count = 8 + phase * 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = rotation + i * Math.PI * 2 / count;
    return { x: Math.cos(angle) * (135 + phase * 15), y: Math.sin(angle) * (135 + phase * 15) };
  });
}
export const insideBolt = (player, lanes, width) => player.y >= 365 && lanes.some(x => Math.abs(player.x - x) < width / 2 + 13);
