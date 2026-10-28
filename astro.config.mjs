import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lada-spravka.vercel.app',
  integrations: [sitemap()],
});
