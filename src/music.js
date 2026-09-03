// Procedural chiptune score. No audio files: every note is a scheduled
// oscillator, so the whole soundtrack costs a few hundred bytes.
//
// Notes are scheduled ahead of the audio clock rather than fired from a
// setInterval, because timer jitter would be audible as a stumbling beat.
// The interval only decides *what* to queue; the AudioContext clock decides
// when it sounds.

import { context } from './audio.js';

const LOOKAHEAD_MS = 25;      // how often we top up the queue
const SCHEDULE_AHEAD = 0.14;  // seconds of music queued at any moment
const VOLUME = 0.13;          // sits under the sfx, which peak around 0.06

const _ = null;               // a rest, so the patterns below stay readable

// MIDI note numbers. Level theme: Am F C G / Am F C E — eight bars of
// sixteenths that resolve on the dominant so the loop pushes forward.
const LEVEL_LEAD = [
  69,_,72,_,76,_, _,74, 72,_, _,_, 69,_, _,_,
  65,_,69,_,72,_, _,71, 69,_, _,_, 65,_, _,_,
  72,_,76,_,79,_, _,77, 76,_, _,_, 72,_, _,_,
  74,_,71,_,74,_,79,_,  78,_,76,_, 74,_, _,_,
  81,_, _,79,76,_,72,_, 69,_,72,_, 76,_,79,_,
  77,_, _,76,72,_,69,_, 65,_,69,_, 72,_,76,_,
  79,_, _,77,76,_,72,_, 76,_,79,_, 84,_, _,_,
  83,_,81,_,80,_,78,_,  76,_, _,_,  _,_, _,_
];
const LEVEL_ROOTS  = [45, 41, 48, 43, 45, 41, 48, 40];
const LEVEL_CHORDS = [[57,60,64],[53,57,60],[48,52,55],[43,47,50],
                      [57,60,64],[53,57,60],[48,52,55],[52,56,59]];

// Boss theme: faster, chromatic, and the bass runs straight sixteenths.
const BOSS_LEAD = [
  69,_,68,_,69,_,72,_, 71,_,69,_,68,_,69,_,
  76,_,75,_,76,_,79,_, 78,_,76,_,75,_,76,_,
  77,_,76,_,77,_,72,_, 69,_,65,_,69,_,72,_,
  80,_,79,_,80,_,83,_, 80,_,76,_,72,_,68,_
];
const BOSS_ROOTS  = [45, 45, 41, 40];
const BOSS_CHORDS = [[57,60,64],[57,60,64],[53,57,60],[52,56,59]];

const THEMES = {
  level: { bpm: 152, lead: LEVEL_LEAD, roots: LEVEL_ROOTS, chords: LEVEL_CHORDS,
           kick: [0, 8], snare: [4, 12], drive: false },
  boss:  { bpm: 172, lead: BOSS_LEAD,  roots: BOSS_ROOTS,  chords: BOSS_CHORDS,
           kick: [0, 3, 8, 11], snare: [4, 12], drive: true }
};

let master = null, noise = null, timer = 0;
let theme = null, step = 0, nextTime = 0, muted = false, running = false;

function ensure() {
  const ac = context();
  if (!ac) return null;
  if (!master) {
    master = ac.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ac.destination);
  }
  return ac;
}

function noiseBuffer(ac) {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function tone(ac, t, midi, dur, type, vol) {
  if (midi == null) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function hit(ac, t, dur, vol, hz) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuffer(ac);
  f.type = 'highpass';
  f.frequency.value = hz;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function kick(ac, t) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
  g.gain.setValueAtTime(0.42, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.17);
}

function scheduleStep(ac, s, t) {
  const th = theme;
  const beat = 60 / th.bpm / 4;
  const barIx = Math.floor(s / 16) % th.roots.length;
  const i = s % 16;
  const root = th.roots[barIx], chord = th.chords[barIx];

  tone(ac, t, th.lead[s], beat * 1.7, 'square', 0.16);

  // Bass: straight sixteenths under the boss, a bouncing octave otherwise.
  if (th.drive) {
    tone(ac, t, root + (i % 8 >= 6 ? 12 : 0), beat * 0.9, 'triangle', 0.30);
  } else if (i % 2 === 0) {
    tone(ac, t, root + (i === 4 || i === 12 ? 12 : 0), beat * 1.7, 'triangle', 0.32);
  }

  // Off-beat chord stabs, the way a third NES channel would fill the gaps.
  if (i % 2 === 1) tone(ac, t, chord[((i - 1) / 2) % chord.length], beat * 0.8, 'square', 0.05);

  if (th.kick.includes(i)) kick(ac, t);
  if (th.snare.includes(i)) hit(ac, t, 0.12, 0.20, 1400);
  if (i % 2 === 0) hit(ac, t, 0.03, i % 4 === 0 ? 0.10 : 0.05, 7000);
}

function tick() {
  const ac = ensure();
  if (!ac || !theme) return;
  const beat = 60 / theme.bpm / 4;
  while (nextTime < ac.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(ac, step, nextTime);
    step = (step + 1) % theme.lead.length;
    nextTime += beat;
  }
}

export function play(name) {
  const ac = ensure();
  if (!ac) return;
  const next = THEMES[name];
  if (!next) return;
  if (running && theme === next) return;    // already playing this one
  if (theme !== next) step = 0;
  theme = next;
  nextTime = ac.currentTime + 0.06;
  if (!running) { running = true; timer = setInterval(tick, LOOKAHEAD_MS); }
  tick();
}

// Keeps the current position, so a pause resumes mid-phrase.
export function suspend() {
  if (!running) return;
  running = false;
  clearInterval(timer);
  timer = 0;
}

export function resume() {
  if (running || !theme) return;
  const ac = ensure();
  if (!ac) return;
  nextTime = ac.currentTime + 0.06;
  running = true;
  timer = setInterval(tick, LOOKAHEAD_MS);
  tick();
}

export function stop() {
  suspend();
  theme = null;
  step = 0;
}

export function setMuted(v) {
  muted = !!v;
  if (master) master.gain.value = muted ? 0 : VOLUME;
}

export function isMuted() { return muted; }
