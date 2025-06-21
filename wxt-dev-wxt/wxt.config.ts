import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    permissions: ['storage', 'identity', 'activeTab', 'scripting'],
    oauth2: {
      client_id: '234898757030-nrqj20cp1hv10tle91prieqsqocjjdqh.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile']
    }
  },
});
