import { defineConfig } from 'vitest/config';

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site from /quantum-game/ (and `vite preview` mimics it).
  base: command === 'build' || isPreview ? '/quantum-game/' : '/',
  build: {
    // Phaser alone is ~1.2 MB minified; it is cached separately from game code.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          return undefined;
        },
      },
    },
  },
  define: {
    __BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
    // Simulation playtests play hundreds of games; CI machines are slower.
    testTimeout: 60_000,
    environment: 'node',
  },
}));
