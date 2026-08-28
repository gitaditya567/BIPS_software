import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/erp/', 

  plugins: [react()],

  server: {
    proxy: {
      '/erp-api': {
        target: 'http://127.0.0.1:5000', // ERP backend
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/erp-api/, '/api'),
      },
    },
  },
})