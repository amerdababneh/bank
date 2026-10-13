// Floating virtual joystick (anywhere on screen, multi-touch safe), tap-on-ground target and WASD/arrows.
// Poll `read()` once per frame, then use x/y (screen space: y>0 = down) and hasTarget/tx/tz.
import { Raycaster, Plane, Vector2, Vector3 } from 'three/webgpu';

const R = 52;          // knob travel in px
const DEAD = 0.12;
const KEYS = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

export function createInput({ canvas, host, camera }) {
  const s = { x: 0, y: 0, hasTarget: false, tx: 0, tz: 0, enabled: true };
  const joy = document.createElement('div');
  joy.className = 'joy';
  const knob = document.createElement('i');
  joy.append(knob);
  host.append(joy);

  // floating joystick: press anywhere and drag; a short press without dragging is a tap-to-walk
  let joyId = null, ox = 0, oy = 0, t0 = 0, dragging = false, jx = 0, jy = 0;
  const held = new Set();
  const ray = new Raycaster(), ndc = new Vector2(), hit = new Vector3(), ground = new Plane(new Vector3(0, 1, 0), 0);

  const endJoy = () => {
    joyId = null;
    dragging = false;
    jx = jy = 0;
    joy.classList.remove('on');
    knob.style.transform = '';
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (joyId !== null || !s.enabled) return; // extra fingers are ignored
    joyId = e.pointerId;
    ox = e.clientX;
    oy = e.clientY;
    t0 = e.timeStamp;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyId) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (!dragging) {
      if (len < 12) return;
      dragging = true;
      s.hasTarget = false;
      joy.style.left = `${ox}px`;
      joy.style.top = `${oy}px`;
      joy.classList.add('on');
    }
    if (len > R) { dx *= R / len; dy *= R / len; }
    jx = dx / R;
    jy = dy / R;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  });
  canvas.addEventListener('pointercancel', (e) => { if (e.pointerId === joyId) endJoy(); });
  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId !== joyId) return;
    const tap = !dragging && s.enabled && e.timeStamp - t0 < 400;
    endJoy();
    if (!tap) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(ground, hit)) {
      s.tx = hit.x;
      s.tz = hit.z;
      s.hasTarget = true;
    }
  });

  addEventListener('keydown', (e) => { if (KEYS[e.code]) { held.add(e.code); s.hasTarget = false; } });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => { held.clear(); endJoy(); });

  s.read = () => {
    let x = 0, y = 0;
    if (s.enabled) {
      const m = Math.hypot(jx, jy);
      if (m > DEAD) { x = jx; y = jy; }
      else {
        for (const k of held) { x += KEYS[k][0]; y += KEYS[k][1]; }
        const l = Math.hypot(x, y);
        if (l > 1) { x /= l; y /= l; }
      }
    }
    s.x = x;
    s.y = y;
  };
  s.setEnabled = (on) => {
    s.enabled = on;
    if (!on) { s.hasTarget = false; held.clear(); endJoy(); }
  };
  return s;
}
