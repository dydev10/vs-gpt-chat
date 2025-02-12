import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import prism from 'vite-plugin-prismjs';
import { analyzer } from 'vite-bundle-analyzer'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    prism({
      languages: ['javascript', 'css', 'html', 'typescript'],
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
