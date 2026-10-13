// bank_door / bank_exit: 300 ms CSS fade, swap the active scene behind it, place the player at the spawn.
import { on } from '../bus.js';
import { setSceneShadows } from './light.js';

const FADE_MS = 300;
const ROUTES = {
  bank_door: { to: 'bank', preset: 'interior', yaw: Math.PI, cam: 0 },
  bank_exit: { to: 'town', preset: 'town', yaw: 0, cam: Math.PI },
};

export function initDoors({ game, player, input, setActiveScene }) {
  const fade = document.createElement('div');
  fade.id = 'fade';
  document.body.append(fade);
  let busy = false;

  on('interact', ({ poiId }) => {
    const r = ROUTES[poiId];
    if (!r || busy) return;
    busy = true;
    input.setEnabled(false);
    fade.classList.add('on');
    setTimeout(() => {
      const w = game.worlds[r.to];
      game.scenes[r.to].add(player.group); // re-parents out of the previous scene
      player.setWorld(w);
      player.teleport(w.spawn.x, w.spawn.z, r.yaw, r.cam);
      setActiveScene(game.scenes[r.to], r.preset);
      setSceneShadows(r.to === 'town');
      fade.classList.remove('on');
      setTimeout(() => { busy = false; input.setEnabled(true); }, FADE_MS);
    }, FADE_MS);
  });
}
