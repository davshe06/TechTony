// Player simulation and the particle/popup effect pools.
// Enemies, boss and pickups arrive in later passes.

import { T, VH, C, SOLID } from './level.js';
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
const HAZARD_KICK = -6.6;   // pop clear of a cabling run when the shield eats a hit

export function makePlayer() {
  return {
    x: 3 * T, y: 8 * T, w: 11, h: 16,
    vx: 0, vy: 0, onGround: false, face: 1, anim: 0,
    shield: 0, power: 0, dead: 0, invuln: 0,
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
export function bumpTile(world, fx, h, out) {
  if (h.t === 3) {
    world.grid[h.r][h.c] = 4;
    fx.pops.push({ x: h.c * T + 4, y: h.r * T - 6, vy: -1.5, life: 38, kind: 'coffee' });
    burst(fx, h.c * T + 8, h.r * T + 2, C.a400);
    sfx.crate();
    out.coffee += 1;
    out.crate = { c: h.c, r: h.r };   // the caller decides what the crate yields
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
    onHead: h => bumpTile(world, fx, h, out)
  });

  if (Math.abs(p.vx) > .2 && p.onGround) p.anim += Math.abs(p.vx) * .16;
  else p.anim = 0;

  if (p.invuln > 0) p.invuln--;
  if (p.power > 0) p.power--;
  for (const h of world.hits(p, false)) if (h.t === 6) hurt(p, fx, 'hazard');
  if (p.y > VH + 60) { p.dead = 1; p.vy = 0; }
}

// One hit: a shield absorbs it and grants brief invulnerability, otherwise
// the run ends and the death arc plays out in stepPlayer.
// source: 'enemy' (absorbed by a charge), 'hazard' (exposed cabling) or 'fall'.
export function hurt(p, fx, source = 'fall') {
  if (p.invuln > 0 || p.dead) return;

  if (source === 'enemy' && p.power > 0) {
    p.power = 0; p.invuln = 40;
    burst(fx, p.x + 5, p.y + 6, C.n300);
    sfx.discharge();
    return;
  }

  if (p.shield) {
    p.shield = 0; p.invuln = 80;
    // A grounded player's body occupies the same row the cabling sits in, so
    // absorbing the hit is not enough — without a hop clear, invulnerability
    // just defers the death by 80 ticks. Launch them out of the run instead.
    if (source === 'hazard') { p.vy = HAZARD_KICK; p.jumping = 0; }
    burst(fx, p.x + 5, p.y + 6, C.a300);
    sfx.guard();
    return;
  }

  p.dead = 1; p.vy = -6;
  sfx.death();
}

// ---- enemies ----

export function makeEnemies(spec) {
  return spec.enemies.map(([x, kind]) => ({
    x: x * T, y: kind === 'ai' ? 6 * T : 9 * T,
    w: kind === 'ai' ? 15 : 13, h: kind === 'ai' ? 13 : 14,
    vx: kind === 'bsod' ? -.8 : -.45, vy: 0,
    kind, alive: true, t: Math.random() * 90, home: 6 * T
  }));
}

function overlaps(p, e, inset) {
  return p.x < e.x + e.w - inset && p.x + p.w - inset > e.x
      && p.y < e.y + e.h && p.y + p.h > e.y;
}

export function stepEnemies(world, enemies, p, fx) {
  for (const e of enemies) {
    // Enemies far off-screen are frozen, so the level doesn't simulate itself
    // to pieces before the player ever sees it.
    if (!e.alive || Math.abs(e.x - p.x) > 340) continue;
    e.t++;

    if (e.kind === 'ai') {
      e.y = e.home + Math.sin(e.t * .045) * 22;   // ignores gravity, hovers
      const dir = p.x > e.x ? 1 : -1;
      e.vx += dir * .012;
      e.vx = Math.max(-.9, Math.min(.9, e.vx));
      e.x += e.vx;
    } else {
      e.vy = Math.min(e.vy + GRAVITY, 9);
      e.hitWall = false;
      world.moveX(e, e.vx);
      world.moveY(e, e.vy);
      // Turn at walls, and at ledges: probe the floor just past the leading edge.
      const ahead = e.x + (e.vx > 0 ? e.w + 2 : -2);
      if (e.hitWall || (world.grounded(e) && !SOLID(world.tileAt(ahead, e.y + e.h + 4)))) e.vx *= -1;
      if (e.y > VH + 40) { e.alive = false; continue; }
    }

    if (p.dead || !overlaps(p, e, 2)) continue;
    const stomped = p.vy > 1.2 && p.y + p.h - p.vy <= e.y + 7;
    if (stomped || p.power > 0) {
      e.alive = false;
      if (stomped) p.vy = -5.6;               // ploughing through does not bounce
      fx.pops.push({ x: e.x, y: e.y, vy: -1, life: 30, kind: 'fixed' });
      burst(fx, e.x + 6, e.y + 6, p.power > 0 ? C.n100 : C.a400);
      sfx.stomp();
    } else {
      hurt(p, fx, 'enemy');
    }
  }
}

// ---- pickups ----

export function makePickups(spec) {
  const coins = [];
  spec.coins.forEach(([x, y, n]) => {
    for (let k = 0; k < n; k++) coins.push({ x: (x + k) * T + 4, y: y * T + 4, got: false });
  });
  const bits = spec.bits.map(([x, y]) => ({ x: x * T + 3, y: y * T + 3, got: false }));
  return { coins, bits };
}

export function stepPickups(p, coins, bits, fx, out) {
  for (const c of coins) {
    if (c.got || !(p.x < c.x + 10 && p.x + p.w > c.x && p.y < c.y + 12 && p.y + p.h > c.y)) continue;
    c.got = true;
    out.coffee += 1;
    fx.pops.push({ x: c.x, y: c.y, vy: -1.4, life: 26, kind: 'plus' });
    sfx.coffee();
  }
  for (const b of bits) {
    if (b.got || !(p.x < b.x + 12 && p.x + p.w > b.x && p.y < b.y + 12 && p.y + p.h > b.y)) continue;
    b.got = true;
    out.bits += 1;
    burst(fx, b.x + 5, b.y + 5, C.a300);
    fx.pops.push({ x: b.x - 4, y: b.y, vy: -1.2, life: 34, kind: 'btc' });
    sfx.bitcoin();
  }
}

// ---- boss: Promptbot 9000 ----

export const BOSS_MIN_X = 210 * T;
export const BOSS_MAX_X = 230 * T;

export function makeBoss() {
  return { x: 228 * T, y: 4 * T, home: 4 * T, w: 34, h: 26,
           hp: 4, maxHp: 4, t: 0, hit: 0, fire: 90 };
}

// Returns true once the boss dies, so the caller can clear the gate.
export function stepBoss(B, p, shots, fx, out) {
  B.t++;

  // Every hit taken raises "rage", which speeds the hover, the chase and the
  // fire rate together — the fight tightens as its HP drops.
  const rage = (B.maxHp - B.hp) * .25;
  B.y = B.home + Math.sin(B.t * (.03 + rage * .012)) * 26;
  const dir = (p.x - 10) > B.x ? 1 : -1;
  B.x += dir * (.34 + rage * .34);
  B.x = Math.max(BOSS_MIN_X, Math.min(BOSS_MAX_X, B.x));

  if (B.hit > 0) B.hit--;

  B.fire--;
  if (B.fire <= 0) {
    B.fire = Math.max(38, 96 - (B.maxHp - B.hp) * 16);
    const n = 1 + (B.maxHp - B.hp > 1 ? 1 : 0);   // second bolt past half health
    for (let i = 0; i < n; i++) {
      const dx = p.x + 5 - (B.x + 17), dy = p.y + 6 - (B.y + 20);
      const d = Math.max(1, Math.hypot(dx, dy));
      shots.push({ x: B.x + 16, y: B.y + 20,
                   vx: dx / d * 1.5, vy: dy / d * 1.5 + (i - .5) * .35, life: 190 });
    }
    sfx.bossFire();
  }

  if (p.dead) return false;
  const touching = p.x < B.x + B.w - 3 && p.x + p.w - 3 > B.x
                && p.y < B.y + B.h && p.y + p.h > B.y;
  if (!touching) return false;

  if (p.vy > 1 && p.y + p.h - p.vy <= B.y + 10 && B.hit === 0) {
    B.hp--;
    B.hit = 46;                                   // i-frames + flicker between hits
    p.vy = -6.4;
    burst(fx, B.x + 17, B.y + 6, C.a300);
    sfx.bossHit();
    if (B.hp <= 0) {
      for (let i = 0; i < 3; i++) burst(fx, B.x + 8 + i * 10, B.y + 10, C.a400);
      fx.pops.push({ x: B.x + 2, y: B.y, vy: -.8, life: 90, kind: 'boss' });
      sfx.bossDown();
      out.bits += 5;
      return true;
    }
  } else if (B.hit === 0) {
    hurt(p, fx, 'enemy');
  }
  return false;
}

// Bolts die on contact with the player, on hitting anything solid, or on age.
export function stepShots(world, shots, p, fx) {
  return shots.filter(o => {
    o.x += o.vx; o.y += o.vy; o.life--;
    if (!p.dead && p.x < o.x + 5 && p.x + p.w > o.x && p.y < o.y + 5 && p.y + p.h > o.y) {
      hurt(p, fx, 'enemy');
      return false;
    }
    return o.life > 0 && !SOLID(world.tileAt(o.x + 2, o.y + 2));
  });
}

// The gate is a solid column until the boss falls, then the corridor opens.
export function openGate(world, gate) {
  for (let r = 3; r <= 9; r++) world.grid[r][gate] = 0;
}
