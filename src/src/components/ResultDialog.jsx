export default function ResultDialog({ result, onAgain, onClose }) {
  return (
    <div id="result">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="rTitle">
        <h3 id="rTitle" className={result.kind}>{result.title}</h3>
        <div className="tally">
          <span><small>You</small><b>{result.a}</b></span>
          <span><small>Opponent</small><b>{result.b}</b></span>
        </div>
        <p>{result.text}</p>
        <div className="row">
          <button type="button" className="primary" onClick={onAgain}>Play again</button>
          <button type="button" onClick={onClose}>Review board</button>
        </div>
      </div>
    </div>
  );
}
