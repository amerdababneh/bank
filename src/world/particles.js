// Footstep dust, POI sparkles and drifting cloud cards. Pooled InstancedMeshes, no per-frame allocation.
import {
  InstancedMesh, Object3D, IcosahedronGeometry, OctahedronGeometry, MeshBasicMaterial, Sprite, SpriteMaterial,
  CanvasTexture, SRGBColorSpace, Group,
} from 'three/webgpu';
import { makeLit } from './light.js';
import { asset } from '../paths.js';

const DUST_LIFE = 0.6, DUST_EVERY = 0.09, CLOUDS = 14, CLOUD_R = 340; // ring radius: well behind the island skyline
const tmp = new Object3D();

// Cloud art: public/textures/cloud.svg when present (drawn onto a canvas), otherwise generated soft puffs.
// onAspect(h / w) lets the sprites match the art's proportions once the SVG has loaded.
function cloudTexture(onAspect) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const puffs = [[70, 78, 40], [112, 60, 52], [160, 66, 46], [196, 82, 34], [128, 86, 44], [92, 92, 30], [170, 94, 30]];
  for (const [x, y, r] of puffs) {
    const grad = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.75)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const w = 512, h = Math.round((512 * img.naturalHeight) / img.naturalWidth) || 410;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    t.image = cv;
    t.needsUpdate = true;
    onAspect(h / w);
  };
  img.src = asset('textures/cloud.svg'); // missing file: keeps the generated cloud
  return t;
}

// pois: town POIs (sparkles); bounds: town bounds (clouds); budget: quality.particles
export function createParticles({ pois, bounds, budget }) {
  // dust: ring buffer at the player's feet
  const nDust = Math.min(16, budget);
  const dust = new InstancedMesh(new IcosahedronGeometry(0.09, 0), makeLit({ color: '#eadcbc', shadows: false, occlude: false }), nDust);
  dust.frustumCulled = false;
  const life = new Float32Array(nDust).fill(-1), px = new Float32Array(nDust), py = new Float32Array(nDust), pz = new Float32Array(nDust);
  let next = 0, acc = 0;

  // sparkles: a few per POI, orbiting and bobbing
  const per = pois.length ? Math.max(2, Math.floor((budget - nDust) / pois.length)) : 0;
  const nSp = per * pois.length;
  const sparkles = new InstancedMesh(new OctahedronGeometry(0.07, 0), new MeshBasicMaterial({ color: 0xffe27a }), Math.max(1, nSp));
  sparkles.frustumCulled = false;
  sparkles.count = nSp;

  // clouds: a handful of soft cards high over the town, drifting east
  const clouds = new Group();
  const cMat = new SpriteMaterial({
    map: cloudTexture((r) => { for (const c of clouds.children) c.scale.y = c.scale.x * r; }),
    transparent: true, depthWrite: false, fog: false, opacity: 0.85,
    color: 0xeef4fa, // a touch below pure white: soft, no bloom glow
  });
  // a ring of big, low clouds around the town: they hang just above the horizon where the low camera looks
  const cx = (bounds.minX + bounds.maxX) / 2, cz = (bounds.minZ + bounds.maxZ) / 2;
  for (let i = 0; i < CLOUDS; i++) {
    const s = new Sprite(cMat);
    const k = 0.7 + ((i * 37) % 10) / 15;
    s.scale.set(60 * k, 26 * k, 1);
    const a = (i / CLOUDS) * Math.PI * 2 + ((i * 7) % 5) * 0.12, rad = CLOUD_R + ((i * 29) % 9) * 10;
    s.position.set(cx + Math.sin(a) * rad, 30 + ((i * 13) % 5) * 7, cz - Math.cos(a) * rad);
    clouds.add(s);
  }

  const group = new Group();
  group.add(sparkles, clouds);

  return {
    group, dust,
    set(name, on) {
      if (name === 'dust') dust.visible = on;
      if (name === 'sparkles') sparkles.visible = on;
      if (name === 'clouds') clouds.visible = on;
    },
    // feet: player ground position; speed: m/s
    update(dt, now, feet, speed) {
      if (dust.visible) {
        acc += dt;
        if (speed > 1.5 && acc > DUST_EVERY) {
          acc = 0;
          life[next] = 0;
          px[next] = feet.x + (Math.random() - 0.5) * 0.3;
          py[next] = feet.y + 0.05;
          pz[next] = feet.z + (Math.random() - 0.5) * 0.3;
          next = (next + 1) % nDust;
        }
        for (let i = 0; i < nDust; i++) {
          let s = 0;
          if (life[i] >= 0) {
            life[i] += dt;
            const k = life[i] / DUST_LIFE;
            if (k >= 1) life[i] = -1;
            else s = Math.sin(k * Math.PI) * (0.6 + k);
          }
          tmp.position.set(px[i], py[i] + (life[i] > 0 ? life[i] * 0.5 : 0), pz[i]);
          tmp.scale.setScalar(s);
          tmp.updateMatrix();
          dust.setMatrixAt(i, tmp.matrix);
        }
        dust.instanceMatrix.needsUpdate = true;
      }
      if (sparkles.visible && nSp) {
        for (let i = 0; i < nSp; i++) {
          const p = pois[(i / per) | 0], a = now * 1.2 + i * 2.4;
          tmp.position.set(p.pos.x + Math.cos(a) * 0.7, 0.6 + ((i % per) / per) * 1.2 + Math.sin(now * 2 + i) * 0.15, p.pos.z + Math.sin(a) * 0.7);
          tmp.rotation.set(0, a * 2, 0);
          tmp.scale.setScalar(0.6 + 0.4 * Math.sin(now * 5 + i * 1.3));
          tmp.updateMatrix();
          sparkles.setMatrixAt(i, tmp.matrix);
        }
        sparkles.instanceMatrix.needsUpdate = true;
      }
      if (clouds.visible) {
        for (const c of clouds.children) {
          c.position.x += dt * 1.2;
          if (c.position.x > cx + CLOUD_R + 120) c.position.x = cx - CLOUD_R - 120;
        }
      }
    },
  };
}
