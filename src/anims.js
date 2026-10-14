// Mixamo FBX clips (public/models/<file>.fbx) retargeted onto the GLB kid by bone name.
// Clips are in place (no position tracks), so the run never drifts or rescales the body.
// Rotations are applied relative to each rig's rest pose (target = targetRest * sourceRest^-1 * anim),
// so rigs whose bind poses differ (e.g. Tripo vs Mixamo, Y-up vs Z-up armature) still line up.
import { AnimationClip, QuaternionKeyframeTrack, Quaternion } from 'three/webgpu';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// key -> file name. 'talk' is loaded now and kept for later (NPC / teller chats).
export const ANIMS = { talk: 'Talking' }; // idle/run come from the GLB's own clips

// 'mixamorig:LeftArm', 'mixamorig9LeftArm', 'LeftArm' -> 'leftarm' (Mixamo numbers rigs of uploaded characters)
const q = new Quaternion();
const norm = (n) => n.replace(/^.*:/, '').replace(/^mixamorig\d*/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export async function loadAnims() {
  const loader = new FBXLoader();
  const out = {};
  await Promise.all(Object.entries(ANIMS).map(async ([key, file]) => {
    try {
      const fbx = await loader.loadAsync(`/models/${encodeURIComponent(file)}.fbx`);
      const clip = fbx.animations[0];
      if (!clip) return;
      clip.name = key;
      const rest = new Map();
      fbx.traverse((o) => {
        if (!o.isBone) return;
        if (!rest.has(norm(o.name))) rest.set(norm(o.name), o.quaternion.clone());
      });
      out[key] = { clip, rest };
    } catch { /* missing file: the GLB's own clips are used instead */ }
  }));
  return out;
}

// Rewrite track names to the model's bone names. Returns null when too few bones match.
export function retarget(anim, model) {
  const bones = new Map();
  model.traverse((o) => { if (o.isBone && !bones.has(norm(o.name))) bones.set(norm(o.name), o); });
  const tracks = [];
  for (const t of anim.clip.tracks) {
    const dot = t.name.lastIndexOf('.');
    const bone = bones.get(norm(t.name.slice(0, dot)));
    const prop = t.name.slice(dot + 1);
    if (!bone || prop === 'scale') continue;
    if (prop === 'position') continue; // in place: rigs may differ in units/up axis, so hips never move
    if (prop === 'quaternion') {
      const src = anim.rest.get(norm(t.name.slice(0, dot)));
      const fix = src ? bone.quaternion.clone().multiply(src.clone().invert()) : null;
      const v = t.values.slice();
      if (fix) {
        for (let i = 0; i < v.length; i += 4) q.fromArray(v, i).premultiply(fix).toArray(v, i);
      }
      tracks.push(new QuaternionKeyframeTrack(`${bone.name}.quaternion`, t.times, v));
      continue;
    }
    const c = t.clone();
    c.name = `${bone.name}.${prop}`;
    tracks.push(c);
  }
  if (tracks.length < 10) {
    console.warn(`anims: '${anim.clip.name}' matched only ${tracks.length} tracks; using the GLB clips`);
    return null;
  }
  return new AnimationClip(anim.clip.name, anim.clip.duration, tracks);
}

// Whole FBX files (Mixamo 'with skin': character + one animation) for NPCs, by file name.
export async function loadFbx(names) {
  const loader = new FBXLoader();
  const out = {};
  await Promise.all([...new Set(names)].map(async (n) => {
    try { out[n] = await loader.loadAsync(`/models/${encodeURIComponent(n)}.fbx`); } catch { /* missing: NPC skipped */ }
  }));
  return out;
}
