import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' — сборка работает из любой папки (превью, Vercel, статический хостинг).
// В разработке /api проксируется на локальный сервер (npm run dev:api).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
})
