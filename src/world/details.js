// Street dressing, all driven by data (tiles.json "details", town.json "crossings"/"islands"):
// white kerbs where road meets pavement or lawn, zebra crossings, street lamps, parked cars,
// swaying grass tufts on lawn tiles and low islands on the horizon.
import { Box3, Vector3, Group, Mesh, Color, BufferGeometry, BufferAttribute, ConeGeometry, DodecahedronGeometry } from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeInstanced } from './geo.js';
import { makeLit } from './light.js';
import { litFromGltf } from './gltfmat.js';

const KERB = '#f4f4ef', STRIPE = '#f7f7f2', RAIL = '#f2efe8';
const rnd = (a, b) => Math.abs(Math.sin(a * 91.17 + b * 47.53) * 43758.5453) % 1;

// ctx: { b, c, rows, defs, T, grounds, models, pois, colliders, contacts, group, town, cfg, quality }
export function streetDetails(ctx) {
  const { b, rows, defs, T, cfg = {} } = ctx;
  const ch = (x, z) => rows[z]?.[x];
  const isRoad = (x, z) => ch(x, z) === 'R';
  const open = (x, z) => !!defs[ch(x, z)]?.walk && !isRoad(x, z);
  const nearPoi = (x, z, d) => ctx.pois.some((p) => Math.hypot(p.pos.x - x, p.pos.z - z) < d);
  b.at(0, 0, 0);

  // kerbs + lamps along road edges that face pavement/lawn
  const crossings = new Set((ctx.town.crossings ?? []).map(([x, z]) => `${x},${z}`));
  const lamps = [];
  rows.forEach((row, z) => [...row].forEach((c, x) => {
    if (c !== 'R') return;
    const cx = (x + 0.5) * T, cz = (z + 0.5) * T;
    for (const [nx, nz, ex, ez] of [[x + 1, z, 1, 0], [x - 1, z, -1, 0], [x, z + 1, 0, 1], [x, z - 1, 0, -1]]) {
      if (!open(nx, nz)) continue;
      const kx = cx + ex * (T / 2 - 0.15), kz = cz + ez * (T / 2 - 0.15);
      b.box('lit', KERB, kx, 0, kz, ex ? 0.3 : T, 0.16, ez ? 0.3 : T);
      if (cfg.lamps && (x + z) % 3 === 0 && !nearPoi(kx, kz, 3)) {
        lamps.push({ x: kx - ex * 0.35, z: kz - ez * 0.35, ry: Math.atan2(-ex, -ez) });
      }
    }
    // zebra crossing: stripes across the road's running direction
    if (crossings.has(`${x},${z}`)) {
      const alongX = isRoad(x - 1, z) || isRoad(x + 1, z);
      for (let i = -3; i <= 3; i++) {
        if (alongX) b.box('lit', STRIPE, cx + i * 0.9, 0, cz, 0.5, 0.035, T * 0.62);
        else b.box('lit', STRIPE, cx, 0, cz + i * 0.9, T * 0.62, 0.035, 0.5);
      }
    }
  }));
  for (const l of lamps) {
    ctx.c.lamp(l.x, l.z);
    ctx.colliders.push(new Box3(new Vector3(l.x - 0.15, 0, l.z - 0.15), new Vector3(l.x + 0.15, 4, l.z + 0.15)));
  }

  parkedCars(ctx, isRoad, open, crossings, nearPoi);
  grassTufts(ctx);
  seaFence(ctx);
  beach(ctx);
  islands(ctx);
}

