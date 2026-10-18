// The kids' banking app, Coastal World style: a phone held up by a cartoon hand over the dimmed game,
// with a white pill toolbar of tabs on top and a close button. Tabs: an in-game version of the bank's
// kids app (saving pot + transactions, link to the real app at brand.json "appUrl"), my money, my badges.
import { t, tf, fmt } from '../i18n.js';
import { el, button } from './widgets.js';
import { openScreen } from './screens.js';
import brand from '../../data/brand.json';

// page: a mini landing page for the bank's kids app (text in ar.json, store links in brand.json)
const TABS = [['page', '🌐'], ['web', '🏦'], ['money', '🪙'], ['badges', '🏅']];
const GOOGLE_PLAY = '<svg viewBox="0 0 24 26" aria-hidden="true"><path d="M2 1l11.5 12L2 25z" fill="#00d7fe"/>'
  + '<path d="M2 1l15 8.5-3.5 3.5z" fill="#32bb5a"/><path d="M2 25l15-8.5-3.5-3.5z" fill="#f43249"/>'
  + '<path d="M17 9.5l4.4 2.5c1 .6 1 1.4 0 2L17 16.5 13.5 13z" fill="#ffc400"/></svg>';
const APPLE = '<svg viewBox="0 0 22 24" aria-hidden="true"><path fill="#fff" d="M16.4 1.4c0 1.1-.4 2.2-1.2 3.1-1 1-2.2 1.6-3.4 1.5v-.4c0-1.1.5-2.3 1.3-3.2.4-.5 1-.9 1.6-1.2.6-.3 1.2-.5 1.8-.5v.7zm4.4 15.8c-.4.9-.8 1.6-1.3 2.4-.7 1-1.3 1.7-1.7 2-.7.6-1.4.9-2.2 1-.6 0-1.2-.2-2-.5s-1.5-.5-2.2-.5c-.7 0-1.4.2-2.2.5-.8.3-1.4.5-1.9.5-.8 0-1.5-.3-2.2-1-.5-.4-1.1-1.1-1.8-2.1-.8-1.1-1.4-2.3-1.9-3.8-.5-1.5-.8-3-.8-4.5 0-1.7.4-3.1 1.1-4.3a6.3 6.3 0 0 1 2.3-2.3 6.1 6.1 0 0 1 3.1-.9c.6 0 1.4.2 2.4.6s1.6.6 1.9.6c.2 0 .9-.2 2.1-.7 1.1-.4 2-.6 2.8-.5 2.1.2 3.7 1 4.7 2.5-1.9 1.1-2.8 2.7-2.8 4.7 0 1.6.6 2.9 1.7 3.9.5.5 1.1.9 1.7 1.1l-.4 1.2z"/></svg>';
const FEATURES = [['🎯', 'lp.f1'], ['📚', 'lp.f2'], ['🤲', 'lp.f3'], ['💳', 'lp.f4']];
const BADGES = ['first_deposit', 'saved_100', 'goal_reached', 'first_give'];

