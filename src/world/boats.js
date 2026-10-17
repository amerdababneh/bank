// Boats from town.json "boats": parked ones moored near the shore and sailing ones on ellipse loops
// (kept clear of the bridge). All bob gently. GLBs from public/models/ships, sized by length.
// update(dt, t) moves them; no allocations per frame.
import { Group, Box3, Vector3, InstancedMesh, PlaneGeometry, Object3D } from 'three/webgpu';
import { litFromGltf } from './gltfmat.js';
import { makeBlobMaterial } from './light.js';

const WATER_Y = -0.8, SHADOW_W = 0.42; // shadow width as a share of the boat length
const tmp = new Object3D();

export const boatModelNames = (cfg) => [...new Set([...(cfg?.parked ?? []), ...(cfg?.sailing ?? [])].map((b) => b.model))];

// model laid out so its long axis runs along the holder's local +z (travel direction), base at y=0
function place(src, len, flip) {
  const m = litFromGltf(src.clone(true));
  const box = new Box3().setFromObject(m), size = box.getSize(new Vector3()), ctr = box.getCenter(new Vector3());
  const k = len / Math.max(0.01, size.x, size.z);
  const inner = new Group();
  m.scale.setScalar(k);
  m.position.set(-ctr.x * k, -box.min.y * k, -ctr.z * k);
  inner.add(m);
  inner.rotation.y = (size.x > size.z ? Math.PI / 2 : 0) + (flip ? Math.PI : 0);
  const holder = new Group();
  holder.add(inner);
  return holder;
}

export function createBoats(cfg, models) {
  const group = new Group(), live = [];
  (cfg?.parked ?? []).forEach((b, i) => {
    if (!models[b.model]) return;
    const h = place(models[b.model], b.len ?? 6, b.flip);
    h.position.set(b.x, WATER_Y, b.z);
    h.rotation.y = ((b.ry ?? 0) * Math.PI) / 180;
    group.add(h);
    live.push({ h, bob: i * 1.7, ry: h.rotation.y, path: null, len: b.len ?? 6 });
  });
  (cfg?.sailing ?? []).forEach((b, i) => {
    if (!models[b.model]) return;
    const h = place(models[b.model], b.len ?? 8, b.flip);
    group.add(h);
    live.push({ h, bob: i * 2.3 + 0.5, path: b, a: (b.start ?? i * 1.3), len: b.len ?? 8 });
  });

  // fake soft shadows on the water: one instanced oval per boat, following it (one draw call)
  const shadows = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), makeBlobMaterial(), Math.max(1, live.length));
  shadows.count = live.length;
  shadows.frustumCulled = false;
  shadows.renderOrder = 1;
  group.add(shadows);

  return {
    group,
    update(dt, t) {
      for (let i = 0; i < live.length; i++) {
        const L = live[i], { h, path } = L;
        if (path) { // ellipse loop: position + face along the tangent
          L.a += dt * (path.speed ?? 0.05) * (path.dir ?? 1);
          const s = Math.sin(L.a), c = Math.cos(L.a), d = path.dir ?? 1;
          h.position.x = path.cx + path.rx * c;
          h.position.z = path.cz + path.rz * s;
          h.rotation.y = Math.atan2(-path.rx * s * d, path.rz * c * d);
        }
        h.position.y = WATER_Y + Math.sin(t * 1.3 + L.bob) * 0.08;
        h.rotation.z = Math.sin(t * 0.9 + L.bob) * 0.03;
        h.rotation.x = Math.sin(t * 0.7 + L.bob * 1.3) * 0.02;
        tmp.position.set(h.position.x + 0.6, WATER_Y + 0.03, h.position.z + 0.4); // nudged toward the sun's shadow side
        tmp.rotation.set(0, h.rotation.y, 0);
        tmp.scale.set(L.len * SHADOW_W, 1, L.len * 1.1);
        tmp.updateMatrix();
        shadows.setMatrixAt(i, tmp.matrix);
      }
      shadows.instanceMatrix.needsUpdate = true;
    },
  };
}
