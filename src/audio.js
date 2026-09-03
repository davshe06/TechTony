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
  start:   () => beep(660, .08, 'triangle')
};
