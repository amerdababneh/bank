import ar from '../data/ar.json';

export const t = (key) => ar[key] ?? key;
// t with {placeholders}: tf('deposit.done', { n: fmt(5) })
export const tf = (key, vars) => t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  document.title = t('app.name');
}

// Numbers: always Western digits (1 2 3) with Arabic formatting.
const nf = new Intl.NumberFormat('ar-QA-u-nu-latn');
export const fmt = (n) => nf.format(n);
