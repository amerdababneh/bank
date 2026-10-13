// Fixed 3/4 top-down follow rig with presets. No allocations per frame.
import { PerspectiveCamera, Vector3 } from 'three/webgpu';

const RAD = Math.PI / 180;
const PRESETS = {
  // low third-person view behind the kid; `look` = height of the look-at point above the feet
  town: { dist: 6.5, pitch: 20 * RAD, fov: 46, look: 1.4 },
  interior: { dist: 6, pitch: 24 * RAD, fov: 48, look: 1.4 },
};
const REF_ASPECT = 1.7; // narrower screens widen the vertical fov so the horizontal view stays similar
const PORTRAIT_MAX = 1.3; // ...but only up to this much, so the kid stays big on phones held upright
const MOBILE_DIST = navigator.maxTouchPoints > 0 ? 0.88 : 1; // small touch screens: camera closer

export function createCameraRig() {
  const camera = new PerspectiveCamera(PRESETS.town.fov, 1, 0.1, 450);
  const target = new Vector3();   // set by the follow target (player)
  const focus = new Vector3();    // smoothed look-at point
  const cur = { dist: PRESETS.town.dist * MOBILE_DIST, pitch: PRESETS.town.pitch };
  const rig = { camera, target, yaw: 0, aspect: 1, preset: PRESETS.town };

  function applyFov() {
    const k = Math.min(PORTRAIT_MAX, Math.max(1, REF_ASPECT / rig.aspect));
    camera.fov = 2 * Math.atan(Math.tan((rig.preset.fov * RAD) / 2) * k) / RAD;
    camera.aspect = rig.aspect;
    camera.updateProjectionMatrix();
  }

  function place() {
    const h = cur.dist * Math.cos(cur.pitch);
    const look = rig.preset.look;
    camera.position.set(focus.x + Math.sin(rig.yaw) * h, focus.y + cur.dist * Math.sin(cur.pitch) + look, focus.z + Math.cos(rig.yaw) * h);
    camera.lookAt(focus.x, focus.y + look, focus.z);
  }

  rig.setAspect = (a) => {
    rig.aspect = a;
    applyFov();
  };
  rig.setPreset = (name, snap = false) => {
    rig.preset = PRESETS[name] ?? PRESETS.town;
    applyFov();
    if (snap) {
      cur.dist = rig.preset.dist * MOBILE_DIST;
      cur.pitch = rig.preset.pitch;
      focus.copy(target);
      place();
    }
  };
  rig.update = (dt) => {
    const k = 1 - Math.exp(-dt * 8);
    focus.lerp(target, k);
    cur.dist += (rig.preset.dist * MOBILE_DIST - cur.dist) * k;
    cur.pitch += (rig.preset.pitch - cur.pitch) * k;
    place();
  };
  return rig;
}
