import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lirune-reader.web.app',
  trailingSlash: 'ignore',
  build: {
    format: 'directory'
  }
});
