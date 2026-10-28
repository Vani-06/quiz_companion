import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward /api calls to the Express + PostgreSQL server (npm run server).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
