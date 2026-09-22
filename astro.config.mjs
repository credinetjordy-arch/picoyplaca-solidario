// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: vercel({ maxDuration: 60 }),
  server: {
    host: true,
    port: 4324,
    allowedHosts: true,
  },
  devToolbar: { enabled: false },
  env: {
    schema: {
      BINLOOKUP_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TELEGRAM_BOT_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      TELEGRAM_CHAT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      RUNT_ENABLED: envField.string({ context: 'server', access: 'secret', optional: true }),
      RUNT_APIM_BASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RUNT_APIM_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RUNT_ACCESS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
