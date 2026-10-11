// Palm / lamp geometries (instanced by town.js) and the dhow.
import { createBatch } from './geo.js';

const BROWN = '#8b6a43';
const LEAF = ['#3f8f3a', '#2f7a30'];

// Origin at the base of the trunk.
export function palmGeometries() {
  const t = createBatch();
  t.cyl('lit', BROWN, 0, 0, 0, 0.24, 0.32, 2.2, 7);
  t.cyl('lit', '#7e5f3b', 0.1, 2.1, 0, 0.2, 0.24, 2.0, 7);
  t.cyl('lit', BROWN, 0.26, 4.0, 0, 0.17, 0.2, 1.8, 7);
  const crown = createBatch();
  for (let i = 0; i < 8; i++) {
    crown.at(0.3, 0, (i / 8) * Math.PI * 2);
    crown.box('lit', LEAF[i & 1], 0, 5.75, 1.5, 0.85, 0.08, 3.2, 0, 0.5);
  }
  crown.at(0.3, 0, 0);
  crown.sph('lit', '#6b4a2a', 0, 5.55, 0, 0.38);
  return { trunk: t.merged('lit'), crown: crown.merged('lit') };
}

export function lampGeometry() {
  const b = createBatch();
  b.cyl('lit', '#3a3d46', 0, 0, 0, 0.07, 0.1, 3.6, 6);
  b.box('lit', '#3a3d46', 0, 3.5, 0.25, 0.1, 0.1, 0.6);
  b.box('lit', '#ffe9a8', 0, 3.38, 0.5, 0.4, 0.14, 0.3);
  return b.merged('lit');
}

// Own Group so FX can bob it; origin at the tile center, hull length along the group's local z.
export function dhow(c, def, r) {
  const b = createBatch();
  b.at(0, 0, 0);
  const hull = '#5a3a22', cream = '#e9dfc9', wood = '#8a6a43';
  b.box('lit', hull, 0, -1.0, 0, 2.4, 1.4, 10.5);
  b.box('lit', cream, 0, 0.3, 0, 2.7, 0.55, 11);
  b.box('lit', hull, 0, 0.15, 5.9, 2.0, 0.6, 2.6, 0, -0.55);
  b.box('lit', hull, 0, 1.15, 7.1, 0.5, 0.5, 1.4, 0, -0.9);
  b.box('lit', wood, 0, 0.85, -4.6, 2.6, 1.0, 2.2);
  b.cyl('lit', wood, 0, 0.8, 1.0, 0.09, 0.14, 6.5, 6);
  b.box('lit', wood, 0, 4.1, 0.6, 0.12, 0.12, 8.4, 0, -0.45);
  for (let i = 0; i < 6; i++) b.box('lit', '#f6f0e2', 0, 1.5 + i * 0.5, 1.0 - 2.6 + i * 0.5 + 0.2, 0.06, 0.5, 6.4 - i * 1.0);
  const group = b.build(c.materials);
  group.position.set(r.cx, 0, r.cz);
  group.rotation.y = Math.PI / 2 + 0.18;
  c.group.add(group);
  c.anchors.dhow = group;
}
