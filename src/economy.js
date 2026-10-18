// Pure game economy: no DOM, no three. Content (jobs, items) is passed in, so tests run in Node.
// Every action returns { ok, error? } and, on success, emits 'econ' { action, state } on the bus.
// Islamic finance: no interest, no percentage returns, no random money.
import { emit } from './bus.js';

export const ERR = {
  NO_CASH: 'NO_CASH', WALLET_FULL: 'WALLET_FULL', NO_BALANCE: 'NO_BALANCE',
  BAD_PIN: 'BAD_PIN', NO_ENERGY: 'NO_ENERGY', NO_ACCOUNT: 'NO_ACCOUNT', BAD_INPUT: 'BAD_INPUT',
};
const TX_KEEP = 30, ENERGY = 3;

export function freshState() {
  return {
    wallet: 0, bank: 0, walletCap: 100,
    account: { opened: false, name: '', pin: '' },
    goal: null, inventory: [], equipped: {}, tx: [],
    day: 1, energy: ENERGY, badges: [], given: 0, ticket: null,
  };
}

// data: { jobs, items, start? }; saved: a state from save.js (missing fields are filled from freshState)
export function createEconomy(data, saved = null) {
  // data.start (data/economy.json): pocket money and wallet cap for a brand-new game
  const fresh = { ...freshState(), wallet: data.start?.startWallet ?? 0, walletCap: data.start?.walletCap ?? 100 };
  const s = { ...fresh, ...(saved ?? {}) };
  const fail = (error) => ({ ok: false, error });
  const amount = (n) => Number.isInteger(n) && n > 0;

  function log(type, value, ref = null) {
    s.tx.push({ t: Date.now(), day: s.day, type, amount: value, ref });
    if (s.tx.length > TX_KEEP) s.tx.splice(0, s.tx.length - TX_KEEP);
  }
  function badge(id) {
    if (s.badges.includes(id)) return;
    s.badges.push(id);
    emit('badge', { id });
  }
  function checkSavings() {
    if (s.bank >= 100) badge('saved_100');
    const g = s.goal && data.items[s.goal];
    if (g && s.bank >= g.price) badge('goal_reached');
  }
  function done(action, extra) {
    emit('econ', { action, state: s, ...extra });
    return { ok: true, ...extra };
  }

  const api = {
    state: s,

    openAccount(name, pin) {
      if (typeof name !== 'string' || !name.trim()) return fail(ERR.BAD_INPUT);
      if (!/^\d{4}$/.test(String(pin))) return fail(ERR.BAD_PIN);
      s.account = { opened: true, name: name.trim(), pin: String(pin) };
      return done('openAccount');
    },

    // Forgot the PIN: a new one is chosen at the bank teller (in person), never at the ATM.
    resetPin(pin) {
      if (!s.account.opened) return fail(ERR.NO_ACCOUNT);
      if (!/^\d{4}$/.test(String(pin))) return fail(ERR.BAD_PIN);
      s.account.pin = String(pin);
      return done('resetPin');
    },

    // Can this job be done right now? (check before starting it, so a finished job is never lost)
    canEarn(jobId) {
      const job = data.jobs[jobId];
      if (!job) return fail(ERR.BAD_INPUT);
      if (s.energy < (job.energy ?? 1)) return fail(ERR.NO_ENERGY);
      if (s.wallet + job.pay + (job.starBonus ?? 0) * 2 > s.walletCap) return fail(ERR.WALLET_FULL);
      return { ok: true };
    },

    // stars 1..3: fixed pay + a fixed bonus per extra star (never random)
    earn(jobId, stars = 1) {
      const can = api.canEarn(jobId);
      if (!can.ok) return can;
      const job = data.jobs[jobId], st = Math.min(3, Math.max(1, stars | 0));
      const pay = job.pay + (job.starBonus ?? 0) * (st - 1);
      s.wallet += pay;
      s.energy -= job.energy ?? 1;
      log('earn', pay, jobId);
      return done('earn', { amount: pay });
    },

    deposit(n) {
      if (!s.account.opened) return fail(ERR.NO_ACCOUNT);
      if (!amount(n)) return fail(ERR.BAD_INPUT);
      if (n > s.wallet) return fail(ERR.NO_CASH);
      s.wallet -= n;
      s.bank += n;
      log('deposit', n);
      badge('first_deposit');
      checkSavings();
      return done('deposit', { amount: n });
    },

    withdraw(n, pin) {
      if (!s.account.opened) return fail(ERR.NO_ACCOUNT);
      if (String(pin) !== s.account.pin) return fail(ERR.BAD_PIN);
      if (!amount(n)) return fail(ERR.BAD_INPUT);
      if (n > s.bank) return fail(ERR.NO_BALANCE);
      if (s.wallet + n > s.walletCap) return fail(ERR.WALLET_FULL);
      s.bank -= n;
      s.wallet += n;
      log('withdraw', n);
      return done('withdraw', { amount: n });
    },

    buy(itemId) {
      const it = data.items[itemId];
      if (!it) return fail(ERR.BAD_INPUT);
      if (it.price > s.wallet) return fail(ERR.NO_CASH);
      s.wallet -= it.price;
      if (it.keep && !s.inventory.includes(itemId)) s.inventory.push(itemId);
      log('buy', it.price, itemId);
      return done('buy', { item: itemId });
    },

    give(n) {
      if (!amount(n)) return fail(ERR.BAD_INPUT);
      if (n > s.wallet) return fail(ERR.NO_CASH);
      s.wallet -= n;
      s.given += n;
      log('give', n);
      badge('first_give');
      return done('give', { amount: n });
    },

    setGoal(itemId) {
      if (itemId !== null && !data.items[itemId]) return fail(ERR.BAD_INPUT);
      s.goal = itemId;
      checkSavings();
      return done('setGoal');
    },

    equip(itemId) {
      const it = data.items[itemId];
      if (!it?.slot || !s.inventory.includes(itemId)) return fail(ERR.BAD_INPUT);
      s.equipped[it.slot] = itemId;
      return done('equip', { item: itemId });
    },

    nextDay() {
      s.day += 1;
      s.energy = ENERGY;
      return done('nextDay');
    },
  };
  return api;
}
