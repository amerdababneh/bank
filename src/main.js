import { WebGPURenderer, Scene } from 'three/webgpu';
import { applyI18n, t } from './i18n.js';
import { quality, detectTier, applyTier, frameGate, adaptResolution, createDebug } from './quality.js';
import { createCameraRig } from './camera.js';
import { createPost, initFx, onFx, postActive, createWind, uWindCenter, createFlags } from './world/fx.js';
import { createParticles } from './world/particles.js';
import { PLAYER_LAYER } from './world/light.js';
import { initFxPanel } from './ui/fxpanel.js';
import { setupSky, setupSun } from './world/light.js';
import { buildTown, computeBounds, modelNames } from './world/town.js';
import { loadModels, loadGltf } from './world/models.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createEconomy } from './economy.js';
import { loadSave, initAutosave } from './save.js';
import { initAudio } from './audio.js';
import { asset } from './paths.js';
import jobs from '../data/jobs.json';
import items from '../data/items.json';
import start from '../data/economy.json';
import { loadAnims, loadFbx } from './anims.js';
import { buildInterior, interiorModelNames, interiorNpcNames } from './world/interior.js';
import { createBoats, boatModelNames } from './world/boats.js';
import { createLandmarks } from './world/landmark.js';
import { createBillboards } from './world/billboards.js';
import bankLayout from '../data/bank.json';
import marketLayout from '../data/market.json';
import { initDoors } from './world/doors.js';
import { initPoiButton } from './ui/poi.js';
import { initDialogs } from './ui/dialog.js';
import { initHud } from './ui/hud.js';
import { openBank } from './ui/bank.js';
import { openAtm } from './ui/atm.js';
import { openSettings, initSettings } from './ui/settings.js';
import { openPhoneApp } from './ui/phoneapp.js';
import { on } from './bus.js';
import { dialogGates } from './ui/dialog.js';
import { startJob } from './jobs/runner.js';
import { loadSignFont } from './world/signs.js';
import brand from '../data/brand.json';
import townData from '../data/town.json';
import tiles from '../data/tiles.json';

// Shared handles for later phases (player, UI, interiors).
const LAYOUTS = { bank: bankLayout, market: marketLayout };
export const game = { renderer: null, rig: null, scenes: {}, world: null, worlds: {}, player: null, econ: null };
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
  logo.src = asset(brand.logo); // missing logo -> text fallback stays
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

// Loading timings in the console (where the wait goes on slow devices): [boot] step: ms
const T0 = performance.now();
let tPrev = T0;
function stage(name, p) {
  const now = performance.now();
  console.info(`[boot] ${name}: ${Math.round(now - tPrev)} ms (total ${Math.round(now - T0)} ms)`);
  tPrev = now;
  if (p !== undefined) progress(p);
}

