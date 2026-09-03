// Personal bests, kept in localStorage. Every read is defensive: private
// windows and blocked site data throw on access rather than returning null.

const KEY = 'techtony.bests.v1';
const EMPTY = { bestSeconds: null, mostCoffee: 0, mostBits: 0 };

export function loadBests() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const b = JSON.parse(raw);
    return {
      bestSeconds: typeof b.bestSeconds === 'number' ? b.bestSeconds : null,
      mostCoffee: b.mostCoffee | 0,
      mostBits: b.mostBits | 0
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(b) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* storage unavailable */ }
}

// Coffee and BTC records stand whether or not the run was won; the clock only
// counts when the mainframe is actually reached.
export function recordRun({ won, seconds, coffee, bits }) {
  const b = loadBests();
  if (won && (b.bestSeconds === null || seconds < b.bestSeconds)) b.bestSeconds = seconds;
  if (coffee > b.mostCoffee) b.mostCoffee = coffee;
  if (bits > b.mostBits) b.mostBits = bits;
  save(b);
  return b;
}

export function formatTime(s) {
  if (s === null) return '—';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function bestsLine(b) {
  if (b.bestSeconds === null && !b.mostCoffee && !b.mostBits) return '';
  return `Best run ${formatTime(b.bestSeconds)} · Most coffee ${b.mostCoffee} · Most BTC ${b.mostBits}`;
}
