import { WebGPURenderer, Scene } from 'three/webgpu';
import { applyI18n, t } from './i18n.js';
import { quality, detectTier, applyTier, frameGate, adaptResolution, createDebug } from './quality.js';
import { createCameraRig } from './camera.js';
import { setupSky, setupSun } from './world/light.js';
import { buildTown, computeBounds, modelNames } from './world/town.js';
import { loadModels } from './world/models.js';
import { loadSignFont } from './world/signs.js';
import brand from '../data/brand.json';
import townData from '../data/town.json';
import tiles from '../data/tiles.json';

// Shared handles for later phases (player, UI, bank interior).
export const game = { renderer: null, rig: null, scenes: {}, world: null };
// Per-frame callbacks: fn(dtSeconds, nowSeconds). Called only on rendered frames.
export const updaters = [];

let active = null;
let paused = false;
let last = 0;
let tickDebug = () => {};

export const setRenderPaused = (p) => { paused = !!p; };

export function setActiveScene(scene, cameraPreset = 'town') {
  active = scene;
  game.rig?.setPreset(cameraPreset, true);
}

const $ = (id) => document.getElementById(id);
const progress = (p) => { $('ld-bar').style.width = `${Math.round(p * 100)}%`; };

function applyBrand() {
  const root = document.documentElement.style;
  const { primary, secondary, accent } = brand.colors;
  root.setProperty('--c-primary', primary);
  root.setProperty('--c-secondary', secondary);
  root.setProperty('--c-accent', accent);
  document.querySelector('meta[name="theme-color"]').content = primary;
  $('ld-short').textContent = brand.short;
  const logo = $('ld-logo');
  logo.onload = () => { logo.hidden = false; };
  logo.src = brand.logo; // missing logo -> text fallback stays
}

function resize() {
  game.renderer.setSize(window.innerWidth, window.innerHeight, false);
  game.rig?.setAspect(window.innerWidth / window.innerHeight);
}

// P1 temporary camera: slow sweep over the town until the player arrives in P2.
function orbit(now) {
  const { rig, world } = game;
  rig.target.set(world.spawn.x + Math.sin(now * 0.05) * 36, 0, world.spawn.z - 4);
  rig.yaw = Math.sin(now * 0.1) * 0.55;
}

function frame(now) {
  if (!frameGate(now)) return;
  const dt = Math.min(now - last, 100);
  last = now;
  const sec = now / 1000;
  for (const fn of updaters) fn(dt / 1000, sec);
  orbit(sec);
  game.rig.update(dt / 1000);
  if (paused) return;
  game.renderer.render(active, game.rig.camera);
  tickDebug(now);
  adaptResolution(game.renderer, dt);
}

async function boot() {
  applyI18n();
  applyBrand();
  progress(0.05);

  const renderer = new WebGPURenderer({ canvas: $('c'), antialias: navigator.maxTouchPoints === 0, powerPreference: 'high-performance' });
  await renderer.init(); // falls back to WebGL2 automatically
  game.renderer = renderer;
  applyTier(detectTier(renderer), renderer);
  tickDebug = createDebug(renderer);
  progress(0.2);

  const [, models] = await Promise.all([loadSignFont(), loadModels(modelNames(tiles), (p) => progress(0.2 + p * 0.3))]);
  progress(0.5);

  const scene = new Scene();
  setupSky(scene);
  setupSun(scene, computeBounds(townData, tiles), quality); // must exist before materials are built
  const world = buildTown({ town: townData, tiles, brand, quality, models });
  scene.add(world.group);
  game.scenes.town = scene;
  game.world = world;
  progress(0.7);

  game.rig = createCameraRig();
  game.rig.target.copy(world.spawn);
  resize();
  setActiveScene(scene, 'town');
  await renderer.compileAsync(scene, game.rig.camera);
  progress(1);

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else { last = performance.now(); renderer.setAnimationLoop(frame); }
  });
  last = performance.now();
  renderer.setAnimationLoop(frame);

  const loader = $('loader');
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 500);
}

boot().catch((err) => {
  console.error(err);
  $('ld-text').textContent = t('loading.error');
  document.querySelector('.ld-bar').hidden = true;
});
