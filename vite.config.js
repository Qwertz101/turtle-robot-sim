import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves this app from a project subpath
// (qwertz101.github.io/turtle-robot-sim/), not the domain root like Vercel
// did — every asset URL Vite emits has to be prefixed with that subpath or
// the built page 404s on its own JS/CSS. `base` only matters for `vite
// build`; the dev server still runs at the root, so `npm run dev` is
// unaffected.
export default defineConfig({
  base: '/turtle-robot-sim/',
  plugins: [react(), tailwindcss()],
});
