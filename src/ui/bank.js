// Bank screen (opened by the teller conversation). First time: open an account (name -> PIN ->
// confirm PIN, with the "never share your PIN" tip). Then tabs: deposit, withdraw, balance, goal,
// statement. Amounts use chips, never the keyboard; withdrawing asks for the PIN.
import { t, tf, fmt } from '../i18n.js';
import { el, button, pinPad, amountPicker, toast, toastError } from './widgets.js';
import { openScreen } from './screens.js';

const TABS = ['deposit', 'withdraw', 'balance', 'goal', 'statement'];
const TX_SIGN = { earn: '+', withdraw: '+', deposit: '−', buy: '−', give: '−' };

export function openBank({ econ, items, bankName }) {
  // ---- step-by-step account opening
  function openAccount(body, done) {
    body.replaceChildren();
    el('h3', 'step-title', body, t('open.title'));
    const box = el('div', 'step', body);
    el('p', 'step-q', box, t('open.name'));
    const name = el('input', 'name-in', box);
    name.maxLength = 16;
    name.dir = 'rtl';
    name.autocomplete = 'off';
    button(box, t('open.next'), () => {
      if (!name.value.trim()) return toastError('BAD_INPUT');
      askPin(name.value.trim());
    }, 'primary big');
    setTimeout(() => name.focus(), 300);

    function askPin(nm) {
      box.replaceChildren();
      el('p', 'step-q', box, t('open.pin'));
      el('p', 'tip', box, `🔒 ${t('open.tip')}`);
      let first = null;
      const pad = pinPad(box, (pin) => {
        if (!first) {
          first = pin;
          q.textContent = t('open.pin2');
          pad.reset();
          return;
        }
        if (pin !== first) {
          toast(t('pin.mismatch'), 'err');
          first = null;
          q.textContent = t('open.pin');
          return pad.shake();
        }
        econ.openAccount(nm, pin);
        toast(t('open.done'), 'ok');
        done();
      });
      const q = box.querySelector('.step-q');
    }
  }

  // ---- tabs
  function tabs(body) {
    const bar = el('div', 'tabs', body);
    const page = el('div', 'tab-page', body);
    const btns = {};
    const show = (id) => {
      for (const k in btns) btns[k].classList.toggle('on', k === id);
      page.replaceChildren();
      PAGES[id](page);
    };
    for (const id of TABS) btns[id] = button(bar, t(`tab.${id}`), () => show(id), 'tab');
    show('deposit');
  }

  const PAGES = {
    deposit(page) {
      el('p', 'hint', page, tf('balance.walletLine', { n: fmt(econ.state.wallet) }));
      const pick = amountPicker(page, () => econ.state.wallet, () => 'NO_CASH');
      button(page, t('amount.confirm'), () => {
        const r = econ.deposit(pick.get());
        if (!r.ok) return toastError(r.error);
        toast(tf('deposit.done', { n: fmt(r.amount) }), 'ok');
        page.replaceChildren();
        PAGES.deposit(page);
      }, 'primary big');
    },

    withdraw(page) {
      const s = econ.state;
      el('p', 'hint', page, tf('balance.bankLine', { n: fmt(s.bank) }));
      const pick = amountPicker(page, () => Math.min(s.bank, s.walletCap - s.wallet), () => (s.bank <= 0 ? 'NO_BALANCE' : 'WALLET_FULL'));
      button(page, t('amount.confirm'), () => {
        if (!pick.get()) return toastError('BAD_INPUT');
        const n = pick.get();
        page.replaceChildren();
        el('p', 'step-q', page, t('pin.enter'));
        const pad = pinPad(page, (pin) => {
          const r = econ.withdraw(n, pin);
          if (!r.ok) {
            toastError(r.error);
            return r.error === 'BAD_PIN' ? pad.shake() : (page.replaceChildren(), PAGES.withdraw(page));
          }
          toast(tf('withdraw.done', { n: fmt(n) }), 'ok');
          page.replaceChildren();
          PAGES.withdraw(page);
        });
      }, 'primary big');
    },

    balance(page) {
      const s = econ.state;
      const row = el('div', 'big-balances', page);
      for (const [label, v, ic] of [['balance.wallet', s.wallet, '🪙'], ['balance.bank', s.bank, '🏦']]) {
        const c = el('div', 'bal-card', row);
        el('span', 'ic', c, ic);
        el('b', '', c, tf('money', { n: fmt(v) }));
        el('small', '', c, t(label));
      }
      el('p', 'tip', page, `💡 ${t('balance.tip')}`);
    },

    goal(page) {
      const s = econ.state, g = s.goal && items[s.goal];
      if (g) {
        const prog = el('div', 'goal-now', page);
        el('span', 'ic', prog, g.icon);
        el('b', '', prog, g.name);
        const bar = el('div', 'progress', prog);
        el('i', '', bar).style.width = `${Math.min(100, (s.bank / g.price) * 100)}%`;
        el('small', '', prog, s.bank >= g.price ? t('goal.reached') : tf('goal.progress', { n: fmt(s.bank), m: fmt(g.price) }));
      }
      el('p', 'step-q', page, t('goal.pick'));
      const grid = el('div', 'item-grid', page);
      for (const [id, it] of Object.entries(items)) {
        const b = button(grid, '', () => { econ.setGoal(id); page.replaceChildren(); PAGES.goal(page); }, `item${s.goal === id ? ' on' : ''}`);
        el('span', 'ic', b, it.icon);
        el('b', '', b, it.name);
        el('small', '', b, tf('money', { n: fmt(it.price) }));
      }
    },

    statement(page) {
      const tx = [...econ.state.tx].reverse();
      if (!tx.length) return el('p', 'hint', page, t('statement.empty'));
      const list = el('div', 'tx-list', page);
      for (const r of tx) {
        const row = el('div', `tx ${r.type}`, list);
        el('span', '', row, t(`tx.${r.type}`) + (r.ref && items[r.ref] ? ` · ${items[r.ref].name}` : ''));
        el('small', '', row, tf('day', { n: fmt(r.day) }));
        el('b', '', row, `${TX_SIGN[r.type] ?? ''}${fmt(r.amount)}`);
      }
    },
  };

  // opened last: the pages above must exist before the first tab is drawn
  openScreen(bankName, (body) => {
    if (econ.state.account.opened) tabs(body);
    else openAccount(body, () => { body.replaceChildren(); tabs(body); });
  });
}
