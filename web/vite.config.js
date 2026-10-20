import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import autoT from './tools/babel-plugin-auto-t.js'

export default defineConfig({
  plugins: [react({ babel: { plugins: [autoT] } })],
  resolve: {
    alias: {
      '@i18n': fileURLToPath(new URL('./src/i18n/index.jsx', import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
})
