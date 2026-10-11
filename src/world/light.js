// All TSL lighting lives here: the fake sun, sky, fog, shadow sampling and blob/contact shadows.
import {
  Vector3, Color, Fog, DirectionalLight, MeshBasicNodeMaterial, MeshBasicMaterial, CanvasTexture, SRGBColorSpace,
} from 'three/webgpu';
import { uniform, normalWorld, normalWorldGeometry, positionWorld, vec3, vec4, mix, smoothstep, color, texture, float, shadow, output } from 'three/tsl';

export const SUN_DIR = new Vector3(-0.6, 0.7, 0.35).normalize(); // points toward the sun
const uSun = uniform(SUN_DIR);
const SKY = vec3(0.54, 0.58, 0.66);
const GROUND = vec3(0.46, 0.40, 0.33);
const SUN = vec3(0.70, 0.62, 0.45);

export const HAZE = '#cfe3ee';
const ZENITH = '#7fb8e0';

let sunShadow = null; // ShadowNode, only on tiers with a shadow map
export let sunLight = null;

// base: vec3 node (albedo). Cheap hemisphere + directional term, darker near the ground on walls.
export function fakeSun(base) {
  const n = normalWorld;
  const hemi = mix(GROUND, SKY, n.y.mul(0.5).add(0.5));
  const sun = SUN.mul(n.dot(uSun).max(0));
  const wallAO = mix(0.78, 1, smoothstep(0, 2.5, positionWorld.y));
  return vec3(base).mul(hemi.add(sun)).mul(mix(1, wallAO, n.y.abs().oneMinus()));
}

// Opaque-by-default fake-sun material. Vertex colors / instance colors multiply on top automatically.
export function makeLit({ color: c = 0xffffff, map = null, vertexColors = false, shadows = true, transparent = false, opacity = 1, side } = {}) {
  const m = new MeshBasicNodeMaterial({ vertexColors, transparent, opacity, ...(side !== undefined && { side }) });
  const tex = map ? texture(map) : null;
  const base = tex ? tex.rgb.mul(color(c)) : color(c);
  m.colorNode = vec4(fakeSun(base), tex ? tex.a : float(1));
  // Shadow goes in outputNode, not colorNode: the shadow pass reuses colorNode.a, and sampling the
  // shadow map there reads the texture while it is being rendered (WebGPU validation error).
  if (shadows && sunShadow) m.outputNode = vec4(output.rgb.mul(sunShadow), output.a);
  return m;
}

export const makeUnlit = ({ vertexColors = true, color: c = 0xffffff } = {}) => new MeshBasicMaterial({ vertexColors, color: c });

// Replace every material of a loaded GLB with a fake-sun one (keeps color, map and vertex colors).
export function litFromGltf(root) {
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    if (!cache.has(old)) {
      cache.set(old, makeLit({ color: old.color ?? 0xffffff, map: old.map ?? null, vertexColors: !!o.geometry.attributes.color }));
    }
    o.material = cache.get(old);
  });
  return root;
}

export function setupSky(scene) {
  scene.fog = new Fog(HAZE, 80, 250);
  scene.backgroundNode = mix(color(HAZE), color(ZENITH), smoothstep(-0.2, 0.6, normalWorldGeometry.y));
  scene.background = new Color(HAZE); // fallback clear color
}

// One DirectionalLight, used only to render a shadow map ONCE (mid/high). Low tier: no light, no map.
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
  s.bias = -0.0004;
  s.normalBias = 0.04;
  s.intensity = 0.5;
  s.autoUpdate = false;  // rendered once on the first full frame
  s.needsUpdate = true;
  scene.add(light, light.target);
  sunLight = light;
  sunShadow = shadow(light);
  return light;
}

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
export const makeBlobMaterial = () => new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
