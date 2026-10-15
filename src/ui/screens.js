// Screen manager: one full-screen screen at a time. While one is open the 3D view stops rendering
// and the controls are off (bus 'ui:modal' { open } — main.js reacts).
import { emit } from '../bus.js';
import { shell } from './widgets.js';

let current = null;

// build(body, close) fills the screen; returns an optional cleanup fn.
// opts.cls: extra class (e.g. 'atm'); opts.live: keep rendering the 3D view (no pause).
export function openScreen(title, build, opts = {}) {
  closeScreen();
  const s = shell(title, () => closeScreen());
  if (opts.cls) s.root.classList.add(opts.cls);
  document.body.append(s.root);
  current = { root: s.root, cleanup: null, live: !!opts.live };
  requestAnimationFrame(() => s.root.classList.add('on'));
  emit('ui:modal', { open: true, live: !!opts.live });
  try {
    current.cleanup = build(s.body, closeScreen, s) ?? null;
  } catch (err) { // never leave a half-built screen covering the game
    console.error(err);
    closeScreen();
  }
}

export function closeScreen() {
  if (!current) return;
  const { root, cleanup, live } = current;
  current = null;
  cleanup?.();
  root.classList.remove('on');
  setTimeout(() => root.remove(), 250);
  emit('ui:modal', { open: false, live });
}

export const screenOpen = () => !!current;
