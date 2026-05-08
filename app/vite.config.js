import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production deploy lives at https://codejupiter.github.io/revassist/ — that
// subpath only matters at build time. Dev keeps `/` so the local server works.
// Override with VITE_BASE_PATH=/ for root-hosted deploys (Vercel, Netlify).
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE_PATH ?? '/revassist/') : '/',
  plugins: [react(), tailwindcss()],
}))
