// Bootstrap, game loop and the screen state machine.

import { T, VW, VH, SCALE, SPEC } from './level.js';
import { World, createLoop } from './engine.js';
import { Renderer, makeLeds } from './render.js';
import { makePlayer, makeFx, stepPlayer, stepFx, makeEnemies, stepEnemies,
         makePickups, stepPickups, makeBoss, stepBoss, stepShots,
         openGate } from './entities.js';
import { drawEnemy, drawCoffee, drawBit, drawPops, drawBoss, drawShot } from './sprites.js';
import { GIANT_CHANCE, LIFE_CHANCE, POWER_TICKS, makeDrop, stepDrops,
         auraVisible, drawAura, drawDrop } from './powerup.js';
import { sfx, context as audioContext } from './audio.js';
import { loadBests, recordRun, bestsLine, loadMuted, saveMuted } from './storage.js';
import * as music from './music.js';

const START_LIVES = 3;
const MAX_LIVES = 5;              // the HUD shows lives as dots; keep it legible
const START_TIME = 300;
const RESPAWN_INVULN = 3 * 60;    // 3 seconds of grace on a fresh life

const el = id => document.getElementById(id);
const dom = {
  canvas: el('game'),
  coffee: el('hud-coffee'), bits: el('hud-bits'),
  lives: el('hud-lives'), time: el('hud-time'),
  progress: el('status-progress'), level: el('status-level'),
  screens: {
    title: el('screen-title'), over: el('screen-over'),
    win: el('screen-win'), pause: el('screen-pause')
  },
  overNote: el('over-note'), winNote: el('win-note'),
  stage: el('stage'), bests: el('bests'),
  mute: el('btn-mute'), pause: el('btn-pause')
};

const renderer = new Renderer(dom.canvas);
const keys = Object.create(null);

const game = {
  screen: 'title',
  state: { coffee: 0, bits: 0, lives: START_LIVES, time: START_TIME, pct: 0 },
  world: null, player: null, fx: null, leds: null,
  enemies: [], coins: [], bits: [],
  boss: null, bossDown: false, shots: [], drops: [],
  timeF: START_TIME * 60, goalX: SPEC.goal * T
};

function loadLevel() {
  game.world = new World(SPEC);
  game.player = makePlayer();
  game.fx = makeFx();
  game.leds = makeLeds(SPEC);
  game.enemies = makeEnemies(SPEC);
  const pickups = makePickups(SPEC);
  game.coins = pickups.coins;
  game.bits = pickups.bits;
  game.boss = null;
  game.bossDown = false;
  game.shots = [];
  game.drops = [];
  game.timeF = START_TIME * 60;
  game.world.updateCamera(game.player);
}

function start() {
  audioContext();                       // first user gesture: unlock audio
  music.play('level');
  game.state = { coffee: 0, bits: 0, lives: START_LIVES, time: START_TIME, pct: 0 };
  loadLevel();
  setScreen('play');
  sfx.start();
}

// A fresh life resumes where the run ended rather than rewinding the level:
// the world keeps its state (cleared enemies, spent crates, boss damage) and
// only the player is rebuilt, at the nearest standable column to the death.
function respawn() {
  const { world, player, state } = game;
  const spot = world.safeSpotNear(player.deathX, game.enemies);

  const p = makePlayer();
  p.x = spot.x;
  p.y = spot.y;
  p.invuln = RESPAWN_INVULN;
  p.deathX = spot.x;
  game.player = p;

  game.shots = [];                 // don't respawn into a bolt already in flight
  game.drops = [];
  game.fx = makeFx();
  game.timeF = START_TIME * 60;
  state.time = START_TIME;
  world.updateCamera(p);
  sfx.respawn();
}

function showBests(b) {
  const line = bestsLine(b || loadBests());
  dom.bests.textContent = line;
  dom.bests.hidden = !line;
}

function setScreen(next) {
  game.screen = next;
  for (const [name, node] of Object.entries(dom.screens)) node.hidden = name !== next;
  dom.pause.textContent = next === 'pause' ? 'Resume' : 'Pause';
  dom.pause.disabled = next !== 'play' && next !== 'pause';
  if (next === 'pause') music.suspend();
  else if (next === 'play') music.resume();
  else music.stop();
  if (next === 'over' || next === 'win') {
    showBests(recordRun({
      won: next === 'win',
      seconds: START_TIME - game.state.time,
      coffee: game.state.coffee,
      bits: game.state.bits
    }));
  }
  if (next === 'over') {
    dom.overNote.textContent =
      'Tech Tony is out of uptime. The queue won this round — but twenty years says he takes the next one.';
  }
  if (next === 'win') {
    dom.winNote.textContent =
      `Tech Tony closed every ticket, banked ${game.state.coffee} coffees and ` +
      `${game.state.bits} bitcoin, and filed no change request. Twenty years of this, ` +
      `and the lights are still green.`;
  }
}

