// Ad billboards from town.json "billboards": [{ image, x, z, ry (deg), w, h, pole (m, 0 = on a wall), y }].
// The ad shows unshaded (bright, like a lit panel) inside a dark frame; free-standing boards get two posts
// and colliders. Missing image -> a plain brand-blue panel.
import { Group, Mesh, PlaneGeometry, BoxGeometry, MeshBasicMaterial, TextureLoader, SRGBColorSpace, Color, Box3, Vector3 } from 'three/webgpu';
import { makeLit } from './light.js';
import { asset } from '../paths.js';

const loader = new TextureLoader();

export function createBillboards(list = [], brand) {
  const group = new Group(), colliders = [];
  const frameMat = makeLit({ color: new Color('#2b3038') }), postMat = makeLit({ color: new Color('#9aa3ad') });
  for (const b of list) {
    const w = b.w ?? 4, h = b.h ?? 3, pole = b.pole ?? 2, y0 = (b.y ?? 0.06) + pole;
    const holder = new Group();
    holder.position.set(b.x, 0, b.z);
    holder.rotation.y = ((b.ry ?? 0) * Math.PI) / 180;
    const mat = new MeshBasicMaterial({ color: brand?.colors?.primary ?? '#0075b0' });
    if (b.image) {
      loader.load(asset(b.image), (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      });
    }
    const panel = new Mesh(new PlaneGeometry(w, h), mat);
    panel.position.set(0, y0 + h / 2, 0.09);
    const frame = new Mesh(new BoxGeometry(w + 0.3, h + 0.3, 0.15), frameMat);
    frame.position.set(0, y0 + h / 2, 0);
    frame.castShadow = true;
    holder.add(frame, panel);
    if (pole > 0) {
      for (const sx of [-w * 0.32, w * 0.32]) {
        const p = new Mesh(new BoxGeometry(0.22, pole, 0.22), postMat);
        p.position.set(sx, (b.y ?? 0.06) + pole / 2, -0.05);
        p.castShadow = true;
        holder.add(p);
      }
      holder.updateMatrixWorld(true);
      colliders.push(new Box3().setFromObject(holder).expandByScalar(-0.05));
      colliders.at(-1).max.y = 4; // footprint only
    }
    group.add(holder);
  }
  return { group, colliders };
}
