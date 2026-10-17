// Doors between the town and the interiors: 300 ms CSS fade, swap the active scene behind it, place
// the player. Entering: interior spawn. Leaving: just outside that building's town door, facing away.
import { on } from '../bus.js';
import { setSceneShadows, setOcclusionEnabled } from './light.js';
import { setIndoor } from './gltfmat.js';
import { t } from '../i18n.js';

const FADE_MS = 300;

// interiors: { bank: world, market: world } (each has .door and .exit POI ids)
export function initDoors({ game, player, input, setActiveScene, interiors }) {
  const fade = document.createElement('div');
  fade.id = 'fade';
  // loading card on the fade: destination name + spinner
  fade.innerHTML = '<div class="fade-card"><i class="spin"></i><b></b></div>';
  const label = fade.querySelector('b');
  document.body.append(fade);
  let busy = false;

  const routes = {};
  for (const [name, w] of Object.entries(interiors)) {
    routes[w.door] = () => ({ to: name, at: w.spawn, yaw: Math.PI, cam: 0, preset: 'interior', label: t(`poi.${w.door}`) });
    routes[w.exit] = () => {
      const d = game.worlds.town.pois.find((p) => p.id === w.door);
      return d?.out
        ? { to: 'town', at: d.out, yaw: d.yaw, cam: d.yaw + Math.PI, preset: 'town', label: t('place.town') }
        : { to: 'town', at: game.worlds.town.spawn, yaw: 0, cam: Math.PI, preset: 'town', label: t('place.town') };
    };
  }

  on('interact', ({ poiId }) => {
    const r = routes[poiId]?.();
    if (!r || busy) return;
    busy = true;
    input.setEnabled(false);
    label.textContent = r.label;
    fade.classList.add('on');
    setTimeout(() => {
      const w = game.worlds[r.to];
      game.scenes[r.to].add(player.group); // re-parents out of the previous scene
      player.setWorld(w);
      player.teleport(r.at.x, r.at.z, r.yaw, r.cam);
      setActiveScene(game.scenes[r.to], r.preset);
      setSceneShadows(r.to === 'town');
      setOcclusionEnabled(r.to === 'town'); // dither see-through only outside
      setIndoor(player.group, r.to !== 'town'); // the kid's town materials sample the town sun shadow
      // lift the fade only after the new place has drawn (two frames), so nothing half-ready shows
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fade.classList.remove('on');
        setTimeout(() => { busy = false; input.setEnabled(true); }, FADE_MS);
      }));
    }, FADE_MS);
  });
}
