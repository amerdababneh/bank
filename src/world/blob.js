// Soft radial blob texture for character blob shadows and low-tier contact shadows (lavender, like the sun shadows).
import { MeshBasicMaterial, CanvasTexture, SRGBColorSpace } from 'three/webgpu';

let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(70,72,150,0.5)');
  grad.addColorStop(0.55, 'rgba(70,72,150,0.25)');
  grad.addColorStop(1, 'rgba(70,72,150,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blobTex = new CanvasTexture(c);
  blobTex.colorSpace = SRGBColorSpace;
  return blobTex;
}

// Soft dark quad material for character blob shadows and low-tier contact shadows.
export const makeBlobMaterial = () => new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, alphaTest: 0.02 });
// alphaTest: the fully transparent corners are discarded, so post passes (MRT/AO/SSR) never see the quad