function step() {
  const { world, player, fx, state } = game;
  const out = { coffee: 0, bits: 0, died: false, crate: null, power: false, life: false };

  stepPlayer(world, player, keys, fx, out);

  // One roll across three outcomes, so the two drop chances stay exactly a
  // quarter each rather than compounding.
  if (out.crate) {
    const roll = Math.random();
    if (roll < GIANT_CHANCE) {
      game.drops.push(makeDrop('giant', out.crate.c, out.crate.r));
      sfx.giant();
    } else if (roll < GIANT_CHANCE + LIFE_CHANCE) {
      game.drops.push(makeDrop('life', out.crate.c, out.crate.r));
      sfx.giant();
    } else if (Math.random() < .3) {
      player.shield = 1;
      sfx.shield();
    }
  }

  if (!player.dead) {
    stepEnemies(world, game.enemies, player, fx);
    stepPickups(player, game.coins, game.bits, fx, out);
  }
  game.drops = stepDrops(world, game.drops, player, fx, out);
  if (out.power) player.power = POWER_TICKS;
  if (out.life) state.lives = Math.min(MAX_LIVES, state.lives + 1);

  // Promptbot wakes as the player closes on tile 208 and only ever spawns once.
  if (!game.boss && !game.bossDown && player.x > SPEC.bossAt * T - 60) {
    game.boss = makeBoss();
    music.play('boss');
    sfx.bossIn();
  }
  if (game.boss && stepBoss(game.boss, player, game.shots, fx, out)) {
    game.boss = null;
    game.bossDown = true;
    game.shots = [];
    openGate(world, SPEC.gate);
    music.play('level');
  }
  game.shots = stepShots(world, game.shots, player, fx);
  state.coffee += out.coffee;
  state.bits += out.bits;

  if (out.died) {
    const lives = state.lives - 1;
    state.lives = Math.max(0, lives);
    if (lives <= 0) { setScreen('over'); return; }
    respawn();
    return;
  }

  stepFx(fx);

  game.timeF--;
  state.time = Math.max(0, Math.ceil(game.timeF / 60));
  if (game.timeF <= 0 && !player.dead) { player.dead = 1; player.vy = -4; }

  state.pct = Math.min(100, Math.round(player.x / game.goalX * 100));
  world.updateCamera(player);

  if (player.x + player.w > game.goalX + 4) { sfx.win(); setScreen('win'); }
}

function draw() {
  renderer.tick++;
  renderer.begin();
  if (game.world) {
    const cam = game.world.cam;
    renderer.background(cam, game.leds);
    renderer.tiles(game.world);
    renderer.goal(game.goalX, cam);

    // Cull in screen space: anything outside the 320px viewport costs nothing.
    const onScreen = wx => wx - cam > -30 && wx - cam < VW + 30;
    for (const c of game.coins) if (!c.got && onScreen(c.x)) drawCoffee(renderer, Math.round(c.x - cam), Math.round(c.y));
    for (const b of game.bits) if (!b.got && onScreen(b.x)) drawBit(renderer, b, cam);
    for (const e of game.enemies) if (e.alive && onScreen(e.x)) drawEnemy(renderer, e, cam);
    for (const g of game.drops) if (onScreen(g.x)) drawDrop(renderer, g, cam);
    if (game.boss) drawBoss(renderer, game.boss, cam);
    for (const o of game.shots) drawShot(renderer, o, cam);

    renderer.particles(game.fx, cam);
    drawPops(renderer, game.fx.pops, cam);
    if (auraVisible(game.player.power, renderer.tick)) drawAura(renderer, game.player, cam);
    renderer.hero(game.player, cam);
  }
  renderer.post();
  syncHud();
}

let lastHud = '';
function syncHud() {
  const s = game.state;
  const key = `${s.coffee}|${s.bits}|${s.lives}|${s.time}|${s.pct}`;
  if (key === lastHud) return;
  lastHud = key;
  dom.coffee.textContent = s.coffee;
  dom.bits.textContent = s.bits;
  dom.lives.textContent = '● '.repeat(Math.max(0, s.lives)).trim() || '—';
  dom.time.textContent = String(s.time).padStart(3, '0');
  dom.progress.textContent = `Route to mainframe — ${s.pct}%`;
}

// ---- input ----

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === 'p') togglePause();
  if (k === 'm') toggleMute();
  if (e.key === 'Enter' && game.screen !== 'play') start();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// Losing focus pauses rather than letting the run bleed out unattended. Held
// keys are dropped too, or the player comes back still walking.
function pauseOnBlur() {
  for (const k in keys) keys[k] = false;
  if (game.screen === 'play') { setScreen('pause'); loop.resync(); }
}
window.addEventListener('blur', pauseOnBlur);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnBlur(); });

// Snap the stage to a whole multiple of the 320x192 logical frame so pixels
// stay square; below one full frame wide, fall back to fluid width.
function fitStage() {
  const padding = 2 * 16.8;
  const availW = document.documentElement.clientWidth - padding;
  const availH = window.innerHeight - 210;          // header, status bar, gutters
  const k = Math.min(Math.floor(availW / VW), Math.floor(availH / VH), SCALE);
  document.documentElement.style.setProperty('--stage-w', k >= 1 ? `${VW * k}px` : '100%');
}
window.addEventListener('resize', fitStage);
fitStage();

function togglePause() {
  if (game.screen !== 'play' && game.screen !== 'pause') return;
  setScreen(game.screen === 'play' ? 'pause' : 'play');
  loop.resync();
}

function toggleMute() {
  const next = !music.isMuted();
  music.setMuted(next);
  saveMuted(next);
  dom.mute.textContent = next ? 'Music off' : 'Music on';
  dom.mute.setAttribute('aria-pressed', String(next));
}

for (const id of ['btn-start', 'btn-restart', 'btn-again']) el(id).addEventListener('click', start);
// Buttons keep focus after a click, which would make Space re-trigger them
// instead of jumping. Hand focus back to the page.
for (const [node, fn] of [[dom.mute, toggleMute], [dom.pause, togglePause]]) {
  node.addEventListener('click', () => { fn(); node.blur(); });
}

// ---- go ----

const loop = createLoop(() => { if (game.screen === 'play') step(); }, draw);
dom.level.textContent = SPEC.name;
dom.pause.disabled = true;
music.setMuted(loadMuted());
dom.mute.textContent = music.isMuted() ? 'Music off' : 'Music on';
dom.mute.setAttribute('aria-pressed', String(music.isMuted()));
showBests();
loadLevel();
loop.start();

// Debug handle: inspect live game state from the console.
window.techTony = game;
