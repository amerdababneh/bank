// Builds the town from data/town.json (ASCII grid) + data/tiles.json (char -> builder).
// Returns { group, colliders, pois, bounds, spawn, anchors, water, size }.
import { Group, Box3, Vector3, PlaneGeometry } from 'three/webgpu';
import { createBatch, makeInstanced } from './geo.js';
import { makeLit, makeUnlit, makeBlobMaterial } from './light.js';
import { makeWater } from './water.js';
import { litFromGltf } from './gltfmat.js';
import { makeSign } from './signs.js';
import { palmGeometries, lampGeometry } from './props.js';
import { road, corniche, bridge } from './grounds.js';
import { streetDetails } from './details.js';
import { souq, bakery, karak, store } from './buildings.js';
import { bank } from './bankfront.js';
import { skyline } from './skyline.js';
import { t } from '../i18n.js';
import { scatter, instanceModel } from './scatter.js';
import { createTerrain } from './terrain.js';

const BUILDERS = { road, corniche, bridge, souq, bakery, karak, store, bank, skyline };
// facade direction -> rotation about Y; +z (south) faces the camera
const FACES = { S: 0, W: -Math.PI / 2, E: Math.PI / 2, N: Math.PI };
const AUTO_ORDER = ['S', 'W', 'E', 'N'];
const APRON = 300;

// Walkable area = bounding box of every non-void tile.
// non-void tiles (shadow map area); walkOnly: walkable tiles incl. ones over water (player area)
export function computeBounds(town, tiles, walkOnly = false) {
  const T = town.tile, xs = [], zs = [];
  town.map.forEach((row, z) => [...row].forEach((ch, x) => { if (walkOnly ? tiles.tiles[ch]?.walk : !tiles.tiles[ch]?.void) { xs.push(x); zs.push(z); } }));
  return { minX: Math.min(...xs) * T, maxX: (Math.max(...xs) + 1) * T, minZ: Math.min(...zs) * T, maxZ: (Math.max(...zs) + 1) * T };
}

// tiles.json: useModels:false = backup (all procedural). model: name or [names] (picked per building).
export const modelNames = (tiles) => (tiles.useModels === false ? [] : [
  ...Object.values(tiles.tiles).flatMap((d) => [d.model ?? [], d.skyModels ?? []].flat()),
  ...(tiles.scatter?.items ?? []).map((it) => it.model),
  ...(tiles.details?.cars?.models ?? []),
]);

