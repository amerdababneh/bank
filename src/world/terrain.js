// Gentle hills on tiles marked "hill" (tiles.json). Deterministic rolling height (sum of sines),
// faded to 0 near any non-hill neighbour so hills meet roads/lawns flat. One vertex-coloured mesh.
// heightAt(x, z) is used by the player (walking), the camera and prop/grass placement.
import { Mesh, PlaneGeometry, Color, BufferAttribute } from 'three/webgpu';
import { makeLit } from './light.js';

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function createTerrain({ town, tiles }) {
  const T = town.tile, rows = town.map, defs = tiles.tiles;
  const cfg = { height: 3, edge: 5, ...tiles.hills };
  const isHill = (tx, tz) => !!defs[rows[tz]?.[tx]]?.hill;

  // distance (m) from a point inside a hill tile to the nearest edge shared with a non-hill tile
  function edgeDist(x, z) {
    const tx = Math.floor(x / T), tz = Math.floor(z / T);
    const lx = x - tx * T, lz = z - tz * T;
    let d = Infinity;
    // reach two tiles out so wide hill areas still fade only near their outer border
    for (let k = 0; k < 2; k++) {
      if (!isHill(tx - 1 - k, tz)) d = Math.min(d, lx + k * T);
      if (!isHill(tx + 1 + k, tz)) d = Math.min(d, T - lx + k * T);
      if (!isHill(tx, tz - 1 - k)) d = Math.min(d, lz + k * T);
      if (!isHill(tx, tz + 1 + k)) d = Math.min(d, T - lz + k * T);
    }
    return d;
  }

  function heightAt(x, z) {
    if (!isHill(Math.floor(x / T), Math.floor(z / T))) return 0;
    const n = 0.55 + 0.25 * Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.16 + 0.4)
      + 0.2 * Math.sin(x * 0.27 + z * 0.19 + 2.1);
    return cfg.height * n * smooth(edgeDist(x, z) / cfg.edge);
  }

  // mesh over the bounding box of all hill tiles, 1 m grid
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  rows.forEach((r, tz) => [...r].forEach((_, tx) => {
    if (!isHill(tx, tz)) return;
    x0 = Math.min(x0, tx * T); x1 = Math.max(x1, (tx + 1) * T);
    z0 = Math.min(z0, tz * T); z1 = Math.max(z1, (tz + 1) * T);
  }));
  if (x0 === Infinity) return { heightAt, mesh: null };

  const w = x1 - x0, d = z1 - z0;
  const geo = new PlaneGeometry(w, d, Math.round(w), Math.round(d)).rotateX(-Math.PI / 2).translate(x0 + w / 2, 0, z0 + d / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const low = new Color(cfg.low ?? '#7cc864'), high = new Color(cfg.high ?? '#a6e07f'), c = new Color();
  const top = tiles.grounds.grass?.top ?? 0.06;
  for (let i = 0; i < pos.count; i++) {
    const h = heightAt(pos.getX(i), pos.getZ(i));
    pos.setY(i, top + 0.02 + h);
    c.copy(low).lerp(high, Math.min(1, h / cfg.height)).toArray(col, i * 3);
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new Mesh(geo, makeLit({ vertexColors: true }));
  mesh.castShadow = mesh.receiveShadow = true;
  return { heightAt, mesh };
}
