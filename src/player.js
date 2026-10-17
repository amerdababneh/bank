// Player: movement (4 m/s), circle-vs-AABB collision with sliding, camera follow, POI detection.
import { Group, Mesh, Vector3, PlaneGeometry } from 'three/webgpu';
import { createAvatar } from './avatar.js';
import { makeBlobMaterial, setOcclusionFocus, updateKidShadow, fxU, PLAYER_LAYER, sceneShadowsOn } from './world/light.js';
import { emit } from './bus.js';

const SPEED = 2.8, RADIUS = 0.35, TURN = 14, SCALE = 0.7;
const TAU = Math.PI * 2, CAM_FOLLOW = 2.2;
const wrap = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };

export function createPlayer({ input, rig, glbs, anims }) {
  const group = new Group();
  group.scale.setScalar(SCALE);
  const pos = new Vector3();
  const blob = new Mesh(new PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), makeBlobMaterial());
  blob.position.y = 0.05; // ~3 cm after scale: clear of the ground without visibly floating
  group.add(blob);
  let avatar = null, look = null, world = { colliders: [], pois: [], bounds: null };
  let yaw = 0, poiId = null, stuck = 0;

  // outlined: the avatar only (never the blob quad); kept as one array the outline pass reads live
  const p = { group, pos, feet: new Vector3(), speed: 0, outlined: [], avatar: () => avatar };

  // player-only layer: excluded from the baked sun shadow, rendered into the kid shadow map
  const markLayer = () => group.traverse((o) => { o.layers.set(PLAYER_LAYER); o.castShadow = o.isMesh && o !== blob; });
  p.markLayer = markLayer;

  p.setLook = (gender, color) => {
    avatar?.dispose();
    look = { gender, color };
    avatar = createAvatar({ gender, color, glbs, anims });
    group.add(avatar.root);
    p.outlined[0] = avatar.root;
    markLayer();
  };
  p.setWorld = (w) => { world = w; poiId = null; };
  p.teleport = (x, z, ry = yaw, camYaw) => {
    pos.set(x, 0, z);
    yaw = ry;
    if (camYaw !== undefined && rig.mode !== 'top') rig.yaw = camYaw; // top view stays facing north
    stuck = 0;
    input.hasTarget = false;
    group.position.set(x, world.groundAt?.(x, z) ?? 0, z);
    group.rotation.y = yaw;
    rig.target.set(x, group.position.y, z); // camera rises with the ground (hills)
  };

  // push the circle out of every box (two passes handle corners); the push is the slide
  function resolve() {
    for (let i = 0; i < 2; i++) {
      for (const b of world.colliders) {
        const cx = Math.max(b.min.x, Math.min(pos.x, b.max.x)), cz = Math.max(b.min.z, Math.min(pos.z, b.max.z));
        const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), k = (RADIUS - d) / d;
          pos.x += dx * k;
          pos.z += dz * k;
        } else { // centre inside the box: leave through the nearest face
          const l = pos.x - b.min.x, r = b.max.x - pos.x, t = pos.z - b.min.z, f = b.max.z - pos.z, m = Math.min(l, r, t, f);
          if (m === l) pos.x = b.min.x - RADIUS;
          else if (m === r) pos.x = b.max.x + RADIUS;
          else if (m === t) pos.z = b.min.z - RADIUS;
          else pos.z = b.max.z + RADIUS;
        }
      }
    }
    const bd = world.bounds;
    if (bd) {
      pos.x = Math.max(bd.minX + RADIUS, Math.min(pos.x, bd.maxX - RADIUS));
      pos.z = Math.max(bd.minZ + RADIUS, Math.min(pos.z, bd.maxZ - RADIUS));
    }
  }

  p.update = (dt) => {
    input.read();
    let dx = 0, dz = 0, amt = 0;
    const mag = Math.hypot(input.x, input.y);
    if (mag > 0) {
      const c = Math.cos(rig.yaw), s = Math.sin(rig.yaw); // screen axes -> world, relative to camera yaw
      dx = (c * input.x + s * input.y) / mag;
      dz = (-s * input.x + c * input.y) / mag;
      amt = Math.min(1, mag);
      input.hasTarget = false;
    } else if (input.hasTarget) {
      const tx = input.tx - pos.x, tz = input.tz - pos.z, d = Math.hypot(tx, tz);
      if (d < 0.2) input.hasTarget = false;
      else { dx = tx / d; dz = tz / d; amt = Math.min(1, d / 0.6); }
    }

    let speed = 0;
    if (amt > 0 && dt > 0) {
      const px = pos.x, pz = pos.z, want = SPEED * amt * dt;
      pos.x += dx * want;
      pos.z += dz * want;
      resolve();
      // stay on walkable ground (e.g. on the bridge deck, not the water around it): undo the blocked axis
      if (world.walkableAt && !world.walkableAt(pos.x, pos.z)) {
        if (world.walkableAt(px, pos.z)) pos.x = px;
        else if (world.walkableAt(pos.x, pz)) pos.z = pz;
        else pos.set(px, 0, pz);
      }
      const moved = Math.hypot(pos.x - px, pos.z - pz);
      speed = moved / dt;
      if (input.hasTarget) { // give up on a tap target that is blocked
        stuck = moved < want * 0.3 ? stuck + dt : 0;
        if (stuck > 0.35) { input.hasTarget = false; stuck = 0; }
      }
      yaw += wrap(Math.atan2(dx, dz) - yaw) * Math.min(1, TURN * dt);
      // 3rd-person follow: the camera swings in behind the kid; not while walking back toward it (no spin)
      const back = mag > 0 ? Math.max(0, input.y / mag) : 0;
      if (rig.mode !== 'top') rig.yaw += wrap(yaw + Math.PI - rig.yaw) * Math.min(1, CAM_FOLLOW * dt * amt * (1 - back));
    }
    const gy = world.groundAt?.(pos.x, pos.z) ?? 0;
    group.position.set(pos.x, gy, pos.z);
    setOcclusionFocus(pos.x, gy + 0.8, pos.z);
    updateKidShadow(pos.x, gy, pos.z);
    blob.visible = fxU.kidShadow.value < 0.5 || !sceneShadowsOn(); // indoors: no kid shadow map -> blob
    p.feet.set(pos.x, gy, pos.z);
    p.speed = speed;
    group.rotation.y = yaw;
    avatar?.update(dt, speed);
    rig.target.set(pos.x, gy, pos.z);

    let near = null, best = Infinity;
    for (const o of world.pois) {
      const d = Math.hypot(o.pos.x - pos.x, o.pos.z - pos.z);
      if (d < o.radius && d < best) { best = d; near = o.id; }
    }
    if (near !== poiId) {
      poiId = near;
      emit('poi:near', { poiId });
    }
  };
  p.look = () => look;
  return p;
}
