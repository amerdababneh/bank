// Public files (public/...) relative to wherever the game is hosted, so it also runs from a subfolder.
// Vite sets BASE_URL from vite.config base ('./' for builds).
export const asset = (p) => import.meta.env.BASE_URL + p.replace(/^\//, '');
