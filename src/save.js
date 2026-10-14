// Local save: localStorage { v, state }. Autosaves after every economy change and when the app is
// hidden. ?reset clears it. Every storage call is guarded (private mode / blocked storage).
import { on } from './bus.js';

const KEY = 'mk_save', V = 1;

export function loadSave() {
  try {
    if (new URLSearchParams(location.search).has('reset')) {
      localStorage.removeItem(KEY);
      return null;
    }
    const raw = JSON.parse(localStorage.getItem(KEY));
    return raw?.v === V ? raw.state : null;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: V, state })); } catch { /* ignore */ }
}

export function initAutosave(econ) {
  on('econ', () => writeSave(econ.state));
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(econ.state); });
}
