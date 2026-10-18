// Landmark towers on the island (town.json "landmarks"), simple geometry + shader materials:
//  qib  — QIB headquarters: slim tower with a slanted pointed top + a wider, shorter tower with a dark
//         vertical stripe, blue glass curtain walls, round white logo discs near the tops.
//  doha — Doha Tower: lattice-skinned cylinder with a domed top, thin spire and a disc at its base.
import { Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, Shape, ExtrudeGeometry, Color } from 'three/webgpu';
import { makeLit } from './light.js';
import { makeTowerGlass, makeLattice } from './water.js';

const add = (g, geo, mat, x, y, z) => { const m = new Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };

function qibTower(h) {
  const g = new Group(), glass = makeTowerGlass('#2f6fd0'), glass2 = makeTowerGlass('#3d82dc');
  const white = makeLit({ color: new Color('#f4f7fb') }), navy = makeLit({ color: new Color('#16346a') });
  const W1 = h * 0.13, H1 = h * 0.82, W2 = h * 0.16, H2 = h * 0.6;
  // slim tower + slanted point: a right triangle extruded through the tower's depth
  add(g, new BoxGeometry(W1, H1, W1), glass, -W1 * 0.55, H1 / 2, 0);
  const tri = new Shape().moveTo(-W1 / 2, 0).lineTo(W1 / 2, 0).lineTo(-W1 / 2, h - H1).closePath();
  const tip = add(g, new ExtrudeGeometry(tri, { depth: W1, bevelEnabled: false }), glass, -W1 * 0.55, H1, -W1 / 2);
  tip.geometry.computeVertexNormals();
  // wider, shorter tower with a dark vertical stripe on its front + a crown lip
  add(g, new BoxGeometry(W2, H2, W2 * 0.9), glass2, W2 * 0.5, H2 / 2, 0);
  add(g, new BoxGeometry(W2 * 0.12, H2 * 0.55, 0.3), navy, W2 * 0.35, H2 * 0.62, W2 * 0.45 + 0.1);
  add(g, new BoxGeometry(W2 * 1.02, 0.8, W2 * 0.92), white, W2 * 0.5, H2, 0);
  // round logo discs facing the town
  const disc = new CylinderGeometry(1.2, 1.2, 0.2, 24).rotateX(Math.PI / 2);
  add(g, disc, white, -W1 * 0.55, H1 * 0.95, W1 / 2 + 0.12);
  add(g, disc, white, W2 * 0.8, H2 * 0.93, W2 * 0.45 + 0.12);
  return g;
}

function dohaTower(h) {
  const g = new Group(), R = h * 0.085, body = h * 0.72;
  const skin = makeLattice(), steel = makeLit({ color: new Color('#7f97b4') }), base = makeLit({ color: new Color('#eef2f6') });
  add(g, new CylinderGeometry(R, R * 1.04, body, 40, 1, true), skin, 0, body / 2, 0);   // UVs drive the lattice
  add(g, new SphereGeometry(R, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, body, 0).scale.y = 1.5;
  add(g, new ConeGeometry(R * 0.05, h * 0.2, 8), steel, 0, body + R * 1.5 + h * 0.1, 0);
  add(g, new CylinderGeometry(R * 0.16, R * 0.3, R * 0.25, 12), steel, 0, body + R * 1.45, 0);
  add(g, new CylinderGeometry(R * 1.9, R * 1.9, 0.4, 40), base, 0, 2.4, 0);             // disc canopy at the base
  add(g, new CylinderGeometry(R * 1.3, R * 1.3, 2.4, 32), steel, 0, 1.2, 0);
  return g;
}

const TYPES = { qib: qibTower, doha: dohaTower };

export function createLandmarks(list = []) {
  const group = new Group();
  for (const l of list) {
    const make = TYPES[l.type];
    if (!make) continue;
    const t = make(l.h ?? 80);
    t.position.set(l.x, 0.06, l.z);
    t.rotation.y = ((l.ry ?? 0) * Math.PI) / 180;
    t.traverse((o) => { o.castShadow = o.isMesh; });
    group.add(t);
  }
  return group;
}