// cars parked along straight road tiles that have a kerb, parallel to the road
function parkedCars(ctx, isRoad, open, crossings, nearPoi) {
  const cfg = ctx.cfg.cars;
  const list = (cfg?.models ?? []).map((n) => ctx.models[n]).filter(Boolean);
  if (!list.length) return;
  const { rows, T } = ctx, box = new Box3(), size = new Vector3(), ctr = new Vector3();
  rows.forEach((row, z) => [...row].forEach((c, x) => {
    if (c !== 'R' || crossings.has(`${x},${z}`) || rnd(x * 3, z * 7) > (cfg.chance ?? 0.3)) return;
    const alongX = isRoad(x - 1, z) && isRoad(x + 1, z), alongZ = isRoad(x, z - 1) && isRoad(x, z + 1);
    if (alongX === alongZ) return; // only straight stretches
    const side = alongX ? (open(x, z + 1) ? 1 : open(x, z - 1) ? -1 : 0) : (open(x + 1, z) ? 1 : open(x - 1, z) ? -1 : 0);
    if (!side) return;
    const px = (x + 0.5) * T + (alongX ? 0 : side * 2.4), pz = (z + 0.5) * T + (alongX ? side * 2.4 : 0);
    if (nearPoi(px, pz, 4)) return;
    const m = litFromGltf(list[Math.floor(rnd(x, z) * list.length)].clone(true), { glassy: true }); // sky reflections in the windows
    box.setFromObject(m).getSize(size);
    box.getCenter(ctr);
    const k = (cfg.length ?? 4.2) / Math.max(0.01, size.x, size.z);
    m.scale.setScalar(k);
    m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    m.traverse((o) => { o.castShadow = o.isMesh; });
    const holder = new Group();
    holder.position.set(px, 0, pz);
    holder.rotation.y = (size.x > size.z ? 0 : Math.PI / 2) + (alongX ? 0 : Math.PI / 2) + (rnd(z, x) > 0.5 ? Math.PI : 0);
    holder.add(m);
    ctx.group.add(holder);
    holder.updateMatrixWorld(true);
    const bb = new Box3().setFromObject(holder);
    ctx.colliders.push(bb.expandByScalar(-0.1));
    ctx.contacts.push({ x: px, z: pz, sx: bb.max.x - bb.min.x + 1, sz: bb.max.z - bb.min.z + 1 });
  }));
}

// small 3-blade grass clumps on lawn tiles, swaying in the wind (one instanced draw call)
function grassTufts(ctx) {
  const cfg = ctx.cfg.grass;
  if (!cfg) return;
  const { rows, defs, T, grounds } = ctx, spots = [];
  const per = Math.round((cfg.perTile ?? 40) * ({ low: 0.4, mid: 0.7 }[ctx.quality.tier] ?? 1));
  rows.forEach((row, z) => [...row].forEach((c, x) => {
    if (defs[c]?.ground !== 'grass') return;
    const top = grounds.grass.top;
    for (let i = 0; i < per; i++) {
      const px = (x + rnd(x * 13 + i, z)) * T, pz = (z + rnd(z * 17 + i, x + 3)) * T;
      if (defs[c].palm && Math.hypot(px - (x + 0.5) * T, pz - (z + 0.5) * T) < 1.2) continue;
      if (ctx.pois.some((p) => Math.hypot(p.pos.x - px, p.pos.z - pz) < 1.5)) continue;
      spots.push({ x: px, y: top + (ctx.heightAt?.(px, pz) ?? 0), z: pz, ry: rnd(px, pz) * 6.28, s: 0.7 + rnd(pz, px) * 0.6 });
    }
  }));
  if (!spots.length) return;
  const blade = (rz, ox) => new ConeGeometry(0.05, 0.38, 3).translate(ox, 0.19, 0).rotateZ(rz);
  const geo = mergeGeometries([blade(0, 0), blade(0.35, 0.05), blade(-0.35, -0.05)]);
  ctx.group.add(makeInstanced(geo, makeLit({ color: cfg.color ?? '#4fae3c', sway: 0.4 }), spots, false));
}

// low islands on the horizon (sand rim + green top), from town.json "islands": [{ x, z, r }]
function islands(ctx) {
  const { b } = ctx;
  b.at(0, 0, 0);
  for (const i of ctx.town.islands ?? []) {
    b.sph('lit', '#e8d7a8', i.x, -1.2, i.z, i.r, 0.16, 12);
    b.sph('lit', '#6cc35a', i.x, -0.2, i.z, i.r * 0.82, 0.22, 12);
    if (i.hill) b.sph('lit', '#58b04a', i.x + i.r * 0.15, 0, i.z, i.r * 0.45, 0.6, 10);
  }
}

// railing along the west/east edges of the town where the land meets the sea (the corniche has its own)
function seaFence(ctx) {
  const { b, rows, defs, T, grounds } = ctx;
  const z0 = rows.findIndex((r) => [...r].some((c) => defs[c]?.walk)) * T, z1 = rows.length * T;
  if (z0 < 0) return;
  b.at(0, 0, 0);
  for (const x of [0.2, rows[0].length * T - 0.2]) {
    for (let z = z0 + 1; z < z1; z += 2) {
      const tile = defs[rows[Math.floor(z / T)]?.[Math.floor(x / T)]];
      const y = (grounds[tile?.ground]?.top ?? 0) + (ctx.heightAt?.(x, z) ?? 0);
      b.box('lit', RAIL, x, y, z, 0.12, 1.0, 0.12);                  // post
      b.box('lit', RAIL, x, y + 0.92, z, 0.14, 0.1, 2.02);           // top rail
      b.box('lit', RAIL, x, y + 0.45, z, 0.1, 0.08, 2.02);           // middle rail
    }
  }
}

