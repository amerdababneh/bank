import { asset } from '../paths.js';
// Canvas2D sign textures (RTL Arabic). One material per distinct sign, shared between meshes.
import { CanvasTexture, SRGBColorSpace, Mesh, PlaneGeometry, MeshBasicMaterial } from 'three/webgpu';

const FONT = '"Baloo Bhaijaan 2", "Segoe UI", Tahoma, Arial, sans-serif';
const plane = new PlaneGeometry(1, 1);
const cache = new Map();

export async function loadSignFont() {
  try {
    await document.fonts.load('700 48px "Baloo Bhaijaan 2"', 'ابت');
  } catch { /* falls back to system fonts */ }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function makeMaterial(text, aspect, { bg, fg, border, logo }) {
  const W = 512, H = Math.max(64, Math.round(W / aspect));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const draw = (img) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = bg;
    roundRect(g, 0, 0, W, H, H * 0.18);
    g.fill();
    if (border) {
      g.lineWidth = H * 0.07;
      g.strokeStyle = border;
      roundRect(g, H * 0.05, H * 0.05, W - H * 0.1, H * 0.9, H * 0.14);
      g.stroke();
    }
    const logoW = img ? H * 0.8 : 0;
    if (img) g.drawImage(img, W - H * 0.9, H * 0.1, logoW, H * 0.8);
    g.direction = 'rtl';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fg;
    let size = H * 0.58;
    g.font = `700 ${size}px ${FONT}`;
    const maxW = W * 0.9 - logoW;
    const w = g.measureText(text).width;
    if (w > maxW) {
      size *= maxW / w;
      g.font = `700 ${size}px ${FONT}`;
    }
    g.fillText(text, (W - logoW) / 2, H * 0.54);
    tex.needsUpdate = true;
  };
  draw(null);
  if (logo) {
    const img = new Image();
    img.onload = () => draw(img);
    img.src = asset(logo); // missing logo -> keeps the text-only sign
  }
  tex.anisotropy = 4;
  return new MeshBasicMaterial({ map: tex, transparent: true });
}

export function makeSign(text, w, h, style = {}) {
  const s = { bg: '#fff7e6', fg: '#3a2a1a', border: null, logo: null, ...style };
  const key = `${text}|${w / h}|${s.bg}|${s.fg}|${s.border}|${s.logo}`;
  if (!cache.has(key)) cache.set(key, makeMaterial(text, w / h, s));
  const mesh = new Mesh(plane, cache.get(key));
  mesh.scale.set(w, h, 1);
  return mesh;
}
