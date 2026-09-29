import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildTrie, evaluate, scoreMoves, chooseMove } from './game/logic.js';
import { initGame, reducer, placedList, usedIdx } from './game/gameState.js';
import useDragDrop from './hooks/useDragDrop.js';
import Board from './components/Board.jsx';
import Rack from './components/Rack.jsx';
import BlankPicker from './components/BlankPicker.jsx';
import WordPanel from './components/WordPanel.jsx';
import Meanings from './components/Meanings.jsx';
import TurnLog from './components/TurnLog.jsx';
import ScoreBar from './components/ScoreBar.jsx';
import ResultDialog from './components/ResultDialog.jsx';

const rand = () => Array.from({ length: 128 }, () => Math.random());

export default function App() {
  const [trie, setTrie] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [level, setLevel] = useState('normal');
  const [dismissed, setDismissed] = useState(false);
  const [state, dispatch] = useReducer(reducer, null, () => initGame());
  const rackRef = useRef(null);
  const levelRef = useRef(level);
  levelRef.current = level;

  const loadDictionary = useCallback(() => {
    setLoadError('');
    fetch(import.meta.env.BASE_URL + 'enable1.txt')
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then((txt) => setTrie(buildTrie(txt)))
      .catch((err) => setLoadError(err.message));
  }, []);
  useEffect(() => { loadDictionary(); }, [loadDictionary]);

  // Computer opponent: generates every legal word from its rack, then picks by difficulty.
  useEffect(() => {
    if (!trie || state.over || state.turn !== 1) return undefined;
    const id = setTimeout(() => {
      const moves = scoreMoves(trie, state.board, state.racks[1]);
      dispatch({ type: 'AI_MOVE', move: chooseMove(moves, levelRef.current), rand: rand() });
    }, 650);
    return () => clearTimeout(id);
    // The board and rack cannot change during the opponent's turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trie, state.turn, state.over, state.gameId]);

  const ev = useMemo(
    () => (trie && state.pending.length ? evaluate(trie, state.board, placedList(state.pending)) : null),
    [trie, state.board, state.pending]
  );
  const used = useMemo(() => usedIdx(state.pending), [state.pending]);
  const myTurn = !!trie && state.turn === 0 && !state.over;
  const inSwap = !!state.exch;

  const drag = useDragDrop({
    enabled: myTurn && !inSwap,
    rackRef,
    isCellFree: (r, c) => !state.board[r][c] && !state.pending.some((p) => p.r === r && p.c === c),
    onRackToRack: (from, to) => dispatch({ type: 'MOVE_RACK', from, to }),
    onRackToCell: (idx, r, c) => dispatch({ type: 'PLACE', idx, r, c }),
    onPendingToRack: (r, c) => dispatch({ type: 'REMOVE_PENDING', r, c }),
    onPendingToCell: (from, to) => dispatch({ type: 'MOVE_PENDING', from, to }),
  });

  const onCellClick = (r, c) => {
    if (drag.wasDrag() || !myTurn || inSwap) return;
    if (state.pending.some((p) => p.r === r && p.c === c)) {
      dispatch({ type: 'REMOVE_PENDING', r, c });
      return;
    }
    if (state.board[r][c] || state.sel === null) return;
    dispatch({ type: 'PLACE', idx: state.sel, r, c });
  };
  const onTileClick = (i) => {
    if (drag.wasDrag() || !myTurn || used.has(i)) return;
    dispatch({ type: 'SELECT_TILE', idx: i });
  };

  const newGame = () => {
    setDismissed(false);
    dispatch({ type: 'NEW_GAME', state: initGame() });
  };

  const meaningWords = ev ? ev.words.filter((w) => w.valid).map((w) => w.word) : state.lastWords ? state.lastWords.words : [];
  const meaningTitle = ev ? 'Your word' : state.lastWords ? state.lastWords.who + ' played' : '';
  const meaningEmpty = ev ? 'A meaning appears once a word in your play is valid.' : 'Meanings appear here for your word and for each word played.';

  let message;
  if (loadError) {
    message = (
      <>
        <span className="err">Could not load the dictionary ({loadError}). </span>
        <button type="button" onClick={loadDictionary}>Try again</button>
      </>
    );
  } else if (!trie) message = <span id="loading">Loading dictionary...</span>;
  else if (state.turn === 1 && !state.over) message = 'Opponent is looking for a word...';
  else {
    message = state.msg.map((m, i) => (m.b ? <b key={i}>{m.b}</b> : <span key={i}>{m.t}</span>));
  }

  return (
    <div className="wrap">
      <header>
        <h1>Letter <span>Duel</span></h1>
        <div className="controls">
          <label htmlFor="level">
            Opponent
            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <button id="newgame" className="primary" type="button" onClick={newGame}>New game</button>
        </div>
      </header>

      <div className="layout">
        <div className="main">
          <ScoreBar scores={state.scores} turn={state.turn} over={state.over} bag={state.bag.length} />
          <div className="msg" id="msg" aria-live="polite">{message}</div>

          <Board
            board={state.board}
            pending={state.pending}
            lastKeys={state.lastKeys}
            onCellClick={onCellClick}
            onPendingPointerDown={(e, r, c) => drag.startPendingDrag(e, r, c)}
          />
          <div className="legend">
            <span><i style={{ background: 'var(--tw)' }} />Triple word</span>
            <span><i style={{ background: 'var(--dw)' }} />Double word</span>
            <span><i style={{ background: 'var(--tl)' }} />Triple letter</span>
            <span><i style={{ background: 'var(--dl)' }} />Double letter</span>
          </div>

          <Rack
            rack={state.racks[0]}
            used={used}
            sel={state.sel}
            exch={state.exch}
            disabled={!myTurn}
            rackRef={rackRef}
            onTileClick={onTileClick}
            onTilePointerDown={(e, i) => { if (!used.has(i) && !inSwap) drag.startRackDrag(e, i); }}
          />
          {state.askBlank && <BlankPicker onChoose={(letter) => dispatch({ type: 'CHOOSE_BLANK', letter })} />}

          <div className="actions">
            <button id="play" className="primary" type="button" disabled={!(myTurn && ev && ev.ok && !inSwap)} onClick={() => dispatch({ type: 'PLAY', trie })}>Play word</button>
            <button id="recall" type="button" disabled={!(myTurn && state.pending.length && !inSwap)} onClick={() => dispatch({ type: 'RECALL' })}>Recall</button>
            <button id="shuffle" type="button" disabled={!(myTurn && !state.pending.length && !inSwap)} onClick={() => dispatch({ type: 'SHUFFLE', rand: rand() })}>Shuffle</button>
            <button
              id="swap"
              type="button"
              disabled={!(myTurn && !state.pending.length && (inSwap || state.bag.length >= 7))}
              onClick={() => dispatch(inSwap ? { type: 'SWAP_CONFIRM', rand: rand() } : { type: 'SWAP_START' })}
            >
              {inSwap ? 'Confirm swap' : 'Swap tiles'}
            </button>
            <button id="pass" type="button" disabled={!(myTurn && !state.pending.length)} onClick={() => dispatch(inSwap ? { type: 'CANCEL_SWAP' } : { type: 'PASS' })}>
              {inSwap ? 'Cancel swap' : 'Pass'}
            </button>
          </div>
        </div>

        <aside className="side">
          <WordPanel ev={ev} />
          <Meanings title={meaningTitle} words={meaningWords} emptyText={meaningEmpty} />
          <TurnLog log={state.log} />
        </aside>
      </div>

      <p className="foot">
        Every word you play is checked against the ENABLE word list (public domain, 168,551 words of 2 to 15 letters). A play with any word not in the list is rejected before it counts. The list predates some newer tournament words, so a few, such as QI and ZA, are missing. Meanings come from WordNet 3.0 and cover about two thirds of the list; other valid words show no meaning, and forms such as plurals and past tenses point to their base word. Drag tiles to reorder your rack or to place them on the board. Standard tile bag, premium squares and 50 point bonus for using all seven tiles.
      </p>
      <p className="foot">
        WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved. Used under the{' '}
        <a href={import.meta.env.BASE_URL + 'wordnet-license.txt'} target="_blank" rel="noopener noreferrer">WordNet license</a>.
      </p>

      {state.over && state.result && !dismissed && (
        <ResultDialog result={state.result} onAgain={newGame} onClose={() => setDismissed(true)} />
      )}
    </div>
  );
}
