// ATM screen (atm_out outside the bank): the camera zooms onto the ATM and the UI shows as its
// glowing display. PIN first, then withdraw (chips) or check the balance.
import { t, tf, fmt } from '../i18n.js';
import { el, button, pinPad, amountPicker, toast, toastError } from './widgets.js';
import { Vector3 } from 'three/webgpu';
import { openScreen } from './screens.js';

const ZOOM = 0.9; // metres in front of the ATM screen
const camPos = new Vector3(), dir = new Vector3();

export function openAtm({ econ, rig, player, anchors }) {
  const scr = anchors?.atm_screen, view = anchors?.atm_view;
  if (scr && view) { // ease the camera onto the ATM screen; hide the kid so he does not block it
    dir.subVectors(view, scr).normalize();
    rig.shot(camPos.copy(scr).addScaledVector(dir, ZOOM), scr, true);
    player.group.visible = false;
  }
  const zoomOut = () => { rig.shot(null, null, true); player.group.visible = true; };
  openScreen(t('atm.title'), (body) => {
    const s = econ.state;
    if (!s.account.opened) {
      el('p', 'step-q', body, t('err.NO_ACCOUNT'));
      return zoomOut;
    }
    let pin = null;
    el('p', 'step-q', body, t('pin.enter'));
    const pad = pinPad(body, (p) => {
      if (p !== s.account.pin) {
        toastError('BAD_PIN');
        return pad.shake();
      }
      pin = p;
      menu();
    });

    function menu() {
      body.replaceChildren();
      const row = el('div', 'atm-menu', body);
      button(row, `💵 ${t('atm.withdraw')}`, withdraw, 'primary big');
      button(row, `🧾 ${t('atm.balance')}`, balance, 'big');
    }

    function withdraw() {
      body.replaceChildren();
      el('p', 'hint', body, tf('balance.bankLine', { n: fmt(s.bank) }));
      const pick = amountPicker(body, () => Math.min(s.bank, s.walletCap - s.wallet), () => (s.bank <= 0 ? 'NO_BALANCE' : 'WALLET_FULL'));
      const row = el('div', 'atm-menu', body);
      button(row, t('amount.confirm'), () => {
        const r = econ.withdraw(pick.get(), pin);
        if (!r.ok) return toastError(r.error);
        toast(tf('withdraw.done', { n: fmt(r.amount) }), 'ok');
        menu();
      }, 'primary big');
      button(row, '↩', menu, 'big');
    }

    function balance() {
      body.replaceChildren();
      const c = el('div', 'bal-card solo', body);
      el('span', 'ic', c, '🏦');
      el('b', '', c, tf('money', { n: fmt(s.bank) }));
      el('small', '', c, t('balance.bank'));
      button(body, '↩', menu, 'big');
    }
    return zoomOut; // on close
  }, { cls: 'atm', live: true });
}
