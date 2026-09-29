export default function TurnLog({ log }) {
  const rows = log.slice().reverse();
  return (
    <div className="card">
      <h2>Turns</h2>
      <ul className="log" id="log">
        {rows.length === 0 && <li><span className="who">No turns yet</span></li>}
        {rows.map((e, i) => (
          <li key={rows.length - i}>
            <span><span className="who">{e.who}</span> {e.text}</span>
            <span className="pts">{e.pts ? '+' + e.pts : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
