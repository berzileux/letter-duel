import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildTrie, isWord, newBoard, makeBag, evaluate, scoreMoves, removeFromRack, PREM_LIST, DIST,
} from './logic.js';

let T;
let words;
beforeAll(() => {
  const txt = readFileSync(new URL('../../public/enable1.txt', import.meta.url), 'utf8');
  T = buildTrie(txt);
  words = txt.split('\n').map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]{2,7}$/.test(s));
});

const tiles = (w, r, c, dr, dc) => [...w].map((ch, i) => ({ r: r + dr * i, c: c + dc * i, ch, blank: false }));
const key = (m) => m.tiles.map((t) => t.r + ',' + t.c + t.ch + (t.blank ? '*' : '')).sort().join('|');

describe('board and bag', () => {
  it('has the standard premium square counts', () => {
    expect(PREM_LIST.TW).toHaveLength(8);
    expect(PREM_LIST.DW).toHaveLength(17);
    expect(PREM_LIST.TL).toHaveLength(12);
    expect(PREM_LIST.DL).toHaveLength(24);
  });
  it('has 100 tiles', () => {
    expect(Object.values(DIST).reduce((a, b) => a + b, 0)).toBe(100);
    expect(makeBag()).toHaveLength(100);
  });
});

describe('dictionary', () => {
  it('accepts and rejects words', () => {
    expect(isWord(T, 'QUIZ')).toBe(true);
    expect(isWord(T, 'XYZZY')).toBe(false);
    expect(isWord(T, 'A')).toBe(false);
  });
});

describe('scoring and rules', () => {
  it('scores the first word with premium squares', () => {
    const ev = evaluate(T, newBoard(), tiles('HELLO', 7, 3, 0, 1));
    expect(ev.ok).toBe(true);
    expect(ev.score).toBe(24);
  });
  it('requires the center square on the first move', () => {
    expect(evaluate(T, newBoard(), tiles('HELLO', 0, 0, 0, 1)).ok).toBe(false);
  });
  it('rejects words not in the dictionary', () => {
    const ev = evaluate(T, newBoard(), tiles('HELXO', 7, 3, 0, 1));
    expect(ev.ok).toBe(false);
    expect(ev.words[0].valid).toBe(false);
  });
  it('scores blanks as zero', () => {
    const t = tiles('HELLO', 7, 3, 0, 1);
    t[2].blank = true;
    expect(evaluate(T, newBoard(), t).score).toBe((8 + 1 + 0 + 1 + 1) * 2);
  });
  it('adds the 50 point bonus for seven tiles', () => {
    const ev = evaluate(T, newBoard(), tiles('JOURNAL', 7, 1, 0, 1));
    expect(ev.ok && ev.bingo).toBe(true);
    expect(ev.score).toBeGreaterThanOrEqual(50);
  });
  it('requires later plays to connect and scores hooks', () => {
    const b = newBoard();
    for (const t of tiles('HELLO', 7, 3, 0, 1)) b[t.r][t.c] = { ch: t.ch, blank: false };
    expect(evaluate(T, b, tiles('HE', 0, 0, 0, 1)).ok).toBe(false);
    const hook = evaluate(T, b, [{ r: 7, c: 8, ch: 'S', blank: false }]);
    expect(hook.ok).toBe(true);
    expect(hook.words[0].word).toBe('HELLOS');
  });
});

describe('move generation', () => {
  it('finds every legal first move that brute force finds', () => {
    for (const rack of [['R', 'E', 'A', 'D', 'I', 'N', 'G'], ['Q', 'U', 'I', 'Z', 'E', 'S', 'T']]) {
      const gen = new Map(scoreMoves(T, newBoard(), rack).map((m) => [key(m), m.score]));
      const cnt = {};
      rack.forEach((c) => { cnt[c] = (cnt[c] || 0) + 1; });
      let checked = 0;
      for (const w of words) {
        const need = { ...cnt };
        if (![...w].every((c) => need[c]-- > 0)) continue;
        for (let c = 0; c + w.length <= 15; c++) {
          if (c > 7 || c + w.length - 1 < 7) continue;
          const ev = evaluate(T, newBoard(), tiles(w, 7, c, 0, 1));
          if (!ev.ok) continue;
          const k = key({ tiles: tiles(w, 7, c, 0, 1) });
          expect(gen.get(k)).toBe(ev.score);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(20);
    }
  });

  it('plays complete self-play games with only valid words on the board', () => {
    let s = 12345;
    const rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    for (let g = 0; g < 4; g++) {
      const board = newBoard();
      const bag = makeBag(rng);
      const racks = [[], []];
      const refill = (p) => { while (racks[p].length < 7 && bag.length) racks[p].push(bag.pop()); };
      refill(0); refill(1);
      let turn = 0; let scoreless = 0; let turns = 0;
      while (turns < 300) {
        const mv = scoreMoves(T, board, racks[turn].slice());
        if (mv.length) {
          for (const t of mv[0].tiles) {
            expect(board[t.r][t.c]).toBeNull();
            board[t.r][t.c] = { ch: t.ch, blank: t.blank };
            removeFromRack(racks[turn], t.ch, t.blank);
          }
          scoreless = 0; refill(turn);
          for (let d = 0; d < 2; d++) {
            for (let a = 0; a < 15; a++) {
              let run = '';
              for (let b = 0; b <= 15; b++) {
                const x = b < 15 ? (d ? board[b][a] : board[a][b]) : null;
                if (x) run += x.ch;
                else { if (run.length >= 2) expect(isWord(T, run)).toBe(true); run = ''; }
              }
            }
          }
        } else scoreless++;
        if ((!racks[turn].length && !bag.length) || scoreless >= 6) break;
        turn = 1 - turn; turns++;
      }
      expect(turns).toBeLessThan(300);
    }
  });
});
