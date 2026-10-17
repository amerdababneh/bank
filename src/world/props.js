// Palm / lamp geometries (instanced by town.js).
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
