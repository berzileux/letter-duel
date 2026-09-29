import { useCallback, useEffect, useRef } from 'react';

// Pointer-event drag and drop that works with mouse, pen and touch.
// Rack tiles can be dropped on another rack slot (reorder) or a board square (place).
// Pending board tiles can be dropped on a free square (move) or the rack (return).
export default function useDragDrop({ enabled, rackRef, isCellFree, onRackToRack, onRackToCell, onPendingToRack, onPendingToCell }) {
  const drag = useRef(null);
  const suppress = useRef(false);
  const cb = useRef({});
  cb.current = { enabled, isCellFree, onRackToRack, onRackToCell, onPendingToRack, onPendingToCell };

  useEffect(() => {
    const clearHover = () => {
      document.querySelectorAll('.cell.drop, .rtile.dslot').forEach((el) => el.classList.remove('drop', 'dslot'));
    };
    const targetAt = (x, y) => {
      const rk = rackRef.current;
      if (rk) {
        const rr = rk.getBoundingClientRect();
        if (x >= rr.left && x <= rr.right && y >= rr.top - 6 && y <= rr.bottom + 6) {
          const kids = Array.from(rk.children);
          let best = -1;
          let bd = Infinity;
          kids.forEach((k, i) => {
            const r = k.getBoundingClientRect();
            const d = Math.abs(x - (r.left + r.width / 2));
            if (d < bd) { bd = d; best = i; }
          });
          if (best >= 0) return { t: 'rack', slot: best, el: kids[best] };
        }
      }
      const el = document.elementFromPoint(x, y);
      const cell = el && el.closest ? el.closest('#board .cell') : null;
      if (cell) return { t: 'cell', r: Number(cell.dataset.r), c: Number(cell.dataset.c), el: cell };
      return null;
    };
    const makeGhost = (el) => {
      const rc = el.getBoundingClientRect();
      const g = el.cloneNode(true);
      g.classList.remove('sel', 'ex', 'used');
      g.classList.add('ghost');
      g.style.width = rc.width + 'px';
      g.style.height = rc.height + 'px';
      g.style.fontSize = getComputedStyle(el).fontSize;
      const sub = g.querySelector('sub');
      const osub = el.querySelector('sub');
      if (sub && osub) sub.style.fontSize = getComputedStyle(osub).fontSize;
      document.body.appendChild(g);
      return { g, w: rc.width, h: rc.height };
    };
    const onMove = (e) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pid) return;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 7) return;
        d.moved = true;
        d.ghost = makeGhost(d.el);
        d.el.style.opacity = '0.3';
      }
      d.ghost.g.style.left = e.clientX - d.ghost.w / 2 + 'px';
      d.ghost.g.style.top = e.clientY - d.ghost.h / 2 + 'px';
      clearHover();
      const t = targetAt(e.clientX, e.clientY);
      if (t && t.t === 'cell' && cb.current.isCellFree(t.r, t.c)) t.el.classList.add('drop');
      else if (t && t.t === 'rack') t.el.classList.add('dslot');
      e.preventDefault();
    };
    const finish = (e, cancel) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pid) return;
      drag.current = null;
      clearHover();
      if (!d.moved) return;
      suppress.current = true;
      setTimeout(() => { suppress.current = false; }, 0);
      d.ghost.g.remove();
      d.el.style.opacity = '';
      if (cancel || !cb.current.enabled) return;
      const t = targetAt(e.clientX, e.clientY);
      if (!t) return;
      if (d.kind === 'rack') {
        if (t.t === 'rack') cb.current.onRackToRack(d.idx, t.slot);
        else cb.current.onRackToCell(d.idx, t.r, t.c);
      } else if (t.t === 'rack') cb.current.onPendingToRack(d.r, d.c);
      else cb.current.onPendingToCell({ r: d.r, c: d.c }, { r: t.r, c: t.c });
    };
    const onUp = (e) => finish(e, false);
    const onCancel = (e) => finish(e, true);
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
    };
  }, [rackRef]);

  const begin = useCallback((e, info) => {
    if (!cb.current.enabled) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { ...info, sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId, el: e.currentTarget, ghost: null };
  }, []);

  return {
    startRackDrag: (e, idx) => begin(e, { kind: 'rack', idx }),
    startPendingDrag: (e, r, c) => begin(e, { kind: 'pending', r, c }),
    wasDrag: () => suppress.current,
  };
}
