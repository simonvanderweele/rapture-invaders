import { rm } from 'node:fs/promises';
import { build } from 'vite';
await rm('dist', { recursive: true, force: true });
await build({ build: { outDir: 'dist/client' } });
await import('./build-worker.mjs');
