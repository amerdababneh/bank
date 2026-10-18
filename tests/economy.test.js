import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEconomy, ERR } from '../src/economy.js';
import { on } from '../src/bus.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url)));
const data = { jobs: load('jobs.json'), items: load('items.json') };
const econ = (state) => createEconomy(data, state);
const withAccount = (state) => {
  const e = econ(state);
  e.openAccount('سالم', '1234');
  return e;
};

test('earn pays the job, fixed star bonus, and uses energy', () => {
  const e = econ();
  assert.deepEqual(e.earn('market', 1), { ok: true, amount: 15 });
  assert.equal(e.earn('market', 3).amount, 19);
  assert.equal(e.state.wallet, 34);
  assert.equal(e.state.energy, 1);
});

test('NO_ENERGY after three jobs, nextDay restores it', () => {
  const e = econ();
  for (let i = 0; i < 3; i++) assert.ok(e.earn('market').ok);
  assert.equal(e.earn('market').error, ERR.NO_ENERGY);
  e.nextDay();
  assert.ok(e.earn('market').ok);
  assert.equal(e.state.day, 2);
});

test('WALLET_FULL blocks earning and withdrawing past the cap', () => {
  const e = withAccount({ wallet: 90 });
  assert.equal(e.canEarn('market').error, ERR.WALLET_FULL);
  assert.equal(e.earn('market').error, ERR.WALLET_FULL);
  assert.equal(e.state.energy, 3); // nothing spent on a refused job
  e.deposit(50);
  e.state.wallet = 95;
  assert.equal(e.withdraw(10, '1234').error, ERR.WALLET_FULL);
});

test('NO_ACCOUNT before opening an account', () => {
  const e = econ({ wallet: 20 });
  assert.equal(e.deposit(5).error, ERR.NO_ACCOUNT);
  assert.equal(e.withdraw(5, '1234').error, ERR.NO_ACCOUNT);
});

test('openAccount needs a name and a 4-digit PIN', () => {
  const e = econ();
  assert.equal(e.openAccount('', '1234').error, ERR.BAD_INPUT);
  assert.equal(e.openAccount('سالم', '12a4').error, ERR.BAD_PIN);
  assert.ok(e.openAccount('سالم', '1234').ok);
});

test('deposit: NO_CASH, moves money, first_deposit badge', () => {
  const e = withAccount({ wallet: 30 });
  assert.equal(e.deposit(31).error, ERR.NO_CASH);
  assert.equal(e.deposit(0).error, ERR.BAD_INPUT);
  assert.ok(e.deposit(30).ok);
  assert.equal(e.state.wallet, 0);
  assert.equal(e.state.bank, 30);
  assert.ok(e.state.badges.includes('first_deposit'));
});

test('withdraw: BAD_PIN and NO_BALANCE', () => {
  const e = withAccount({ wallet: 20 });
  e.deposit(20);
  assert.equal(e.withdraw(5, '0000').error, ERR.BAD_PIN);
  assert.equal(e.withdraw(21, '1234').error, ERR.NO_BALANCE);
  assert.ok(e.withdraw(20, '1234').ok);
  assert.equal(e.state.wallet, 20);
});

test('saved_100 and goal_reached badges, no interest ever added', () => {
  const e = withAccount({ wallet: 100 });
  e.setGoal('thobe');
  e.deposit(100);
  assert.ok(e.state.badges.includes('saved_100'));
  assert.ok(e.state.badges.includes('goal_reached'));
  e.nextDay();
  e.nextDay();
  assert.equal(e.state.bank, 100); // balance never grows by itself
});

test('buy: NO_CASH, keepable items go to the inventory, equip by slot', () => {
  const e = econ({ wallet: 50 });
  assert.equal(e.buy('thobe').error, ERR.NO_CASH);
  assert.equal(e.equip('ghutra').error, ERR.BAD_INPUT); // not owned yet
  assert.ok(e.buy('ice_cream').ok);
  assert.ok(e.buy('ghutra').ok);
  assert.deepEqual(e.state.inventory, ['ghutra']);
  assert.ok(e.equip('ghutra').ok);
  assert.equal(e.state.equipped.head, 'ghutra');
  assert.equal(e.state.wallet, 5);
});

test('give: NO_CASH, tracks total, first_give badge', () => {
  const e = econ({ wallet: 10 });
  assert.equal(e.give(11).error, ERR.NO_CASH);
  assert.ok(e.give(4).ok);
  assert.equal(e.state.given, 4);
  assert.ok(e.state.badges.includes('first_give'));
});

test('transaction log keeps the last 30', () => {
  const e = econ({ wallet: 100 });
  for (let i = 0; i < 40; i++) e.give(1);
  assert.equal(e.state.tx.length, 30);
  assert.equal(e.state.tx.at(-1).type, 'give');
});

test('every successful action emits an econ event', () => {
  const seen = [];
  const off = on('econ', (d) => seen.push(d.action));
  const e = withAccount({ wallet: 10 });
  e.deposit(5);
  off();
  assert.deepEqual(seen, ['openAccount', 'deposit']);
});

test('resetPin: needs an account and 4 digits, then the new PIN works', () => {
  assert.equal(econ().resetPin('1111').error, ERR.NO_ACCOUNT);
  const e = withAccount({ wallet: 10 });
  e.deposit(10);
  assert.equal(e.resetPin('12').error, ERR.BAD_PIN);
  assert.ok(e.resetPin('4321').ok);
  assert.equal(e.withdraw(5, '1234').error, ERR.BAD_PIN);
  assert.ok(e.withdraw(5, '4321').ok);
});