// Narrow, unreachable beach outside the railing (north shore + both side coasts): dry sand, a darker
// wet strip at the waterline and a few low-poly rocks. tiles.json "beach": { width, sand, wet, rocks }.
function beach(ctx) {
  const cfg = ctx.tilesCfg?.beach;
  if (!cfg) return;
  const { b, rows, defs, T } = ctx, B = cfg.width ?? 3.5, WET = 1.2;
  const z0 = rows.findIndex((r) => [...r].some((c) => defs[c]?.walk)) * T, z1 = rows.length * T, W = rows[0].length * T;
  if (z0 < 0) return;
  ctx.group.add(beachMesh(cfg, B, WET, W, z0, z1));

  // rocks: flattened dodecahedrons scattered along the beach (one instanced draw call)
  const rocks = [], n = cfg.rocks ?? 40;
  const len = W + 2 * (z1 - z0); // north strip, then the west and east strips
  for (let i = 0; i < n; i++) {
    let u = rnd(i, 7) * len, x, z;
    const across = -B * 0.15 - rnd(i, 3) * (B * 0.75 + WET * 0.6); // how far out from the land edge
    if (u < W) { x = u; z = z0 + across; }
    else if ((u -= W) < z1 - z0) { x = across; z = z0 + u; }
    else { x = W - across; z = z0 + u - (z1 - z0); }
    const s = 0.35 + rnd(i, 11) * 0.9;
    rocks.push({ x, y: -0.35, z, ry: rnd(i, 5) * 6.28, sx: s * 1.3, sy: s * 0.7, sz: s });
  }
  ctx.group.add(makeInstanced(new DodecahedronGeometry(1, 0), makeLit({ color: cfg.rock ?? '#9ba4ae' }), rocks));
}

// One sloped mesh following the land outline (west side up, north shore, east side down) with
// rounded corners. Dry-sand and wet-sand outer edges ripple with a gentle wave instead of straight lines.
function beachMesh(cfg, B, WET, W, z0, z1) {
  const pts = []; // { x, z, nx, nz, s }
  let s = 0;
  const push = (x, z, nx, nz) => {
    const p = pts.at(-1);
    if (p) s += Math.hypot(x - p.x, z - p.z);
    pts.push({ x, z, nx, nz, s });
  };
  for (let z = z1; z > z0; z -= 1) push(0, z, -1, 0);                      // west side, heading north
  for (let k = 0; k <= 6; k++) { const a = Math.PI + (k / 6) * Math.PI / 2; push(0, z0, Math.cos(a), Math.sin(a)); } // corner
  for (let x = 1; x < W; x += 1) push(x, z0, 0, -1);                        // north shore
  for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + (k / 6) * Math.PI / 2; push(W, z0, Math.cos(a), Math.sin(a)); }
  for (let z = z0 + 1; z <= z1; z += 1) push(W, z, 1, 0);                   // east side, heading south

  const wave = (u, o) => 0.75 * Math.sin(u * 0.21 + o) + 0.4 * Math.sin(u * 0.53 + o * 2.3);
  const rings = [[0, -0.26, cfg.sand], [null, -0.42, cfg.sand], [null, -0.74, cfg.wet]];
  const n = pts.length, pos = new Float32Array(n * 3 * 3), col = new Float32Array(n * 3 * 3), c = new Color();
  pts.forEach((p, i) => {
    const dry = B + wave(p.s, 0.0), wet = dry + WET + wave(p.s, 1.7) * 0.6;
    [0, dry, wet].forEach((d, r) => {
      const o = (i * 3 + r) * 3;
      pos[o] = p.x + p.nx * d; pos[o + 1] = rings[r][1]; pos[o + 2] = p.z + p.nz * d;
      c.set(rings[r][2]).toArray(col, o);
    });
  });
  const idx = [];
  for (let i = 0; i < n - 1; i++) {
    for (let r = 0; r < 2; r++) {
      const a = i * 3 + r, b2 = a + 1, c2 = a + 3, d = a + 4;
      idx.push(a, c2, b2, b2, c2, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, makeLit({ vertexColors: true, side: 2 }));
  mesh.receiveShadow = true;
  return mesh;
}
