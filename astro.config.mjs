import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lirune-reader-1aa95.web.app',
  trailingSlash: 'never',
  build: {
    format: 'directory'
  }
});