export function buildTown({ town, tiles, brand, quality, models = {} }) {
  const T = town.tile, rows = town.map, D = rows.length, W = rows[0].length;
  const defs = tiles.tiles, grounds = tiles.grounds;
  const group = new Group();
  const b = createBatch();
  const materials = { lit: makeLit({ vertexColors: true }), unlit: makeUnlit(), water: null }; // animated water is built once the shore line is known
  const palms = [], lamps = [], contacts = [], colliders = [], pois = [], anchors = {}, flags = [];
  let spawn = new Vector3(W * T / 2, 0, D * T / 2);

  const charAt = (x, z) => rows[z]?.[x];
  const def = (x, z) => defs[charAt(x, z)];
  const hash = (x, z) => Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  const box3 = (x0, z0, x1, z1, h = 6) => new Box3(new Vector3(x0, 0, z0), new Vector3(x1, h, z1));

  const c = {
    b, brand, materials, group, anchors, top: 0,
    is: (ch, x, z) => charAt(x, z) === ch,
    def,
    sign(text, w, h, lx, ly, lz, style) {
      const m = makeSign(text, w, h, style), p = b.world(lx, lz);
      m.position.set(p.x, ly, p.z);
      m.rotation.y = b.frame.ry;
      group.add(m);
    },
    anchor(name, lx, ly, lz) {
      const p = b.world(lx, lz);
      anchors[name] = new Vector3(p.x, ly, p.z);
    },
    palm(lx, lz) {
      const p = b.world(lx, lz), h = hash(p.x, p.z);
      palms.push({ x: p.x, y: c.top, z: p.z, ry: h * 6.28, s: 0.9 + h * 0.3 });
      colliders.push(box3(p.x - 0.4, p.z - 0.4, p.x + 0.4, p.z + 0.4));
      contacts.push({ x: p.x, z: p.z, sx: 3.2, sz: 3.2 });
    },
    lamp(lx, lz) {
      const p = b.world(lx, lz);
      lamps.push({ x: p.x, y: c.top, z: p.z, ry: 0 });
    },
  };

  // ground (one box per tile; water lives in its own material kind)
  const rect = (kind, hex, x0, z0, x1, z1, top, thick = 1) =>
    b.box(kind, hex, (x0 + x1) / 2, top - thick, (z0 + z1) / 2, x1 - x0, thick, z1 - z0);
  b.at(0, 0, 0);
  let waterEnd = 0;
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const d = def(x, z), g = grounds[d?.ground];
      if (!g) continue;
      const hex = Array.isArray(g.color) ? g.color[(x + z) & 1] : g.color;
      rect(d.water ? 'water' : 'lit', hex, x * T, z * T, (x + 1) * T, (z + 1) * T, g.top);
      if (d.water) waterEnd = Math.max(waterEnd, (z + 1) * T);
    }
  }
  const { land, water } = tiles.apron, A = APRON, MW = W * T, MD = D * T;
  rect('water', water, -A, -A, MW + A, waterEnd, grounds.water.top);
  rect('water', water, -A, waterEnd, 0, MD + A, grounds.water.top);
  rect('water', water, MW, waterEnd, MW + A, MD + A, grounds.water.top);
  rect('lit', land, 0, MD, MW, MD + A, 0.06);
  const BW = (tiles.beach?.width ?? 0) + 1.2; // foam laps at the outer edge of the beach (details.js)
  materials.water = makeWater(grounds.water.color, waterEnd - BW, -BW, MW + BW);

  // connected components of identical `span` letters become one building
  const seen = new Set();
  const comps = [];
  for (let z = 0; z < D; z++) {
    for (let x = 0; x < W; x++) {
      const ch = charAt(x, z), d = defs[ch];
      if (!d) { console.warn(`town: unknown tile '${ch}' at ${x},${z}`); continue; }
      if (seen.has(z * W + x)) continue;
      const cells = [[x, z]], stack = [[x, z]];
      seen.add(z * W + x);
      while (d.span && stack.length) {
        const [px, pz] = stack.pop();
        for (const [nx, nz] of [[px + 1, pz], [px - 1, pz], [px, pz + 1], [px, pz - 1]]) {
          if (charAt(nx, nz) !== ch || seen.has(nz * W + nx)) continue;
          seen.add(nz * W + nx);
          cells.push([nx, nz]);
          stack.push([nx, nz]);
        }
      }
      comps.push({ ch, d, cells });
    }
  }

  const walkable = (x, z) => !!def(x, z)?.walk;
  for (const { ch, d, cells } of comps) {
    const x0 = Math.min(...cells.map((p) => p[0])), x1 = Math.max(...cells.map((p) => p[0]));
    const z0 = Math.min(...cells.map((p) => p[1])), z1 = Math.max(...cells.map((p) => p[1]));
    const sides = {
      S: Array.from({ length: x1 - x0 + 1 }, (_, i) => walkable(x0 + i, z1 + 1)),
      N: Array.from({ length: x1 - x0 + 1 }, (_, i) => walkable(x0 + i, z0 - 1)),
      E: Array.from({ length: z1 - z0 + 1 }, (_, i) => walkable(x1 + 1, z0 + i)),
      W: Array.from({ length: z1 - z0 + 1 }, (_, i) => walkable(x0 - 1, z0 + i)),
    };
    const face = d.face ?? AUTO_ORDER.find((s) => sides[s].some(Boolean)) ?? 'S';
    const ry = FACES[face];
    const bw0 = (x1 - x0 + 1) * T, bd0 = (z1 - z0 + 1) * T, side = face === 'S' || face === 'N';
    const w = side ? bw0 : bd0, dep = side ? bd0 : bw0;
    const bd = Math.min(dep - 1.2, d.maxDepth ?? 99), bwid = Math.min(w - 1, d.maxWidth ?? 99);
    const r = {
      tx: x0, tz: z0, cx: ((x0 + x1 + 1) / 2) * T, cz: ((z0 + z1 + 1) / 2) * T, w, d: dep, bw: bwid, bd,
      zb: -dep / 2 + 0.6, zf: -dep / 2 + 0.6 + bd,
    };
    c.top = grounds[d.ground]?.top ?? 0;
    b.at(r.cx, r.cz, ry);
    const mName = Array.isArray(d.model) ? d.model[Math.floor(hash(r.cx, r.cz) * d.model.length)] : d.model;
    const model = tiles.useModels !== false && mName && models[mName];
    const sky = tiles.useModels !== false && d.skyModels?.map((n) => models[n]).filter(Boolean);
    let fit = null; // model buildings: doors and colliders follow the fitted model, not the whole plot
    if (sky?.length) {
      BUILDERS[d.build]?.(c, { ...d, marks: false }, r); // filler towers stay as a hazy back row
      placeSkyline(sky, r);
    } else if (model) {
      // tiles.modelYaw: whole pack; d.modelYaw: this tile only (e.g. 180 = keep the model, put door/sign behind)
      fit = placeModel(model, r, ry + (((tiles.modelYaw ?? 0) + (d.modelYaw ?? 0)) * Math.PI) / 180);
      const text = d.sign ? t(d.sign) : d.build === 'souq' ? t(`sign.souq.${1 + Math.floor(hash(r.cz, r.cx) * 5)}`) : null;
      // signAt { y, front, w, h, side } and signStyle { bg, fg, border } override the default placement/look
      const sa = d.signAt ?? {};
      if (text) c.sign(text, sa.w ?? Math.min(5, fit.w * 0.6), sa.h ?? 1.1, sa.side ?? 0, sa.y ?? Math.min(4, fit.h * 0.55), fit.front + (sa.front ?? 0.15), d.signStyle);
    } else BUILDERS[d.build]?.(c, d, r);
    if (d.palm) c.palm(0, 0);

    const zf = fit ? fit.front : r.zf;
    for (const f of d.flags ?? []) { const q = b.world(f.side, zf + f.front); flags.push({ x: q.x, z: q.z, ry }); }
    for (const p of d.pois ?? []) {
      const q = b.world(p.side, zf + p.front);
      const o = b.world(p.side, zf + p.front + 1.8); // where the player reappears when leaving an interior
      pois.push({ id: p.id, pos: new Vector3(q.x, 0, q.z), radius: p.r, out: new Vector3(o.x, 0, o.z), yaw: ry });
    }
    if (d.spawn) {
      const q = b.world(0, zf + d.spawn.front);
      spawn = new Vector3(q.x, 0, q.z);
    }
    if (d.solid && fit) {
      const bb = new Box3().setFromObject(fit.holder);
      colliders.push(box3(bb.min.x + 0.1, bb.min.z + 0.1, bb.max.x - 0.1, bb.max.z - 0.1));
      contacts.push({ x: (bb.min.x + bb.max.x) / 2, z: (bb.min.z + bb.max.z) / 2, sx: bb.max.x - bb.min.x + 3, sz: bb.max.z - bb.min.z + 3 });
    } else if (d.solid) {
      const xs = [], zs = [];
      for (const [lx, lz] of [[-bwid / 2, r.zb], [bwid / 2, r.zb], [-bwid / 2, r.zf], [bwid / 2, r.zf]]) {
        const q = b.world(lx, lz);
        xs.push(q.x);
        zs.push(q.z);
      }
      colliders.push(box3(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)));
      const q = b.world(0, (r.zb + r.zf) / 2);
      contacts.push({ x: q.x, z: q.z, sx: (side ? bwid : bd) + 3, sz: (side ? bd : bwid) + 3 });
    }
  }

  // GLB replaces the primitive building: fitted into the footprint, re-lit with fakeSun
  function placeModel(src, r, ry) {
    const m = litFromGltf(src.clone(true));
    const box = new Box3().setFromObject(m), size = box.getSize(new Vector3()), ctr = box.getCenter(new Vector3());
    const s = Math.min(r.bw / size.x, r.bd / size.z);
    m.scale.setScalar(s);
    m.position.set(-ctr.x * s, -box.min.y * s, (r.zb + r.zf) / 2 - ctr.z * s);
    m.traverse((o) => { o.castShadow = o.isMesh; });
    const holder = new Group();
    holder.position.set(b.frame.x, 0, b.frame.z);
    holder.rotation.y = ry;
    holder.add(m);
    group.add(holder);
    return { holder, w: size.x * s, h: size.y * s, front: (r.zb + r.zf) / 2 + (size.z * s) / 2 };
  }

  // skyscraper models spread along the skyline strip, in front of the filler towers
  function placeSkyline(list, r) {
    const n = Math.max(3, Math.round(r.w / 14));
    for (let i = 0; i < n; i++) {
      const x = r.cx - r.w / 2 + ((i + 0.5) / n) * r.w + (hash(i, 9) - 0.5) * 4;
      if ((town.landmarks ?? []).some((l) => Math.abs(x - l.x) < (l.clear ?? 14))) continue; // landmark tower spots
      const src = list[Math.floor(hash(i, r.cz) * list.length)];
      const m = litFromGltf(src.clone(true));
      const box = new Box3().setFromObject(m), size = box.getSize(new Vector3()), ctr = box.getCenter(new Vector3());
      const s = (26 + hash(i + 3, 7) * 22) / size.y; // 26-48 m tall
      m.scale.setScalar(s);
      m.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
      const holder = new Group();
      holder.position.set(x, 0, r.cz + 3 + (hash(i, 5) - 0.5) * 3);
      holder.rotation.y = ((tiles.modelYaw ?? 0) * Math.PI) / 180;
      group.add(holder.add(m));
    }
  }

  const terrain = createTerrain({ town, tiles }), { heightAt } = terrain; // gentle hills on "hill" tiles
  if (terrain.mesh) group.add(terrain.mesh);
  streetDetails({ b, c, rows, defs, T, grounds, models, pois, colliders, contacts, group, town, quality, heightAt, cfg: tiles.details, tilesCfg: tiles });

  const built = b.build(materials);
  group.add(built);

  // instanced palms / lamps; low tier gets fake contact-shadow quads instead of a shadow map
  if (tiles.useModels !== false) scatter({ cfg: tiles.scatter, rows, defs, T, grounds, models, pois, spawn, group, colliders, contacts, heightAt });

  if (palms.length && models.palm) instanceModel(models.palm, palms, tiles.palm?.h ?? 6.5, group, { sway: true, grad: tiles.palm?.h ?? 6.5, recolor: tiles.palm?.colors }); // FBX palm
  else if (palms.length) {
    const g = palmGeometries(), swayMat = makeLit({ vertexColors: true, sway: true });
    group.add(makeInstanced(g.trunk, swayMat, palms), makeInstanced(g.crown, swayMat, palms));
  }
  if (lamps.length) group.add(makeInstanced(lampGeometry(), materials.lit, lamps));
  if (!quality.shadows && contacts.length) {
    group.add(makeInstanced(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), makeBlobMaterial(), contacts.map((p) => ({ ...p, y: 0.1, sy: 1 })), false));
  }

  const bounds = computeBounds(town, tiles, true); // walkable area
  const groundAt = (x, z) => (grounds[def(Math.floor(x / T), Math.floor(z / T))?.ground]?.top ?? 0) + heightAt(x, z);
  const walkableAt = (x, z) => !!def(Math.floor(x / T), Math.floor(z / T))?.walk;
  return { group, colliders, pois, bounds, spawn, groundAt, walkableAt, anchors, flags, water: built.getObjectByName('water'), size: { w: MW, d: MD } };
}
