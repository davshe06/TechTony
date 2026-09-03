// Level data and shared constants. SPEC is copied verbatim from the prototype.

export const T = 16;        // tile size, px
export const VW = 320;      // logical viewport width
export const VH = 192;      // logical viewport height
export const SCALE = 3;     // integer upscale to the 960x576 backing canvas
export const ROWS = 12;

export const C = {
  bg: '#161826', deep: '#12141f', surf: '#232532',
  n900: '#292b31', n800: '#3f424d', n700: '#595d6c', n600: '#75798c', n500: '#9397ab',
  n400: '#b2b6ca', n300: '#cfd3e5', n200: '#e4e7f5', n100: '#f3f5fe',
  a: '#9184d9', a300: '#d2cefd', a400: '#b5abfc', a500: '#968ae0',
  a600: '#796cbf', a700: '#5d5294', a800: '#423a6a', a900: '#2b2741',
  sec: '#262a60', glow: '#353b80', ghost: '#4c5397',
  skin: '#c9945f', skinLo: '#a97545', hair: '#241d1c',
  shirt: '#e4e7f5', suit: '#4a4f63', suitLo: '#343948'
};

export const SPEC = {
  name: 'Data centre — floor 3', w: 244,
  gaps: [[26,3],[44,4],[62,3],[80,5],[97,4],[116,5],[134,4],[150,3],[166,5],[184,4],[197,3]],
  plats: [[16,7,4],[22,5,3],[34,7,4],[40,5,3],[52,7,5],[58,5,3],[68,8,3],[72,6,4],[86,7,4],[92,5,4],[104,7,3],[110,5,4],[122,8,3],[126,6,4],[140,7,4],[146,4,4],[158,7,3],[162,5,4],[172,8,3],[176,6,4],[190,7,4],[200,5,4],[212,7,3],[222,5,3],[226,7,3]],
  items: [[18,7],[36,7],[42,5],[54,7],[74,6],[88,7],[94,5],[112,5],[128,6],[142,7],[148,4],[164,5],[178,6],[202,5]],
  gate: 232,
  haz: [[49,9,2],[84,9,3],[101,9,2],[120,9,3],[138,9,2],[155,9,3],[170,9,2],[188,9,3]],
  enemies: [[20,'phish'],[31,'phish'],[38,'phish'],[47,'bsod'],[56,'phish'],[65,'bsod'],[73,'ai'],[88,'phish'],[93,'bsod'],[105,'ai'],[112,'phish'],[119,'bsod'],[127,'phish'],[136,'ai'],[143,'bsod'],[152,'phish'],[160,'ai'],[168,'bsod'],[177,'phish'],[181,'bsod'],[192,'ai'],[201,'bsod']],
  coins: [[17,5,4],[35,5,4],[41,3,4],[53,5,5],[71,4,4],[87,5,4],[93,3,4],[105,5,3],[111,3,4],[127,4,4],[141,5,4],[147,2,4],[159,5,3],[163,3,4],[177,4,4],[191,5,4],[201,3,4]],
  bits: [[23,3],[59,3],[75,4],[113,3],[147,1],[179,4],[203,3]],
  goal: 238, bossAt: 208
};

// Tiles: 0 empty, 1 raised floor, 2 rack shelf, 3 supply crate,
//        4 spent crate, 5 energy gate, 6 exposed cabling (hazard).
export const SOLID = t => t === 1 || t === 2 || t === 3 || t === 4 || t === 5;

// Paints ground everywhere except the gaps, then overlays the feature lists.
export function buildLevel(s) {
  const g = [];
  for (let r = 0; r < ROWS; r++) g.push(new Array(s.w).fill(0));

  for (let x = 0; x < s.w; x++) {
    if (!(s.gaps || []).some(([st, l]) => x >= st && x < st + l)) { g[10][x] = 1; g[11][x] = 1; }
  }
  (s.plats || []).forEach(([x, y, l]) => { for (let i = 0; i < l; i++) if (g[y]) g[y][x + i] = 2; });
  (s.items || []).forEach(([x, y]) => { if (g[y]) g[y][x] = 3; });
  (s.haz   || []).forEach(([x, y, l]) => { for (let i = 0; i < l; i++) if (g[y] && !g[y][x + i]) g[y][x + i] = 6; });
  if (s.gate) for (let r = 3; r <= 9; r++) g[r][s.gate] = 5;

  return g;
}
