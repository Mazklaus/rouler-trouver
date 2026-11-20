import { defineConfig } from 'vite';

// base relatif : le build fonctionne aussi bien en local que sous GitHub Pages (/rouler-trouver/).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
});
