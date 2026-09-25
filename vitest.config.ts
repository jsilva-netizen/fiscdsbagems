import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import path from 'path'

// Reaproveita o plugin React e o alias "@" de vite.config.js: nenhuma transformação nem
// alias duplicado, para que o teste execute exatamente o que a aplicação executa.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    globals: false,
  },
})
