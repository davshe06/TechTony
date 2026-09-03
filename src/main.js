// Bootstrap, game loop and the screen state machine.

import { T, SPEC } from './level.js';
import { World, createLoop } from './engine.js';
import { Renderer, makeLeds } from './render.js';
import { makePlayer, makeFx, stepPlayer, stepFx } from './entities.js';
import { sfx, context as audioContext } from './audio.js';

const START_LIVES = 3;
const START_TIME = 300;

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
  overNote: el('over-note'), winNote: el('win-note')
};

const renderer = new Renderer(dom.canvas);
const keys = Object.create(null);

const game = {
  screen: 'title',
  state: { coffee: 0, bits: 0, lives: START_LIVES, time: START_TIME, pct: 0 },
  world: null, player: null, fx: null, leds: null,
  timeF: START_TIME * 60, goalX: SPEC.goal * T
};

function loadLevel() {
  game.world = new World(SPEC);
  game.player = makePlayer();
  game.fx = makeFx();
  game.leds = makeLeds(SPEC);
  game.timeF = START_TIME * 60;
  game.world.updateCamera(game.player);
}

function start() {
  audioContext();                       // first user gesture: unlock audio
  game.state = { coffee: 0, bits: 0, lives: START_LIVES, time: START_TIME, pct: 0 };
  loadLevel();
  setScreen('play');
  sfx.start();
}

// Restart after a death: the level resets but coffee and BTC totals carry over.
function respawn() {
  const { coffee, bits } = game.state;
  loadLevel();
  game.state.coffee = coffee;
  game.state.bits = bits;
  game.state.time = START_TIME;
}

function setScreen(next) {
  game.screen = next;
  for (const [name, node] of Object.entries(dom.screens)) node.hidden = name !== next;
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
  const out = { coffee: 0, died: false };

  stepPlayer(world, player, keys, fx, out);
  state.coffee += out.coffee;

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
}

function draw() {
  renderer.tick++;
  renderer.begin();
  if (game.world) {
    const cam = game.world.cam;
    renderer.background(cam, game.leds);
    renderer.tiles(game.world);
    renderer.goal(game.goalX, cam);
    renderer.particles(game.fx, cam);
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
  if (k === 'p' && (game.screen === 'play' || game.screen === 'pause')) {
    setScreen(game.screen === 'play' ? 'pause' : 'play');
    loop.resync();
  }
  if (e.key === 'Enter' && game.screen !== 'play') start();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

for (const id of ['btn-start', 'btn-restart', 'btn-again']) el(id).addEventListener('click', start);

// ---- go ----

const loop = createLoop(() => { if (game.screen === 'play') step(); }, draw);
dom.level.textContent = SPEC.name;
loadLevel();
loop.start();

// Debug handle: inspect live game state from the console.
window.techTony = game;
