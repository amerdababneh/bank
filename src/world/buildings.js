// Primitive town buildings. Local frame: origin = footprint center, +z toward the facade.
// r: { w, d, bw, bd, zb, zf, tx, tz } -> building spans x ±bw/2, z zb..zf (facade at zf).
import { t } from '../i18n.js';

const MUD = '#d8b98c', MUD_DARK = '#c9a577', WOOD = '#7a4e2a', DARK = '#3b2a1d', GLASS = '#6aa5d8';
const AWNINGS = ['#c0392b', '#2e86c1', '#e67e22', '#27ae60', '#8e44ad'];

// Slanted striped awning over the facade (alternating two colors).
function awning(b, x, y, zf, width, depth, a, bColor, stripes = 6) {
  const sw = width / stripes;
  for (let i = 0; i < stripes; i++) b.box('lit', i & 1 ? bColor : a, x - width / 2 + sw * (i + 0.5), y, zf + depth / 2, sw, 0.12, depth, 0, 0.35);
}

export function souq(c, def, r) {
  const { b } = c, { bw, bd, zb, zf } = r;
  const zc = (zb + zf) / 2, H = 4.3 + (r.tx % 3) * 0.5, k = r.tx + r.tz * 7;
  b.box('lit', MUD, 0, 0, zc, bw, H, bd);
  b.box('lit', MUD_DARK, 0, H, zc, bw + 0.3, 0.3, bd + 0.3);
  for (let i = 0; i < 5; i++) b.box('lit', MUD, -bw / 2 + 0.6 + (i * (bw - 1.2)) / 4, H + 0.3, zf, 0.55, 0.55, 0.4);
  for (const s of [-1, 1]) b.box('lit', WOOD, s * (bw / 2 - 0.3), 0, zf + 0.15, 0.3, 3.2, 0.3);
  b.box('lit', WOOD, 0, 3.0, zf + 0.15, bw - 0.2, 0.28, 0.3);
  for (let i = 0; i < 3; i++) b.box('lit', WOOD, bw / 2 + 0.2, H - 0.7 - i * 0.7, zc - 1 + i, 0.5, 0.18, 0.18);
  b.box('lit', DARK, 0, 0, zf + 0.03, 1.8, 2.5, 0.1);
  for (const s of [-1, 1]) b.box('lit', DARK, s * 2.4, 1.3, zf + 0.03, 1, 1.1, 0.1);
  awning(b, 0, 2.7, zf + 0.25, bw - 0.8, 1.2, AWNINGS[k % 5], '#f4ecd8', 4);
  c.sign(t(`sign.souq.${1 + (k % 5)}`), 3, 0.85, 0, 3.7, zf + 0.12);
  b.cyl('lit', '#a0522d', -2.4, 0, zf + 1.6, 0.35, 0.45, 0.8, 8);
  b.box('lit', '#c58b4b', 2.4, 0, zf + 1.6, 0.8, 0.6, 0.8);
}

export function bakery(c, def, r) {
  const { b } = c, { bw, bd, zb, zf } = r;
  const zc = (zb + zf) / 2, H = 4.6;
  b.box('lit', '#e8c9a0', 0, 0, zc, bw, H, bd);
  b.box('lit', '#b5653a', 0, 0, zf + 0.02, bw, 1.0, 0.1);
  b.box('lit', '#a4552f', 0, H, zc, bw + 0.3, 0.3, bd + 0.3);
  b.cyl('lit', '#7d4a2e', bw / 2 - 2.5, H + 0.3, zb + 1.5, 0.55, 0.65, 2.6, 8);
  for (const s of [-1, 1]) b.box('lit', '#ffd88a', s * (bw / 2 - 3.2), 1.2, zf + 0.03, 3.2, 1.6, 0.1);
  b.box('lit', DARK, 0, 0, zf + 0.03, 1.8, 2.6, 0.1);
  awning(b, 0, 2.9, zf + 0.25, bw - 1, 1.6, '#d9822b', '#f6ead0', 10);
  b.cyl('lit', '#a0522d', -bw / 2 + 1.4, 0.06, zf + 1.4, 0.7, 0.9, 1.1, 10);
  b.sph('lit', '#8d4426', -bw / 2 + 1.4, 1.1, zf + 1.4, 0.7, 0.7, 8);
  for (const s of [-1, 1]) b.box('lit', '#c58b4b', s * 2.2, 0.06, zf + 1.2, 1.2, 0.9, 0.8);
  c.sign(t(def.sign), 5.2, 1.3, 0, 3.95, zf + 0.12);
  c.anchor('bakery_steam', bw / 2 - 2.5, H + 3.0, zb + 1.5);
}

