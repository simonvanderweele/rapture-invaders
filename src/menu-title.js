// Matches output/menu-title-v1/spritesheet.json. Play once, then hold the rust.
export const TITLE_ANIMATION = Object.freeze({ width: 768, height: 256, columns: 4, frames: 48, fps: 8 });
export function titleFrame(elapsed, reducedMotion = false) {
  return reducedMotion ? 47 : Math.min(47, Math.max(0, Math.floor(elapsed * TITLE_ANIMATION.fps / 1000)));
}

export class MenuTitle {
  constructor(element) {
    this.element = element;
    this.canvas = element.querySelector('canvas');
    this.context = this.canvas.getContext('2d');
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.image = new Image();
    this.image.src = '/assets/menu/title-spritesheet.png';
    this.ready = this.image.decode().then(() => {
      this.loaded = true;
      this.canvas.hidden = false;
      this.element.classList.add('has-art');
      if (this.visible) this.play();
    }).catch(() => { /* Keep the accessible, readable text if artwork fails. */ });
    this.onMotion = () => { if (this.visible && this.loaded) this.play(); };
    this.motion.addEventListener('change', this.onMotion);
  }
  setVisible(visible) {
    this.visible = visible;
    cancelAnimationFrame(this.request);
    if (visible && this.loaded) this.play();
  }
  draw(frame) {
    const { width, height, columns } = TITLE_ANIMATION;
    this.context.clearRect(0, 0, width, height);
    this.context.imageSmoothingEnabled = false;
    this.context.drawImage(this.image, frame % columns * width, Math.floor(frame / columns) * height, width, height, 0, 0, width, height);
  }
  play() {
    cancelAnimationFrame(this.request);
    const start = performance.now();
    const tick = now => {
      if (!this.visible) return;
      const frame = titleFrame(now - start, this.motion.matches);
      this.draw(frame);
      if (frame < TITLE_ANIMATION.frames - 1) this.request = requestAnimationFrame(tick);
    };
    tick(start);
  }
  destroy() {
    this.visible = false;
    cancelAnimationFrame(this.request);
    this.motion.removeEventListener('change', this.onMotion);
  }
}
