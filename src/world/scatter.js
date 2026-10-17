// Random props (trees, planters) on open tiles, from tiles.json "scatter". One InstancedMesh per
// model part, so many props cost a few draw calls. Keeps clear of POIs, the spawn and tile centres
// that already hold a palm.
import { Box3, Vector3 } from 'three/webgpu';
import { makeInstanced } from './geo.js';
import { litFromGltf } from './gltfmat.js';

const _box = new Box3(), _size = new Vector3();

// cfg: { on: ["."], perTile, chance, clear, items: [{ model, h, r, notOn? }] }
export function scatter({ cfg, rows, defs, T, grounds, models, pois, spawn, group, colliders, contacts, heightAt = () => 0 }) {
  if (!cfg) return;
  const items = cfg.items.filter((it) => models[it.model]);
  if (!items.length) return;
  const rnd = (a, b) => Math.abs(Math.sin(a * 91.17 + b * 47.53) * 43758.5453) % 1;
  const clear = cfg.clear ?? 3.5;
  const blocked = [spawn, ...pois.map((p) => p.pos)];
  const placed = items.map(() => []);

  rows.forEach((row, z) => [...row].forEach((ch, x) => {
    if (!cfg.on.includes(ch)) return;
    const top = grounds[defs[ch].ground]?.top ?? 0;
    for (let k = 0; k < (cfg.perTile ?? 1); k++) {
      if (rnd(x * 7 + k, z * 3 + k) > (cfg.chance ?? 0.5)) continue;
      const px = (x + 0.15 + rnd(x + k, z) * 0.7) * T, pz = (z + 0.15 + rnd(z + k, x + 5) * 0.7) * T;
      if (defs[ch].palm && Math.hypot(px - (x + 0.5) * T, pz - (z + 0.5) * T) < 2.2) continue;
      if (blocked.some((b) => Math.hypot(b.x - px, b.z - pz) < clear)) continue;
      // notOn: tile letters an item must not appear on (e.g. no planters on the hills)
      const ok = items.filter((x) => !x.notOn?.includes(ch));
      if (!ok.length) continue;
      const it = ok[Math.floor(rnd(px, pz) * ok.length)], i = items.indexOf(it);
      placed[i].push({ x: px, y: top + heightAt(px, pz), z: pz, ry: rnd(pz, px) * 6.28, s: 0.85 + rnd(px + 1, pz) * 0.3 });
      blocked.push({ x: px, z: pz });
      const r = it.r ?? 0.4;
      colliders.push(new Box3(new Vector3(px - r, 0, pz - r), new Vector3(px + r, 4, pz + r)));
      contacts.push({ x: px, z: pz, sx: r * 6, sz: r * 6 });
    }
  }));

  items.forEach((it, i) => { if (placed[i].length) instanceModel(models[it.model], placed[i], it.h ?? 2, group); });
}

// Normalise a model to h metres tall and bake each mesh part into its own InstancedMesh at the
// given transforms. opts.sway: wind sway (palms). Used for trees/planters and the FBX palm.
export function instanceModel(model, transforms, h, group, opts = {}) {
  const src = litFromGltf(model.clone(true), opts);
  src.updateMatrixWorld(true);
  const k = h / Math.max(0.01, _box.setFromObject(src).getSize(_size).y);
  const minY = _box.min.y;
  src.traverse((m) => {
    if (!m.isMesh) return;
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld).translate(0, -minY, 0).scale(k, k, k);
    group.add(makeInstanced(geo, m.material, transforms));
  });
}
