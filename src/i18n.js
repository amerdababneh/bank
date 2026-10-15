import ar from '../data/ar.json';

export const t = (key) => ar[key] ?? key;
// t with {placeholders}: tf('deposit.done', { n: fmt(5) })
export const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  document.title = t('app.name');
}

// Numbers: Arabic-Indic (١٢٣) or Latin (123) digits, a setting saved on the device.
const DIGITS_KEY = 'mk_digits';
let digits = 'arab';
try { digits = localStorage.getItem(DIGITS_KEY) || 'arab'; } catch { /* ignore */ }
let nf = null;
export const getDigits = () => digits;
export function setDigits(d) {
  digits = d;
  nf = null;
  try { localStorage.setItem(DIGITS_KEY, d); } catch { /* ignore */ }
}
export function fmt(n) {
  nf ??= new Intl.NumberFormat(digits === 'latn' ? 'ar-QA-u-nu-latn' : 'ar-QA-u-nu-arab');
  return nf.format(n);
}
