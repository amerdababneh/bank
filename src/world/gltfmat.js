// Loaded models (GLB/FBX) get fake-sun materials from light.js; the kid also keeps an indoor set.
import { Color } from 'three/webgpu';
import { makeLit } from './light.js';

// Replace every material of a loaded GLB with a fake-sun one (keeps color, map and vertex colors).
export function litFromGltf(root, { occlude = true, rim = false, shadows = true, allFaces = false, shadowNode = null, indoorVariant = false, glassy = false, sway = false, grad = 0, recolor = null } = {}) {
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const conv = (old) => {
      if (!cache.has(old)) {
        // recolor { green, brown }: replace greenish / other material colours (e.g. a dull FBX palm)
        let col = old.color ?? 0xffffff;
        if (recolor && old.color) {
          const lum = old.color.r * 0.3 + old.color.g * 0.59 + old.color.b * 0.11;
          // near-black parts (trunk rings) stay as darker bands of the new brown
          col = lum < (recolor.darkBelow ?? 0.03) ? new Color(recolor.brown).multiplyScalar(0.45)
            : old.color.g > old.color.r ? recolor.green : recolor.brown;
        }
        const mat = makeLit({ color: col, map: old.map ?? null, vertexColors: !!o.geometry.attributes.color, occlude, rim, shadows, allFaces, shadowNode, glassy, sway, grad });
        // leaves / cut-out textures: keep the holes (alpha test) and show both sides
        if (old.map && (old.transparent || old.alphaTest > 0)) { mat.alphaTest = 0.5; mat.side = 2; }
        cache.set(old, mat);
      }
      return cache.get(old);
    };
    const src = o.material;
    o.material = Array.isArray(src) ? src.map(conv) : conv(src); // FBX: multi-material
    if (indoorVariant) { // same look without the town sun shadow (that light is not in interior scenes)
      const inConv = (old) => makeLit({ color: old.color ?? 0xffffff, map: old.map ?? null, vertexColors: !!o.geometry.attributes.color, occlude, rim, shadows: false, allFaces });
      o.userData.matOut = o.material;
      o.userData.matIn = Array.isArray(src) ? src.map(inConv) : inConv(src);
    }
  });
  return root;
}

// Swap meshes made with indoorVariant between their town and interior materials.
export function setIndoor(root, indoor) {
  root.traverse((o) => { if (o.userData.matIn) o.material = indoor ? o.userData.matIn : o.userData.matOut; });
}
