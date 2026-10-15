// Kid avatar: rigged GLB when provided, otherwise a procedural primitive avatar (also used for NPCs).
import {
  Group, Mesh, Color, SphereGeometry, CylinderGeometry, TorusGeometry, BoxGeometry,
} from 'three/webgpu';
import { makeLit } from './world/light.js';
import { createGlbAvatar, slotSetter } from './avatar_glb.js';
import data from '../data/avatars.json';
import { emit } from './bus.js';

const SPEED_REF = 4; // m/s that maps to a full stride

let G = null;
function geos() {
  return G ??= {
    robe: new CylinderGeometry(0.27, 0.42, 0.86, 14).translate(0, 0.5, 0),
    head: new SphereGeometry(0.33, 16, 12),
    eye: new SphereGeometry(0.045, 6, 6),
    hand: new SphereGeometry(0.09, 8, 6),
    foot: new SphereGeometry(0.14, 8, 6).scale(1, 0.55, 1.5),
    cap: new SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    ring: new TorusGeometry(0.34, 0.04, 6, 18).rotateX(Math.PI / 2),
    hem: new TorusGeometry(0.42, 0.03, 6, 18).rotateX(Math.PI / 2),
    drape: new BoxGeometry(0.56, 0.5, 0.1),
  };
}

const shade = (hex, k) => new Color(hex).multiplyScalar(k);

export function createProceduralAvatar({ gender = 'boy', color = 0 }) {
  const g = geos(), cfg = data[gender] ?? data.boy;
  const base = cfg.colors[color % cfg.colors.length];
  const mats = [];
  const mat = (c) => { const m = makeLit({ color: c instanceof Color ? c : new Color(c), shadows: false, occlude: false, rim: true, allFaces: true }); mats.push(m); return m; };
  const part = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const o = new Mesh(geo, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const skin = mat(data.skin);

  const root = new Group();
  const body = new Group();
  root.add(body);

  part(body, g.robe, mat(base));
  part(body, g.head, skin, 0, 1.18, 0);
  part(body, g.eye, mat(data.eye), -0.12, 1.15, 0.29);
  part(body, g.eye, mat(data.eye), 0.12, 1.15, 0.29);
  const handL = part(body, g.hand, skin, -0.42, 0.65, 0);
  const handR = part(body, g.hand, skin, 0.42, 0.65, 0);
  if (gender === 'girl') { // جلابية + بخنق
    const cloth = mat(shade(base, 0.8));
    part(body, g.cap, cloth, 0, 1.24, -0.02);
    part(body, g.drape, cloth, 0, 1.0, -0.3);
    part(body, g.hem, mat(cfg.trim), 0, 0.1, 0);
  } else { // ثوب + غترة + عقال
    part(body, g.cap, mat(cfg.ghutra), 0, 1.24, -0.02);
    part(body, g.drape, mat(cfg.ghutra), 0, 1.02, -0.3);
    part(body, g.ring, mat(cfg.agal), 0, 1.33, -0.02);
  }
  const feet = [part(root, g.foot, skin, -0.15, 0.08, 0), part(root, g.foot, skin, 0.15, 0.08, 0)];
  const head = new Group(), hand = new Group();
  head.position.set(0, 1.52, 0);
  body.add(head);
  handR.add(hand);

  let phase = 0, clock = 0;
  return {
    root,
    update(dt, speed) {
      const k = Math.min(1, speed / SPEED_REF);
      clock += dt;
      const prev = phase;
      phase += dt * (2 + speed * 1.1);
      if (k > 0.1 && Math.floor(phase / Math.PI) !== Math.floor(prev / Math.PI)) emit('step');
      const s = Math.sin(phase), c = Math.cos(phase);
      const sq = 0.05 * Math.sin(phase * 2) * k + 0.018 * Math.sin(clock * 2.4) * (1 - k); // squash + breathing
      body.position.y = Math.abs(s) * 0.09 * k;
      body.scale.set(1 + sq, 1 - sq, 1 + sq);
      body.rotation.x = 0.16 * k;
      feet[0].position.set(-0.15, 0.08 + Math.max(0, c) * 0.08 * k, s * 0.2 * k);
      feet[1].position.set(0.15, 0.08 + Math.max(0, -c) * 0.08 * k, -s * 0.2 * k);
      handL.position.z = -s * 0.15 * k;
      handR.position.z = s * 0.15 * k;
    },
    setAccessory: slotSetter({ head, hand }),
    dispose() { root.removeFromParent(); for (const m of mats) m.dispose(); },
  };
}

// glbs: { boy?: gltf, girl?: gltf } (null/undefined entries fall back to procedural); anims: loadAnims()
export function createAvatar({ gender, color, glbs = {}, anims = {} }) {
  const glb = glbs[gender];
  return glb ? createGlbAvatar(glb, anims) : createProceduralAvatar({ gender, color });
}
