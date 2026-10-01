# Rapture Invaders

A playable BioShock-themed fixed-screen shooter built with Phaser 3 and Vite. No backend required.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). `npm run build` produces `dist/`; `npm run preview` serves that build. `npm test` checks the combat rules.

## Play

- Arrow keys or WASD: move within the lower combat area.
- Hold Space: shoot. Escape: pause/resume.
- Three fleets of 24 ships, followed by Big Daddy with three phases at 50–31, 30–16, and 15–1 HP.
- Hits to kill: security flyer 2, rivet drone 4, heavy gunship 5 (2 armor + 3 hull), Big Daddy 50. Every enemy has a health bar; heavy armor sits above hull.
- Every fifth normal enemy drops a pickup, cycling through invincibility, triple shot, and chain burst. Collect by touching it. Each lasts nine seconds; effects can overlap.
- Burst produces eight radial shots only on direct player-shot kills while active. Burst-shot kills never propagate. Fragments last 650 ms (about 215 px of travel); at most 24 may coexist, and a new burst is skipped if fewer than eight slots remain.
- Normal enemies hold fire in formation. Selected ships telegraph a sortie for 500 ms, zigzag down while shooting, then return to formation. At most two sorties coexist in wave one and three thereafter. Three player lives. Losing a life plays the death animation, then respawns a new ship at (640, 626), flashing and invincible for 2.2 seconds. The final life leads to game over.
- Options persist locally. The supplied `assets/sfx/music.mp3` loops at 40% by default, starting and repeating from 00:04 to skip the silent intro. Older synth settings migrate once to 40%; later volume choices persist. Playback is requested on menu load and unlocked by the first click/key if autoplay is blocked. One media element and source graph are reused, same-origin tabs share an exclusive Web Lock, and blur/pause/hide stop playback. HMR disposes old audio graphs. Browser verification must always launch with `--args "--mute-audio"` to avoid playing alongside the user's browser. Sound effects are synthesized. Armor hits use a short metallic ting with three ringing overtones; once armor is gone, hits use the lower hull-impact sound. Credits retain the mockup's placeholders.
- Basic left/right/fire touch controls are included; desktop is the primary target.

## Project map

| File | Responsibility |
| --- | --- |
| `src/game.js` | Ocean backdrop, combat loop, collisions, waves, boss, effects |
| `src/rules.js` | Enemy tuning, armor damage, fleet layout, burst geometry |
| `src/assets.js` | Actor animation lifecycle and pickup-only chroma-key shader |
| `src/actor-animations.js` | Supplied actor frame sizes, frame rates, fire-frame metadata |
| `src/scores.js` | Local top-five ranking, names, and storage fallback |
| `src/juice.js` | Light shafts, fish, sonar, hit flashes, shockwaves, score feedback |
| `src/main.js` | Phaser boot, screen navigation, controls, HUD |
| `src/style.css` | Native menu and settings presentation |
| `src/audio.js` | Saved volumes, supplied music loop, synthesized effects |
| `public/assets/asset-overview.png` | Unmodified copy of the supplied art overview |
| `output/verification/` | Browser captures at 1280 × 720 |

## Big Daddy specials

Big Daddy keeps 50 HP and cycles through three visually telegraphed specials, without attack instructions or phase callout text. He braces in place during attacks and moves during reload windows. Difficulty escalates at 60% and 30% health; attacks already in progress keep their original phase tuning.

- **Electro Bolt:** two marked vertical lanes in phase one, three later. Subtle cyan fills and square brass corner brackets show the shock area; there are no arrow patterns or text instructions. Targets lock when the warning begins. After 1.1 / 1.0 / 0.9 seconds the lanes become dangerous for 1.05 seconds. Safe space remains outside the marked lanes.
- **Depth Charges:** two / three / four marked pods fall into the lower arena, then detonate in sequence into 10 / 12 / 14 radial projectiles each. Markers show the destinations before launch.
- **Rivet Barrage:** a visible fan warning precedes a sweeping series of paired or triple shots. Phase three increases firing speed.

Reload windows last 1.35 / 1.15 / 0.95 seconds. The boss remains damageable throughout. Losing a life cancels current hazards and gives an additional recovery window; pause freezes all special timing, and boss death/menu/restart destroy the hazard graphics and state. `src/boss.js` owns the attack director and `src/boss-rules.js` contains phase tuning and hazard geometry.

## Wave transitions and high scores

The four supplied sheets from `output/wave-announcements-v1` play before waves 1–3 and Big Daddy: 32 frames at 14 fps, centered at (640, 304). Combat and power-up clocks hold during announcements, and Escape pauses the counter as well. Enemy entry begins after the announcement finishes.

The final death plays an animated signal-loss sequence before opening the high-score screen. Victory uses a matching success sequence. The five best runs are saved on this device, sorted by score. The current run is initially stored as DIVER; players may save a name of up to twelve characters without duplicating their entry. No fabricated scores fill empty rows. Retry starts a clean run; Return to Menu clears combat and pending transitions. If persistent storage is unavailable, the table retains session scores and labels that limitation.

## Art and effects

Transparent animation strips from `output/sprites-v1` are copied to `public/assets/sprites-v1`. Player and normal enemy frames are 96 × 96; boss frames are 256 × 256. They render at native scale because the canvases already include padding around the intended hull sizes. Hitboxes remain based on hull dimensions, not the transparent frame canvas.

All sixteen animations are loaded. Idle loops; attack/shoot/consume return to idle; deaths remove actors only after animation completion. Projectiles spawn at the authored fire-frame indices. Simulation, sprite animations, effects, and result delays pause together.

Only the three pickup icons still use concept-sheet crops and the temporary navy chroma-key shader. New versions of actor strips can replace the same files; update `src/actor-animations.js` if frame layout or timing changes.

Combat feedback includes banking, thruster wakes, bullet trails, hit flashes, armor-break cues, layered explosion rings, death strips, floating scores, camera shake, and brief kill impact pauses. The city has parallax, drifting shafts of light, fish, bubbles, and sonar sweeps. Reduced-motion preference disables impact camera shake/flash.

The supplied pixel-art cutout is an unmodified asset at `public/assets/menu-cameo-pixel-v2.png`. Exactly one decorative image appears on the main menu only. At 24% of the screen width, a 14-second CSS animation fades between 0 and 1.5% opacity while floating and rotating; each pass moves it to another position. The cutout retains its pixel edges. Reduced-motion preference uses a static 1.5% opacity image.

## Visual status

The supplied main-menu/options/credits images guide the brass, navy, cream, pixel-text presentation and native control layout. This is a foundation, not a claim of pixel parity: the skyline is procedural, corners are simplified, and Press Start 2P is a provisional font because no original font file was supplied. The actor animation sheets and music loop are integrated. Final skyline art, authored sound effects, credit names, and human balance playtesting remain future work.

Phaser installation reference: https://docs.phaser.io/phaser/getting-started/installation
