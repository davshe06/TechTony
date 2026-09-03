// Fixed-timestep loop, AABB tile collision against the level grid, and the camera.

import { T, VW, ROWS, SOLID, buildLevel } from './level.js';

const STEP_MS = 1000 / 60;

export class World {
  constructor(spec) {
    this.spec = spec;
    this.grid = buildLevel(spec);
    this.cam = 0;
  }

  tileAt(px, py) {
    const c = Math.floor(px / T), r = Math.floor(py / T);
    if (r < 0 || r >= ROWS || c < 0) return 0;
    if (c >= this.spec.w) return 1;   // treat past the end as wall, so nothing walks off
    return this.grid[r][c];
  }

  // Every tile overlapping box b. solidOnly filters to collidable tiles;
  // otherwise returns any non-empty tile (used for hazard overlap tests).
  hits(b, solidOnly) {
    const out = [];
    const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 1) / T);
    const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 1) / T);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || r >= ROWS) continue;
        const t = c < 0 ? 1 : (c >= this.spec.w ? 0 : this.grid[r][c]);
        if (solidOnly ? SOLID(t) : t) out.push({ r, c, t });
      }
    }
    return out;
  }

  // Probes just below both feet: the onGround flag alone flickers between frames.
  grounded(o) {
    return o.onGround
      || SOLID(this.tileAt(o.x + 2, o.y + o.h + 1))
      || SOLID(this.tileAt(o.x + o.w - 2, o.y + o.h + 1));
  }

  moveX(o, dx) {
    o.x += dx;
    for (const h of this.hits(o, true)) {
      if (dx > 0) o.x = h.c * T - o.w;
      else if (dx < 0) o.x = (h.c + 1) * T;
      o.vx = 0; o.hitWall = true;
    }
    if (o.x < 0) { o.x = 0; o.vx = 0; o.hitWall = true; }
  }

  // hooks: { onLand(o, dy), onHead(h) } — only supplied for the player.
  moveY(o, dy, hooks) {
    o.y += dy;
    o.onGround = false;
    for (const h of this.hits(o, true)) {
      if (dy > 0) {
        o.y = h.r * T - o.h;
        o.onGround = true;
        if (hooks && hooks.onLand) hooks.onLand(o, dy);
      } else if (dy < 0) {
        o.y = (h.r + 1) * T;
        if (hooks && hooks.onHead) hooks.onHead(h);
      }
      o.vy = 0;
    }
  }

  updateCamera(p) {
    this.cam = Math.max(0, Math.min(p.x - 130, this.spec.w * T - VW));
  }
}

// Drives simulation at a fixed 60 Hz and renders once per animation frame.
// dt is clamped so a backgrounded tab doesn't unleash a burst of catch-up steps.
export function createLoop(step, draw) {
  let last = performance.now(), acc = 0, raf = 0;

  const frame = now => {
    raf = requestAnimationFrame(frame);
    acc = Math.min(acc + (now - last), 100);
    last = now;
    while (acc >= STEP_MS) { acc -= STEP_MS; step(); }
    draw();
  };

  return {
    start() { last = performance.now(); acc = 0; raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); },
    resync() { last = performance.now(); acc = 0; }
  };
}
