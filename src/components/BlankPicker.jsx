const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function BlankPicker({ onChoose }) {
  return (
    <div className="picker" id="picker">
      <p>Choose a letter for the blank tile.</p>
      {LETTERS.map((l) => (
        <button key={l} type="button" onClick={() => onChoose(l)}>{l}</button>
      ))}
    </div>
  );
}
