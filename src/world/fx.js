// Effect switches + post-processing. Shader effects flip uniforms in light.js (fxU); post effects
// rebuild the RenderPipeline. Defaults depend on the tier; ?fx shows a panel to try them live.
import {
  RenderPipeline, Vector3, InstancedMesh, PlaneGeometry, OctahedronGeometry, MeshBasicNodeMaterial, DoubleSide,
  Group, Mesh, CylinderGeometry, CanvasTexture, SRGBColorSpace, Box3,
} from 'three/webgpu';
import {
  pass, mrt, output, normalView, normalWorld, positionWorld, directionToColor, colorToDirection, sample,
  screenUV, saturation, vec2, vec3, vec4, smoothstep, step, float, blendColor,
  uniform, time, fract, hash, uv, sin, cos, mix, color, rotate, instanceIndex, positionLocal, texture,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { outline } from 'three/addons/tsl/display/OutlineNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { fxU, hasKidShadow, setBloomMask, makeLit } from './light.js';

const SAT = 1.12;                      // a little more colour
const TINT = vec3(1.03, 1.0, 0.96);    // warm Gulf sun
const VIG = 0.3;                       // corner darkening (0..1)
const BLOOM = { strength: 0.45, radius: 0.5, threshold: 0.82 }; // only the brightest pixels glow

// name -> [label, cost, kind]; kind: 'u' = shader uniform, 'obj' = scene objects, 'post' = pipeline
export const FX = {
  water: ['Water waves + foam', 'cheap', 'u'],
  sway: ['Palm sway', 'cheap', 'u'],
  rim: ['Kid rim light', 'cheap', 'u'],
  clouds: ['Clouds + cloud shadows', 'cheap', 'u'],
  ao: ['Fake AO (walls)', 'cheap', 'u'],
  haze: ['Sun haze / glow', 'cheap', 'u'],
  dust: ['Footstep dust', 'cheap', 'obj'],
  sparkles: ['POI sparkles', 'cheap', 'obj'],
  wind: ['Wind ribbons', 'cheap', 'obj'],
  leaves: ['Blowing leaves', 'cheap', 'obj'],
  kidShadow: ['Kid realtime shadow', 'mid', 'u'],
  grade: ['Colour grade + vignette', 'mid', 'post'],
  outline: ['Kid outline', 'mid', 'post'],
  bloom: ['Bloom', 'high', 'post'],
  gtao: ['GTAO (real AO)', 'demo', 'post'],
  ssr: ['SSR reflections', 'demo', 'post'],
};

const KEY = 'mk_fx';
// Demo look: the same effects on every device (chosen in the ?fx panel). null = pick by tier.
const DEMO_DEFAULTS = ['water', 'sway', 'rim', 'clouds', 'ao', 'haze', 'dust', 'sparkles', 'wind', 'leaves', 'grade', 'bloom'];
export const flags = {};
const listeners = [];
export const onFx = (fn) => listeners.push(fn);

export function initFx(quality) {
  const t = quality.tier;
  for (const k in FX) flags[k] = DEMO_DEFAULTS ? DEMO_DEFAULTS.includes(k)
    : FX[k][1] === 'cheap' || (FX[k][1] === 'mid' && t !== 'low') || (FX[k][1] === 'high' && t === 'high');
  if (new URLSearchParams(location.search).has('fx')) {
    try { Object.assign(flags, JSON.parse(localStorage.getItem(KEY)) ?? {}); } catch { /* ignore */ }
  }
  if (!hasKidShadow()) flags.kidShadow = false;
  for (const k in flags) apply(k);
}

function apply(name) {
  if (fxU[name]) fxU[name].value = flags[name] ? 1 : 0;
  if (name === 'bloom') setBloomMask(flags.bloom);
  for (const fn of listeners) fn(name, flags[name]);
}

export function setFx(name, on) {
  flags[name] = on;
  try { localStorage.setItem(KEY, JSON.stringify(flags)); } catch { /* ignore */ }
  apply(name);
}

export const postActive = () => Object.keys(FX).some((k) => FX[k][2] === 'post' && flags[k]);

// opts.outlined: objects that get an outline (the player)
export function createPost(renderer, camera, opts = {}) {
  const pipes = new Map();
  onFx((name) => { if (FX[name]?.[2] === 'post') { for (const p of pipes.values()) p.dispose(); pipes.clear(); } });

  function build(scene) {
    const scenePass = pass(scene, camera);
    const needGeo = flags.gtao || flags.ssr;
    const outs = { output };
    if (needGeo) {
      // floors and water near y=0 facing up are "glossy" for SSR
      const gloss = step(0.9, normalWorld.y).mul(step(positionWorld.y, 0.2)).mul(0.7);
      Object.assign(outs, { normal: directionToColor(normalView), metalrough: vec2(gloss, 0.15) });
    }
    if (flags.bloom) outs.bloomMask = float(1); // materials can override with mrtNode (the player writes 0)
    if (needGeo || flags.bloom) scenePass.setMRT(mrt(outs));
    const colorTex = scenePass.getTextureNode('output');
    let c = colorTex.rgb;
    if (needGeo) {
      const depth = scenePass.getTextureNode('depth');
      const normalTex = scenePass.getTextureNode('normal');
      const normal = sample((uv) => colorToDirection(normalTex.sample(uv)));
      if (flags.gtao) {
        const aoPass = ao(depth, normal, camera);
        aoPass.resolutionScale = 0.5;
        c = c.mul(aoPass.getTextureNode().sample(screenUV).r);
      }
      if (flags.ssr) {
        const mr = scenePass.getTextureNode('metalrough');
        const ssrPass = ssr(colorTex, depth, normal, { metalnessNode: mr.r, roughnessNode: mr.g, camera });
        ssrPass.resolutionScale = 0.5;
        c = blendColor(vec4(c, 1), ssrPass).rgb;
      }
    }
    if (flags.bloom) {
      const mask = scenePass.getTextureNode('bloomMask').r;
      c = c.add(bloom(vec4(c.mul(mask), 1), BLOOM.strength, BLOOM.radius, BLOOM.threshold).rgb);
    }
    if (flags.outline && opts.outlined) {
      const o = outline(scene, camera, { selectedObjects: opts.outlined, edgeThickness: float(1.5) });
      c = c.mul(o.visibleEdge.add(o.hiddenEdge.mul(0.6)).clamp(0, 1).mul(0.85).oneMinus());
    }
    if (flags.grade) {
      const vig = smoothstep(0.35, 0.85, screenUV.sub(0.5).length()).mul(VIG).oneMinus();
      c = saturation(c, float(SAT)).mul(TINT).mul(vig);
    }
    const pipe = new RenderPipeline(renderer);
    pipe.outputNode = vec4(c, 1);
    return pipe;
  }

  return {
    render(scene) {
      let p = pipes.get(scene);
      if (!p) pipes.set(scene, (p = build(scene)));
      p.render();
    },
  };
}

// ---- Wind ribbons + leaves (GPU only: each instance respawns at a hashed spot around the player every cycle)
const WIND_R = 14; // spawn radius around the player (m)
export const uWindCenter = uniform(new Vector3());

function cycleRand(rate, seed) {
  const t = time.mul(rate).add(seed.mul(0.173));
  const cycle = t.floor(), p = fract(t);
  const base = cycle.mul(131).add(seed.mul(17));
  return { p, h1: hash(base), h2: hash(base.add(1)), h3: hash(base.add(2)) };
}

export function createWind(quality) {
  const nRib = { low: 3, mid: 6, high: 8 }[quality.tier] ?? 4;
  const nLeaf = Math.round(quality.particles * 0.4);

  // ribbon: a long thin strip that flies along +x, curling, drawn as a fading trail behind its head
  const rSeed = float(instanceIndex);
  const r = cycleRand(0.22, rSeed);
  const u = uv();
  const ph = r.p.mul(6).add(rSeed);
  const rBase = uWindCenter.add(vec3(r.h1.sub(0.5).mul(WIND_R * 2), r.h2.mul(2.2).add(0.8), r.h3.sub(0.5).mul(WIND_R * 2)));
  const rPos = rBase.add(vec3(
    u.x.mul(5).add(r.p.mul(7)).sub(4),
    sin(u.x.mul(5).add(ph)).mul(0.35).add(positionLocal.y.mul(0.08)),
    cos(u.x.mul(3.5).add(ph.mul(0.7))).mul(0.5),
  ));
  const ribMat = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: DoubleSide });
  ribMat.positionNode = rPos;
  const pV = r.p.toVarying(), head = pV.mul(1.6).sub(0.3);
  const trail = smoothstep(head.sub(0.45), head, u.x).mul(step(u.x, head));
  ribMat.colorNode = vec4(1, 1, 1, 1);
  ribMat.opacityNode = trail.mul(sin(pV.mul(Math.PI))).mul(0.65);
  const ribbons = new InstancedMesh(new PlaneGeometry(1, 1, 24, 1).translate(0.5, 0, 0), ribMat, nRib);
  ribbons.frustumCulled = false;

  // leaves: tumbling green diamonds blown along the wind
  const lSeed = float(instanceIndex);
  const l = cycleRand(0.18, lSeed.add(50));
  const s = sin(l.p.mul(Math.PI)).min(1);
  const spin = vec3(time.mul(3).add(lSeed), time.mul(2.1).add(lSeed.mul(2)), time.mul(1.3));
  const lBase = uWindCenter.add(vec3(l.h1.sub(0.5).mul(WIND_R * 2), l.h2.mul(2.5).add(0.3), l.h3.sub(0.5).mul(WIND_R * 2)));
  const drift = vec3(l.p.mul(7), sin(l.p.mul(3).add(lSeed)).mul(0.6).sub(l.p.mul(0.8)), sin(l.p.mul(5).add(lSeed)).mul(0.8));
  const leafMat = new MeshBasicNodeMaterial({ side: DoubleSide });
  leafMat.positionNode = rotate(positionLocal.mul(s), spin).add(lBase).add(drift);
  leafMat.colorNode = vec4(mix(color('#4f9a34'), color('#a6d65c'), l.h1.toVarying()), 1);
  const leaves = new InstancedMesh(new OctahedronGeometry(0.07, 0).scale(1.5, 0.3, 0.9), leafMat, Math.max(1, nLeaf));
  leaves.count = nLeaf;
  leaves.frustumCulled = false;

  return {
    ribbons, leaves,
    set(name, on) {
      if (name === 'wind') ribbons.visible = on;
      if (name === 'leaves') leaves.visible = on;
    },
  };
}

