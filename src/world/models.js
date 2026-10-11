// Optional CC0 GLBs: public/models/<name>.glb is used when present, otherwise callers fall back to primitives.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const GLB_MAGIC = 0x46546c67; // 'glTF'

export async function loadModel(name) {
  try {
    const res = await fetch(`/models/${name}.glb`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // the dev server answers missing files with index.html, so check the magic bytes
    if (new Uint32Array(buf, 0, 1)[0] !== GLB_MAGIC) return null;
    return (await loader.parseAsync(buf, '/models/')).scene;
  } catch {
    return null;
  }
}

export async function loadModels(names, onProgress) {
  const out = {};
  let done = 0;
  await Promise.all([...new Set(names)].map(async (n) => {
    out[n] = await loadModel(n);
    onProgress?.(++done / names.length);
  }));
  return out;
}
