// ATM (atm_out outside the bank). The camera zooms onto the ATM and the UI is a real-looking ATM
// fascia: header with the bank, side keys lined up with option pills, card -> PIN -> menu ->
// fast cash / balance, notes sliding out of the cash slot, card eject on exit.
import { Vector3 } from 'three/webgpu';
import { t, tf, fmt } from '../i18n.js';
import { el, button, pinPad, amountPicker, toast, toastError } from './widgets.js';
import { openScreen } from './screens.js';
import brand from '../../data/brand.json';
import './atm.css';

const ZOOM = 0.9; // metres in front of the ATM screen
const FAST = [5, 10, 20, 50];
const camPos = new Vector3(), dir = new Vector3();

export function openAtm({ econ, rig, player, anchors }) {
  const scr = anchors?.atm_screen, view = anchors?.atm_view;
  if (scr && view) { // ease the camera onto the ATM screen; hide the kid so he does not block it
    dir.subVectors(view, scr).normalize();
    rig.shot(camPos.copy(scr).addScaledVector(dir, ZOOM), scr, true);
    player.group.visible = false;
  }
  const zoomOut = () => { rig.shot(null, null, true); player.group.visible = true; };

  openScreen(t('atm.title'), (body, close) => {
    const s = econ.state;
    const face = el('div', 'atm-face', body);
    el('div', 'atm-brand', face, brand.short);
    const keysL = el('div', 'atm-keys', face), display = el('div', 'atm-display', face), keysR = el('div', 'atm-keys', face);
    const head = el('div', 'atm-head', display);
    const logo = el('img', 'atm-logo', head);
    logo.alt = '';
    logo.onerror = () => logo.remove();
    logo.src = brand.logo;
    el('b', 'atm-bank', head, brand.bankName);
    el('small', 'atm-help', head, t('atm.help'));
    const stage = el('div', 'atm-stage', display);
    const cashSlot = el('div', 'atm-cash', face);
    const keyBtns = [keysL, keysR].map((col) => [0, 1, 2, 3].map(() => button(col, '', null, 'atm-key')));
    let pin = null;

    // view({ title, lines, content(el), left: [opt|null x4], right: [...] }) — opt: { label, fn, off }
    function view({ title = '', lines = [], content = null, left = [], right = [] }) {
      stage.replaceChildren();
      const mid = el('div', 'atm-mid', stage);
      if (title) el('h3', '', mid, title);
      for (const l of lines) el('p', '', mid, l);
      content?.(mid);
      [left, right].forEach((opts, side) => {
        const col = el('div', `atm-opts ${side ? 'right' : 'left'}`, stage);
        for (let r = 0; r < 4; r++) {
          const o = opts[r], key = keyBtns[side][r];
          const slot = el('div', 'atm-slot', col);
          key.onclick = o && !o.off ? o.fn : null;
          key.classList.toggle('live', !!o && !o.off);
          if (!o) continue;
          const pill = button(slot, '', o.off ? null : o.fn, `atm-opt${o.off ? ' off' : ''}`);
          el('span', '', pill, o.label);
          el('i', '', pill, side ? '›' : '‹');
        }
      });
    }

    function insertCard() {
      view({
        title: t('atm.insert'),
        lines: [t('atm.insertHint')],
        content(mid) {
          const card = el('button', 'atm-card', mid);
          card.type = 'button';
          el('i', 'chip', card);
          el('b', '', card, brand.short);
          el('span', 'num', card, '•••• 2026');
          el('small', '', card, s.account.name);
          card.onclick = () => { card.classList.add('in'); setTimeout(askPin, 650); };
        },
      });
    }

    function askPin() {
      view({ title: t('pin.enter'), content(mid) {
        const pad = pinPad(mid, (p) => {
          if (p !== s.account.pin) { toastError('BAD_PIN'); return pad.shake(); }
          pin = p;
          menu();
        });
      } });
    }

    const exit = { label: t('atm.exit'), fn: eject };
    function menu() {
      view({
        title: tf('atm.hello', { name: s.account.name }),
        lines: [t('atm.choose')],
        left: [null, null, { label: t('atm.balance'), fn: balance }, exit],
        right: [null, null, { label: t('atm.withdraw'), fn: fastCash }, null],
      });
    }

    function fastCash() {
      const max = Math.min(s.bank, s.walletCap - s.wallet);
      const opt = (n) => ({ label: tf('money', { n: fmt(n) }), fn: () => dispense(n), off: n > max });
      view({
        title: t('atm.fast'),
        lines: [tf('balance.bankLine', { n: fmt(s.bank) })],
        left: [opt(FAST[0]), opt(FAST[1]), { label: t('atm.other'), fn: other }, { label: t('atm.back'), fn: menu }],
        right: [opt(FAST[2]), opt(FAST[3]), null, null],
      });
      if (max <= 0) toastError(s.bank <= 0 ? 'NO_BALANCE' : 'WALLET_FULL');
    }

    function other() {
      let pick = null;
      view({
        title: t('atm.other'),
        content(mid) { pick = amountPicker(mid, () => Math.min(s.bank, s.walletCap - s.wallet), () => (s.bank <= 0 ? 'NO_BALANCE' : 'WALLET_FULL')); },
        left: [null, null, null, { label: t('atm.back'), fn: fastCash }],
        right: [null, null, null, { label: t('amount.confirm'), fn: () => dispense(pick.get()) }],
      });
    }

    function dispense(n) {
      const r = econ.withdraw(n, pin);
      if (!r.ok) return toastError(r.error);
      view({ title: t('atm.take'), lines: [tf('withdraw.done', { n: fmt(n) })] });
      cashSlot.classList.remove('out');
      void cashSlot.offsetWidth;
      cashSlot.classList.add('out');
      setTimeout(menu, 1800);
    }

    function balance() {
      view({
        title: t('atm.balance'),
        content(mid) {
          el('div', 'atm-big', mid, tf('money', { n: fmt(s.bank) }));
          el('p', '', mid, tf('balance.walletLine', { n: fmt(s.wallet) }));
        },
        left: [null, null, null, { label: t('atm.back'), fn: menu }],
      });
    }

    function eject() {
      view({ title: t('atm.cardBack'), content(mid) { el('div', 'atm-card out', mid).append(el('i', 'chip')); } });
      toast(t('atm.bye'), 'ok');
      setTimeout(close, 1200);
    }

    if (!s.account.opened) view({ title: t('atm.title'), lines: [t('err.NO_ACCOUNT')], left: [null, null, null, { label: t('atm.exit'), fn: close }] });
    else insertCard();
    return zoomOut;
  }, { cls: 'atm', live: true });
}
