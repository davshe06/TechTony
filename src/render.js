// All canvas drawing: parallax background, tiles, the goal rack, the hero,
// particles and the post-process pass. Sprite art for enemies and the boss
// lives in sprites.js so both files stay small.

import { T, VW, VH, SCALE, ROWS, C } from './level.js';

const W = VW * SCALE, H = VH * SCALE;

export function makeLeds(spec) {
  return Array.from({ length: 90 }, () => ({
    x: Math.random() * spec.w * T,
    y: 14 + Math.random() * 60,
    r: Math.random() < .25 ? 2 : 1,
    p: Math.random() * 140
  }));
}

export class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.tick = 0;
  }

  // Single-pixel rect helper; rounds so nothing lands on a half pixel.
  px(x, y, w, h, c) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  // Paints the 960x576 sky, then switches to the 320x192 logical space.
  begin() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, C.deep);
    sky.addColorStop(.55, C.bg);
    sky.addColorStop(1, '#1b1d2e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  }

  background(cam, leds) {
    const ctx = this.ctx, tick = this.tick;

    for (const s of leds) {
      const sx = s.x - cam * .25;
      if (sx < -4 || sx > VW + 4) continue;
      const on = ((tick + s.p * 3) % 150) > 50;
      this.px(sx, s.y, s.r, s.r, on ? C.a700 : '#1c1f30');
    }

    for (let i = 0; i < 30; i++) {
      const rx = (i * 74 - (cam * .32) % (74 * 30) + 74 * 30) % (74 * 30) - 37;
      if (rx < -46 || rx > VW + 46) continue;
      this.px(rx, 84, 44, 78, '#1a1c2b');
      this.px(rx, 84, 44, 1, '#22253a');
      for (let j = 0; j < 7; j++) this.px(rx + 3, 89 + j * 10, 38, 7, '#1e2132');
    }

    for (let i = 0; i < 34; i++) {
      const rx = (i * 58 - (cam * .6) % (58 * 34) + 58 * 34) % (58 * 34) - 29;
      if (rx < -40 || rx > VW + 40) continue;
      this.px(rx, 96, 36, 66, '#202334');
      this.px(rx + 1, 97, 34, 64, '#191c2b');
      for (let j = 0; j < 6; j++) {
        this.px(rx + 3, 100 + j * 10, 30, 7, '#232637');
        this.px(rx + 5, 102 + j * 10, 12, 1, '#2c3045');
        const on = ((tick / 26 + i * 2 + j) | 0) % 4;
        this.px(rx + 28, 102 + j * 10, 2, 2, on ? C.a800 : C.a400);
      }
    }

    ctx.fillStyle = 'rgba(22,24,38,.55)';
    ctx.fillRect(0, 80, VW, 92);
  }

  tiles(world) {
    const cam = world.cam, tick = this.tick;
    const c0 = Math.floor(cam / T), c1 = c0 + 21;
    for (let r = 0; r < ROWS; r++) {
      for (let c = c0; c <= c1; c++) {
        if (c < 0 || c >= world.spec.w) continue;
        const t = world.grid[r][c];
        if (!t) continue;
        const x = c * T - cam, y = r * T;

        if (t === 1) {
          this.px(x, y, T, T, C.n900);
          this.px(x, y, T, 2, C.n800);
          this.px(x, y, T, 1, C.n700);
          this.px(x + 1, y + 4, T - 2, 1, '#22242e');
          this.px(x + 1, y + 9, T - 2, 1, '#22242e');
          this.px(x + T - 1, y + 2, 1, T - 2, '#1d1f28');
          if ((c % 4) === 0) this.px(x + 2, y + 6, 3, 1, C.a700);
        } else if (t === 2) {
          this.px(x, y, T, T, C.surf);
          this.px(x, y, T, 1, C.n700);
          this.px(x + 1, y + 2, T - 2, 4, '#1d2030');
          this.px(x + 1, y + 8, T - 2, 4, '#1d2030');
          this.px(x + 2, y + 3, 5, 1, C.n700);
          this.px(x + 2, y + 9, 5, 1, C.n700);
          this.px(x + 12, y + 3, 2, 2, ((tick / 30 + c) | 0) % 3 ? C.a800 : C.a400);
          this.px(x, y + T - 1, T, 1, C.deep);
        } else if (t === 3) {
          const pulse = (Math.sin(tick * .08) + 1) / 2;
          this.px(x, y, T, T, C.a800);
          this.px(x + 1, y + 1, T - 2, T - 2, pulse > .5 ? C.a700 : '#4e4680');
          this.px(x, y, T, 1, C.a400);
          this.px(x + 6, y + 4, 4, 2, C.a300);
          this.px(x + 9, y + 6, 2, 2, C.a300);
          this.px(x + 7, y + 8, 2, 2, C.a300);
          this.px(x + 7, y + 11, 2, 2, C.a300);
        } else if (t === 4) {
          this.px(x, y, T, T, C.n800);
          this.px(x + 1, y + 1, T - 2, T - 2, C.n900);
          this.px(x + 4, y + 7, 8, 1, C.n700);
        } else if (t === 5) {
          this.px(x + 4, y, 8, T, C.a900);
          this.px(x + 6, y, 4, T, ((tick / 6 + r) | 0) % 2 ? C.a700 : C.a600);
          this.px(x + 7, y + (tick * .6 % T), 2, 4, C.a300);
          this.ctx.fillStyle = 'rgba(145,132,217,.10)';
          this.ctx.fillRect(x, y, T, T);
        } else if (t === 6) {
          this.px(x, y + 11, T, 5, C.n900);
          this.px(x, y + 11, T, 1, C.n800);
          for (let i = 0; i < 4; i++) {
            const on = ((tick / 7 + i) | 0) % 2;
            this.px(x + 1 + i * 4, y + 6 + (i % 2 ? 0 : 2), 2, 6, on ? C.a300 : C.a700);
            if (on) {
              this.ctx.fillStyle = 'rgba(210,206,253,.14)';
              this.ctx.fillRect(x + i * 4 - 1, y + 3, 6, 12);
            }
          }
        }
      }
    }
  }

  goal(goalX, cam) {
    const ctx = this.ctx, gx = goalX - cam, tick = this.tick;
    if (gx < -70 || gx > VW + 70) return;
    const g = ctx.createRadialGradient(gx + 14, 112, 4, gx + 14, 112, 60);
    g.addColorStop(0, 'rgba(145,132,217,.25)');
    g.addColorStop(1, 'rgba(145,132,217,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - 46, 52, 120, 120);
    this.px(gx, 56, 30, 104, C.n800);
    this.px(gx + 1, 57, 28, 102, '#191c2b');
    for (let j = 0; j < 9; j++) {
      this.px(gx + 3, 61 + j * 11, 24, 8, C.surf);
      this.px(gx + 5, 63 + j * 11, 3, 3, ((tick / 18 + j) | 0) % 4 ? C.a400 : C.a800);
      this.px(gx + 11, 63 + j * 11, 12, 1, C.n700);
      this.px(gx + 11, 66 + j * 11, 8, 1, C.n800);
    }
    ctx.font = '600 6px Inter, sans-serif';
    ctx.fillStyle = C.a300;
    ctx.fillText('MAINFRAME', gx - 6, 52);
  }

  hero(p, cam) {
    if (p.invuln > 0 && Math.floor(this.tick / 4) % 2) return;
    const ctx = this.ctx;
    const x = Math.round(p.x - cam), y = Math.round(p.y), f = p.face;
    const walk = Math.floor(p.anim) % 4, air = !p.onGround;

    if (p.shield) {
      ctx.fillStyle = 'rgba(210,206,253,.16)';
      ctx.fillRect(x - 4, y - 4, p.w + 8, p.h + 8);
      this.px(x - 4, y - 4, p.w + 8, 1, C.a300);
      this.px(x - 4, y + p.h + 3, p.w + 8, 1, C.a300);
    }
    ctx.fillStyle = 'rgba(18,20,31,.35)';
    ctx.fillRect(x - 1, y + p.h - 1, p.w + 2, 2);

    this.px(x + 2, y, 8, 2, C.hair);
    this.px(x + 1, y + 1, 10, 2, C.hair);
    this.px(x + 2, y + 2, 8, 5, C.skin);
    this.px(x + 2, y + 2, 8, 1, C.skinLo);
    this.px(x + (f > 0 ? 10 : 1), y + 3, 1, 2, C.skinLo);
    this.px(x + (f > 0 ? 5 : 3), y + 4, 1, 1, C.n900);
    this.px(x + (f > 0 ? 8 : 6), y + 4, 1, 1, C.n900);
    this.px(x + (f > 0 ? 6 : 4), y + 6, 2, 1, C.n100);

    this.px(x + 1, y + 7, 10, 7, C.suit);
    this.px(x + 1, y + 7, 10, 1, C.suitLo);
    this.px(x + 4, y + 7, 4, 4, C.shirt);
    this.px(x + 3, y + 7, 1, 3, C.suitLo);
    this.px(x + 8, y + 7, 1, 3, C.suitLo);
    this.px(x + 5, y + 8, 2, 3, C.a);

    const swing = air ? -2 : (walk === 1 ? 1 : walk === 3 ? -1 : 0);
    this.px(f > 0 ? x + 10 : x, y + 8 + swing, 2, 4, C.suit);
    this.px(f > 0 ? x + 10 : x, y + 12 + swing, 2, 1, C.skin);

    if (air) { this.px(x + 2, y + 14, 3, 2, C.n900); this.px(x + 7, y + 13, 3, 3, C.n900); }
    else if (walk === 1) { this.px(x + 1, y + 14, 4, 2, C.n900); this.px(x + 7, y + 14, 3, 2, C.n900); }
    else if (walk === 3) { this.px(x + 2, y + 14, 3, 2, C.n900); this.px(x + 6, y + 14, 4, 2, C.n900); }
    else { this.px(x + 2, y + 14, 3, 2, C.n900); this.px(x + 6, y + 14, 3, 2, C.n900); }
    this.px(x + 1, y + p.h - 1, 4, 1, C.deep);
    this.px(x + 6, y + p.h - 1, 4, 1, C.deep);
  }

  particles(fx, cam) {
    for (const o of fx.parts) this.px(o.x - cam, o.y, 1, 1, o.c);
  }

  // Vignette and scanlines, drawn back in device space so the lines stay 1px.
  post() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  }
}
