import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Portfolio/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        visualize: resolve(__dirname, 'visualize.html'),
        profile: resolve(__dirname, 'profile.html'),
      },
    },
  },
});
