import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/windborne': {
        target: 'https://a.windbornesystems.com',
        changeOrigin: true,
        // Example: /api/windborne/00.json -> https://a.windbornesystems.com/treasure/00.json
        rewrite: (path) => path.replace(/^\/api\/windborne/, '/treasure')
      }
    }
  }
})  