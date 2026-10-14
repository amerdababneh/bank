// Camera view toggle (top-left): close 3rd person <-> high top-down.
import { t } from '../i18n.js';

export function initCamButton(host, rig) {
  const btn = document.createElement('button');
  btn.className = 'cam-btn';
  btn.textContent = '🎥';
  btn.setAttribute('aria-label', t('ui.camera'));
  btn.onclick = () => rig.setMode(rig.mode === 'top' ? 'follow' : 'top');
  host.append(btn);
}
