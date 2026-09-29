import { VAL } from '../game/logic.js';

export default function Rack({ rack, used, sel, exch, disabled, rackRef, onTileClick, onTilePointerDown }) {
  return (
    <div className="rackwrap">
      <div className="rack" id="rack" ref={rackRef}>
        {rack.map((ch, i) => {
          const cls = 'rtile' + (used.has(i) ? ' used' : '') + (sel === i ? ' sel' : '') + (exch && exch.includes(i) ? ' ex' : '');
          return (
            <button
              key={i}
              type="button"
              className={cls}
              data-i={i}
              disabled={disabled}
              aria-label={'Tile ' + (ch === '?' ? 'blank' : ch)}
              onClick={() => onTileClick(i)}
              onPointerDown={(e) => onTilePointerDown(e, i)}
            >
              {ch === '?' ? '' : (<>{ch}<sub>{VAL[ch]}</sub></>)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
