// Small DOM kit for the kid-style screens: element helper, toasts, PIN pad, amount chips.
import { t, tf, fmt } from '../i18n.js';
import './screens.css';

export function el(tag, cls = '', parent = null, text = null) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== null) e.textContent = text;
  parent?.append(e);
  return e;
}

export function button(parent, text, onClick, cls = '') {
  const b = el('button', `kbtn ${cls}`, parent, text);
  b.type = 'button';
  b.onclick = onClick;
  return b;
}

// ---- toasts (top centre, stacked, auto-hide)
let toastBox = null;
export function toast(msg, kind = 'info') {
  toastBox ??= el('div', 'toasts', document.body);
  const tEl = el('div', `toast ${kind}`, toastBox, msg);
  setTimeout(() => tEl.classList.add('out'), 2600);
  setTimeout(() => tEl.remove(), 3100);
}
export const toastError = (code) => toast(t(`err.${code}`), 'err');

// ---- PIN pad: big 0-9 keys, 4 dots. onDone(pin) after the 4th digit; returns { el, reset, shake }.
export function pinPad(parent, onDone) {
  const wrap = el('div', 'pinpad', parent);
  const dots = el('div', 'pin-dots', wrap);
  const dEls = [0, 1, 2, 3].map(() => el('i', '', dots));
  const keys = el('div', 'pin-keys', wrap);
  let pin = '';
  const draw = () => dEls.forEach((d, i) => d.classList.toggle('on', i < pin.length));
  const press = (k) => {
    if (k === 'del') pin = pin.slice(0, -1);
    else if (pin.length < 4) pin += k;
    draw();
    if (pin.length === 4) setTimeout(() => onDone(pin), 120);
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0']) {
    button(keys, k === 'del' ? '⌫' : fmt(+k), () => press(k), k === 'del' ? 'key del' : 'key');
  }
  return {
    el: wrap,
    reset() { pin = ''; draw(); },
    shake() { wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); pin = ''; draw(); },
  };
}

// ---- amount picker: +1 +5 +10 +50 and "all" chips (no keyboard). getMax() caps it. onChange(n).
// whyZero(): error code shown when nothing can be picked (e.g. empty wallet).
export function amountPicker(parent, getMax, whyZero = null, onChange = () => {}) {
  const wrap = el('div', 'amount', parent);
  const show = el('div', 'amount-show', wrap);
  const chips = el('div', 'chips', wrap);
  let n = 0;
  const set = (v, tapped = false) => {
    if (tapped && getMax() <= 0 && whyZero) return toastError(whyZero());
    n = Math.max(0, Math.min(v, getMax()));
    show.textContent = tf('money', { n: fmt(n) });
    onChange(n);
  };
  for (const step of [1, 5, 10, 50]) button(chips, `+${fmt(step)}`, () => set(n + step, true), 'chip');
  button(chips, t('amount.all'), () => set(getMax(), true), 'chip all');
  button(chips, '↺', () => set(0), 'chip reset');
  set(0);
  return { el: wrap, get: () => n, reset: () => set(0) };
}

// ---- screen shell: title bar with close button; body to fill
export function shell(title, onClose) {
  const root = el('div', 'screen');
  const card = el('div', 'screen-card', root);
  const head = el('div', 'screen-head', card);
  el('h2', '', head, title);
  const x = button(head, '✕', onClose, 'close');
  x.setAttribute('aria-label', t('screen.close'));
  const body = el('div', 'screen-body', card);
  return { root, card, body };
}
