// Big bouncing action button (bottom-right) shown while the player stands inside a POI radius.
import { on, emit } from '../bus.js';
import { t } from '../i18n.js';
import pois from '../../data/pois.json';

export function initPoiButton(host) {
  const btn = document.createElement('button');
  btn.className = 'poi-btn';
  btn.hidden = true;
  const ic = document.createElement('span');
  const lb = document.createElement('small');
  btn.append(ic, lb);
  host.append(btn);

  let id = null;
  const fire = () => { if (id && !btn.hidden) emit('interact', { poiId: id }); };
  btn.addEventListener('click', fire);
  addEventListener('keydown', (e) => { if (e.code === 'KeyE' || e.code === 'Enter') fire(); });
  on('poi:near', ({ poiId }) => {
    id = poiId;
    btn.hidden = !id;
    if (!id) return;
    ic.textContent = pois[id]?.icon ?? '👆';
    lb.textContent = t(`poi.${id}`);
  });
}
