import { N, evaluate, removeFromRack, rackValue, makeBag, newBoard, shuffleWith } from './logic.js';

export const RACK_SIZE = 7;

function refill(rack, bag) {
  const r = rack.slice();
  const b = bag.slice();
  while (r.length < RACK_SIZE && b.length) r.push(b.pop());
  return [r, b];
}

const T = (t) => ({ t });
const B = (b) => ({ b });

export function initGame(rand) {
  const bag0 = makeBag(rand);
  const [r0, b1] = refill([], bag0);
  const [r1, b2] = refill([], b1);
  return {
    gameId: Date.now() + Math.random(),
    board: newBoard(),
    bag: b2,
    racks: [r0, r1],
    scores: [0, 0],
    turn: 0,
    scoreless: 0,
    over: false,
    result: null,
    log: [],
    lastKeys: [],
    lastWords: null,
    pending: [],
    sel: null,
    exch: null,
    askBlank: null,
    msg: [T('Your move. Cover the center star with your first word.')],
  };
}

export const placedList = (pending) => pending.map((p) => ({ r: p.r, c: p.c, ch: p.ch, blank: p.blank }));
export const usedIdx = (pending) => new Set(pending.map((p) => p.idx));
const cellFree = (s, r, c) => !s.board[r][c] && !s.pending.some((p) => p.r === r && p.c === c);
const who = (p) => (p === 0 ? 'You' : 'Opponent');

function commit(s, p, tiles, words, pts) {
  const board = s.board.map((row) => row.slice());
  const rack = s.racks[p].slice();
  const keys = [];
  for (const t of tiles) {
    board[t.r][t.c] = { ch: t.ch, blank: t.blank };
    keys.push(t.r * N + t.c);
    removeFromRack(rack, t.ch, t.blank);
  }
  const [newRack, bag] = refill(rack, s.bag);
  const racks = s.racks.slice();
  racks[p] = newRack;
  const scores = s.scores.slice();
  scores[p] += pts;
  return {
    ...s,
    board,
    racks,
    bag,
    scores,
    scoreless: 0,
    lastKeys: keys,
    lastWords: { who: who(p), words },
    log: [...s.log, { who: who(p), text: words.join(', '), pts }],
    pending: [],
    sel: null,
    exch: null,
    askBlank: null,
  };
}

function checkEnd(s) {
  let out = -1;
  for (let p = 0; p < 2; p++) if (!s.racks[p].length && !s.bag.length) out = p;
  if (out < 0 && s.scoreless < 6) return null;
  const scores = s.scores.slice();
  const log = s.log.slice();
  if (out >= 0) {
    const other = 1 - out;
    const v = rackValue(s.racks[other]);
    scores[out] += v;
    scores[other] -= v;
    log.push({ who: who(out), text: 'went out, ' + v + ' from the other rack', pts: v });
  } else {
    for (let p = 0; p < 2; p++) scores[p] -= rackValue(s.racks[p]);
    log.push({ who: 'Game', text: 'six scoreless turns in a row', pts: 0 });
  }
  const [a, b] = scores;
  const title = a > b ? 'You win' : b > a ? 'Opponent wins' : 'Tie';
  const kind = a > b ? 'win' : b > a ? 'lose' : 'tie';
  const text = out >= 0
    ? 'The game ended when ' + (out === 0 ? 'you' : 'the opponent') + ' played the last tile. Leftover tiles were counted.'
    : 'The game ended after six turns in a row with no score. Leftover tiles were subtracted.';
  return { ...s, scores, log, over: true, result: { title, kind, text, a, b }, msg: [T('Game over.')] };
}

function endTurn(s) {
  return checkEnd(s) || { ...s, turn: 1 - s.turn };
}

