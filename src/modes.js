export const MODES = Object.freeze({
  normal: Object.freeze({ id: 'normal', label: 'NORMAL', lives: 3, musicRate: 1, projectileSpeed: 1, diveInterval: 1, extraDivers: 0, fireInterval: 1, bossRecovery: 1, powerDuration: 9000, tint: 0xffffff }),
  drowned: Object.freeze({ id: 'drowned', label: 'DROWNED', lives: 2, musicRate: .95, projectileSpeed: 1.18, diveInterval: .75, extraDivers: 1, fireInterval: .85, bossRecovery: .75, powerDuration: 7000, tint: 0x95cfc5 }),
});
export const getMode = id => MODES[id] ?? MODES.normal;
