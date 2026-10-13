// Bank interior stub: an empty 12x16 m room with an exit POI and a spawn point (P5 fills it).
import { Scene, Group, Mesh, BoxGeometry, Box3, Vector3, Color } from 'three/webgpu';
import { makeLit } from './light.js';

const W = 12, D = 16, WALL_H = 4.2, FLOOR_TOP = 0.12;

export function buildBank({ brand }) {
  const scene = new Scene();
  const { primary, secondary } = brand.colors;
  scene.background = new Color(primary).multiplyScalar(0.55);

  const group = new Group();
  const lit = (hex) => makeLit({ color: new Color(hex), shadows: false });
  const box = (hex, w, h, d, x, y, z) => {
    const m = new Mesh(new BoxGeometry(w, h, d), lit(hex));
    m.position.set(x, y, z);
    group.add(m);
  };
  const floorA = new Color(secondary).multiplyScalar(0.92).getStyle();
  box(floorA, W, 1, D, 0, FLOOR_TOP - 0.5, 0);
  box(primary, W, 0.02, 2, 0, FLOOR_TOP + 0.01, D / 2 - 2.5);       // entrance rug
  box(secondary, W, WALL_H, 0.4, 0, WALL_H / 2, -D / 2 - 0.2);       // back wall
  box(secondary, 0.4, WALL_H, D, -W / 2 - 0.2, WALL_H / 2, 0);       // side walls
  box(secondary, 0.4, WALL_H, D, W / 2 + 0.2, WALL_H / 2, 0);
  box(primary, W, 0.35, 0.45, 0, 0.5, -D / 2 + 0.02);                // skirting
  scene.add(group);

  // the camera looks in from +z, so there is no front wall mesh; colliders still close the room
  const colliders = [
    new Box3(new Vector3(-W / 2 - 2, 0, -D / 2 - 2), new Vector3(W / 2 + 2, 6, -D / 2)),
    new Box3(new Vector3(-W / 2 - 2, 0, -D / 2), new Vector3(-W / 2, 6, D / 2)),
    new Box3(new Vector3(W / 2, 0, -D / 2), new Vector3(W / 2 + 2, 6, D / 2)),
  ];
  const bounds = { minX: -W / 2, maxX: W / 2, minZ: -D / 2, maxZ: D / 2 };
  return {
    scene, group, colliders, bounds, groundAt: () => FLOOR_TOP,
    pois: [{ id: 'bank_exit', pos: new Vector3(0, 0, D / 2 - 1.2), radius: 2 }],
    spawn: new Vector3(0, 0, D / 2 - 3.5),
  };
}
