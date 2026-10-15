// Quality tiers (low/mid/high). Every effect reads `quality` instead of sniffing the device itself.
const TIERS = {
  low: { maxDpr: 1, shadows: false, shadowMap: 0, particles: 20, post: false, fpsCap: 30 },
  mid: { maxDpr: 1.5, shadows: true, shadowMap: 1024, particles: 60, post: true, fpsCap: 0 },
  high: { maxDpr: 2, shadows: true, shadowMap: 2048, particles: 150, post: true, fpsCap: 0 },
};
const params = new URLSearchParams(location.search);
const DEMO_TIER = 'high'; // set to null to pick the tier from the device again

export const quality = { tier: 'mid', ...TIERS.mid, dpr: 1 };

export function detectTier(renderer) {
  let saved = null;
  try { saved = localStorage.getItem('mk_tier'); } catch { /* ignore */ }
  const forced = params.get('tier') ?? saved; // ?tier= wins, then the settings screen choice
  if (TIERS[forced]) return forced;
  if (DEMO_TIER) return DEMO_TIER; // pitch demo: best look everywhere (dynamic resolution keeps fps up)
  const gpu = renderer.backend.isWebGPUBackend === true;
  const mem = navigator.deviceMemory ?? 0; // Chrome only; 0 = unknown (iOS Safari)
  const cores = navigator.hardwareConcurrency ?? 4;
  if (gpu) return mem >= 6 && cores >= 8 ? 'high' : 'mid';
  return (mem > 0 && mem <= 3) || cores <= 4 ? 'low' : 'mid';
}

export function applyTier(name, renderer) {
  Object.assign(quality, TIERS[name], { tier: name });
  quality.dpr = Math.min(quality.maxDpr, window.devicePixelRatio || 1);
  renderer.setPixelRatio(quality.dpr);
  renderer.shadowMap.enabled = quality.shadows;
}

// 30 fps cap on low: returns false when this animation frame should be skipped.
let lastRender = 0;
export function frameGate(now) {
  if (quality.fpsCap && now - lastRender < 1000 / quality.fpsCap - 4) return false;
  lastRender = now;
  return true;
}

// Dynamic resolution: every 2 s nudge the pixel ratio between 0.6 and the tier max.
let acc = 0, frames = 0, good = 0;
export function adaptResolution(renderer, dtMs) {
  acc += dtMs;
  frames++;
  if (acc < 2000) return;
  const fps = (frames * 1000) / acc;
  const target = quality.fpsCap || 58;
  const cap = Math.min(quality.maxDpr, window.devicePixelRatio || 1);
  let dpr = quality.dpr;
  if (fps < target * 0.9) {
    dpr = Math.max(0.6, dpr - 0.1);
    good = 0;
  } else if (fps > target * 0.97 && ++good >= 3) {
    dpr = Math.min(cap, dpr + 0.05);
    good = 0;
  }
  dpr = Math.round(dpr * 100) / 100;
  if (dpr !== quality.dpr) {
    quality.dpr = dpr;
    renderer.setPixelRatio(dpr);
  }
  acc = frames = 0;
}

// ?debug overlay: backend, tier, fps, dpr, draw calls, triangles. Returns a per-frame tick (no-op without ?debug).
export function createDebug(renderer) {
  if (!params.has('debug')) return () => {};
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:4px;left:4px;z-index:99;padding:4px 6px;background:rgba(0,0,0,.65);color:#9f9;font:11px/1.35 monospace;white-space:pre;pointer-events:none;direction:ltr;text-align:left';
  document.body.append(el);
  const backend = renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  let n = 0, t0 = performance.now();
  return (now) => {
    n++;
    if (now - t0 < 500) return;
    const i = renderer.info.render;
    el.textContent = `${backend} · ${quality.tier}\nfps ${((n * 1000) / (now - t0)).toFixed(0)}  dpr ${quality.dpr.toFixed(2)}\ncalls ${i.drawCalls}  tris ${i.triangles}`;
    n = 0;
    t0 = now;
  };
}