export function karak(c, def, r) {
  const { b } = c, { zb, zf } = r;
  const bw = Math.min(r.bw, 7), zc = (zb + zf) / 2, H = 3.5;
  b.box('lit', '#2b7a78', 0, 0, zc, bw, H, r.bd);
  b.box('lit', '#f2c94c', 0, H, zc, bw + 0.3, 0.3, r.bd + 0.3);
  b.box('lit', '#1d5755', 0, 0.9, zf + 0.5, bw - 0.6, 0.15, 1.1);
  b.box('lit', '#f2c94c', 0, 0, zf + 0.5, bw - 0.6, 0.9, 1.0);
  awning(b, 0, 2.55, zf + 0.7, bw + 0.2, 1.6, '#f2c94c', '#ffffff', 8);
  b.cyl('lit', '#b9bcc4', -1.4, 1.05, zf + 0.5, 0.3, 0.38, 0.55, 8);
  b.sph('lit', '#b9bcc4', -1.4, 1.75, zf + 0.5, 0.3, 1, 8);
  b.box('lit', '#b9bcc4', -1.05, 1.5, zf + 0.5, 0.45, 0.1, 0.1, 0, -0.3);
  for (const s of [-1, 1]) b.cyl('lit', '#8a5a33', s * 2.6, 0.06, zf + 2.1, 0.28, 0.28, 0.55, 8);
  for (const [x, col] of [[0.6, '#ffffff'], [1.5, '#f6c453'], [2.3, '#ffffff']]) b.cyl('lit', col, x, 1.05, zf + 0.5, 0.16, 0.14, 0.28, 8);
  c.sign(t(def.sign), 4.4, 1.2, 0, 3.0, zf + 0.12, { bg: '#fff3c4' });
  c.anchor('karak_steam', -1.4, 2.5, zf + 0.5);
}

const PROPS = {
  icecream(b, x, y, z) {
    b.cyl('lit', '#e0a458', x, y, z, 0.6, 0.0, 1.5, 8);
    b.sph('lit', '#f78fb3', x, y + 1.7, z, 0.7, 1, 8);
    b.sph('lit', '#fff2c6', x, y + 2.35, z, 0.5, 1, 8);
  },
  blocks(b, x, y, z) {
    b.box('lit', '#e74c3c', x - 0.5, y, z, 1, 1, 1);
    b.box('lit', '#3498db', x + 0.6, y, z, 1, 1, 1);
    b.box('lit', '#2ecc71', x, y + 1, z, 1, 1, 1, 0.4);
  },
  dress(b, x, y, z) {
    b.cyl('lit', '#e8c3a0', x, y, z, 0.2, 0.2, 0.3, 8);
    b.cyl('lit', '#1f8a7a', x, y + 0.3, z, 0.3, 0.75, 1.5, 8);
    b.sph('lit', '#e8c3a0', x, y + 2.0, z, 0.3, 1, 8);
  },
};

export function store(c, def, r) {
  const { b } = c, { bw, bd, zb, zf } = r, st = def.style;
  const zc = (zb + zf) / 2, H = 4.1;
  b.box('lit', st.wall, 0, 0, zc, bw, H, bd);
  b.box('lit', st.trim, 0, H, zc, bw + 0.3, 0.3, bd + 0.3);
  b.box('lit', st.trim, 0, 3.4, zf + 0.04, bw, 0.2, 0.1);
  b.box('lit', GLASS, -bw / 4 - 0.4, 0.5, zf + 0.04, bw / 2 - 1.2, 1.8, 0.1);
  b.box('lit', DARK, bw / 4 + 0.6, 0, zf + 0.04, 1.4, 2.4, 0.1);
  awning(b, 0, 2.75, zf + 0.25, bw - 0.4, 1.3, st.awning, '#ffffff', 6);
  PROPS[st.prop]?.(b, 0, H + 0.3, zc);
  c.sign(t(def.sign), 3.6, 1.0, 0, 3.75, zf + 0.12);
}
