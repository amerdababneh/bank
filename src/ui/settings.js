// Settings: sound on/off, digit style (١٢٣ / 123), quality tier (applies after a reload).
import { t, getDigits, setDigits } from '../i18n.js';
import { setMuted } from '../audio.js';
import { quality } from '../quality.js';
import { el, button, toast } from './widgets.js';
import { openScreen } from './screens.js';

const MUTE_KEY = 'mk_mute';
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

// apply the saved sound setting at startup
export const initSettings = () => setMuted(get(MUTE_KEY) === '1');

export function openSettings({ onDigits }) {
  openScreen(t('settings.title'), (body) => {
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
    row('settings.digits', [['arab', t('digits.arab')], ['latn', t('digits.latn')]], getDigits(), (v) => {
      setDigits(v);
      onDigits?.();
    });
    row('settings.quality', [['low', t('q.low')], ['mid', t('q.mid')], ['high', t('q.high')]], quality.tier, (v) => {
      put('mk_tier', v);
      toast(t('settings.reload'));
    });
  });
}
