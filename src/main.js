import { WebGPURenderer, Scene } from 'three/webgpu';
import { applyI18n, t } from './i18n.js';
import { quality, detectTier, applyTier, frameGate, adaptResolution, createDebug } from './quality.js';
import { createCameraRig } from './camera.js';
import { createPost, initFx, onFx, postActive, createWind, uWindCenter } from './world/fx.js';
import { createParticles } from './world/particles.js';
import { PLAYER_LAYER } from './world/light.js';
import { initFxPanel } from './ui/fxpanel.js';
import { setupSky, setupSun } from './world/light.js';
import { buildTown, computeBounds, modelNames } from './world/town.js';
import { loadModels, loadGltf } from './world/models.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { buildBank } from './world/bank.js';
import { initDoors } from './world/doors.js';
import { initPoiButton } from './ui/poi.js';
import { loadSignFont } from './world/signs.js';
import brand from '../data/brand.json';
import townData from '../data/town.json';
import tiles from '../data/tiles.json';

// Shared handles for later phases (player, UI, bank interior).
export const game = { renderer: null, rig: null, scenes: {}, world: null, worlds: {}, player: null };
// Per-frame callbacks: fn(dtSeconds, nowSeconds). Called only on rendered frames.
export const updaters = [];

let active = null;
let paused = false;
let last = 0;
let tickDebug = () => {};
let post = null; // used only while a post effect is switched on

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

function frame(now) {
  if (!frameGate(now)) return;
  const dt = Math.min(now - last, 100);
  last = now;
  const sec = now / 1000;
  for (const fn of updaters) fn(dt / 1000, sec);
  game.rig.update(dt / 1000);
  if (paused) return;
  if (post && postActive()) post.render(active);
  else game.renderer.render(active, game.rig.camera);
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

  const [, models, boy, girl] = await Promise.all([
    loadSignFont(), loadModels(modelNames(tiles), (p) => progress(0.2 + p * 0.3)), loadGltf('kid_boy'), loadGltf('kid_girl'),
  ]);
  progress(0.5);

  const scene = new Scene();
  setupSky(scene);
  setupSun(scene, computeBounds(townData, tiles), quality); // must exist before materials are built
  const world = buildTown({ town: townData, tiles, brand, quality, models });
  scene.add(world.group);
  game.scenes.town = scene;
  game.world = world;
  const bank = buildBank({ brand });
  game.scenes.bank = bank.scene;
  game.worlds = { town: world, bank };
  progress(0.7);

  game.rig = createCameraRig();
  game.rig.camera.layers.enable(PLAYER_LAYER);
  resize();

  const input = createInput({ canvas: $('c'), host: $('ui'), camera: game.rig.camera });
  const player = createPlayer({ input, rig: game.rig, glbs: { boy, girl } });
  game.player = player;
  player.setLook('boy', 0);
  player.setWorld(world);
  player.teleport(world.spawn.x, world.spawn.z, Math.PI); // facing the bank, camera behind
  scene.add(player.group);
  updaters.push(player.update);
  initDoors({ game, player, input, setActiveScene });
  initPoiButton($('ui'));

  post = createPost(renderer, game.rig.camera, { outlined: player.outlined });
  const fx = createParticles({ pois: world.pois, bounds: world.bounds, budget: quality.particles });
  scene.add(fx.group);
  const wind = createWind(quality);
  scene.add(wind.ribbons, wind.leaves);
  onFx((name, on) => { fx.set(name, on); wind.set(name, on); });
  updaters.push((dt, now) => {
    const sc = player.group.parent; // dust follows the player between scenes
    if (sc && fx.dust.parent !== sc) sc.add(fx.dust);
    fx.update(dt, now, player.feet, player.speed);
    uWindCenter.value.copy(player.feet);
  });
  initFx(quality);
  initFxPanel();

  setActiveScene(scene, 'town');
  await renderer.compileAsync(scene, game.rig.camera);
  await renderer.compileAsync(bank.scene, game.rig.camera);
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
