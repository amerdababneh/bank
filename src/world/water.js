// Water and glass shaders (TSL): the cartoon sea and the landmark tower's glass curtain wall.
import { MeshBasicNodeMaterial, Color } from 'three/webgpu';
import {
  positionWorld, positionViewDirection, normalView, reflectVector, vec3, vec4, mix, smoothstep, step, sin, fract, float, color, time,
  mx_noise_float, fwidth, uv,
} from 'three/tsl';
import { fakeSun, fxU, uSun, HAZE, ZENITH } from './light.js';

// Cartoon sea (flat, unlit): drifting light contour lines over two noise layers, tiny white flecks and a
// wobbling foam line at the shore (z = shoreZ). With the water effect off it is a plain flat colour.
// land: the town rectangle x0..x1, z >= shoreZ; the foam band hugs its outline (north and side coasts)
export function makeWater(hex, shoreZ, x0 = -1e5, x1 = 1e5) {
  const m = new MeshBasicNodeMaterial();
  const p = positionWorld.xz, base = color(new Color(hex));
  const n1 = mx_noise_float(vec3(p.mul(0.09), time.mul(0.12)));
  const n2 = mx_noise_float(vec3(p.mul(0.17).add(7.3), time.mul(0.18)));
  const line = (n) => smoothstep(0, fwidth(n).mul(1.5).add(0.012), n.abs()).oneMinus(); // thin, pixel-stable
  const lines = line(n1).max(line(n2).mul(0.6));
  const light = base.mul(1.15).add(0.07);
  let sea = mix(base, base.mul(0.92), smoothstep(0.15, 0.55, n1).mul(0.35)); // soft darker patches
  sea = mix(sea, light, lines.mul(0.75));
  const fleck = smoothstep(0.8, 0.86, mx_noise_float(vec3(p.mul(1.7), time.mul(0.9))));
  sea = mix(sea, vec3(1), fleck);
  const wobble = sin(time.mul(1.6).add(p.x.add(p.y).mul(0.35))).mul(0.35);
  const dx = float(x0).sub(p.x).max(p.x.sub(x1)).max(0), dz = float(shoreZ).sub(p.y).max(0);
  const foam = smoothstep(0.2, 1.4, dx.mul(dx).add(dz.mul(dz)).sqrt().add(wobble)).oneMinus(); // distance to the land
  sea = mix(sea, vec3(1), foam.mul(0.85));
  m.colorNode = vec4(mix(base, sea, fxU.water), 1);
  return m;
}

// Landmark glass: base blue with floor bands and vertical mullions, mirroring the sky (horizon -> zenith)
// with fresnel and a sun glint. along: 'x' or 'z' — the facade direction the mullions run across.
export function makeTowerGlass(hex, { floor = 3.6, mullion = 1.6 } = {}) {
  const m = new MeshBasicNodeMaterial();
  const p = positionWorld, base = color(new Color(hex));
  const floors = smoothstep(0.86, 0.94, fract(p.y.div(floor)));                  // thin bright floor lines
  const cols = smoothstep(0.88, 0.96, fract(p.x.add(p.z).div(mullion)));         // vertical mullions
  const glass = fakeSun(base).mul(mix(0.9, 1.08, smoothstep(0, 90, p.y)));       // a touch lighter up high
  const r = reflectVector;
  const sky = mix(color(HAZE), color(ZENITH), smoothstep(-0.05, 0.55, r.y)).add(r.dot(uSun).max(0).pow(60).mul(1.2));
  const fres = positionViewDirection.dot(normalView).max(0).oneMinus().pow(2).mul(0.5).add(0.22);
  let c = mix(glass, sky, fres);
  c = mix(c, vec3(0.86, 0.92, 0.98), floors.max(cols).mul(0.45));
  m.colorNode = vec4(c, 1);
  return m;
}

// Doha Tower skin: silvery-white lattice (mashrabiya) — a diamond grid of dark blue openings over
// the cylinder's UVs, plus a soft sky reflection. cells: lattice repeats around / up the tower.
export function makeLattice(hex = '#e9eef4', { around = 64, up = 90 } = {}) {
  const m = new MeshBasicNodeMaterial();
  const u = uv(), a = u.x.mul(around), b = u.y.mul(up);
  const d = fract(a.add(b)).sub(0.5).abs().add(fract(a.sub(b)).sub(0.5).abs()); // diamond distance
  const skin = fakeSun(color(new Color(hex)));
  const r = reflectVector;
  const sky = mix(color(HAZE), color(ZENITH), smoothstep(-0.05, 0.55, r.y));
  const lit = mix(skin, sky, positionViewDirection.dot(normalView).max(0).oneMinus().pow(2).mul(0.35).add(0.1));
  m.colorNode = vec4(mix(lit, fakeSun(vec3(0.16, 0.27, 0.42)), smoothstep(0.17, 0.25, d).oneMinus().mul(0.85)), 1); // small openings
  return m;
}
