// HUD (top-right): wallet, bank balance, savings-goal ring, energy, settings gear.
// Redraws on bus 'econ'; coins fly into the wallet when money arrives. Badges show as toasts.
import { on } from '../bus.js';
import { t, fmt } from '../i18n.js';
import { el, button, toast } from './widgets.js';

const RING = 2 * Math.PI * 20; // goal ring circumference (r = 20 in a 48x48 svg)

export function initHud({ host, econ, items, onSettings }) {
  const hud = el('div', 'hud', host);
  const pill = (icon, label) => {
    const p = el('div', 'hud-pill', hud);
    p.setAttribute('aria-label', t(label));
    el('span', 'ic', p, icon);
    return el('b', '', p);
  };
  const wallet = pill('🪙', 'hud.wallet');
  const walletPill = wallet.parentElement;
  const bank = pill('🏦', 'hud.bank');

  const goal = el('div', 'hud-goal', hud);
  goal.setAttribute('aria-label', t('hud.goal'));
  goal.innerHTML = `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" class="track"/><circle cx="24" cy="24" r="20" class="fill" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg><span></span>`;
  const ringFill = goal.querySelector('.fill'), goalIcon = goal.querySelector('span');

  const energy = el('div', 'hud-energy', hud);
  energy.setAttribute('aria-label', t('hud.energy'));
  const bolts = [0, 1, 2].map(() => el('i', '', energy, '⚡'));

  // out of energy: a moon button starts the next day
  const sleep = button(hud, '🌙', () => { econ.nextDay(); toast(t('day.new'), 'ok'); }, 'hud-gear hud-sleep');
  sleep.setAttribute('aria-label', t('day.sleep'));
  const gear = button(hud, '⚙️', onSettings, 'hud-gear');
  gear.setAttribute('aria-label', t('hud.settings'));

  function draw() {
    const s = econ.state;
    wallet.textContent = fmt(s.wallet);
    bank.textContent = s.account.opened ? fmt(s.bank) : '—';
    walletPill.classList.toggle('full', s.wallet >= s.walletCap);
    bolts.forEach((b, i) => b.classList.toggle('off', i >= s.energy));
    sleep.hidden = s.energy > 0;
    const g = s.goal && items[s.goal];
    goal.hidden = !g;
    if (g) {
      goalIcon.textContent = g.icon;
      ringFill.style.strokeDashoffset = String(RING * (1 - Math.min(1, s.bank / g.price)));
    }
  }

  // a few coins arc from the screen centre into the wallet pill
  function coinFly(count) {
    const to = walletPill.getBoundingClientRect();
    for (let i = 0; i < Math.min(8, count); i++) {
      const c = el('i', 'coin-fly', document.body, '🪙');
      c.style.setProperty('--dx', `${to.left + to.width / 2 - innerWidth / 2}px`);
      c.style.setProperty('--dy', `${to.top + to.height / 2 - innerHeight / 2}px`);
      c.style.animationDelay = `${i * 70}ms`;
      setTimeout(() => c.remove(), 900 + i * 70);
    }
    setTimeout(() => { walletPill.classList.remove('bump'); void walletPill.offsetWidth; walletPill.classList.add('bump'); }, 650);
  }

  on('econ', ({ action, amount }) => {
    draw();
    if ((action === 'earn' || action === 'withdraw') && amount) coinFly(Math.ceil(amount / 5));
  });
  on('badge', ({ id }) => toast(t(`badge.${id}`), 'badge'));
  on('ui:modal', ({ open }) => hud.classList.toggle('dim', open));
  draw();
  return { draw };
}
