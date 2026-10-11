import ar from '../data/ar.json';

export const t = (key) => ar[key] ?? key;

export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
  document.title = t('app.name');
}
