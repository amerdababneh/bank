// Bank exterior: modern box, brand-color canopy, logo sign, flagpole and an outdoor ATM.
import { PlaneGeometry, Mesh, DoubleSide } from 'three/webgpu';
import { t } from '../i18n.js';
import { makeLit } from './light.js';

const GLASS = '#5e9fc4', FRAME = '#2f3e4e', WHITE = '#f4f1ea';

export function bank(c, def, r) {
  const { b } = c, { bw, bd, zb, zf } = r;
  const { primary } = c.brand.colors;
  const zc = (zb + zf) / 2, H = 8.6;
  b.box('lit', WHITE, 0, 0, zc, bw, H, bd);
  b.box('lit', '#d9d4c8', 0, H, zc, bw + 0.4, 0.4, bd + 0.4);
  // lobby glass wall with mullions
  b.box('lit', GLASS, 0, 0.1, zf + 0.05, bw - 2.4, 3.7, 0.12);
  for (let i = -3; i <= 3; i++) b.box('lit', FRAME, i * ((bw - 2.4) / 6), 0.1, zf + 0.09, 0.1, 3.7, 0.1);
  b.box('lit', '#24394b', 0, 0.1, zf + 0.12, 3.4, 3.1, 0.12); // door
  b.box('lit', FRAME, 0, 0.1, zf + 0.15, 0.1, 3.1, 0.1);
  b.box('lit', '#cfc6b3', 0, 0.06, zf + 1.4, 5.5, 0.14, 2.2); // steps
  // brand band + sign panel
  b.box('lit', primary, 0, 4.5, zf + 0.06, bw, 3.6, 0.2);
  b.box('lit', WHITE, 0, 4.2, zf + 0.04, bw, 0.3, 0.3);
  c.sign(c.brand.bankName, 9.5, 1.9, 0, 5.4, zf + 0.2, { bg: primary, fg: WHITE, border: WHITE, logo: c.brand.logo }); // white logo on brand blue
  // QIB logo sign over the door, between the door top and the canopy (white logo on brand blue)
  c.sign('', 1.9, 0.62, 0, 3.55, zf + 0.2, { bg: primary, image: c.brand.logo });
  // canopy
  b.box('lit', primary, 0, 3.95, zf + 1.9, bw - 1, 0.28, 3.8);
  b.box('lit', WHITE, 0, 3.85, zf + 3.78, bw - 1, 0.12, 0.14); // canopy trim
  for (const s of [-1, 1]) b.cyl('lit', WHITE, s * (bw / 2 - 1.6), 0.06, zf + 3.4, 0.17, 0.17, 3.9, 8);
  // roof units
  b.box('lit', '#b9b5aa', -3, H + 0.4, zc, 2.4, 0.9, 1.6);
  b.box('lit', '#b9b5aa', 2, H + 0.4, zc - 1, 1.8, 0.7, 1.4);
  // outdoor ATM (side matches the atm_out POI)
  const ax = def.pois.find((p) => p.id === 'atm_out').side;
  b.box('lit', '#3b4252', ax, 0.06, zf + 0.5, 1.2, 2.1, 0.8);
  b.box('lit', '#8fe3ff', ax, 1.2, zf + 0.92, 0.8, 0.5, 0.05);
  b.box('lit', '#d6d9e0', ax, 0.9, zf + 0.92, 0.8, 0.12, 0.2);
  b.box('lit', primary, ax, 2.2, zf + 0.5, 1.4, 0.22, 1.0);
  c.sign(t('sign.atm'), 1.7, 0.5, ax, 2.7, zf + 0.15);
  c.anchor('atm_screen', ax, 1.45, zf + 0.95); // ATM screen centre + a point in front (zoom shot)
  // security cameras: either side above the entrance + one over the ATM, angled down at the visitor
  cam(b, -2.3, 3.35, zf + 0.12, 0.25);
  cam(b, 2.3, 3.35, zf + 0.12, -0.25);
  const side = ax < 0 ? 1 : -1; // beside the ATM sign (1.7 m wide), on the door side, turned in at the screen
  cam(b, ax + side * 1.15, 2.6, zf + 0.12, -side * 0.4);
  c.anchor('atm_view', ax, 1.45, zf + 2);
  // flagpole + flag (separate mesh so FX can wave it)
  const fx = bw / 2 + 0.7, fz = zf + 2.2;
  b.cyl('lit', '#c9ccd2', fx, 0, fz, 0.07, 0.11, 11, 8);
  b.sph('lit', WHITE, fx, 11.1, fz, 0.16);
  const flag = new Mesh(new PlaneGeometry(2.4, 1.5, 8, 4), makeLit({ color: primary, side: DoubleSide, shadows: false }));
  const w = b.world(fx + 1.25, fz);
  flag.position.set(w.x, 10.1, w.z);
  flag.rotation.y = b.frame.ry;
  c.group.add(flag);
  c.anchors.flag = flag;
}

// Wall-mounted security camera (local frame, facing +z): plate, arm, tilted housing, dark lens, red LED.
const CAM_BODY = '#f2f4f7', CAM_DARK = '#2b2f36', CAM_LED = '#ff3b3b';
function cam(b, x, y, z, ry) {
  const tilt = 0.4; // nose down
  const fx = Math.sin(ry), fz = Math.cos(ry); // forward on the ground plane
  b.box('lit', CAM_DARK, x, y - 0.12, z, 0.26, 0.24, 0.05);                                       // wall plate
  b.box('lit', CAM_DARK, x + fx * 0.16, y - 0.04, z + fz * 0.16, 0.06, 0.06, 0.3, ry);           // arm
  const bx = x + fx * 0.38, bz = z + fz * 0.38, by = y - 0.16;
  b.box('lit', CAM_BODY, bx, by, bz, 0.2, 0.17, 0.42, ry, tilt);                                // housing
  b.box('lit', CAM_BODY, bx, by + 0.15, bz + fz * 0.03, 0.24, 0.03, 0.48, ry, tilt);            // sun hood
  const lx = bx + fx * 0.22, lz = bz + fz * 0.22, ly = by + 0.085 - Math.sin(tilt) * 0.22;
  b.cyl('lit', CAM_DARK, lx, ly - 0.05, lz, 0.06, 0.06, 0.08, 10);                               // lens
  b.sph('lit', CAM_LED, bx - Math.cos(ry) * 0.06, by + 0.06, bz + Math.sin(ry) * 0.06 + fz * 0.12, 0.018); // LED
}
