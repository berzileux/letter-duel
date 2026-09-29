import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built site work from any path, including a GitHub Pages project URL.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
