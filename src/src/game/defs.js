// Word meanings from WordNet 3.0, split into one JSON file per first letter and loaded on demand.
const base = import.meta.env.BASE_URL;
const cache = {};

function loadLetter(letter) {
  if (!cache[letter]) {
    cache[letter] = fetch(base + 'defs/' + letter + '.json')
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .catch(() => {
        delete cache[letter];
        return null;
      });
  }
  return cache[letter];
}

// Returns {error:true}, null (no meaning available), or {of, items:[[pos, gloss], ...]}.
export async function getMeaning(word) {
  const w = word.toLowerCase();
  const data = await loadLetter(w[0]);
  if (!data) return { error: true };
  if (!Object.prototype.hasOwnProperty.call(data, w)) return null;
  const e = data[w];
  return Array.isArray(e) ? { of: '', items: e } : { of: e.o, items: e.d };
}

export const POS_LABEL = { n: 'noun', v: 'verb', a: 'adj.', r: 'adv.' };
