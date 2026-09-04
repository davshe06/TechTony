// On-screen controls for touch devices.
//
// Two rules shape this: the game must not know it is being played by thumb —
// the pads write into the same `keys` object the keyboard does — and a device
// with both a keyboard and a touchscreen must not be stuck with either input.
// So the pads appear on the first real touch and disappear on the first key.

const PADS = [
  { id: 'tc-left',   key: 'arrowleft',  glyph: '◀', label: 'Move left',  side: 'left' },
  { id: 'tc-right',  key: 'arrowright', glyph: '▶', label: 'Move right', side: 'left' },
  { id: 'tc-sprint', key: 'shift',      glyph: '»', label: 'Sprint',     side: 'right' },
  { id: 'tc-jump',   key: ' ',          glyph: '▲', label: 'Jump',       side: 'right' },
];

const IDLE_FADE_MS = 3200;

let keys = null, root = null, shown = false, idleTimer = 0;
// touch identifier -> the pad it is currently holding, so a finger that slides
// off a pad releases it and one that slides on presses the new one.
const held = new Map();

export function isTouchLikely() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      || ('ontouchstart' in window)
      || navigator.maxTouchPoints > 0;
}

function padAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest ? el.closest('.touchpad') : null;
}

function press(pad) {
  if (!pad) return;
  keys[pad.dataset.key] = true;
  pad.classList.add('is-down');
}

function release(pad) {
  if (!pad) return;
  pad.classList.remove('is-down');
  // Only clear the key once no other finger is still on a pad bound to it.
  const stillHeld = [...held.values()].some(p => p !== pad && p.dataset.key === pad.dataset.key);
  if (!stillHeld) keys[pad.dataset.key] = false;
}

function releaseAll() {
  for (const pad of held.values()) {
    pad.classList.remove('is-down');
    keys[pad.dataset.key] = false;
  }
  held.clear();
}

function wake() {
  root.classList.remove('is-idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => root.classList.add('is-idle'), IDLE_FADE_MS);
}

export function show() {
  if (shown) return;
  shown = true;
  root.hidden = false;
  document.body.classList.add('touch-mode');
  wake();
}

export function hide() {
  if (!shown) return;
  shown = false;
  releaseAll();
  root.hidden = true;
  document.body.classList.remove('touch-mode');
  clearTimeout(idleTimer);
}

export function init(keyMap) {
  keys = keyMap;
  root = document.getElementById('touch-controls');
  if (!root) return;

  for (const side of ['left', 'right']) {
    const cluster = document.createElement('div');
    cluster.className = `touch-cluster touch-${side}`;
    for (const p of PADS.filter(p => p.side === side)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'touchpad';
      btn.id = p.id;
      btn.dataset.key = p.key;
      btn.setAttribute('aria-label', p.label);
      btn.tabIndex = -1;                 // keyboard users have real keys
      btn.innerHTML = `<span aria-hidden="true">${p.glyph}</span>`;
      cluster.appendChild(btn);
    }
    root.appendChild(cluster);
  }

  const onStart = e => {
    show();
    wake();
    let claimed = false;
    for (const t of e.changedTouches) {
      const pad = padAt(t.clientX, t.clientY);
      if (!pad) continue;
      held.set(t.identifier, pad);
      press(pad);
      claimed = true;
    }
    // Only swallow the gesture when it actually landed on a pad, so taps on
    // the page's own buttons still work normally.
    if (claimed) e.preventDefault();
  };

  const onMove = e => {
    let claimed = false;
    for (const t of e.changedTouches) {
      if (!held.has(t.identifier)) continue;
      claimed = true;
      const was = held.get(t.identifier);
      const now = padAt(t.clientX, t.clientY);
      if (now === was) continue;
      held.delete(t.identifier);
      release(was);
      if (now) { held.set(t.identifier, now); press(now); }
    }
    if (claimed) e.preventDefault();
  };

  const onEnd = e => {
    for (const t of e.changedTouches) {
      const pad = held.get(t.identifier);
      if (!pad) continue;
      held.delete(t.identifier);
      release(pad);
    }
    wake();
  };

  document.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
  document.addEventListener('touchcancel', onEnd);   // a call or notification
  window.addEventListener('blur', releaseAll);

  if (isTouchLikely()) show();
}

// Called from the keydown handler: a real key press means this is not a
// thumbs-only device after all.
export function noteKeyboard() { hide(); }

// The pads sit inside the stage, so they would otherwise draw over the title,
// pause and game-over overlays. Park them whenever the game is not running.
export function setPlaying(playing) {
  if (!root) return;
  root.classList.toggle('is-off', !playing);
  if (!playing) releaseAll();
  else wake();
}
