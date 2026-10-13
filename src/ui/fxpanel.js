// ?fx developer panel: toggle every effect live (dev-only, so English labels like ?debug).
import { FX, flags, setFx } from '../world/fx.js';

export function initFxPanel() {
  if (!new URLSearchParams(location.search).has('fx')) return;
  const el = document.createElement('div');
  el.className = 'fxp';
  const head = document.createElement('button');
  head.textContent = 'FX ▾';
  const list = document.createElement('div');
  el.append(head, list);
  head.onclick = () => { list.hidden = !list.hidden; };
  for (const [k, [label, cost]] of Object.entries(FX)) {
    const row = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!flags[k];
    cb.onchange = () => setFx(k, cb.checked);
    const tag = document.createElement('i');
    tag.textContent = cost;
    tag.className = `c-${cost}`;
    row.append(cb, ` ${label} `, tag);
    list.append(row);
  }
  document.body.append(el);
}
