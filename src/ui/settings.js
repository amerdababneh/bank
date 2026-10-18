// Settings: money (phones), energy + next day, badges, sound on/off, quality tier (after a reload).
import { t, fmt } from '../i18n.js';
import { setMuted } from '../audio.js';
import { quality } from '../quality.js';
import { el, button, toast } from './widgets.js';
import { openScreen } from './screens.js';

const MUTE_KEY = 'mk_mute';
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

// apply the saved sound setting at startup
export const initSettings = () => setMuted(get(MUTE_KEY) === '1');

const BADGES = ['first_deposit', 'saved_100', 'goal_reached', 'first_give'];

export function openSettings({ econ }) {
  openScreen(t('settings.title'), (body) => {
    if (econ) { // money (shown here on phones), energy (power) + next day, badges (achievements)
      const s = econ.state;
      const mo = el('div', 'set-row', body);
      el('b', '', mo, t('hud.wallet'));
      el('span', 'set-money', mo, `🪙 ${fmt(s.wallet)}   🏦 ${s.account.opened ? fmt(s.bank) : '—'}`);
      const en = el('div', 'set-row', body);
      el('b', '', en, t('hud.energy'));
      el('span', 'set-energy', en, '⚡'.repeat(s.energy) + '·'.repeat(3 - s.energy));
      if (s.energy === 0) button(en, '🌙 ' + t('day.sleep'), () => { econ.nextDay(); toast(t('day.new'), 'ok'); }, 'primary');
      const bd = el('div', 'set-row', body);
      el('b', '', bd, `${t('hud.badges')} (${fmt(s.badges.length)})`);
      const list = el('div', 'set-badges', bd);
      for (const id of BADGES) el('span', s.badges.includes(id) ? 'got' : '', list, s.badges.includes(id) ? '🏅' : '🔒').title = t('badge.' + id);
    }
    const row = (label, options, current, onPick) => {
      const r = el('div', 'set-row', body);
      el('b', '', r, t(label));
      const opts = el('div', 'seg', r);
      const btns = options.map(([v, text]) => button(opts, text, () => {
        btns.forEach((b) => b.classList.toggle('on', b === btn(v)));
        onPick(v);
      }, v === current ? 'on' : ''));
      const btn = (v) => btns[options.findIndex(([x]) => x === v)];
    };
    row('settings.sound', [['1', t('on')], ['0', t('off')]], get(MUTE_KEY) === '1' ? '0' : '1', (v) => {
      put(MUTE_KEY, v === '1' ? '0' : '1');
      setMuted(v !== '1');
    });
    row('settings.quality', [['low', t('q.low')], ['mid', t('q.mid')], ['high', t('q.high')]], quality.tier, (v) => {
      put('mk_tier', v);
      toast(t('settings.reload'));
    });
  });
}
