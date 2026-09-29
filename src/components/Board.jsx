import { N, PREM, VAL } from '../game/logic.js';

export default function Board({ board, pending, lastKeys, onCellClick, onPendingPointerDown }) {
  const pend = new Map(pending.map((p) => [p.r * N + p.c, p]));
  const last = new Set(lastKeys);
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const key = r * N + c;
      const t = board[r][c];
      const pd = pend.get(key);
      const pr = PREM[r][c];
      const star = r === 7 && c === 7;
      let inner = null;
      if (t) {
        inner = (
          <div className={'tile' + (t.blank ? ' blank' : '') + (last.has(key) ? ' last' : '')}>
            {t.ch}
            {!t.blank && <sub>{VAL[t.ch]}</sub>}
          </div>
        );
      } else if (pd) {
        inner = (
          <div className={'tile pend' + (pd.blank ? ' blank' : '')} onPointerDown={(e) => onPendingPointerDown(e, r, c)}>
            {pd.ch}
            {!pd.blank && <sub>{VAL[pd.ch]}</sub>}
          </div>
        );
      } else if (star) inner = '★';
      else if (pr) inner = pr;
      cells.push(
        <div
          key={key}
          className={'cell ' + pr + (star ? ' star' : '') + (t ? ' fixed' : '')}
          data-r={r}
          data-c={c}
          onClick={() => onCellClick(r, c)}
        >
          {inner}
        </div>
      );
    }
  }
  return (
    <div className="boardwrap">
      <div className="board" id="board">{cells}</div>
    </div>
  );
}
