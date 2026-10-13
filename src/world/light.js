// All TSL lighting lives here: the fake sun, sky, fog, shadow sampling, blob/contact shadows and the
// material-level effects (water, sway, rim, cloud shadows, AO, haze, kid shadow). Toggled via `fxU`.
import {
  Vector3, Color, DirectionalLight, MeshBasicNodeMaterial, MeshBasicMaterial, CanvasTexture, SRGBColorSpace,
} from 'three/webgpu';
import {
  uniform, normalWorld, normalWorldGeometry, normalView, positionWorld, positionLocal, positionViewDirection, vec2, vec3, vec4,
  mix, smoothstep, step, fract, dot, bool, sin, color, texture, float, shadow, output, cameraPosition, screenCoordinate,
  time, instanceIndex, mx_noise_float, fog, rangeFogFactor, fwidth,
} from 'three/tsl';

export const SUN_DIR = new Vector3(-0.6, 0.7, 0.35).normalize(); // points toward the sun
const uSun = uniform(SUN_DIR);
const SKY = vec3(0.54, 0.58, 0.66);
const GROUND = vec3(0.46, 0.40, 0.33);
const SUN = vec3(0.70, 0.62, 0.45);

export const HAZE = '#cfe3ee';
const ZENITH = '#7fb8e0';
const SUN_GLOW = '#ffe2b0';

// effect switches (0/1), flipped live by the ?fx panel
export const fxU = {
  water: uniform(1), sway: uniform(1), rim: uniform(1), clouds: uniform(1), ao: uniform(1), haze: uniform(1), kidShadow: uniform(0),
};

let sunShadow = null; // ShadowNode, only on tiers with a shadow map
let kidShadow = null; // small realtime map that only renders the player (layer 2)
export let sunLight = null;
let kidLight = null;
export const PLAYER_LAYER = 2;
// 0 inside the bank: the town shadow map must not land on the player there
const uSceneShadow = uniform(1);
export const setSceneShadows = (on) => { uSceneShadow.value = on ? 1 : 0; };

// drifting cloud shadows on everything
const cloudShade = mix(1, 0.8, smoothstep(0.15, 0.45, mx_noise_float(vec3(positionWorld.xz.mul(0.03).add(time.mul(vec2(0.02, 0.008))), 0))));

// base: vec3 node (albedo). Cheap hemisphere + directional term, darker near the ground on walls.
export function fakeSun(base) {
  const n = normalWorld;
  const hemi = mix(GROUND, SKY, n.y.mul(0.5).add(0.5));
  const sun = SUN.mul(n.dot(uSun).max(0)).mul(mix(1, cloudShade, fxU.clouds));
  const aoLow = mix(0.78, 0.55, fxU.ao), aoH = mix(2.5, 4, fxU.ao); // stronger, taller fake AO when on
  const wallAO = mix(aoLow, 1, smoothstep(0, aoH, positionWorld.y));
  return vec3(base).mul(hemi.add(sun)).mul(mix(1, wallAO, n.y.abs().oneMinus()));
}

// See-through occlusion: anything between the camera and the player (above ground) dithers away,
// fading out inside a tube of OCC_R metres around the camera->player line.
const OCC_R = 1.5;
const uFocus = uniform(new Vector3(0, -1000, 0));
export const setOcclusionFocus = (x, y, z) => { uFocus.value.set(x, y, z); };
const occAB = uFocus.sub(cameraPosition);
const occAP = positionWorld.sub(cameraPosition);
const occT = occAP.dot(occAB).div(occAB.dot(occAB));
const occD = occAP.sub(occAB.mul(occT)).length();
const occFade = smoothstep(OCC_R * 0.45, OCC_R, occD).oneMinus()
  .mul(step(0, occT)).mul(step(occT, 0.9)).mul(step(0.3, positionWorld.y));
const ditherNoise = fract(float(52.9829189).mul(fract(dot(screenCoordinate.xy, vec2(0.06711056, 0.00583715)))));
const OCC_MASK = ditherNoise.greaterThanEqual(occFade.mul(0.88)); // true = keep the fragment
const KEEP = bool(true); // the shadow pass must not see the hole

// rim light: bright edge facing away from the camera (player only)
const rimTerm = positionViewDirection.dot(normalView).max(0).oneMinus().pow(3).mul(0.55).mul(fxU.rim);

// palm sway: bend grows with height; phase per instance
const swayPos = () => {
  const bend = positionLocal.y.div(6).pow(2).mul(0.3).mul(fxU.sway);
  const s = sin(time.mul(1.3).add(float(instanceIndex).mul(1.7))).mul(bend);
  return positionLocal.add(vec3(s, 0, s.mul(0.6)));
};

// Opaque-by-default fake-sun material. Vertex colors / instance colors multiply on top automatically.
// occlude: false for the player's own materials. rim: player. sway: instanced palms.
export function makeLit({ color: c = 0xffffff, map = null, vertexColors = false, shadows = true, transparent = false, opacity = 1, side, occlude = true, rim = false, sway = false, allFaces = false } = {}) {
  const m = new MeshBasicNodeMaterial({ vertexColors, transparent, opacity, ...(side !== undefined && { side }) });
  const tex = map ? texture(map) : null;
  const base = tex ? tex.rgb.mul(color(c)) : color(c);
  let lit = fakeSun(base);
  if (rim) lit = lit.add(rimTerm);
  m.colorNode = vec4(lit, tex ? tex.a : float(1));
  if (sway) m.positionNode = swayPos();
  // Shadow goes in outputNode, not colorNode: the shadow pass reuses colorNode.a, and sampling the
  // shadow map there reads the texture while it is being rendered (WebGPU validation error).
  if (shadows && sunShadow) {
    let sh = sunShadow;
    if (kidShadow && !allFaces) sh = sh.mul(mix(1, kidShadow, fxU.kidShadow)); // never on the kid himself
    // only ground/roofs receive; walls stay clean (no acne). allFaces: the player receives everywhere
    if (!allFaces) sh = mix(1, sh, smoothstep(0.35, 0.75, normalWorld.y));
    sh = mix(1, sh, uSceneShadow);
    m.outputNode = vec4(output.rgb.mul(sh), output.a);
  }
  if (occlude) {
    m.maskNode = OCC_MASK;
    m.maskShadowNode = KEEP;
  }
  return m;
}

