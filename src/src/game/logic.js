// Pure game logic: scoring, dictionary trie, move generation. No React or DOM in this file.
const N = 15;
const VAL = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '?': 0 };
const DIST = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2 };
const PREM_LIST = {
  TW: [[0, 0], [0, 7], [0, 14], [7, 0], [7, 14], [14, 0], [14, 7], [14, 14]],
  DW: [[1, 1], [2, 2], [3, 3], [4, 4], [1, 13], [2, 12], [3, 11], [4, 10], [13, 1], [12, 2], [11, 3], [10, 4], [13, 13], [12, 12], [11, 11], [10, 10], [7, 7]],
  TL: [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13], [9, 1], [9, 5], [9, 9], [9, 13], [13, 5], [13, 9]],
  DL: [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11], [8, 2], [8, 6], [8, 8], [8, 12], [11, 0], [11, 7], [11, 14], [12, 6], [12, 8], [14, 3], [14, 11]]
};
const PREM = Array.from({ length: N }, () => new Array(N).fill(''));
for (const k in PREM_LIST) for (const [r, c] of PREM_LIST[k]) PREM[r][c] = k;

function buildTrie(text) {
  let cap = 500000;
  let first = new Int32Array(cap).fill(-1), next = new Int32Array(cap).fill(-1);
  let let_ = new Uint8Array(cap), end = new Uint8Array(cap);
  let cnt = 1, words = 0;
  const lines = text.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const w = lines[li].trim();
    if (w.length < 2 || w.length > 15 || !/^[a-z]+$/.test(w)) continue;
    let node = 0;
    for (let i = 0; i < w.length; i++) {
      const k = w.charCodeAt(i) - 97;
      let ch = first[node];
      while (ch !== -1 && let_[ch] !== k) ch = next[ch];
      if (ch === -1) {
        if (cnt >= cap) {
          const nc = cap * 2;
          const f2 = new Int32Array(nc).fill(-1); f2.set(first); first = f2;
          const n2 = new Int32Array(nc).fill(-1); n2.set(next); next = n2;
          const l2 = new Uint8Array(nc); l2.set(let_); let_ = l2;
          const e2 = new Uint8Array(nc); e2.set(end); end = e2;
          cap = nc;
        }
        ch = cnt++;
        let_[ch] = k; next[ch] = first[node]; first[node] = ch;
      }
      node = ch;
    }
    end[node] = 1; words++;
  }
  return { first, next, let_, end, nodes: cnt, words };
}
function tChild(T, node, k) {
  for (let ch = T.first[node]; ch !== -1; ch = T.next[ch]) if (T.let_[ch] === k) return ch;
  return -1;
}
function isWord(T, str) {
  if (str.length < 2) return false;
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    n = tChild(T, n, str.charCodeAt(i) - 65);
    if (n < 0) return false;
  }
  return T.end[n] === 1;
}

const newBoard = () => Array.from({ length: N }, () => new Array(N).fill(null));
const boardEmpty = b => b.every(r => r.every(x => !x));
function makeBag(rng) {
  rng = rng || Math.random;
  const bag = [];
  for (const k in DIST) for (let i = 0; i < DIST[k]; i++) bag.push(k);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
  return bag;
}

