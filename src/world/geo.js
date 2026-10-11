// Static-geometry collector: primitives are baked with vertex colors in a local frame, then merged per
// material kind so the whole town is a handful of draw calls.
import {
  BoxGeometry, CylinderGeometry, SphereGeometry, BufferAttribute, Matrix4, Quaternion, Euler, Vector3, Color, Mesh, Group, InstancedMesh,
} from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const protos = new Map();
const proto = (key, make) => {
  let g = protos.get(key);
  if (!g) protos.set(key, (g = make()));
  return g;
};

export function createBatch() {
  const parts = {};
  const frame = { x: 0, z: 0, ry: 0 };
  const M = new Matrix4(), L = new Matrix4(), Q = new Quaternion(), E = new Euler(), S = new Vector3(), P = new Vector3(), C = new Color();
  const out = { x: 0, z: 0 };

  function push(kind, g0, hex, x, y, z, sx, sy, sz, ry, rx) {
    L.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, 0, 'YXZ')), S.set(sx, sy, sz));
    M.makeRotationY(frame.ry).setPosition(frame.x, 0, frame.z).multiply(L);
    const g = g0.clone().applyMatrix4(M);
    g.deleteAttribute('uv');
    C.set(hex);
    const n = g.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = C.r;
      a[i * 3 + 1] = C.g;
      a[i * 3 + 2] = C.b;
    }
    g.setAttribute('color', new BufferAttribute(a, 3));
    (parts[kind] ??= []).push(g);
  }

  return {
    frame,
    // Local frame: origin at (x, z) in the world, +z points toward the facade, rotated by ry about Y.
    at(x, z, ry = 0) {
      frame.x = x;
      frame.z = z;
      frame.ry = ry;
    },
    // Local (lx, lz) -> world {x, z}. Returns a shared object; copy values out immediately.
    world(lx, lz) {
      const c = Math.cos(frame.ry), s = Math.sin(frame.ry);
      out.x = frame.x + lx * c + lz * s;
      out.z = frame.z - lx * s + lz * c;
      return out;
    },
    // y is the BOTTOM of the box; ry/rx rotate about its center.
    box: (kind, hex, x, y, z, w, h, d, ry = 0, rx = 0) =>
      push(kind, proto('box', () => new BoxGeometry(1, 1, 1)), hex, x, y + h / 2, z, w, h, d, ry, rx),
    cyl: (kind, hex, x, y, z, rt, rb, h, seg = 8) =>
      push(kind, proto(`cyl${seg}_${rt}_${rb}`, () => new CylinderGeometry(rt, rb, 1, seg)), hex, x, y + h / 2, z, 1, h, 1, 0, 0),
    sph: (kind, hex, x, y, z, r, sy = 1, seg = 8) =>
      push(kind, proto(`sph${seg}`, () => new SphereGeometry(1, seg, (seg * 0.75) | 0)), hex, x, y, z, r, r * sy, r, 0, 0),
    merged(kind) {
      const list = parts[kind];
      if (!list?.length) return null;
      parts[kind] = null;
      return mergeGeometries(list, false);
    },
    // materials: { kind: Material }. Returns a Group; 'lit' meshes cast shadows.
    build(materials) {
      const group = new Group();
      for (const kind of Object.keys(parts)) {
        const geo = this.merged(kind);
        if (!geo) continue;
        const mesh = new Mesh(geo, materials[kind]);
        mesh.name = kind;
        mesh.castShadow = kind === 'lit';
        group.add(mesh);
      }
      return group;
    },
  };
}

// transforms: [{ x, y, z, ry, s }] -> InstancedMesh (one draw call).
export function makeInstanced(geometry, material, transforms, cast = true) {
  const mesh = new InstancedMesh(geometry, material, transforms.length);
  const m = new Matrix4(), q = new Quaternion(), p = new Vector3(), s = new Vector3(), up = new Vector3(0, 1, 0);
  transforms.forEach((t, i) => {
    const k = t.s ?? 1;
    m.compose(p.set(t.x, t.y ?? 0, t.z), q.setFromAxisAngle(up, t.ry ?? 0), s.set(t.sx ?? k, t.sy ?? k, t.sz ?? k));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.frustumCulled = false;
  return mesh;
}
