// Doors between the town and the interiors: 300 ms CSS fade, swap the active scene behind it, place
// the player. Entering: interior spawn. Leaving: just outside that building's town door, facing away.
import { on } from '../bus.js';
import { setSceneShadows, setIndoor } from './light.js';

const FADE_MS = 300;

// interiors: { bank: world, market: world } (each has .door and .exit POI ids)
export function initDoors({ game, player, input, setActiveScene, interiors }) {
  const fade = document.createElement('div');
  fade.id = 'fade';
  document.body.append(fade);
  let busy = false;

  const routes = {};
  for (const [name, w] of Object.entries(interiors)) {
    routes[w.door] = () => ({ to: name, at: w.spawn, yaw: Math.PI, cam: 0, preset: 'interior' });
    routes[w.exit] = () => {
      const d = game.worlds.town.pois.find((p) => p.id === w.door);
      return d?.out
        ? { to: 'town', at: d.out, yaw: d.yaw, cam: d.yaw + Math.PI, preset: 'town' }
        : { to: 'town', at: game.worlds.town.spawn, yaw: 0, cam: Math.PI, preset: 'town' };
    };
  }

  on('interact', ({ poiId }) => {
    const r = routes[poiId]?.();
    if (!r || busy) return;
    busy = true;
    input.setEnabled(false);
    fade.classList.add('on');
    setTimeout(() => {
      const w = game.worlds[r.to];
      game.scenes[r.to].add(player.group); // re-parents out of the previous scene
      player.setWorld(w);
      player.teleport(r.at.x, r.at.z, r.yaw, r.cam);
      setActiveScene(game.scenes[r.to], r.preset);
      setSceneShadows(r.to === 'town');
      setIndoor(player.group, r.to !== 'town'); // the kid's town materials sample the town sun shadow
      fade.classList.remove('on');
      setTimeout(() => { busy = false; input.setEnabled(true); }, FADE_MS);
    }, FADE_MS);
  });
}
