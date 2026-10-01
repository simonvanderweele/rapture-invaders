export const ACTORS = {
  "security-flyer": {
    "frameWidth": 96,
    "frameHeight": 96,
    "targetHull": [
      64,
      36
    ],
    "idleVisibleBounds": [
      15,
      31,
      80,
      65
    ],
    "animations": {
      "idle": {
        "file": "security-flyer/idle.png",
        "frames": 4,
        "frameRate": 6,
        "repeat": -1
      },
      "attack": {
        "file": "security-flyer/attack.png",
        "frames": 4,
        "frameRate": 12,
        "repeat": 0,
        "fireFrame": 1
      },
      "die": {
        "file": "security-flyer/die.png",
        "frames": 8,
        "frameRate": 12,
        "repeat": 0
      }
    }
  },
  "rivet-drone": {
    "frameWidth": 96,
    "frameHeight": 96,
    "targetHull": [
      56,
      48
    ],
    "idleVisibleBounds": [
      20,
      26,
      76,
      71
    ],
    "animations": {
      "idle": {
        "file": "rivet-drone/idle.png",
        "frames": 4,
        "frameRate": 6,
        "repeat": -1
      },
      "attack": {
        "file": "rivet-drone/attack.png",
        "frames": 4,
        "frameRate": 12,
        "repeat": 0,
        "fireFrame": 2
      },
      "die": {
        "file": "rivet-drone/die.png",
        "frames": 8,
        "frameRate": 12,
        "repeat": 0
      }
    }
  },
  "heavy-gunship": {
    "frameWidth": 96,
    "frameHeight": 96,
    "targetHull": [
      72,
      56
    ],
    "idleVisibleBounds": [
      12,
      20,
      84,
      75
    ],
    "animations": {
      "idle": {
        "file": "heavy-gunship/idle.png",
        "frames": 4,
        "frameRate": 6,
        "repeat": -1
      },
      "attack": {
        "file": "heavy-gunship/attack.png",
        "frames": 4,
        "frameRate": 12,
        "repeat": 0,
        "fireFrame": 2
      },
      "die": {
        "file": "heavy-gunship/die.png",
        "frames": 8,
        "frameRate": 12,
        "repeat": 0
      }
    }
  },
  "big-daddy": {
    "frameWidth": 256,
    "frameHeight": 256,
    "targetHull": [
      200,
      200
    ],
    "idleVisibleBounds": [
      28,
      37,
      229,
      219
    ],
    "animations": {
      "idle": {
        "file": "big-daddy/idle.png",
        "frames": 4,
        "frameRate": 6,
        "repeat": -1
      },
      "attack": {
        "file": "big-daddy/attack.png",
        "frames": 4,
        "frameRate": 12,
        "repeat": 0,
        "fireFrame": 1
      },
      "die": {
        "file": "big-daddy/die.png",
        "frames": 8,
        "frameRate": 12,
        "repeat": 0
      }
    }
  },
  "player": {
    "frameWidth": 96,
    "frameHeight": 96,
    "targetHull": [
      40,
      48
    ],
    "idleVisibleBounds": [
      28,
      24,
      68,
      72
    ],
    "animations": {
      "idle": {
        "file": "player/idle.png",
        "frames": 4,
        "frameRate": 6,
        "repeat": -1
      },
      "shoot": {
        "file": "player/shoot.png",
        "frames": 4,
        "frameRate": 16,
        "repeat": 0,
        "fireFrame": 1
      },
      "die": {
        "file": "player/die.png",
        "frames": 4,
        "frameRate": 10,
        "repeat": 0
      },
      "consume-power-up": {
        "file": "player/consume-power-up.png",
        "frames": 4,
        "frameRate": 10,
        "repeat": 0
      }
    }
  }
};

export function preloadActors(scene, baseUrl = '/assets/sprites-v1') {
  const base = baseUrl.replace(/\/$/, '');
  for (const [entity, spec] of Object.entries(ACTORS)) {
    for (const [name, animation] of Object.entries(spec.animations)) {
      scene.load.spritesheet(`${entity}-${name}`, `${base}/${animation.file}`, {
        frameWidth: spec.frameWidth, frameHeight: spec.frameHeight,
        margin: 0, spacing: 0
      });
    }
  }
}

export function createActorAnimations(scene) {
  for (const [entity, spec] of Object.entries(ACTORS)) {
    for (const [name, animation] of Object.entries(spec.animations)) {
      const key = `${entity}-${name}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: animation.frames - 1 }),
        frameRate: animation.frameRate, repeat: animation.repeat
      });
    }
  }
}
