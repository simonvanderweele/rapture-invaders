// Only pickups still use the supplied concept overview. Actors use transparent animation strips.
export const FRAMES = {
  shield: [111, 456, 118, 108],
  triple: [612, 456, 117, 108], chain: [1081, 456, 120, 108],
};
export { preloadActors } from './actor-animations.js';
import { ALL_ACTORS, createActorAnimations } from './actor-animations.js';
const ACTOR_KEYS = { player: 'player', flyer: 'security-flyer', drone: 'rivet-drone', heavy: 'heavy-gunship', boss: 'big-daddy' };
export function registerAssets(scene) {
  const texture = scene.textures.get('overview');
  for (const [key, rect] of Object.entries(FRAMES)) texture.add(key, 0, ...rect);
  createActorAnimations(scene);
}
export function actorSprite(scene, x, y, entity, scale = 1) {
  const base = ACTOR_KEYS[entity];
  const key = scene.runMode?.id === 'drowned' && ALL_ACTORS[`drowned-${base}`] ? `drowned-${base}` : base;
  const sprite = scene.add.sprite(x, y, `${key}-idle`).setScale(scale).play(`${key}-idle`);
  sprite.actorKey = key; sprite.baseTint = key.startsWith('drowned-') ? 0xffffff : (scene.runMode?.tint ?? 0xffffff); sprite.setTint(sprite.baseTint);
  sprite.on('animationcomplete', animation => {
    if (animation.key.endsWith('-die')) sprite.destroy();
    else if (sprite.active) sprite.play(`${key}-idle`);
  });
  return sprite;
}
export function animate(sprite, entity, state, onFire) {
  if (!sprite.active) return;
  const key = `${sprite.actorKey ?? ACTOR_KEYS[entity]}-${state === 'consume' ? 'consume-power-up' : state}`;
  // A collection effect takes priority over firing art, but never suppresses a shot.
  if (state === 'shoot' && sprite.anims.currentAnim?.key.endsWith('consume-power-up')) { onFire?.(); return; }
  if (sprite.fireListener) sprite.off('animationupdate', sprite.fireListener);
  sprite.fireListener = null;
  if (onFire) {
    const fireFrame = ALL_ACTORS[sprite.actorKey ?? ACTOR_KEYS[entity]].animations[state]?.fireFrame ?? 0;
    sprite.fireListener = (animation, frame) => {
      if (animation.key === key && frame.index === fireFrame + 1) {
        sprite.off('animationupdate', sprite.fireListener); sprite.fireListener = null; onFire();
      }
    };
    sprite.on('animationupdate', sprite.fireListener);
  }
  sprite.play(key);
}

// Runtime chroma key for the dark navy presentation sheet. The source artwork
// remains untouched; used only by the three pickup icons.
export function installOverviewPipeline(scene, Phaser) {
  if (!scene.game.renderer.pipelines) return false;
  scene.game.renderer.pipelines.add('OverviewKey', new Phaser.Renderer.WebGL.Pipelines.SinglePipeline({
    game: scene.game,
    fragShader: `precision mediump float;
      uniform sampler2D uMainSampler;
      varying vec2 outTexCoord;
      varying vec4 outTint;
      void main() {
        vec4 tex = texture2D(uMainSampler, outTexCoord);
        float brightness = max(tex.r, max(tex.g, tex.b));
        float mask = smoothstep(0.105, 0.19, brightness);
        float alpha = tex.a * outTint.a * mask;
        gl_FragColor = vec4(tex.rgb * outTint.bgr * alpha, alpha);
      }`,
  }));
  return true;
}
export function styleOverview(sprite) {
  if (sprite.scene.game.renderer.pipelines?.has('OverviewKey')) sprite.setPipeline('OverviewKey');
  return sprite;
}

export function preloadWaves(scene) {
  for (const variant of ['wave-1', 'wave-2', 'wave-3', 'boss']) {
    scene.load.spritesheet(`announcement-${variant}`, `/assets/waves/${variant}.png`, { frameWidth: 768, frameHeight: 448 });
  }
}
export function registerWaves(scene) {
  for (const variant of ['wave-1', 'wave-2', 'wave-3', 'boss']) {
    const key = `announcement-${variant}`;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 31 }), frameRate: 14, repeat: 0 });
  }
}
