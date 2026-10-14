// Far, unlit West Bay skyline: simplified Doha Tower, Museum of Islamic Art and Aspire Torch + filler towers.
const TINTS = ['#a9bccb', '#b8c6d2', '#9fb3c4', '#c3ced8', '#aebfcf'];
const rnd = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function dohaTower(b, x) {
  b.cyl('unlit', '#8aa6bc', x, 0, 0, 4, 4.3, 34, 10);
  for (let i = 0; i < 6; i++) b.cyl('unlit', '#cfdbe4', x, 3 + i * 5.2, 0, 4.35, 4.35, 0.6, 10);
  b.cyl('unlit', '#8aa6bc', x, 34, 0, 0, 4, 5, 10);
}

function museum(b, x) {
  b.box('unlit', '#e7e0d0', x, 0, 0, 15, 6, 11);
  b.box('unlit', '#dcd4c2', x, 6, -0.5, 10, 5, 8);
  b.box('unlit', '#e7e0d0', x, 11, -1, 5.5, 4, 5);
  b.box('unlit', '#cfc7b4', x + 3, 0, -2, 2.2, 15, 2.2);
  b.sph('unlit', '#d6ceba', x - 1, 15, -1, 1.8, 0.9);
}

function torch(b, x) {
  b.cyl('unlit', '#a8b9c9', x, 0, 0, 1.5, 2.6, 20, 8);
  b.cyl('unlit', '#9db0c2', x, 20, 0, 1.3, 1.5, 6, 8);
  b.cyl('unlit', '#b7c6d4', x, 26, 0, 3.2, 1.3, 7, 8);
  b.sph('unlit', '#f4a64a', x, 34.5, 0, 1.9, 1.9, 8);
}

export function skyline(c, def, r) {
  const { b } = c;
  b.at(r.cx, r.cz, 0);
  // def.marks === false: no landmarks (skyscraper models are placed instead, see town.js)
  const marks = def.marks === false ? [] : [[-0.3, torch], [0.08, dohaTower], [0.34, museum]].map(([f, fn]) => [f * r.w, fn]);
  for (const [x, fn] of marks) fn(b, x);
  for (let i = 0, x = -r.w / 2 + 3; x < r.w / 2 - 3; i++) {
    const w = 4 + rnd(i) * 3, h = 8 + rnd(i + 40) * 14;
    x += w / 2;
    if (marks.every(([mx]) => Math.abs(mx - x) > 10)) b.box('unlit', TINTS[i % TINTS.length], x, 0, (rnd(i + 9) - 0.5) * 2, w, h, w * 0.9);
    x += w / 2 + 1.2 + rnd(i + 7) * 2;
  }
}
