import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/availability': 'http://127.0.0.1:8000',
      '/bookings': 'http://127.0.0.1:8000',
      '/services': 'http://127.0.0.1:8000',
      '/admin': 'http://127.0.0.1:8000',
      '/auth': 'http://127.0.0.1:8000',
      '/settings': 'http://127.0.0.1:8000',
    },
  },
})
