import { getMode } from './modes.js';
import Phaser from 'phaser';
import './style.css';
import { OceanScene } from './game.js';
import { AudioDirector } from './audio.js';
import { HostedScoreBoard, cleanName } from './scores.js';
import { MenuTitle } from './menu-title.js';
const $ = selector => document.querySelector(selector);
const menuTitle = new MenuTitle($('.menu-title'));
// Dispose any prior development instance before constructing a new audio graph.
window.__raptureAudio?.dispose();
const audio = new AudioDirector();
window.__raptureAudio = audio;
const boards = { normal: new HostedScoreBoard(), drowned: new HostedScoreBoard('drowned') };
for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, () => audio.start(), { once: true });
const ui = {
  screen: 'menu', scene: null, selectedMode: 'normal',
  selectMode(mode) {
    this.selectedMode = getMode(mode).id;
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === this.selectedMode)));

  },
  ready(scene) { this.scene = scene; this.show('menu'); $('#loading').classList.add('hidden'); audio.start(); },
  show(name) {
    if (name !== 'result') this.scoreRequest = (this.scoreRequest ?? 0) + 1;
    this.screen = name;
    menuTitle.setVisible(name === 'menu');
    $('#menu-cameo').classList.toggle('hidden', name !== 'menu');
    this.scene?.input.keyboard.clearCaptures();
    if (name === 'play') this.scene.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    document.querySelectorAll('.screen').forEach(e => e.classList.toggle('hidden', e.id !== name));
    $('#hud').classList.toggle('hidden', !['play', 'pause'].includes(name));
    $('#touch-controls').classList.toggle('hidden', name !== 'play');
    if (name !== 'play') requestAnimationFrame(() => $(`#${name} button, #${name} input`)?.focus({ preventScroll: true }));
  },
  start() { this.scene.showMenu(false); this.show('difficulty'); },
  begin() { if (!this.scene) return; audio.setMode(this.selectedMode); audio.start(); $('#stage').dataset.mode = this.selectedMode; this.scene.tweens.resumeAll(); this.scene.startRun(this.selectedMode); this.show('play'); document.activeElement?.blur(); },
  menu() { audio.setMode('normal'); $('#stage').dataset.mode = 'normal'; this.scene.tweens.resumeAll(); this.scene.showMenu(); this.show('menu'); audio.start(); },
  options() { this.scene.showMenu(false); this.show('options'); },
  credits() { this.scene.showMenu(false); this.show('credits'); },
  pause() { if (this.screen !== 'play') return; this.scene.pause(); this.show('pause'); audio.suspend(); },
  resume() { this.scene.resume(); this.show('play'); document.activeElement?.blur(); audio.start(); },
  escape() { if (this.screen === 'play') this.pause(); else if (this.screen === 'pause') this.resume(); else if (['credits', 'options', 'result', 'difficulty'].includes(this.screen)) this.menu(); },
  finish(won, score, wave) {
    this.scoreEntry = { id: crypto.randomUUID(), token: crypto.randomUUID(), name: 'DIVER', score, wave };
    this.resultMode = this.selectedMode;
    $('#result-eyebrow').textContent = won ? 'THE CITY IS YOURS' : 'SIGNAL LOST';
    $('#result-title').textContent = `${getMode(this.resultMode).label} SCORES`;
    $('#result-score').textContent = String(score).padStart(6, '0');
    $('#result-score').classList.remove('hidden');
    $('#score-name').value = 'DIVER'; $('#score-name').disabled = false;
    $('#score-save').disabled = false; $('#score-save').textContent = 'SAVE SCORE';
    $('#score-form').classList.remove('hidden');
    $('#board-tabs').classList.add('hidden');
    $('#result-retry').classList.remove('hidden');
    this.show('result'); this.loadScores();
  },
  leaderboard() {
    this.scene.showMenu(false); this.scoreEntry = null;
    this.resultMode = this.selectedMode;
    $('#result-score').classList.add('hidden'); $('#score-form').classList.add('hidden');
    $('#result-retry').classList.add('hidden'); $('#board-tabs').classList.remove('hidden');
    $('#result-eyebrow').textContent = 'SHARED HIGH SCORES';
    this.show('result'); this.loadScores();
  },
  async loadScores() {
    const request = this.scoreRequest = (this.scoreRequest ?? 0) + 1;
    const board = boards[this.resultMode];
    $('#result-title').textContent = `${getMode(this.resultMode).label} SCORES`;
    document.querySelectorAll('[data-board]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.board === this.resultMode)));
    $('#score-refresh').disabled = true;
    $('#score-storage').textContent = 'CONNECTING TO THE LEADERBOARD…';
    this.renderScores([]);
    try {
      await board.load();
      if (request !== this.scoreRequest) return;
      this.renderScores(board.scores);
      $('#score-storage').textContent = board.scores.length ? 'TOP 5 · HOSTED LEADERBOARD' : 'NO SCORES YET · MAKE THE FIRST DESCENT';
    } catch {
      if (request !== this.scoreRequest) return;
      $('#score-storage').textContent = 'LEADERBOARD UNAVAILABLE · RETRY TO RECONNECT';
    } finally { if (request === this.scoreRequest) $('#score-refresh').disabled = false; }
  },
  renderScores(entries) {
    const body = $('#score-rows'); body.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const entry = entries[i], row = document.createElement('tr');
      if (entry && entry.id === this.scoreEntry?.id) row.className = 'current-score';
      for (const text of [String(i + 1).padStart(2, '0'), entry?.name ?? '—', entry ? String(entry.score).padStart(6, '0') : '—']) {
        const cell = document.createElement('td'); cell.textContent = text; row.append(cell);
      }
      body.append(row);
    }
  },
  async saveScore(event) {
    event.preventDefault(); if (!this.scoreEntry || $('#score-save').disabled) return;
    const entry = this.scoreEntry, board = boards[this.resultMode];
    const request = this.scoreRequest = (this.scoreRequest ?? 0) + 1;
    entry.name = cleanName($('#score-name').value); $('#score-name').value = entry.name;
    $('#score-name').disabled = true; $('#score-save').disabled = true; $('#score-refresh').disabled = true;
    $('#score-save').textContent = 'SAVING…'; $('#score-storage').textContent = 'SAVING YOUR SCORE…';
    try {
      await board.save(entry);
      if (request !== this.scoreRequest) return;
      this.renderScores(board.scores); $('#score-save').textContent = 'SAVED';
      $('#score-storage').textContent = 'SCORE SAVED ONLINE · TOP 5';
    } catch {
      if (request !== this.scoreRequest) return;
      $('#score-save').disabled = false; $('#score-save').textContent = 'RETRY SAVE';
      $('#score-storage').textContent = 'NOT SAVED · YOUR SCORE IS READY TO RETRY';
    } finally {
      if (request === this.scoreRequest) { $('#score-name').disabled = false; $('#score-refresh').disabled = false; }
    }
  },
  updateHUD(scene) {
    $('#run-mode').textContent = getMode(scene.runMode.id).label;
    $('#hull').textContent = '◆ '.repeat(Math.max(0, scene.lives)).trim() || '—';
    $('#score').textContent = String(scene.score).padStart(6, '0');
    $('#wave-label').textContent = scene.wave > 3 ? 'BIG DADDY' : `WAVE 0${scene.wave} / 03`;
    const labels = { shield: 'SHIELD', triple: 'TRIPLE', chain: 'CHAIN' };
    $('#power').textContent = Object.entries(scene.power).filter(([, t]) => t > scene.elapsed).map(([k, t]) => `${labels[k]} ${Math.ceil((t - scene.elapsed) / 1000)}s`).join(' · ') || 'BATHYSPHERE ONLINE';
  },
};
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { ui.selectMode(button.dataset.mode); audio.tone('click'); ui.begin(); }));
document.querySelectorAll('[data-board]').forEach(button => button.addEventListener('click', () => { ui.resultMode = button.dataset.board; ui.loadScores(); }));
$('#score-form').addEventListener('submit', event => ui.saveScore(event));
$('#score-name').addEventListener('input', () => { $('#score-save').disabled = false; $('#score-save').textContent = 'SAVE SCORE'; });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  if (!ui.scene) return; audio.start(); audio.tone('click'); ui[button.dataset.action]();
}));
for (const key of ['music', 'sfx']) {
  const input = $(`#${key}`);
  const render = () => { input.style.setProperty('--volume', `${input.value}%`); $(`#${key}-value`).textContent = `${input.value}%`; };
  input.value = audio.settings[key]; render();
  input.addEventListener('input', () => { audio.start(); audio.set(key, Number(input.value)); render(); });
  input.addEventListener('change', () => { if (key === 'sfx') audio.tone('pickup'); });
}
for (const [id, key] of [['touch-left', 'left'], ['touch-right', 'right'], ['touch-fire', 'fire']]) {
  const button = $(`#${id}`);
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); if (ui.scene) ui.scene.touch[key] = true; });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => { if (ui.scene) ui.scene.touch[key] = false; });
}
window.addEventListener('blur', () => { if (ui.scene) ui.scene.touch = { left: false, right: false, fire: false }; ui.pause(); audio.suspend(); });
window.addEventListener('focus', () => { if (ui.screen !== 'pause') audio.start(); });
window.addEventListener('pagehide', () => audio.suspend());
document.addEventListener('visibilitychange', () => { if (document.hidden) { ui.pause(); audio.suspend(); } else if (ui.screen !== 'pause') audio.start(); });
await document.fonts.load('16px "Press Start 2P"');
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 1280, height: 720, pixelArt: true, roundPixels: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: new OceanScene(ui, audio), backgroundColor: '#001520', audio: { noAudio: true } });
if (import.meta.env.DEV) window.__rapture = { game, ui };
if (import.meta.hot) import.meta.hot.dispose(() => { menuTitle.destroy(); audio.dispose(); game.destroy(true); });

// One decorative image is reused on every pass; never stack overlapping copies.
const cameo = $('#menu-cameo');
const cameoPositions = [[8, 26], [53, 34], [30, 13], [10, 45], [55, 15]];
let cameoPass = 0;
cameo.addEventListener('animationiteration', () => {
  const [left, top] = cameoPositions[++cameoPass % cameoPositions.length];
  cameo.style.left = `${left}%`; cameo.style.top = `${top}%`;
});