// placed: [{r, c, ch, blank}]. Returns {ok, err, words:[{word, score, valid}], score}
function evaluate(T, board, placed) {
  if (!placed.length) return { ok: false, err: 'Place at least one tile.', words: [], score: 0 };
  const map = new Map();
  for (const p of placed) {
    const key = p.r * N + p.c;
    if (map.has(key) || board[p.r][p.c]) return { ok: false, err: 'That square is taken.', words: [], score: 0 };
    map.set(key, p);
  }
  const rows = new Set(placed.map(p => p.r)), cols = new Set(placed.map(p => p.c));
  if (rows.size > 1 && cols.size > 1) return { ok: false, err: 'Tiles must sit in one row or one column.', words: [], score: 0 };
  const get = (r, c) => {
    if (r < 0 || c < 0 || r >= N || c >= N) return null;
    return map.get(r * N + c) || board[r][c];
  };
  if (placed.length > 1) {
    const across = rows.size === 1;
    const fixed = across ? placed[0].r : placed[0].c;
    const vs = placed.map(p => (across ? p.c : p.r));
    const lo = Math.min(...vs), hi = Math.max(...vs);
    for (let v = lo; v <= hi; v++) {
      if (!(across ? get(fixed, v) : get(v, fixed))) return { ok: false, err: 'Tiles must connect with no gaps.', words: [], score: 0 };
    }
  }
  const first = boardEmpty(board);
  if (first) {
    if (!map.has(7 * N + 7)) return { ok: false, err: 'The first word must cover the center square.', words: [], score: 0 };
    if (placed.length < 2) return { ok: false, err: 'The first word needs at least two letters.', words: [], score: 0 };
  }
  const wordAt = (r, c, dr, dc) => {
    let rr = r, cc = c;
    while (get(rr - dr, cc - dc)) { rr -= dr; cc -= dc; }
    const cells = [];
    while (get(rr, cc)) { cells.push({ r: rr, c: cc, t: get(rr, cc) }); rr += dr; cc += dc; }
    return cells;
  };
  const words = [], seen = new Set();
  const add = cells => {
    if (cells.length < 2) return;
    const key = cells[0].r + ',' + cells[0].c + (cells[0].r === cells[1].r ? 'h' : 'v');
    if (seen.has(key)) return;
    seen.add(key); words.push(cells);
  };
  for (const p of placed) { add(wordAt(p.r, p.c, 0, 1)); add(wordAt(p.r, p.c, 1, 0)); }
  if (!words.length) return { ok: false, err: 'Words need at least two letters.', words: [], score: 0 };
  if (!first && !words.some(w => w.some(x => !map.has(x.r * N + x.c)))) {
    return { ok: false, err: 'The word must connect to tiles already on the board.', words: [], score: 0 };
  }
  let total = 0;
  const out = [];
  for (const w of words) {
    let s = 0, mult = 1, str = '';
    for (const x of w) {
      str += x.t.ch;
      let v = x.t.blank ? 0 : VAL[x.t.ch];
      if (map.has(x.r * N + x.c)) {
        const pr = PREM[x.r][x.c];
        if (pr === 'DL') v *= 2; else if (pr === 'TL') v *= 3; else if (pr === 'DW') mult *= 2; else if (pr === 'TW') mult *= 3;
      }
      s += v;
    }
    s *= mult;
    out.push({ word: str, score: s, valid: isWord(T, str) });
    total += s;
  }
  if (placed.length === 7) total += 50;
  const bad = out.filter(x => !x.valid).map(x => x.word);
  return {
    ok: bad.length === 0,
    err: bad.length ? (bad.length === 1 ? bad[0] + ' is not in the dictionary.' : bad.join(', ') + ' are not in the dictionary.') : '',
    words: out, score: total, bingo: placed.length === 7
  };
}

