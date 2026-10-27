import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const useHttps = process.env.HTTPS === 'true' || process.env.VITE_HTTPS === 'true' || process.argv.includes('--https');

export default defineConfig({
  plugins: [
    react(),
    useHttps ? basicSsl() : null
  ].filter(Boolean),
  server: {
    host: '0.0.0.0', // Exposes server to local network for mobile phone access
    port: 5173,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})

