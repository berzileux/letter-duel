export default function WordPanel({ ev }) {
  return (
    <div className="card">
      <h2>Your word</h2>
      <div className="chips" id="chips">
        {ev ? (
          <>
            {ev.words.map((w) => (
              <span key={w.word} className={'chip ' + (w.valid ? 'ok' : 'no')}>
                {w.word} <small>{w.score}</small>
              </span>
            ))}
            {ev.bingo && <span className="chip ok">All 7 tiles <small>+50</small></span>}
          </>
        ) : (
          <span className="hint">Drag a tile onto the board, or pick a tile and click a square.</span>
        )}
      </div>
      <div id="err" className="err">{ev && !ev.ok ? ev.err : ''}</div>
      <div className="total" id="total">{ev && ev.ok ? '+' + ev.score : ''}</div>
    </div>
  );
}