// Anchor-based move generation over the trie (Appel and Jacobson). Returns candidate moves as {tiles:[{r,c,ch,blank}]}.
function genMoves(T, board, rack) {
  const moves = [];
  const first = boardEmpty(board);
  const counts = new Array(26).fill(0);
  let blanks = 0;
  for (const ch of rack) { if (ch === '?') blanks++; else counts[ch.charCodeAt(0) - 65]++; }
  const FULL = (1 << 26) - 1;
  const maxLeft = rack.length - 1;
  for (let dir = 0; dir < 2; dir++) {
    if (first && dir === 1) continue;
    const G = dir === 0 ? (r, c) => board[r][c] : (r, c) => board[c][r];
    const cross = Array.from({ length: N }, () => new Int32Array(N));
    const anchor = Array.from({ length: N }, () => new Uint8Array(N));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (G(r, c)) continue;
        let A = '', r2 = r - 1;
        while (r2 >= 0 && G(r2, c)) { A = G(r2, c).ch + A; r2--; }
        let B = '', r3 = r + 1;
        while (r3 < N && G(r3, c)) { B += G(r3, c).ch; r3++; }
        if (!A && !B) cross[r][c] = FULL;
        else {
          let m = 0;
          for (let k = 0; k < 26; k++) if (isWord(T, A + String.fromCharCode(65 + k) + B)) m |= 1 << k;
          cross[r][c] = m;
        }
        const adj = (r > 0 && G(r - 1, c)) || (r < N - 1 && G(r + 1, c)) || (c > 0 && G(r, c - 1)) || (c < N - 1 && G(r, c + 1));
        if (adj || (first && r === 7 && c === 7)) anchor[r][c] = 1;
      }
    }
    const record = (r, placed) => {
      const tiles = placed.map(p => (dir === 0
        ? { r, c: p.col, ch: String.fromCharCode(65 + p.k), blank: p.blank }
        : { r: p.col, c: r, ch: String.fromCharCode(65 + p.k), blank: p.blank }));
      moves.push({ tiles });
    };
    const extendRight = (r, node, col, anc, placed) => {
      if (col >= N || !G(r, col)) {
        if (T.end[node] && col > anc) record(r, placed);
        if (col >= N) return;
        const mask = cross[r][col];
        for (let ch = T.first[node]; ch !== -1; ch = T.next[ch]) {
          const k = T.let_[ch];
          if (!((mask >> k) & 1)) continue;
          if (counts[k] > 0) {
            counts[k]--; placed.push({ k, blank: false, col });
            extendRight(r, ch, col + 1, anc, placed);
            placed.pop(); counts[k]++;
          } else if (blanks > 0) {
            blanks--; placed.push({ k, blank: true, col });
            extendRight(r, ch, col + 1, anc, placed);
            placed.pop(); blanks++;
          }
        }
      } else {
        const child = tChild(T, node, G(r, col).ch.charCodeAt(0) - 65);
        if (child >= 0) extendRight(r, child, col + 1, anc, placed);
      }
    };
    const leftPart = (r, node, lp, limit, anc) => {
      extendRight(r, node, anc, anc, lp.map((x, i) => ({ k: x.k, blank: x.blank, col: anc - lp.length + i })));
      if (limit <= 0) return;
      for (let ch = T.first[node]; ch !== -1; ch = T.next[ch]) {
        const k = T.let_[ch];
        if (counts[k] > 0) {
          counts[k]--; lp.push({ k, blank: false });
          leftPart(r, ch, lp, limit - 1, anc);
          lp.pop(); counts[k]++;
        } else if (blanks > 0) {
          blanks--; lp.push({ k, blank: true });
          leftPart(r, ch, lp, limit - 1, anc);
          lp.pop(); blanks++;
        }
      }
    };
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!anchor[r][c]) continue;
        if (c > 0 && G(r, c - 1)) {
          let s = c - 1;
          while (s > 0 && G(r, s - 1)) s--;
          let node = 0, okp = true;
          for (let x = s; x < c; x++) {
            node = tChild(T, node, G(r, x).ch.charCodeAt(0) - 65);
            if (node < 0) { okp = false; break; }
          }
          if (okp) extendRight(r, node, c, c, []);
        } else {
          let l = 0;
          while (c - 1 - l >= 0 && !G(r, c - 1 - l) && !anchor[r][c - 1 - l] && l < maxLeft) l++;
          leftPart(r, 0, [], l, c);
        }
      }
    }
  }
  return moves;
}

function scoreMoves(T, board, rack) {
  const out = [];
  for (const m of genMoves(T, board, rack)) {
    const ev = evaluate(T, board, m.tiles);
    if (ev.ok) out.push({ tiles: m.tiles, score: ev.score, words: ev.words.map(w => w.word) });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function chooseMove(moves, level) {
  if (!moves.length) return null;
  if (level === 'hard') return moves[0];
  if (level === 'normal') return moves[Math.floor(Math.random() * Math.min(10, moves.length))];
  const lo = Math.floor(moves.length * 0.4);
  return moves[lo + Math.floor(Math.random() * (moves.length - lo))];
}

function removeFromRack(rack, ch, blank) {
  const i = rack.indexOf(blank ? '?' : ch);
  if (i >= 0) rack.splice(i, 1);
  return i >= 0;
}
function rackValue(rack) { return rack.reduce((a, ch) => a + VAL[ch], 0); }

export function shuffleWith(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand[i % rand.length] * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export const PREM_LABEL = { TW: 'TW', DW: 'DW', TL: 'TL', DL: 'DL' };

export { N, VAL, DIST, PREM_LIST, PREM, buildTrie, tChild, isWord, newBoard, boardEmpty, makeBag, evaluate, genMoves, scoreMoves, chooseMove, removeFromRack, rackValue };
