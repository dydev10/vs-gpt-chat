import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prism from 'vite-plugin-prismjs';
import { analyzer } from 'vite-bundle-analyzer';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    prism({
      languages: ['javascript', 'css', 'html', 'typescript', 'jsx', 'tsx'],
      plugins: ['line-numbers'],
      theme: 'tomorrow',
      css: true,
    }),
    analyzer({
      openAnalyzer: false,
      analyzerMode: 'static',
      fileName: '../.reports/stats',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
