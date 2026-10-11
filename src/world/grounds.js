// Ground-level tile builders. Signature: (c, def, r) with c = town context, r = rect info (see town.js).
const DASH = '#e9e3d0';
const RAIL = '#f2efe8';

export function road(c, def, r) {
  const { b } = c;
  b.at(r.cx, r.cz, 0);
  const x = c.is('R', r.tx - 1, r.tz) && c.is('R', r.tx + 1, r.tz);
  const z = c.is('R', r.tx, r.tz - 1) && c.is('R', r.tx, r.tz + 1);
  if (x && !z) for (const px of [-2, 2]) b.box('lit', DASH, px, 0, 0, 2.2, 0.03, 0.22);
  if (z && !x) for (const pz of [-2, 2]) b.box('lit', DASH, 0, 0, pz, 0.22, 0.03, 2.2);
}

export function corniche(c, def, r) {
  const { b } = c;
  b.at(r.cx, r.cz, 0);
  const top = c.top;
  if (c.def(r.tx, r.tz - 1)?.water) {
    b.box('lit', RAIL, 0, top + 0.95, -3.85, 8, 0.1, 0.14);
    for (const px of [-3.8, -1.3, 1.3, 3.8]) b.box('lit', RAIL, px, top, -3.85, 0.12, 1.0, 0.12);
  }
  if (def.palmEvery && r.tx % def.palmEvery === 0) c.palm(0, 2.6);
  if (def.lamp && r.tx % 2 === 1) c.lamp(0, -3.3);
}
