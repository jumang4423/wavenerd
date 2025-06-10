import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

let COMMIT_HASH = 'unknown';
let COMMIT_DATE = 'unknown';

try {
  COMMIT_HASH = execSync('git rev-parse HEAD').toString().trim();
  COMMIT_DATE = execSync('git log -1 --pretty=format:%cd').toString().trim();
} catch (error) {
  // Git not available in build environment, use fallback values
}

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: [
      '@0b5vr/wavenerd-deck',
    ],
  },
  plugins: [
    react(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
  ],
  define: {
    COMMIT_HASH: `'${COMMIT_HASH}'`,
    COMMIT_DATE: `'${COMMIT_DATE}'`,
  },
  build: {
    target: 'esnext',
  },
  base: './',
});