async function boot() {
  game.econ = createEconomy({ jobs, items, start }, loadSave());
  initAutosave(game.econ);
  applyI18n();
  applyBrand();
  progress(0.05);

  const renderer = new WebGPURenderer({ canvas: $('c'), antialias: navigator.maxTouchPoints === 0, powerPreference: 'high-performance' });
  await renderer.init(); // falls back to WebGL2 automatically
  game.renderer = renderer;
  applyTier(detectTier(renderer), renderer);
  tickDebug = createDebug(renderer);
  progress(0.2);

  const [, models, boy, girl, anims, npcFbx, palmFbx] = await Promise.all([
    loadSignFont(), loadModels([...modelNames(tiles), ...Object.values(LAYOUTS).flatMap(interiorModelNames), ...boatModelNames(townData.boats)], (p) => progress(0.2 + p * 0.3)), loadGltf('kid_boy'), loadGltf('kid_girl'), loadAnims(), loadFbx(Object.values(LAYOUTS).flatMap(interiorNpcNames)), loadFbx(tiles.palm?.fbx ? [tiles.palm.fbx] : []),
  ]);
  if (tiles.palm?.fbx && palmFbx[tiles.palm.fbx]) models.palm = palmFbx[tiles.palm.fbx]; // town palms from the FBX
  stage('downloads (models, FBX, font)', 0.5);

  const scene = new Scene();
  setupSky(scene);
  setupSun(scene, computeBounds(townData, tiles), quality); // must exist before materials are built
  const world = buildTown({ town: townData, tiles, brand, quality, models });
  scene.add(world.group);
  scene.add(createLandmarks(townData.landmarks)); // QIB HQ + Doha Tower on the island
  const ads = createBillboards(townData.billboards, brand); // QIB ad boards + one on the bank wall
  scene.add(ads.group);
  world.colliders.push(...ads.colliders);
  const boats = createBoats(townData.boats, models); // parked + sailing ships around the town
  scene.add(boats.group);
  updaters.push((dt, now) => boats.update(dt, now));
  // flags: in front of buildings (tiles.json) + free-standing ones from town.json (corniche, bridge, island)
  const flags = createFlags([...world.flags, ...(townData.flags ?? []).map(([x, z]) => ({ x, z, ry: 0 }))], brand.flag);
  scene.add(flags.group);
  world.colliders.push(...flags.colliders);
  game.scenes.town = scene;
  game.world = world;
  const interiors = {};
  game.worlds = { town: world };
  for (const [name, layout] of Object.entries(LAYOUTS)) {
    interiors[name] = buildInterior({ brand, layout, models, npcFbx, quality });
    game.scenes[name] = interiors[name].scene;
    game.worlds[name] = interiors[name];
  }
  stage('build town + interiors', 0.7);

  game.rig = createCameraRig();
  game.rig.camera.layers.enable(PLAYER_LAYER);
  resize();

  const input = createInput({ canvas: $('c'), host: $('ui'), camera: game.rig.camera });
  const player = createPlayer({ input, rig: game.rig, glbs: { boy, girl }, anims });
  game.player = player;
  player.setLook('boy', 0);
  player.setWorld(world);
  player.teleport(world.spawn.x, world.spawn.z, Math.PI); // facing the bank, camera behind
  scene.add(player.group);
  updaters.push(player.update);
  initAudio();
  updaters.push((dt) => { for (const w of Object.values(interiors)) if (w.scene === active) w.update(dt); });
  initDoors({ game, player, input, setActiveScene, interiors });
  initPoiButton($('ui'));
  initDialogs({ host: document.body, player, rig: game.rig, input, econ: game.econ, worlds: game.worlds });

  // P4 UI: HUD, bank (after the teller conversation), ATM, settings; full-screen screens pause the 3D
  initSettings();
  const hud = initHud({ host: $('ui'), econ: game.econ, items, rig: game.rig, onApp: () => openPhoneApp({ econ: game.econ, items }), onSettings: () => openSettings({ econ: game.econ }) });
  on('dialog:end', ({ next }) => {
    if (next === 'open_account' || next === 'bank') openBank({ econ: game.econ, items, bankName: brand.bankName });
    else if (next?.startsWith('job:')) startJob({ econ: game.econ, jobs, jobId: next.slice(4) });
  });
  // P5: the manager only offers work when the kid can do it (energy left, room in the wallet)
  dialogGates.market_checkout = () => { const c = game.econ.canEarn('market'); return c.ok ? null : c.error; };
  on('interact', ({ poiId }) => { if (poiId === 'atm_out') openAtm({ econ: game.econ, rig: game.rig, player, anchors: world.anchors }); });
  on('ui:modal', ({ open, live }) => { setRenderPaused(open && !live); input.setEnabled(!open); });

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
  stage('compile town shaders', 0.8);
  if (postActive()) post.render(scene);
  stage('first town frame', 1);

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else { last = performance.now(); renderer.setAnimationLoop(frame); }
  });
  last = performance.now();
  renderer.setAnimationLoop(frame);

  // Interiors compile in the background once the town is playable (not behind the loader); their
  // shadow bake + the kid's indoor look finish behind the door's loading card on first entry.
  setTimeout(async () => {
    for (const w of Object.values(interiors)) await renderer.compileAsync(w.scene, game.rig.camera);
    stage('background: interiors compiled');
  }, 1200);

  const loader = $('loader');
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 500);
}

boot().catch((err) => {
  console.error(err);
  $('ld-text').textContent = t('loading.error');
  document.querySelector('.ld-bar').hidden = true;
});
