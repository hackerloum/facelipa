import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        bank: 'bank.html',
        merchant: 'merchant.html',
      }
    }
  }
})
