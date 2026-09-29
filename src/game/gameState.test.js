import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildTrie } from './logic.js';
import { initGame, reducer } from './gameState.js';

const T = buildTrie(readFileSync(new URL('../../public/enable1.txt', import.meta.url), 'utf8'));

describe('game reducer', () => {
  it('deals seven tiles each and leaves 86 in the bag', () => {
    const s = initGame();
    expect(s.racks[0]).toHaveLength(7);
    expect(s.racks[1]).toHaveLength(7);
    expect(s.bag).toHaveLength(86);
  });

  it('reorders the rack and keeps placed tiles attached to the right letters', () => {
    let s = initGame();
    s = { ...s, racks: [['A', 'B', 'C', 'D', 'E', 'F', 'G'], s.racks[1]] };
    s = reducer(s, { type: 'PLACE', idx: 0, r: 7, c: 7 });
    expect(s.pending).toEqual([{ idx: 0, r: 7, c: 7, ch: 'A', blank: false }]);
    s = reducer(s, { type: 'MOVE_RACK', from: 0, to: 4 });
    expect(s.racks[0].join('')).toBe('BCDEAFG');
    expect(s.pending[0].idx).toBe(4);
    expect(s.racks[0][s.pending[0].idx]).toBe('A');
  });

  it('returns and moves pending tiles', () => {
    let s = initGame();
    s = { ...s, racks: [['A', 'B', 'C', 'D', 'E', 'F', 'G'], s.racks[1]] };
    s = reducer(s, { type: 'PLACE', idx: 1, r: 7, c: 7 });
    s = reducer(s, { type: 'MOVE_PENDING', from: { r: 7, c: 7 }, to: { r: 7, c: 8 } });
    expect(s.pending[0]).toMatchObject({ r: 7, c: 8 });
    s = reducer(s, { type: 'REMOVE_PENDING', r: 7, c: 8 });
    expect(s.pending).toHaveLength(0);
  });

  it('rejects an invalid play and accepts a valid one', () => {
    let s = initGame();
    s = { ...s, racks: [['C', 'A', 'T', 'X', 'E', 'F', 'G'], s.racks[1]] };
    s = reducer(s, { type: 'PLACE', idx: 3, r: 7, c: 7 });
    s = reducer(s, { type: 'PLACE', idx: 1, r: 7, c: 8 });
    const bad = reducer(s, { type: 'PLAY', trie: T });
    expect(bad.turn).toBe(0);
    expect(bad.scores[0]).toBe(0);

    let g = { ...initGame() };
    g = { ...g, racks: [['C', 'A', 'T', 'X', 'E', 'F', 'G'], g.racks[1]] };
    g = reducer(g, { type: 'PLACE', idx: 0, r: 7, c: 6 });
    g = reducer(g, { type: 'PLACE', idx: 1, r: 7, c: 7 });
    g = reducer(g, { type: 'PLACE', idx: 2, r: 7, c: 8 });
    g = reducer(g, { type: 'PLAY', trie: T });
    expect(g.turn).toBe(1);
    expect(g.scores[0]).toBeGreaterThan(0);
    expect(g.racks[0]).toHaveLength(7);
    expect(g.lastWords.words).toEqual(['CAT']);
  });

  it('asks for a letter when a blank is placed', () => {
    let s = initGame();
    s = { ...s, racks: [['?', 'A', 'T', 'X', 'E', 'F', 'G'], s.racks[1]] };
    s = reducer(s, { type: 'PLACE', idx: 0, r: 7, c: 7 });
    expect(s.askBlank).toEqual({ idx: 0, r: 7, c: 7 });
    s = reducer(s, { type: 'CHOOSE_BLANK', letter: 'C' });
    expect(s.pending[0]).toMatchObject({ ch: 'C', blank: true });
  });
});
