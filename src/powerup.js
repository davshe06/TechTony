// The Giant Coffee and the charge it grants.
//
// A quarter of supply crates release one instead of an ordinary cup. It pops
// out of the crate, lands, then walks — turning at walls but NOT at ledges, so
// a slow player can watch it drop down a gap and lose it.

import { T, VH, C } from './level.js';
import { GRAVITY, burst } from './entities.js';
import { sfx } from './audio.js';

export const GIANT_CHANCE = 0.25;
export const POWER_TICKS = 30 * 60;   // 30 seconds on the fixed 60 Hz clock
export const POWER_WARN = 3 * 60;     // aura flickers over the last 3 seconds

const WALK = 0.8;
const POP = -2.6;

export function makeGiant(col, row) {
  return {
    x: col * T + 1, y: row * T - 14, w: 14, h: 12,
    vx: WALK, vy: POP, onGround: false, hitWall: false, t: 0
  };
}

// Returns the surviving coffees; sets out.power when one is caught.
export function stepGiants(world, giants, p, fx, out) {
  return giants.filter(g => {
    g.t++;
    g.vy = Math.min(g.vy + GRAVITY, 9);

    // moveX zeroes vx when it stops the box, so remember the heading first and
    // restore the walk afterwards — reversed if a wall got in the way.
    const dir = Math.sign(g.vx) || 1;
    g.hitWall = false;
    world.moveX(g, g.vx);
    world.moveY(g, g.vy);
    g.vx = (g.hitWall ? -dir : dir) * WALK;

    if (g.y > VH + 40) return false;                 // lost down a gap

    if (!p.dead && p.x < g.x + g.w && p.x + p.w > g.x && p.y < g.y + g.h && p.y + p.h > g.y) {
      out.power = true;
      burst(fx, g.x + 7, g.y + 6, C.a300);
      burst(fx, g.x + 7, g.y + 6, C.n100);
      fx.pops.push({ x: g.x - 10, y: g.y, vy: -1.1, life: 60, kind: 'charged' });
      sfx.charge();
      return false;
    }
    return true;
  });
}

// True while the aura should be painted: solid at first, flickering as the
// charge runs out so the player gets a warning before it drops.
export function auraVisible(power, tick) {
  if (power <= 0) return false;
  if (power > POWER_WARN) return true;
  return Math.floor(tick / 4) % 2 === 0;
}

export function drawAura(r, p, cam) {
  const ctx = r.ctx;
  const x = Math.round(p.x - cam), y = Math.round(p.y);
  const pulse = (Math.sin(r.tick * .18) + 1) / 2;

  const g = ctx.createRadialGradient(x + 5, y + 8, 2, x + 5, y + 8, 22 + pulse * 6);
  g.addColorStop(0, 'rgba(210,206,253,.34)');
  g.addColorStop(1, 'rgba(210,206,253,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 20, y - 20, p.w + 40, p.h + 40);

  ctx.fillStyle = pulse > .5 ? 'rgba(245,244,255,.20)' : 'rgba(210,206,253,.14)';
  ctx.fillRect(x - 2, y - 2, p.w + 4, p.h + 4);

  // Sparks orbiting the sprite, so the charge reads even against a bright tile.
  for (let i = 0; i < 4; i++) {
    const a = r.tick * .09 + i * (Math.PI / 2);
    r.px(x + 5 + Math.cos(a) * 11, y + 8 + Math.sin(a) * 12, 1, 1, C.n100);
  }
}

export function drawGiant(r, g, cam) {
  const ctx = r.ctx;
  const x = Math.round(g.x - cam);
  const y = Math.round(g.y + Math.sin(g.t * .12) * .8);

  const glow = ctx.createRadialGradient(x + 7, y + 6, 2, x + 7, y + 6, 18);
  glow.addColorStop(0, 'rgba(210,206,253,.30)');
  glow.addColorStop(1, 'rgba(210,206,253,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 12, y - 12, g.w + 24, g.h + 24);

  ctx.fillStyle = 'rgba(18,20,31,.35)';
  ctx.fillRect(x, y + g.h - 1, g.w, 2);

  r.px(x, y, 12, 12, C.n100);          // cup body
  r.px(x, y, 12, 3, C.n300);           // rim
  r.px(x + 1, y + 4, 10, 4, C.a600);   // brew
  r.px(x + 1, y + 4, 10, 1, C.a400);
  r.px(x + 12, y + 4, 2, 5, C.n300);   // handle
  r.px(x + 13, y + 5, 1, 3, C.n100);
  r.px(x + 3, y + 9, 6, 1, C.n300);

  const s = Math.floor(r.tick / 8) % 2;
  r.px(x + 3, y - 4 - s, 1, 3, 'rgba(210,206,253,.55)');
  r.px(x + 7, y - 5 + s, 1, 4, 'rgba(210,206,253,.40)');
}
