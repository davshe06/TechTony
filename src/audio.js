// Tiny WebAudio blips. The context is created lazily on the first input so
// browser autoplay policy doesn't leave us with a suspended context.

let ac = null;

export function context() {
  if (!ac) {
    const A = window.AudioContext || window.webkitAudioContext;
    if (A) ac = new A();
  }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}

export function beep(f, d, type = 'square', vol = 0.045) {
  const a = context();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.value = vol;
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + d);
}

// Second note of a two-tone sting, scheduled off the main thread clock.
export function beepLater(delayMs, f, d, type, vol) {
  setTimeout(() => beep(f, d, type, vol), delayMs);
}

export const sfx = {
  jump:    () => beep(520, .09, 'square', .04),
  shelf:   () => beep(150, .05, 'square', .03),
  crate:   () => beep(1180, .07),
  shield:  () => beep(700, .18, 'triangle'),
  start:   () => beep(660, .08, 'triangle'),
  stomp:   () => beep(760, .07, 'square', .045),
  coffee:  () => beep(1320, .06, 'square', .03),
  bitcoin: () => { beep(980, .09, 'triangle', .05); beepLater(90, 1460, .12, 'triangle', .045); },
  guard:   () => beep(240, .2, 'sawtooth', .04),
  death:   () => beep(300, .5, 'sawtooth', .05),
  win:     () => { beep(880, .12, 'triangle'); beepLater(130, 1320, .22, 'triangle'); },
  bossIn:  () => { beep(180, .5, 'sawtooth', .05); beepLater(260, 140, .6, 'sawtooth', .05); },
  bossFire:() => beep(300, .12, 'square', .035),
  bossHit: () => beep(620, .12, 'square', .05),
  bossDown:() => { beep(880, .16, 'triangle'); beepLater(160, 1180, .3, 'triangle'); },
  giant:   () => { beep(440, .1, 'triangle', .05); beepLater(100, 660, .14, 'triangle', .045); },
  charge:  () => { beep(660, .1, 'triangle', .06); beepLater(90, 880, .1, 'triangle', .055);
                   beepLater(180, 1320, .26, 'triangle', .05); },
  discharge:() => { beep(420, .18, 'square', .04); beepLater(120, 260, .24, 'square', .035); }
};
