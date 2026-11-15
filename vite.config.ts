import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * qBittorrent serves `public/` to anonymous clients and `private/` to
 * authenticated ones, so we build two independent bundles (no shared chunks):
 *   --mode login -> dist/nuvora/public   (tiny sign-in page)
 *   --mode app   -> dist/nuvora/private  (the application)
 * `base: './'` keeps every URL relative so sub-path reverse proxies work.
 */
export default defineConfig(({ mode }) => {
  const isLogin = mode === 'login'
  const qbt = process.env['NUVORA_QBT_URL'] ?? 'http://localhost:8080'
  return {
    root: resolve(import.meta.dirname, `src/entries/${isLogin ? 'login' : 'app'}`),
    base: './',
    publicDir: resolve(import.meta.dirname, 'public-assets'),
    plugins: [react(), ...(isLogin ? [] : [tailwindcss()])],
    resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
    build: {
      outDir: resolve(import.meta.dirname, `dist/nuvora/${isLogin ? 'public' : 'private'}`),
      emptyOutDir: true,
      target: 'es2022',
      sourcemap: false,
      assetsInlineLimit: 0,
    },
    server: {
      // Dev only: forward the API to a real qBittorrent. Origin/Referer are
      // rewritten so qBittorrent's CSRF check accepts the request.
      proxy: { '/api': { target: qbt, changeOrigin: true, headers: { Origin: qbt, Referer: `${qbt}/` } } },
    },
    test: { root: import.meta.dirname, include: ['src/**/*.test.ts'], environment: 'node' },
  }
})
