// Web Audio: background loop + footsteps that fade in while the player moves.
// Browsers only allow sound after a user gesture, so the context starts on the first tap/key.
// Files: public/audio/<name>.mp3. Missing files are simply silent.

const FILES = { music: 'loop', steps: 'steps' };
const VOL = { music: 0.35, steps: 0.6 };
const STEP_REF = 2.8; // m/s at which the steps play at normal rate
const DUCK = 0.25;    // music level (x normal) while a voice line plays

let ctx = null, master = null, muted = false;
const gains = {}, sources = {};

async function load(name) {
  try {
    const res = await fetch(`/audio/${name}.mp3`);
    if (!res.ok || !res.headers.get('content-type')?.includes('audio')) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function loop(key, buffer, volume) {
  const g = ctx.createGain();
  g.gain.value = volume;
  g.connect(master);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(g);
  src.start();
  gains[key] = g;
  sources[key] = src;
}

async function start() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  const [music, steps] = await Promise.all([load(FILES.music), load(FILES.steps)]);
  if (music) loop('music', music, VOL.music);
  if (steps) loop('steps', steps, 0); // silent until the player moves
}

export function initAudio() {
  const unlock = () => {
    start();
    if (ctx?.state === 'suspended') ctx.resume();
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}

// Per frame: speed in m/s. Fades the steps in/out; cadence follows the speed. No allocations.
export function setStepSpeed(speed) {
  const g = gains.steps;
  if (!g) return;
  const moving = speed > 0.3;
  g.gain.setTargetAtTime(moving ? VOL.steps : 0, ctx.currentTime, moving ? 0.05 : 0.08);
  if (moving) sources.steps.playbackRate.value = Math.min(1.25, Math.max(0.75, speed / STEP_REF));
}

// For the settings screen (P4).
export function setMuted(on) {
  muted = on;
  if (master) master.gain.setTargetAtTime(on ? 0 : 1, ctx.currentTime, 0.05);
}

// Spoken dialog lines: public/audio/voice/<key>.mp3 (e.g. dlg.teller.hello.mp3). null stops the current one.
let voice = null;
export function playVoice(key) {
  voice?.pause();
  voice = null;
  duck(false);
  if (!key || muted) return;
  const v = new Audio(`/audio/voice/${key}.mp3`);
  voice = v;
  v.onplaying = () => duck(true);
  v.onended = () => { if (voice === v) duck(false); };
  v.play().catch(() => {}); // missing file or blocked: stay silent
}

// Music dips while someone speaks.
function duck(on) {
  const g = gains.music;
  if (g) g.gain.setTargetAtTime(on ? VOL.music * DUCK : VOL.music, ctx.currentTime, on ? 0.12 : 0.4);
}
