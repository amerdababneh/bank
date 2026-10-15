// Cinematic conversations: letterbox bars, over-the-shoulder camera shots on whoever speaks,
// typewriter text, tap to continue. Started by tapping a POI that has a `talk` point (the NPC's head).
// Lines come from data/dialogs.json; text from ar.json. Ends with bus 'dialog:end' { id, next }.
import { Vector3 } from 'three/webgpu';
import { on, emit } from '../bus.js';
import { t } from '../i18n.js';
import dialogs from '../../data/dialogs.json';
import brand from '../../data/brand.json';
import { playVoice } from '../audio.js';
import { toastError } from './widgets.js';

// gates[poiId]() -> error code to block a conversation before it starts (e.g. too tired to work)
export const dialogGates = {};

const KID_HEAD = 1.15, TYPE_MS = 28;

const el = (tag, cls, parent) => {
  const e = document.createElement(tag);
  e.className = cls;
  parent?.append(e);
  return e;
};

export function initDialogs({ host, player, rig, input, econ, worlds }) {
  const root = el('div', 'dlg', host);
  el('i', 'dlg-bar top', root);
  el('i', 'dlg-bar bottom', root);
  const box = el('div', 'dlg-box', root);
  const who = el('b', 'dlg-who', box);
  const text = el('p', 'dlg-text', box);
  const hint = el('small', 'dlg-hint', box);
  hint.textContent = t('dlg.continue');

  const K = new Vector3(), N = new Vector3(), d = new Vector3(), side = new Vector3();
  const camPos = new Vector3(), camLook = new Vector3();
  let conv = null, id = null, line = 0, typing = null, full = '';

  const fill = (s) => s.replace('{bank}', brand.bankName).replace('{name}', econ.state.account.name || t('npc.you'));

  function frame(speaker) {
    if (speaker === 'npc') { // over the kid's shoulder, looking at the NPC
      camPos.copy(K).addScaledVector(d, -1.3).addScaledVector(side, 0.55).add({ x: 0, y: 0.35, z: 0 });
      camLook.copy(N).addScaledVector(side, 0.45); // aim left of the face: it sits on the right, clear of the box
    } else { // over the NPC's shoulder, looking at the kid
      camPos.copy(N).addScaledVector(d, 1.1).addScaledVector(side, -0.5).add({ x: 0, y: 0.1, z: 0 });
      camLook.copy(K).addScaledVector(side, -0.35);
    }
    rig.shot(camPos, camLook);
  }

  function show() {
    const ln = conv.lines[line];
    who.textContent = ln.who === 'kid' ? (econ.state.account.name || t('npc.you')) : t(conv.npc ?? 'npc.teller');
    root.classList.toggle('kid', ln.who === 'kid');
    frame(ln.who);
    player.avatar()?.setTalking?.(ln.who === 'kid');
    full = fill(t(ln.text));
    playVoice(ln.text); // public/audio/voice/<key>.mp3 if present
    let i = 0;
    text.textContent = '';
    hint.hidden = true;
    clearInterval(typing);
    typing = setInterval(() => {
      text.textContent = full.slice(0, ++i);
      if (i >= full.length) { clearInterval(typing); typing = null; hint.hidden = false; }
    }, TYPE_MS);
  }

  function end() {
    playVoice(null);
    player.avatar()?.setTalking?.(false);
    root.classList.remove('on');
    document.body.classList.remove('cine');
    rig.shot(null);
    input.setEnabled(true);
    emit('dialog:end', { id, next: conv.next });
    conv = null;
  }

  root.addEventListener('pointerdown', () => {
    if (!conv) return;
    if (typing) { // first tap finishes the line
      clearInterval(typing);
      typing = null;
      text.textContent = full;
      hint.hidden = false;
    } else if (++line < conv.lines.length) show();
    else end();
  });

  on('interact', ({ poiId }) => {
    const set = dialogs[poiId];
    const poi = set && Object.values(worlds).flatMap((w) => w.pois).find((p) => p.id === poiId && p.talk);
    if (!poi || conv) return;
    const block = dialogGates[poiId]?.();
    if (block) return toastError(block);
    conv = set.first?.when === 'noAccount' && !econ.state.account.opened ? set.first : set.again;
    id = poiId;
    line = 0;
    // stand the kid at the desk, facing the NPC
    N.set(poi.talk.x, poi.talk.y, poi.talk.z);
    const yaw = Math.atan2(N.x - poi.pos.x, N.z - poi.pos.z);
    player.teleport(poi.pos.x, poi.pos.z, yaw);
    K.set(poi.pos.x, player.group.position.y + KID_HEAD, poi.pos.z);
    d.set(N.x - K.x, 0, N.z - K.z).normalize();
    side.set(d.z, 0, -d.x);
    input.setEnabled(false);
    document.body.classList.add('cine');
    root.classList.add('on');
    show();
  });
}
