import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/MyOnlineTools/',
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
})
