export default function ScoreBar({ scores, turn, over, bag }) {
  return (
    <div className="scores">
      <div className={'score' + (turn === 0 && !over ? ' turn' : '')} id="sMe">
        <div className="lbl"><span>You</span></div>
        <div className="num" id="nMe">{scores[0]}</div>
      </div>
      <div className={'score' + (turn === 1 && !over ? ' turn' : '')} id="sAi">
        <div className="lbl"><span>Opponent</span></div>
        <div className="num" id="nAi">{scores[1]}</div>
      </div>
      <div className="bag">
        <div className="lbl">Bag</div>
        <div className="num" id="nBag">{bag}</div>
      </div>
    </div>
  );
}
