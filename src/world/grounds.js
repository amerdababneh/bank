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
  if (c.def(r.tx, r.tz - 1)?.water && !c.is('b', r.tx, r.tz - 1)) { // no railing where the bridge lands
    b.box('lit', RAIL, 0, top + 0.95, -3.85, 8, 0.1, 0.14);
    for (const px of [-3.8, -1.3, 1.3, 3.8]) b.box('lit', RAIL, px, top, -3.85, 0.12, 1.0, 0.12);
  }
  if (def.palmEvery && r.tx % def.palmEvery === 0) c.palm(0, 2.6);
  if (def.lamp && r.tx % 2 === 1) c.lamp(0, -3.3);
}

// Bridge over the water (tile 'b'): low deck + rails + pillars, running north-south. The end tiles
// ramp down to ground level so it meets the corniche and the island cleanly.
const DECK = '#eef0f2', PILLAR = '#c9ced6';
const BR = { Y: 1.1, L: 4, G: 0.12 }; // deck height, ramp length, ground top

export function bridge(c, def, r) {
  const { b } = c, T = 8, { Y, L, G } = BR;
  b.at(r.cx, r.cz, 0);
  const south = !c.is('b', r.tx, r.tz + 1), north = !c.is('b', r.tx, r.tz - 1);
  // flat part of this tile (minus any ramp) + optional ramps, each with its rails
  const z0 = -T / 2 + (north ? L : 0), z1 = T / 2 - (south ? L : 0);
  const span = (zA, zB, yA, yB) => {
    const len = Math.hypot(zB - zA, yB - yA), rx = Math.atan2(yA - yB, zB - zA), zc = (zA + zB) / 2, yc = (yA + yB) / 2;
    b.box('lit', DECK, 0, yc - 0.2, zc, 3.6, 0.4, len, 0, rx);
    b.box('lit', c.brand.colors.primary, 0, yc - 0.28, zc, 3.7, 0.1, len, 0, rx); // brand stripe
    for (const sx of [-1.75, 1.75]) {
      b.box('lit', RAIL, sx, yc + 0.9, zc, 0.12, 0.12, len, 0, rx);
      b.box('lit', RAIL, sx, yc + 0.2, zc, 0.1, 0.1, len, 0, rx);
      for (let k = 0.15; k < 1; k += 0.35) b.box('lit', RAIL, sx, yA + (yB - yA) * k, zA + (zB - zA) * k, 0.08, 0.8, 0.08);
    }
  };
  if (z1 > z0) span(z0, z1, Y, Y);
  if (north) span(-T / 2, -T / 2 + L, G, Y);
  if (south) span(T / 2 - L, T / 2, Y, G);
  if (z1 > z0) b.box('lit', PILLAR, 0, -1.5, (z0 + z1) / 2, 1.1, Y + 1.3, 1.1);
}
