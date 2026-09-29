import { useEffect, useState } from 'react';
import { getMeaning, POS_LABEL } from '../game/defs.js';

function Entry({ word, m }) {
  if (m && m.error) {
    return <div className="mean none"><b>{word}</b><p>Meanings could not be loaded. Check your connection.</p></div>;
  }
  if (!m) {
    return <div className="mean none"><b>{word}</b><p>Valid in the word list, but no meaning is included for it.</p></div>;
  }
  return (
    <div className="mean">
      <b>{word}</b>
      {m.of ? <span className="of">{m.of}</span> : null}
      {m.items.map((it, i) => (
        <p key={i}><span className="pos">{POS_LABEL[it[0]]}</span>{it[1]}</p>
      ))}
    </div>
  );
}

export default function Meanings({ title, words, emptyText }) {
  const [list, setList] = useState(null);
  const key = words.join(',');
  useEffect(() => {
    let alive = true;
    if (!words.length) { setList(null); return undefined; }
    setList('loading');
    Promise.all(words.map(getMeaning)).then((r) => { if (alive) setList(r); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  let body;
  if (!words.length) body = <span className="hint">{emptyText}</span>;
  else if (list === 'loading' || list === null) body = <span className="hint">Looking up...</span>;
  else body = words.map((w, i) => <Entry key={w + i} word={w} m={list[i]} />);

  return (
    <div className="card">
      <h2 id="meanTitle">Meanings{title ? ' · ' + title : ''}</h2>
      <div className="means" id="means">{body}</div>
    </div>
  );
}