// ---- Flags on poles (brand.json "flag": colours [hoist, field], serration points, white band width).
// The cloth waves on the GPU: displacement grows away from the pole, no per-frame CPU work.
const POLE_H = 6.5, FLAG_W = 2.0, FLAG_H = 1.25;

function flagTexture({ colors: [hoist, field], points = 9, band = 0.3 }) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = field;
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = hoist;
  const bx = band * 256, tip = bx + 256 * 0.12, step = 160 / points;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(bx, 0);
  for (let i = 0; i < points; i++) { g.lineTo(tip, (i + 0.5) * step); g.lineTo(bx, (i + 1) * step); }
  g.lineTo(0, 160);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

// list: [{ x, z, ry }] in world space. Returns { group, colliders }.
export function createFlags(list, cfg) {
  const group = new Group(), colliders = [];
  if (!list?.length || !cfg) return { group, colliders };
  const u = uv(), ph = positionLocal.x.div(FLAG_W); // 0 at the pole -> 1 at the free end
  const wave = sin(positionLocal.x.mul(2.6).sub(time.mul(4.2))).mul(ph).mul(0.18);
  const cloth = new MeshBasicNodeMaterial({ side: DoubleSide });
  cloth.positionNode = positionLocal.add(vec3(0, sin(time.mul(2.3).add(positionLocal.x)).mul(ph).mul(0.05), wave));
  const shade = cos(positionLocal.x.mul(2.6).sub(time.mul(4.2))).mul(ph).mul(0.12).add(0.95);
  cloth.colorNode = vec4(texture(flagTexture(cfg), u).rgb.mul(shade), 1);
  const clothGeo = new PlaneGeometry(FLAG_W, FLAG_H, 16, 6).translate(FLAG_W / 2, 0, 0);
  const poleGeo = new CylinderGeometry(0.05, 0.07, POLE_H, 8).translate(0, POLE_H / 2, 0);
  const poleMat = makeLit({ color: 0xd9dde2 });
  for (const f of list) {
    const holder = new Group();
    holder.position.set(f.x, 0, f.z);
    holder.rotation.y = f.ry;
    const pole = new Mesh(poleGeo, poleMat);
    pole.castShadow = true;
    const flag = new Mesh(clothGeo, cloth);
    flag.position.set(0.06, POLE_H - FLAG_H / 2 - 0.1, 0);
    holder.add(pole, flag);
    group.add(holder);
    colliders.push(new Box3(new Vector3(f.x - 0.15, 0, f.z - 0.15), new Vector3(f.x + 0.15, POLE_H, f.z + 0.15)));
  }
  return { group, colliders };
}
