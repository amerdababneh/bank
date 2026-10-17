// Follow camera rig with presets and two modes: 'follow' (low 3rd person that swings behind the kid)
// and 'top' (high 3/4 view, fixed north). No allocations per frame.
import { PerspectiveCamera, Vector3 } from 'three/webgpu';

const RAD = Math.PI / 180;
const PRESETS = {
  // low third-person view behind the kid; `look` = height of the look-at point above the feet
  town: { dist: 6.2, pitch: 11 * RAD, fov: 40, look: 1.3 }, // Coastal World framing: kid ~1/4 of the height, feet low, horizon high
  interior: { dist: 5.2, pitch: 16 * RAD, fov: 44, look: 1.2 },
  // high 3/4 view
  townTop: { dist: 15, pitch: 50 * RAD, fov: 40, look: 0.6 },
  interiorTop: { dist: 11, pitch: 55 * RAD, fov: 44, look: 0.6 },
};
const MODE_KEY = 'mk_cam';
const REF_ASPECT = 1.7; // narrower screens widen the vertical fov so the horizontal view stays similar
const PORTRAIT_MAX = 1.3; // ...but only up to this much, so the kid stays big on phones held upright
const MOBILE_DIST = navigator.maxTouchPoints > 0 ? 0.88 : 1; // small touch screens: camera closer

export function createCameraRig() {
  const camera = new PerspectiveCamera(PRESETS.town.fov, 1, 0.1, 700);
  const target = new Vector3();   // set by the follow target (player)
  const focus = new Vector3();    // smoothed look-at point
  const cur = { dist: PRESETS.town.dist * MOBILE_DIST, pitch: PRESETS.town.pitch };
  const rig = { camera, target, yaw: 0, aspect: 1, preset: PRESETS.town, base: 'town', mode: 'follow' };
  try { if (localStorage.getItem(MODE_KEY) === 'top') rig.mode = 'top'; } catch { /* ignore */ }
  // cinematic shot: blends from the follow pose to (cinePos looking at cineLook) and back
  const cinePos = new Vector3(), cineLook = new Vector3(), shotPos = new Vector3(), shotLook = new Vector3(), look0 = new Vector3();
  let cineOn = false, blend = 0, snapShot = true;

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
    look0.set(focus.x, focus.y + look, focus.z);
    if (blend > 0.001) {
      const b = blend * blend * (3 - 2 * blend); // smoothstep
      camera.position.lerp(shotPos, b);
      look0.lerp(shotLook, b);
    }
    camera.lookAt(look0);
  }

  rig.setAspect = (a) => {
    rig.aspect = a;
    applyFov();
  };
  rig.setPreset = (name, snap = false) => {
    rig.base = name;
    rig.preset = (rig.mode === 'top' && PRESETS[name + 'Top']) || PRESETS[name] || PRESETS.town;
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
    blend = Math.min(1, Math.max(0, blend + (cineOn ? dt : -dt) * 1.6));
    const ks = snapShot ? 1 : 1 - Math.exp(-dt * 3); // glide between shots
    shotPos.lerp(cinePos, ks);
    shotLook.lerp(cineLook, ks);
    snapShot = false;
    focus.lerp(target, k);
    cur.dist += (rig.preset.dist * MOBILE_DIST - cur.dist) * k;
    cur.pitch += (rig.preset.pitch - cur.pitch) * k;
    place();
  };
  // Cinematic: rig.shot(pos, look) cuts straight to a framed shot; rig.shot(null) cuts back.
  // smooth: ease in/out of the shot (e.g. zooming onto the ATM) instead of cutting
  rig.shot = (pos, lookAt, smooth = false) => {
    if (!pos) { cineOn = false; if (!smooth) blend = 0; return; } // cut (or ease) back to the follow camera
    snapShot = true; // hard cut between shots, like film editing
    cineOn = true;
    if (!smooth) blend = 1;
    cinePos.copy(pos);
    cineLook.copy(lookAt);
  };
  // switch view; the rig eases to the new distance/pitch
  rig.setMode = (mode) => {
    rig.mode = mode;
    if (mode === 'top') rig.yaw = 0;
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* ignore */ }
    rig.setPreset(rig.base);
  };
  return rig;
}
