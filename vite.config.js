import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths: the build runs from any folder (e.g. a subfolder on the host)
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
