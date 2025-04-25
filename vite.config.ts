import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ToDo WebApp',
        short_name: 'ToDoApp',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0d6efd',
        icons: [
          {
            src: 'https://webdesign-vito-luigi.it/appIcon/apple-touch-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://webdesign-vito-luigi.it/appIcon/apple-touch-icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});

