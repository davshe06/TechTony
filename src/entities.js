// Player simulation and the particle/popup effect pools.
// Enemies, boss and pickups arrive in later passes.

import { T, VH, C } from './level.js';
import { sfx } from './audio.js';

export const GRAVITY = 0.44;
export const MAX_FALL = 11;
const ACCEL = 0.42;
const FRICTION = 0.82;
const JUMP_IMPULSE = -7.6;
const JUMP_HOLD = -0.18;
const JUMP_HOLD_TICKS = 30;
const COYOTE_TICKS = 6;
const BUFFER_TICKS = 6;

export function makePlayer() {
  return {
    x: 3 * T, y: 8 * T, w: 11, h: 16,
    vx: 0, vy: 0, onGround: false, face: 1, anim: 0,
    shield: 0, dead: 0, invuln: 0,
    coyote: 0, buffer: 0, jumping: 0, jumpHeld: false
  };
}

export function makeFx() {
  return { parts: [], pops: [] };
}

export function dust(fx, x, y, n) {
  for (let i = 0; i < n; i++) {
    fx.parts.push({ x, y, vx: (Math.random() - .5) * 1.2, vy: -Math.random() * .7,
                    life: 14 + Math.random() * 10, c: C.n700 });
  }
}

export function burst(fx, x, y, c) {
  for (let i = 0; i < 9; i++) {
    fx.parts.push({ x, y, vx: (Math.random() - .5) * 2.4, vy: -Math.random() * 2,
                    life: 16 + Math.random() * 12, c });
  }
}

export function stepFx(fx) {
  fx.parts = fx.parts.filter(o => { o.x += o.vx; o.y += o.vy; o.vy += .07; o.life--; return o.life > 0; });
  fx.pops  = fx.pops.filter(o => { o.y += o.vy; o.vy += .05; o.life--; return o.life > 0; });
}

// Head-bump onto a tile. Crates pop a coffee and convert to a spent crate;
// 30% of the time they also hand out a one-hit shield.
export function bumpTile(world, player, fx, h, out) {
  if (h.t === 3) {
    world.grid[h.r][h.c] = 4;
    fx.pops.push({ x: h.c * T + 4, y: h.r * T - 6, vy: -1.5, life: 38, kind: 'coffee' });
    burst(fx, h.c * T + 8, h.r * T + 2, C.a400);
    sfx.crate();
    out.coffee += 1;
    if (Math.random() < .3) { player.shield = 1; sfx.shield(); }
  } else if (h.t === 2) {
    sfx.shelf();
    dust(fx, h.c * T + 8, h.r * T + T, 3);
  }
}

// One 60 Hz tick of player physics. `out` collects side effects the caller
// applies to game state (coffee gained, death). Returns nothing.
export function stepPlayer(world, p, keys, fx, out) {
  if (p.dead) {
    p.vy += ACCEL;
    p.y += p.vy;
    if (p.y > 420) out.died = true;
    return;
  }

  const left   = keys['arrowleft'] || keys['a'];
  const right  = keys['arrowright'] || keys['d'];
  const jump   = keys[' '] || keys['arrowup'] || keys['w'];
  const sprint = keys['shift'] || keys['z'];
  const max = sprint ? 3.4 : 2.3;

  if (left)  { p.vx -= ACCEL; p.face = -1; }
  if (right) { p.vx += ACCEL; p.face = 1; }
  if (!left && !right) p.vx *= FRICTION;
  p.vx = Math.max(-max, Math.min(max, p.vx));

  // Coyote time + input buffering, both edge-triggered. Testing onGround
  // directly drops jumps, because the flag flickers off for a frame while
  // walking over tile seams.
  if (world.grounded(p)) p.coyote = COYOTE_TICKS;
  else if (p.coyote > 0) p.coyote--;

  if (jump && !p.jumpHeld) p.buffer = BUFFER_TICKS;
  else if (p.buffer > 0) p.buffer--;
  p.jumpHeld = !!jump;

  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = JUMP_IMPULSE;
    p.jumping = JUMP_HOLD_TICKS;
    p.coyote = 0; p.buffer = 0;
    dust(fx, p.x + p.w / 2, p.y + p.h, 3);
    sfx.jump();
  }
  if (!jump) p.jumping = 0;                       // release cuts the jump short
  if (p.jumping > 0) { p.jumping--; p.vy += JUMP_HOLD; }

  p.vy = Math.min(p.vy + GRAVITY, MAX_FALL);
  p.hitWall = false;

  world.moveX(p, p.vx);
  world.moveY(p, p.vy, {
    onLand: (o, dy) => { if (dy > 4) dust(fx, o.x + o.w / 2, o.y + o.h, 4); },
    onHead: h => bumpTile(world, p, fx, h, out)
  });

  if (Math.abs(p.vx) > .2 && p.onGround) p.anim += Math.abs(p.vx) * .16;
  else p.anim = 0;

  if (p.invuln > 0) p.invuln--;
  if (p.y > VH + 60) { p.dead = 1; p.vy = 0; }
}
