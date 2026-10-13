// Footstep dust, POI sparkles and drifting cloud cards. Pooled InstancedMeshes, no per-frame allocation.
import {
  InstancedMesh, Object3D, IcosahedronGeometry, OctahedronGeometry, MeshBasicMaterial, Sprite, SpriteMaterial,
  CanvasTexture, SRGBColorSpace, Group,
} from 'three/webgpu';
import { makeLit } from './light.js';

const DUST_LIFE = 0.6, DUST_EVERY = 0.09;
const tmp = new Object3D();

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  for (const [x, y, r] of [[40, 38, 22], [64, 30, 28], [90, 38, 22], [64, 44, 24]]) {
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 64);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
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
  const cMat = new SpriteMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: false });
  const spanX = bounds.maxX - bounds.minX + 160;
  for (let i = 0; i < 7; i++) {
    const s = new Sprite(cMat);
    const k = 0.7 + ((i * 37) % 10) / 15;
    s.scale.set(34 * k, 15 * k, 1);
    s.position.set(bounds.minX - 80 + (i / 7) * spanX, 38 + ((i * 13) % 5) * 4, bounds.minZ - 60 + ((i * 29) % 7) * 18);
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
          if (c.position.x > bounds.maxX + 80) c.position.x = bounds.minX - 80;
        }
      }
    },
  };
}
