import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The one-container server (server/). Same paths as in production, so the
    // client never needs to know whether it is in development.
    proxy: {
      '/sync': { target: 'ws://localhost:3000', ws: true },
      '/api': 'http://localhost:3000',
    },
  },
})
