import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'pronote-ng-cards.js',
    },
    rollupOptions: { external: [] },
    target: 'es2021',
    minify: 'esbuild',
    emptyOutDir: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
