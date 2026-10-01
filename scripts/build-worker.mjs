import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await build({ entryPoints: ['worker/index.js'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022' });
await mkdir('dist/.openai', { recursive: true });
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
