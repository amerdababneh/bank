// Rigged GLB avatar (Tripo/Mixamo style) + accessory slots shared with the procedural avatar.
import { AnimationMixer, Group, Box3 } from 'three/webgpu';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { litFromGltf, PLAYER_LAYER } from './world/light.js';
import { loadModel } from './world/models.js';
import { retarget } from './anims.js';

const HEIGHT = 1.7;

// slots: { head: Object3D, hand: Object3D }. Returns async setAccessory(itemId | null, slot = 'head').
export function slotSetter(slots) {
  const cur = {};
  return async (itemId, slot = 'head') => {
    cur[slot]?.removeFromParent();
    cur[slot] = null;
    if (!itemId || !slots[slot]) return;
    const m = await loadModel(`acc_${itemId}`);
    if (!m) return;
    cur[slot] = litFromGltf(m, { occlude: false, rim: true, allFaces: true, indoorVariant: true });
    cur[slot].traverse((o) => { o.layers.set(PLAYER_LAYER); o.castShadow = o.isMesh; });
    slots[slot].add(cur[slot]);
  };
}

// extra: Mixamo clips from loadAnims() ({ idle, walk, talk }); used when the GLB has no clip of that kind
export function createGlbAvatar({ scene, animations }, extra = {}) {
  const root = new Group();
  const model = litFromGltf(clone(scene), { occlude: false, rim: true, allFaces: true, indoorVariant: true });
  const bones = {};
  model.traverse((o) => {
    o.frustumCulled = false; // skinned bounds are unreliable
    if (o.isBone) {
      if (!bones.head && /head/i.test(o.name)) bones.head = o;
      if (!bones.hand && /hand/i.test(o.name)) bones.hand = o;
    }
  });
  root.add(model);

  // clips by name; a single clip serves as both idle and walk
  const rt = (k) => (extra[k] ? retarget(extra[k], model) : null);
  const pick = (re) => animations.find((c) => re.test(c.name));
  // the GLB's own baked clips win (they match its rig exactly); Mixamo FBX clips are the fallback
  const idleClip = pick(/idle/i) ?? rt('idle') ?? animations[0];
  const walkClip = pick(/walk|run/i) ?? rt('walk') ?? animations.find((c) => c !== idleClip) ?? idleClip;
  const talkClip = pick(/talk/i) ?? rt('talk'); // used in conversations: avatar.setTalking(true)
  const mixer = idleClip ? new AnimationMixer(model) : null;
  const same = idleClip === walkClip;
  const idle = mixer?.clipAction(idleClip).play();
  const walk = same ? idle : mixer?.clipAction(walkClip).play();
  const talk = talkClip ? mixer.clipAction(talkClip).play() : null;
  let w = 0, tw = 0, talking = false;
  if (walk && !same) walk.setEffectiveWeight(0);
  talk?.setEffectiveWeight(0);

  // fit to the animated (skinned) pose, not the bind pose, so the feet sit on the ground
  mixer?.update(0);
  model.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model, true);
  const s = HEIGHT / Math.max(0.01, box.max.y - box.min.y);
  model.scale.setScalar(s);
  model.position.y = -box.min.y * s;

  return {
    root,
    update(dt, speed) {
      if (!mixer) return;
      const f = Math.min(1, dt * 10);
      w += ((speed > 0.2 ? 1 : 0) - w) * f; // crossfade by speed
      tw += ((talking && speed < 0.2 ? 1 : 0) - tw) * f;
      if (same) idle.timeScale = 0.15 + 0.85 * w;
      else {
        idle.setEffectiveWeight((1 - w) * (1 - tw));
        walk.setEffectiveWeight(w);
        walk.timeScale = Math.min(1.3, Math.max(0.6, speed / 2.8)); // run cadence follows speed (1x at full speed)
      }
      talk?.setEffectiveWeight((1 - w) * tw);
      mixer.update(dt);
    },
    setAccessory: slotSetter(bones),
    setTalking(on) { talking = !!on; },
    dispose() { mixer?.stopAllAction(); root.removeFromParent(); },
  };
}
