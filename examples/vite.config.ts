import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  root: here,
  // `src/` and `styles/` live above this directory.
  server: { port: 5173, fs: { allow: [repoRoot] } },
});
