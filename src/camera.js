// Fixed 3/4 top-down follow rig with presets. No allocations per frame.
import { PerspectiveCamera, Vector3 } from 'three/webgpu';

const RAD = Math.PI / 180;
const PRESETS = {
  town: { dist: 24, pitch: 52 * RAD, fov: 36 },
  interior: { dist: 17, pitch: 56 * RAD, fov: 40 },
};
const REF_ASPECT = 1.7; // narrower screens widen the vertical fov so the horizontal view stays similar

export function createCameraRig() {
  const camera = new PerspectiveCamera(PRESETS.town.fov, 1, 0.5, 450);
  const target = new Vector3();   // set by the follow target (player)
  const focus = new Vector3();    // smoothed look-at point
  const cur = { dist: PRESETS.town.dist, pitch: PRESETS.town.pitch };
  const rig = { camera, target, yaw: 0, aspect: 1, preset: PRESETS.town };

  function applyFov() {
    const k = Math.min(2.2, Math.max(1, REF_ASPECT / rig.aspect));
    camera.fov = 2 * Math.atan(Math.tan((rig.preset.fov * RAD) / 2) * k) / RAD;
    camera.aspect = rig.aspect;
    camera.updateProjectionMatrix();
  }

  function place() {
    const h = cur.dist * Math.cos(cur.pitch);
    camera.position.set(focus.x + Math.sin(rig.yaw) * h, focus.y + cur.dist * Math.sin(cur.pitch) + 1, focus.z + Math.cos(rig.yaw) * h);
    camera.lookAt(focus.x, focus.y + 1, focus.z);
  }

  rig.setAspect = (a) => {
    rig.aspect = a;
    applyFov();
  };
  rig.setPreset = (name, snap = false) => {
    rig.preset = PRESETS[name] ?? PRESETS.town;
    applyFov();
    if (snap) {
      cur.dist = rig.preset.dist;
      cur.pitch = rig.preset.pitch;
      focus.copy(target);
      place();
    }
  };
  rig.update = (dt) => {
    const k = 1 - Math.exp(-dt * 8);
    focus.lerp(target, k);
    cur.dist += (rig.preset.dist - cur.dist) * k;
    cur.pitch += (rig.preset.pitch - cur.pitch) * k;
    place();
  };
  return rig;
}