export function reducer(s, a) {
  switch (a.type) {
    case 'NEW_GAME':
      return a.state;

    case 'SELECT_TILE': {
      if (s.over || s.turn !== 0) return s;
      if (s.exch) {
        const set = new Set(s.exch);
        if (set.has(a.idx)) set.delete(a.idx); else set.add(a.idx);
        return { ...s, exch: [...set] };
      }
      if (usedIdx(s.pending).has(a.idx)) return s;
      return { ...s, sel: s.sel === a.idx ? null : a.idx, askBlank: null };
    }

    case 'PLACE': {
      if (s.over || s.turn !== 0 || s.exch) return s;
      const { idx, r, c } = a;
      if (idx === null || idx === undefined || !cellFree(s, r, c) || usedIdx(s.pending).has(idx)) return s;
      const ch = s.racks[0][idx];
      if (ch === undefined) return s;
      if (ch === '?') return { ...s, askBlank: { idx, r, c }, sel: null };
      return { ...s, pending: [...s.pending, { idx, r, c, ch, blank: false }], sel: null, askBlank: null };
    }

    case 'CHOOSE_BLANK': {
      if (!s.askBlank) return s;
      const { idx, r, c } = s.askBlank;
      return { ...s, pending: [...s.pending, { idx, r, c, ch: a.letter, blank: true }], askBlank: null, sel: null };
    }

    case 'REMOVE_PENDING':
      return { ...s, pending: s.pending.filter((p) => !(p.r === a.r && p.c === a.c)), askBlank: null };

    case 'MOVE_PENDING': {
      if (!cellFree(s, a.to.r, a.to.c)) return s;
      return { ...s, pending: s.pending.map((p) => (p.r === a.from.r && p.c === a.from.c ? { ...p, r: a.to.r, c: a.to.c } : p)) };
    }

    case 'MOVE_RACK': {
      const rack = s.racks[0];
      const n = rack.length;
      const { from, to } = a;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return s;
      const order = [];
      for (let i = 0; i < n; i++) order.push(i);
      order.splice(from, 1);
      order.splice(to, 0, from);
      const remap = (k) => order.indexOf(k);
      const racks = s.racks.slice();
      racks[0] = order.map((k) => rack[k]);
      return {
        ...s,
        racks,
        pending: s.pending.map((p) => ({ ...p, idx: remap(p.idx) })),
        sel: s.sel === null ? null : remap(s.sel),
        askBlank: s.askBlank ? { ...s.askBlank, idx: remap(s.askBlank.idx) } : null,
      };
    }

    case 'RECALL':
      return { ...s, pending: [], sel: null, askBlank: null };

    case 'SHUFFLE': {
      if (s.pending.length) return s;
      const racks = s.racks.slice();
      racks[0] = shuffleWith(s.racks[0], a.rand);
      return { ...s, racks, sel: null };
    }

    case 'SWAP_START':
      if (s.pending.length || s.bag.length < RACK_SIZE) return s;
      return { ...s, exch: [], sel: null, msg: [T('Tap the tiles you want to swap, then press Confirm swap.')] };

    case 'CANCEL_SWAP':
      return { ...s, exch: null, msg: [T('Swap cancelled.')] };

    case 'SWAP_CONFIRM': {
      if (!s.exch || !s.exch.length) return { ...s, msg: [T('Select at least one tile to swap.')] };
      const drop = new Set(s.exch);
      const out = s.racks[0].filter((_, i) => drop.has(i));
      const keep = s.racks[0].filter((_, i) => !drop.has(i));
      const [rack, bag0] = refill(keep, s.bag);
      const bag = shuffleWith(bag0.concat(out), a.rand);
      const racks = s.racks.slice();
      racks[0] = rack;
      const n = out.length;
      return endTurn({
        ...s,
        racks,
        bag,
        exch: null,
        sel: null,
        scoreless: s.scoreless + 1,
        lastKeys: [],
        log: [...s.log, { who: 'You', text: 'swapped ' + n + ' tile' + (n > 1 ? 's' : ''), pts: 0 }],
        msg: [T('You swapped ' + n + ' tile' + (n > 1 ? 's' : '') + '.')],
      });
    }

    case 'PASS':
      if (s.over || s.turn !== 0 || s.pending.length) return s;
      return endTurn({
        ...s,
        scoreless: s.scoreless + 1,
        lastKeys: [],
        log: [...s.log, { who: 'You', text: 'passed', pts: 0 }],
        msg: [T('You passed.')],
      });

    case 'PLAY': {
      if (s.over || s.turn !== 0) return s;
      const tiles = placedList(s.pending);
      const ev = evaluate(a.trie, s.board, tiles);
      if (!ev.ok) return s;
      const words = ev.words.map((w) => w.word);
      const next = commit(s, 0, tiles, words, ev.score);
      return endTurn({ ...next, msg: [T('You played '), B(words[0]), T(' for ' + ev.score + '.')] });
    }

    case 'AI_MOVE': {
      if (s.over || s.turn !== 1) return s;
      const m = a.move;
      if (m) {
        const next = commit(s, 1, m.tiles, m.words, m.score);
        return endTurn({ ...next, msg: [T('Opponent played '), B(m.words[0]), T(' for ' + m.score + '. Your move.')] });
      }
      if (s.bag.length >= RACK_SIZE) {
        const [rack, bag0] = refill([], s.bag);
        const bag = shuffleWith(bag0.concat(s.racks[1]), a.rand);
        const racks = s.racks.slice();
        racks[1] = rack;
        return endTurn({
          ...s,
          racks,
          bag,
          scoreless: s.scoreless + 1,
          lastKeys: [],
          log: [...s.log, { who: 'Opponent', text: 'swapped tiles', pts: 0 }],
          msg: [T('Opponent swapped tiles. Your move.')],
        });
      }
      return endTurn({
        ...s,
        scoreless: s.scoreless + 1,
        lastKeys: [],
        log: [...s.log, { who: 'Opponent', text: 'passed', pts: 0 }],
        msg: [T('Opponent passed. Your move.')],
      });
    }

    default:
      return s;
  }
}
