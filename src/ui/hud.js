// HUD in the Coastal World style: brand mark top-left, round outline buttons top-right (sound,
// camera view, settings) and a tilted "phone" card bottom-left with wallet, bank, goal and energy.
// Redraws on bus 'econ'; coins fly into the wallet when money arrives. Badges show as toasts.
import { on } from '../bus.js';
import { t, fmt } from '../i18n.js';
import { el, button, toast } from './widgets.js';
import { setMuted } from '../audio.js';
import { asset } from '../paths.js';
import brand from '../../data/brand.json';

const RING = 2 * Math.PI * 20; // goal ring circumference (r = 20 in a 48x48 svg)
const MUTE_KEY = 'mk_mute';     // shared with the settings screen
const ICON = {
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="12.5" height="10" rx="2.5"/><path d="M15.5 11l5-3v8l-5-3"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M5 8h14M7 12h10M9.5 16h5"/></svg>',
};
const muted = () => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } };

export function initHud({ host, econ, items, rig, onSettings }) {
  // ---- brand mark (top-left)
  const mark = el('div', 'hud-brand', host);
  const logo = el('img', '', mark);
  logo.alt = '';
  logo.onerror = () => { logo.remove(); el('b', '', mark, brand.short); };
  logo.src = asset(brand.logo);

  // ---- round outline buttons (top-right)
  const top = el('div', 'hud-top', host);
  const round = (icon, label, fn) => {
    const b = button(top, '', fn, 'round-btn');
    b.innerHTML = ICON[icon];
    b.setAttribute('aria-label', t(label));
    return b;
  };
  const sound = round(muted() ? 'mute' : 'sound', 'settings.sound', () => {
    const m = !muted();
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
    setMuted(m);
    sound.innerHTML = ICON[m ? 'mute' : 'sound'];
  });
  round('camera', 'ui.camera', () => rig.setMode(rig.mode === 'top' ? 'follow' : 'top'));
  round('menu', 'hud.settings', onSettings);

  // ---- phone card (bottom-left)
  const phone = el('div', 'hud-phone', host);
  const row = (icon, label) => {
    const r = el('div', 'ph-row', phone);
    r.setAttribute('aria-label', t(label));
    el('span', 'ic', r, icon);
    return el('b', '', r);
  };
  const status = el('div', 'ph-status', phone);
  const goal = el('div', 'hud-goal', status);
  goal.setAttribute('aria-label', t('hud.goal'));
  goal.innerHTML = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" class="track"/><circle cx="24" cy="24" r="20" class="fill" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg><span></span>`;
  const ringFill = goal.querySelector('.fill'), goalIcon = goal.querySelector('span');
  const energy = el('div', 'hud-energy', status);
  energy.setAttribute('aria-label', t('hud.energy'));
  const bolts = [0, 1, 2].map(() => el('i', '', energy, '⚡'));
  // out of energy: a moon button starts the next day
  const sleep = button(status, '🌙', () => { econ.nextDay(); toast(t('day.new'), 'ok'); }, 'ph-sleep');
  sleep.setAttribute('aria-label', t('day.sleep'));
  const wallet = row('🪙', 'hud.wallet');
  const walletRow = wallet.parentElement;
  const bank = row('🏦', 'hud.bank');

  function draw() {
    const s = econ.state;
    wallet.textContent = fmt(s.wallet);
    bank.textContent = s.account.opened ? fmt(s.bank) : '—';
    walletRow.classList.toggle('full', s.wallet >= s.walletCap);
    bolts.forEach((b, i) => b.classList.toggle('off', i >= s.energy));
    sleep.hidden = s.energy > 0;
    const g = s.goal && items[s.goal];
    goal.classList.toggle('empty', !g);
    goalIcon.textContent = g ? g.icon : '🎯';
    ringFill.style.strokeDashoffset = String(g ? RING * (1 - Math.min(1, s.bank / g.price)) : RING);
  }

  // a few coins arc from the screen centre into the wallet row
  function coinFly(count) {
    const to = walletRow.getBoundingClientRect();
    for (let i = 0; i < Math.min(8, count); i++) {
      const c = el('i', 'coin-fly', document.body, '🪙');
      c.style.setProperty('--dx', `${to.left + to.width / 2 - innerWidth / 2}px`);
      c.style.setProperty('--dy', `${to.top + to.height / 2 - innerHeight / 2}px`);
      c.style.animationDelay = `${i * 70}ms`;
      setTimeout(() => c.remove(), 900 + i * 70);
    }
    setTimeout(() => { walletRow.classList.remove('bump'); void walletRow.offsetWidth; walletRow.classList.add('bump'); }, 650);
  }

  on('econ', ({ action, amount }) => {
    draw();
    if ((action === 'earn' || action === 'withdraw') && amount) coinFly(Math.ceil(amount / 5));
  });
  on('badge', ({ id }) => toast(t(`badge.${id}`), 'badge'));
  on('ui:modal', ({ open }) => document.body.classList.toggle('modal', open));
  draw();
  return { draw };
}
