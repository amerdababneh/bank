// Interiors (bank, supermarket, ...): a W x D room built from data/<name>.json — size, colours, the
// town door / exit POI ids, extra POIs and GLB furniture. Room spans x -W/2..W/2, z -D/2 (back wall)
// .. D/2 (entrance, camera side). The camera looks in from +z, so there is no front wall mesh.
import { Scene, Group, Mesh, BoxGeometry, PlaneGeometry, Box3, Vector3, Color, AnimationMixer } from 'three/webgpu';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { makeLit, litFromGltf, setupInteriorShadow, makeBlobMaterial } from './light.js';
import { makeInstanced } from './geo.js';

const WALL_H = 4.2, FLOOR_TOP = 0.12;

export const interiorModelNames = (layout) => [...new Set((layout?.items ?? []).map((it) => it.model))];
export const interiorNpcNames = (layout) => (layout?.npcs ?? []).map((n) => n.fbx);

// npcFbx: { name: FBX group } from loadFbx(); layout.npcs: [{ fbx, x, z, ry, h }]
export function buildInterior({ brand, layout, models = {}, npcFbx = {}, quality }) {
  const [W, D] = layout.size ?? [12, 16];
  const col = { wall: brand.colors.secondary, accent: brand.colors.primary, ...layout.colors };
  col.floor ??= new Color(col.wall).multiplyScalar(0.92).getStyle();
  const scene = new Scene();
  const shadowNode = setupInteriorShadow(scene, quality, W, D); // must exist before materials
  scene.background = new Color(col.accent).multiplyScalar(0.55);

  const group = new Group();
  const lit = (hex) => makeLit({ color: new Color(hex), shadows: !!shadowNode, shadowNode });
  const box = (hex, w, h, d, x, y, z) => {
    const m = new Mesh(new BoxGeometry(w, h, d), lit(hex));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    group.add(m);
  };
  box(col.floor, W, 1, D, 0, FLOOR_TOP - 0.5, 0);
  box(col.wall, W, WALL_H, 0.4, 0, WALL_H / 2, -D / 2 - 0.2);       // back wall
  box(col.wall, 0.4, WALL_H, D, -W / 2 - 0.2, WALL_H / 2, 0);       // side walls
  box(col.wall, 0.4, WALL_H, D, W / 2 + 0.2, WALL_H / 2, 0);
  box(col.accent, W, 0.35, 0.45, 0, 0.5, -D / 2 + 0.02);            // skirting
  scene.add(group);

  const furniture = furnish(layout, models, group, shadowNode);
  const mixers = placeNpcs(layout, npcFbx, group, shadowNode);
  if (!shadowNode && furniture.length) { // low tier: soft contact quads under the furniture
    const quad = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const spots = furniture.map((b) => ({ x: (b.min.x + b.max.x) / 2, y: FLOOR_TOP + 0.02, z: (b.min.z + b.max.z) / 2, sx: b.max.x - b.min.x + 0.8, sy: 1, sz: b.max.z - b.min.z + 0.8 }));
    group.add(makeInstanced(quad, makeBlobMaterial(), spots, false));
  }

  const colliders = [
    ...furniture,
    new Box3(new Vector3(-W / 2 - 2, 0, -D / 2 - 2), new Vector3(W / 2 + 2, 6, -D / 2)),
    new Box3(new Vector3(-W / 2 - 2, 0, -D / 2), new Vector3(-W / 2, 6, D / 2)),
    new Box3(new Vector3(W / 2, 0, -D / 2), new Vector3(W / 2 + 2, 6, D / 2)),
  ];
  const pois = [
    { id: layout.exit, pos: new Vector3(0, 0, D / 2 - 1.2), radius: 2 },
    ...(layout.pois ?? []).map((p) => ({ id: p.id, pos: new Vector3(p.x, 0, p.z), radius: p.r ?? 1.6 })),
  ];
  return {
    scene, group, colliders, pois, door: layout.door, exit: layout.exit,
    update(dt) { for (const m of mixers) m.update(dt); },
    bounds: { minX: -W / 2, maxX: W / 2, minZ: -D / 2, maxZ: D / 2 },
    groundAt: () => FLOOR_TOP,
    spawn: new Vector3(0, 0, D / 2 - 3.5),
  };
}

// Place each layout item: sized by h (height) or w (largest footprint side), rotated by ry degrees.
// Returns colliders (footprint boxes) for every item that is not walk:true.
function furnish(layout, models, group, shadowNode) {
  const out = [], box = new Box3(), size = new Vector3(), ctr = new Vector3();
  const yaw = layout?.yaw ?? 0;
  for (const it of layout?.items ?? []) {
    const src = models[it.model];
    if (!src) continue;
    const m = litFromGltf(src.clone(true), { shadows: !!shadowNode, shadowNode });
    m.traverse((o) => { o.castShadow = o.isMesh; });
    box.setFromObject(m).getSize(size);
    box.getCenter(ctr);
    const k = it.h ? it.h / Math.max(0.01, size.y) : (it.w ?? 1) / Math.max(0.01, size.x, size.z);
    m.scale.setScalar(k);
    m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
    const holder = new Group();
    holder.position.set(it.x, FLOOR_TOP + (it.y ?? 0), it.z);
    holder.rotation.y = (((it.ry ?? 0) + yaw) * Math.PI) / 180;
    holder.add(m);
    group.add(holder);
    if (!it.walk) {
      holder.updateMatrixWorld(true);
      const b = new Box3().setFromObject(holder);
      b.expandByScalar(-0.05);
      out.push(b);
    }
  }
  return out;
}

// Animated Mixamo NPCs (e.g. tellers typing at their desks). Sized from the bind pose to h metres;
// copies of the same clip start at different times so they don't move in sync.
function placeNpcs(layout, npcFbx, group, shadowNode) {
  const mixers = [], box = new Box3(), size = new Vector3();
  (layout.npcs ?? []).forEach((n, i) => {
    const src = npcFbx[n.fbx];
    if (!src) return;
    const m = litFromGltf(cloneSkinned(src), { shadows: !!shadowNode, shadowNode });
    m.traverse((o) => { o.frustumCulled = false; o.castShadow = o.isMesh; });
    box.setFromObject(m).getSize(size);
    m.scale.multiplyScalar((n.h ?? 1.75) / Math.max(0.01, size.y));
    m.position.set(n.x, FLOOR_TOP, n.z);
    m.rotation.y = ((n.ry ?? 0) * Math.PI) / 180;
    group.add(m);
    const clip = src.animations[0];
    if (!clip) return;
    const mixer = new AnimationMixer(m);
    mixer.clipAction(clip).play();
    mixer.setTime((i * 1.37) % clip.duration);
    mixers.push(mixer);
  });
  return mixers;
}