export function openPhoneApp({ econ, items }) {
  openScreen(t('phone.title'), (body, close) => {
    const stage = el('div', 'phone-stage', body);
    el('div', 'hand back', stage);
    const phone = el('div', 'phone', stage);
    const hand = el('div', 'hand front', stage);
    for (let i = 0; i < 4; i++) el('i', `finger f${i}`, hand);
    el('i', 'thumb', hand);

    const bar = el('div', 'ph-bar', phone);
    const tabs = el('div', 'ph-tabs', bar);
    const x = button(bar, '✕', close, 'ph-close');
    x.setAttribute('aria-label', t('screen.close'));
    const page = el('div', 'ph-page', phone);
    const btns = {};
    const show = (id) => {
      for (const k in btns) btns[k].classList.toggle('on', k === id);
      page.replaceChildren();
      PAGES[id](page);
    };
    for (const [id, icon] of TABS) {
      btns[id] = button(tabs, icon, () => show(id), 'ph-tab');
      btns[id].setAttribute('aria-label', t(`phone.${id}`));
    }

    const PAGES = {
      page(p) {
        const lp = el('div', 'lp', p);
        const hero = el('div', 'lp-hero', lp);
        el('b', 'jr-logo', hero, t('phone.appName'));
        el('h3', '', hero, t('lp.title'));
        el('p', '', hero, t('lp.sub'));
        const stores = el('div', 'lp-stores', hero);
        // compact store badges: logo + small "get it on" line + store name
        const store = (icon, small, name, url) => {
          const b = button(stores, '', () => window.open(url, '_blank', 'noopener'), 'lp-store');
          b.innerHTML = `${icon}<span><small>${small}</small><b>${name}</b></span>`;
          b.setAttribute('aria-label', name);
        };
        store(GOOGLE_PLAY, t('lp.getOn'), 'Google Play', brand.appUrl);
        store(APPLE, t('lp.dlOn'), 'App Store', brand.appStoreUrl ?? brand.appUrl);
        el('h4', '', lp, t('lp.features'));
        for (const [ic, key] of FEATURES) {
          const f = el('div', 'lp-feat', lp);
          el('span', 'ic', f, ic);
          el('span', '', f, t(key));
        }
        const card = el('div', 'lp-card', lp);
        el('i', 'lp-visa', card);
        el('b', '', card, t('lp.card'));
        el('small', '', card, t('lp.cardSub'));
      },
      // In-game version of the bank's kids app (bank sites and app stores refuse to load in a frame):
      // saving pot with the real account balance, recent transactions, and a link to the real app.
      web(p) {
        const s = econ.state;
        const app = el('div', 'jr', p);
        const head = el('div', 'jr-head', app);
        el('b', 'jr-logo', head, t('phone.appName'));
        el('span', 'jr-avatar', head, '🧒');
        const pot = el('div', 'jr-pot', app);
        el('h3', '', pot, t('phone.pot'));
        el('p', '', pot, t('phone.potHint'));
        el('small', 'jr-label', pot, t('phone.balance'));
        el('div', 'jr-balance', pot, s.account.opened ? tf('money', { n: fmt(s.bank) }) : t('err.NO_ACCOUNT'));
        el('i', 'jr-jar', pot);
        const list = el('div', 'jr-tx', app);
        el('h4', '', list, t('tab.statement'));
        const tx = [...s.tx].reverse().slice(0, 6);
        if (!tx.length) el('p', 'jr-empty', list, t('statement.empty'));
        for (const r of tx) {
          const row = el('div', 'jr-row', list);
          el('span', '', row, t(`tx.${r.type}`) + (r.ref && items[r.ref] ? ` · ${items[r.ref].name}` : ''));
          el('b', r.type === 'earn' || r.type === 'withdraw' ? 'in' : 'out', row, tf('money', { n: fmt(r.amount) }));
        }
        button(app, `⬇ ${t('phone.download')}`, () => window.open(brand.appUrl, '_blank', 'noopener'), 'jr-get');
      },
      money(p) {
        const s = econ.state, g = s.goal && items[s.goal];
        const card = (ic, label, v) => { const c = el('div', 'ph-card', p); el('span', 'ic', c, ic); el('small', '', c, t(label)); el('b', '', c, v); };
        card('🪙', 'balance.wallet', tf('money', { n: fmt(s.wallet) }));
        card('🏦', 'balance.bank', s.account.opened ? tf('money', { n: fmt(s.bank) }) : t('err.NO_ACCOUNT'));
        if (g) card(g.icon, 'tab.goal', tf('goal.progress', { n: fmt(s.bank), m: fmt(g.price) }));
        card('⚡', 'hud.energy', `${fmt(s.energy)} / ${fmt(3)}`);
      },
      badges(p) {
        const grid = el('div', 'ph-badges', p);
        for (const id of BADGES) {
          const got = econ.state.badges.includes(id);
          const b = el('div', `ph-badge${got ? ' got' : ''}`, grid);
          el('span', 'ic', b, got ? '🏅' : '🔒');
          el('small', '', b, t(`badge.${id}`).replace(/^\S+\s/, ''));
        }
      },
    };
    show(TABS[0][0]);
  }, { cls: 'phone-screen' });
}
