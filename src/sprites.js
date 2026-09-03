// Pixel art for enemies, pickups, projectiles and floating popups.
// Split out of render.js so both files stay small; every function takes the
// Renderer so it can reuse its px() helper and tick counter.

import { C } from './level.js';

export function drawEnemy(r, e, cam) {
  const ctx = r.ctx;
  const x = Math.round(e.x - cam), y = Math.round(e.y);

  if (e.kind === 'phish') {
    r.px(x, y + 2, 13, 10, C.n200);
    r.px(x, y + 2, 13, 1, C.n400);
    r.px(x, y + 11, 13, 1, C.n400);
    ctx.strokeStyle = C.n500;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + .5, y + 2.5); ctx.lineTo(x + 6.5, y + 8.5); ctx.lineTo(x + 12.5, y + 2.5);
    ctx.stroke();
    r.px(x + 3, y + 8, 2, 2, C.n900);
    r.px(x + 8, y + 8, 2, 2, C.n900);
    r.px(x + 6, y - 3, 1, 5, C.a600);      // the hook
    r.px(x + 6, y - 4, 3, 1, C.a600);
  } else if (e.kind === 'bsod') {
    r.px(x, y, 13, 11, C.n700);
    r.px(x + 1, y + 1, 11, 9, C.sec);
    r.px(x + 2, y + 2, 9, 1, C.ghost);
    r.px(x + 3, y + 4, 2, 2, C.n100);
    r.px(x + 8, y + 4, 2, 2, C.n100);
    r.px(x + 3, y + 8, 7, 1, C.a300);
    r.px(x + 4, y + 11, 5, 3, C.n800);
    r.px(x + 2, y + 13, 9, 1, C.n900);
  } else {
    const glow = ((r.tick / 14 + e.x) | 0) % 3 ? C.a400 : C.a300;
    r.px(x, y, 15, 10, C.surf);
    r.px(x, y, 15, 1, C.a800);
    r.px(x + 1, y + 1, 13, 8, C.a900);
    r.px(x + 3, y + 10, 3, 3, C.a900);     // speech tail
    r.px(x + 3, y + 3, 3, 3, glow);
    r.px(x + 9, y + 3, 3, 3, glow);
    r.px(x + 4, y + 7, 7, 1, C.a600);
    ctx.fillStyle = 'rgba(181,171,252,.10)';
    ctx.fillRect(x - 3, y - 3, 21, 17);
  }
}

export function drawCoffee(r, x, y) {
  y = y + Math.sin((r.tick + x) * .08) * 1.2;
  r.px(x, y, 9, 8, C.n100);
  r.px(x, y, 9, 2, C.n300);
  r.px(x + 1, y + 3, 7, 2, C.a600);
  r.px(x + 9, y + 3, 2, 3, C.n300);       // handle
  r.px(x + 2, y - 3, 1, 2, 'rgba(210,206,253,.5)');
  r.px(x + 5, y - 4, 1, 3, 'rgba(210,206,253,.35)');
}

export function drawBit(r, b, cam) {
  const ctx = r.ctx;
  const x = Math.round(b.x - cam);
  const y = Math.round(b.y + Math.sin((r.tick + b.x) * .07) * 1.6);

  const g = ctx.createRadialGradient(x + 5, y + 5, 1, x + 5, y + 5, 11);
  g.addColorStop(0, 'rgba(181,171,252,.35)');
  g.addColorStop(1, 'rgba(181,171,252,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 6, y - 6, 22, 22);

  // Width oscillates to fake a coin spinning edge-on.
  const w = Math.abs(Math.cos(r.tick * .05)) * 9 + 1;
  r.px(x + (10 - w) / 2, y, w, 10, C.a500);
  r.px(x + (10 - w) / 2, y, w, 1, C.a300);
  if (w > 6) {
    r.px(x + 4, y + 2, 1, 6, C.a900);
    r.px(x + 5, y + 2, 2, 2, C.a900);
    r.px(x + 5, y + 5, 2, 2, C.a900);
    r.px(x + 4, y + 1, 1, 1, C.a900);
    r.px(x + 4, y + 8, 1, 1, C.a900);
  }
}

export function drawBoss(r, B, cam) {
  const ctx = r.ctx;
  const x = Math.round(B.x - cam), y = Math.round(B.y);
  if (B.hit > 0 && Math.floor(r.tick / 3) % 2) return;   // flicker while invulnerable

  const g = ctx.createRadialGradient(x + 17, y + 13, 4, x + 17, y + 13, 44);
  g.addColorStop(0, 'rgba(145,132,217,.22)');
  g.addColorStop(1, 'rgba(145,132,217,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 28, y - 28, 90, 84);

  r.px(x, y, 34, 22, C.surf);
  r.px(x, y, 34, 1, C.a600);
  r.px(x + 1, y + 1, 32, 20, C.a900);
  r.px(x + 8, y + 22, 6, 4, C.a900);                     // speech tail

  const angry = B.hit > 0 ? C.n200 : (((r.tick / 12) | 0) % 4 ? C.a400 : C.a300);
  r.px(x + 6, y + 6, 7, 5, angry);
  r.px(x + 21, y + 6, 7, 5, angry);
  r.px(x + 6, y + 6, 7, 1, C.n100);
  r.px(x + 21, y + 6, 7, 1, C.n100);

  for (let i = 0; i < 7; i++) {                          // waveform mouth
    const h = 1 + Math.abs(Math.sin(r.tick * .12 + i)) * 4;
    r.px(x + 8 + i * 3, y + 18 - h, 2, h, C.a600);
  }
  r.px(x + 16, y - 5, 2, 5, C.a700);                     // antenna
  r.px(x + 14, y - 8, 6, 3, C.a400);

  const w = 34 * (B.hp / B.maxHp);
  r.px(x, y - 14, 34, 3, C.n900);
  r.px(x, y - 14, Math.max(0, w), 3, C.a400);
  ctx.font = '600 5px Inter, sans-serif';
  ctx.fillStyle = C.n400;
  ctx.fillText('PROMPTBOT 9000', x - 4, y - 17);
}

export function drawShot(r, o, cam) {
  const x = Math.round(o.x - cam), y = Math.round(o.y);
  r.ctx.fillStyle = 'rgba(210,206,253,.16)';
  r.ctx.fillRect(x - 2, y - 2, 9, 9);
  r.px(x, y, 5, 5, C.a300);
  r.px(x + 1, y + 1, 3, 3, C.a600);
}

const POP_TEXT = {
  btc: '+1 BTC', plus: '+1', boss: 'DECOMMISSIONED — +5 BTC', fixed: 'RESOLVED',
  charged: 'FULLY CAFFEINATED', uptime: '+1 UPTIME'
};
const POP_COLOR = { btc: C.a300, plus: C.n200, charged: C.n100, uptime: C.a300 };

export function drawPops(r, pops, cam) {
  for (const o of pops) {
    const x = o.x - cam;
    if (o.kind === 'coffee') { drawCoffee(r, Math.round(x), Math.round(o.y)); continue; }
    r.ctx.font = '600 7px Inter, sans-serif';
    r.ctx.fillStyle = POP_COLOR[o.kind] || C.a400;
    r.ctx.fillText(POP_TEXT[o.kind] || '', x, o.y);
  }
}
