import { defineConfig } from 'vite';

export default defineConfig({
  build: {rolldownOptions:{input:{editor:'index.html',modelPreview:'model-preview.html'}}},
  server: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
  },
});