// Animated sea: slow colour waves, sun sparkles and a wobbling foam line at the shore (z = shoreZ).
// Cartoon sea (flat, unlit): drifting light contour lines over two noise layers, tiny white flecks and a
// wobbling foam line at the shore (z = shoreZ). With the water effect off it is a plain flat colour.
export function makeWater(hex, shoreZ) {
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
  const wobble = sin(time.mul(1.6).add(p.x.mul(0.35))).mul(0.35);
  const foam = smoothstep(0.2, 1.4, float(shoreZ).sub(p.y).add(wobble)).oneMinus().mul(step(p.y, shoreZ + 0.5));
  sea = mix(sea, vec3(1), foam.mul(0.85));
  m.colorNode = vec4(mix(base, sea, fxU.water), 1);
  return m;
}

export const makeUnlit = ({ vertexColors = true, color: c = 0xffffff } = {}) => new MeshBasicMaterial({ vertexColors, color: c });

// Replace every material of a loaded GLB with a fake-sun one (keeps color, map and vertex colors).
export function litFromGltf(root, { occlude = true, rim = false, shadows = true, allFaces = false } = {}) {
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    if (!cache.has(old)) {
      cache.set(old, makeLit({ color: old.color ?? 0xffffff, map: old.map ?? null, vertexColors: !!o.geometry.attributes.color, occlude, rim, shadows, allFaces }));
    }
    o.material = cache.get(old);
  });
  return root;
}

export function setupSky(scene) {
  const view = normalWorldGeometry; // background: direction of the view ray
  const glow = view.dot(uSun).max(0).pow(6).mul(0.55).mul(fxU.haze);
  scene.backgroundNode = mix(mix(color(HAZE), color(ZENITH), smoothstep(-0.2, 0.6, view.y)), color(SUN_GLOW), glow);
  // fog tinted warm toward the sun when haze is on
  const dir = positionWorld.sub(cameraPosition).normalize();
  const fogCol = mix(color(HAZE), color(SUN_GLOW), dir.dot(uSun).max(0).pow(3).mul(0.7).mul(fxU.haze));
  scene.fogNode = fog(fogCol, rangeFogFactor(80, 250));
  scene.background = new Color(HAZE); // fallback clear color
}

// One DirectionalLight, used only to render a shadow map ONCE (mid/high). Low tier: no light, no map.
// Plus a tiny realtime map that follows the player and renders only PLAYER_LAYER.
export function setupSun(scene, bounds, quality) {
  if (!quality.shadows) return null;
  const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
  const r = Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + 6;
  const light = new DirectionalLight(0xffffff, 1);
  light.position.copy(SUN_DIR).multiplyScalar(r * 2).add(new Vector3(cx, 0, cz));
  light.target.position.set(cx, 0, cz);
  light.castShadow = true;
  const s = light.shadow;
  s.mapSize.set(quality.shadowMap, quality.shadowMap);
  Object.assign(s.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 4.5 });
  s.camera.updateProjectionMatrix();
  s.camera.layers.mask = 0b1001; // layer 0 (+3 so three keeps the mask): never the player
  s.bias = -0.0004;
  s.normalBias = 0.04;
  s.intensity = 0.5;
  s.autoUpdate = false;  // rendered once on the first full frame
  s.needsUpdate = true;
  scene.add(light, light.target);
  sunLight = light;
  sunShadow = shadow(light);

  kidLight = new DirectionalLight(0xffffff, 1);
  kidLight.castShadow = true;
  const k = kidLight.shadow;
  k.mapSize.set(512, 512);
  Object.assign(k.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 20 });
  k.camera.updateProjectionMatrix();
  k.camera.layers.set(PLAYER_LAYER);
  k.bias = -0.0008;
  k.intensity = 0.5;
  k.autoUpdate = false;
  scene.add(kidLight, kidLight.target);
  kidShadow = shadow(kidLight);
  return light;
}

// Follow the player with the kid-shadow light. No allocations.
export function updateKidShadow(x, y, z) {
  if (!kidLight) return;
  const on = fxU.kidShadow.value > 0.5;
  kidLight.shadow.autoUpdate = on;
  if (!on) return;
  kidLight.target.position.set(x, y, z);
  kidLight.position.set(x + SUN_DIR.x * 10, y + SUN_DIR.y * 10, z + SUN_DIR.z * 10);
}

export const hasKidShadow = () => !!kidLight;
export const refreshShadows = () => { if (sunLight) sunLight.shadow.needsUpdate = true; };

let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(20,14,10,0.55)');
  grad.addColorStop(0.55, 'rgba(20,14,10,0.28)');
  grad.addColorStop(1, 'rgba(20,14,10,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blobTex = new CanvasTexture(c);
  blobTex.colorSpace = SRGBColorSpace;
  return blobTex;
}

// Soft dark quad material for character blob shadows and low-tier contact shadows.
export const makeBlobMaterial = () => new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, alphaTest: 0.02 });
// alphaTest: the fully transparent corners are discarded, so post passes (MRT/AO/SSR) never see the quad
